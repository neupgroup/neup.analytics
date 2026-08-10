import { NextResponse } from 'next/server';
import { prisma } from '@/core/database/prisma';

interface Params {
  id: string;
}

function getPagePathFromUrl(value: string) {
  try {
    const url = new URL(value);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

function addPathVariants(candidates: Set<string>, value: string | null | undefined) {
  if (!value) return;

  const trimmed = value.trim();
  if (!trimmed) return;

  candidates.add(trimmed);

  const parsedPath = getPagePathFromUrl(trimmed);
  if (parsedPath) {
    candidates.add(parsedPath);
  }

  const withoutHash = (parsedPath ?? trimmed).split('#')[0];
  if (withoutHash) {
    candidates.add(withoutHash);
  }

  if (withoutHash.length > 1 && withoutHash.endsWith('/')) {
    candidates.add(withoutHash.slice(0, -1));
  } else if (withoutHash && !withoutHash.includes('?')) {
    candidates.add(`${withoutHash}/`);
  }
}

function getSnapshotPagePath(details: unknown) {
  if (!details || typeof details !== 'object' || Array.isArray(details)) {
    return null;
  }

  const pagePath = (details as { pagePath?: unknown }).pagePath;
  return typeof pagePath === 'string' ? pagePath : null;
}

function getPageCandidates(value: string, details?: unknown) {
  const candidates = new Set<string>();
  addPathVariants(candidates, value);
  addPathVariants(candidates, getSnapshotPagePath(details));
  return candidates;
}

function snapshotMatchesPage(snapshot: { pageUrl: string; details: unknown }, pagePath: string) {
  const replayCandidates = getPageCandidates(pagePath);
  const snapshotCandidates = getPageCandidates(snapshot.pageUrl, snapshot.details);

  for (const candidate of replayCandidates) {
    if (snapshotCandidates.has(candidate)) {
      return true;
    }
  }

  return false;
}

function getUtcDayBounds(value: Date) {
  const start = new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
  );
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return { start, end };
}

function getDistanceFromReplay(snapshotCreatedOn: Date, replayCreatedAt: Date) {
  return Math.abs(snapshotCreatedOn.getTime() - replayCreatedAt.getTime());
}

async function findSnapshotForReplay(pagePath: string, createdAt: Date) {
  const { start, end } = getUtcDayBounds(createdAt);
  const snapshotsFromReplayDay = await prisma.snapshotWeb.findMany({
    where: {
      createdOn: {
        gte: start,
        lt: end,
      },
    },
    orderBy: { createdOn: 'asc' },
  });

  const matchingSnapshots = snapshotsFromReplayDay.filter((snapshot) =>
    snapshotMatchesPage(snapshot, pagePath)
  );

  if (matchingSnapshots.length === 0) {
    return null;
  }

  return matchingSnapshots.reduce((closest, snapshot) =>
    getDistanceFromReplay(snapshot.createdOn, createdAt) <
    getDistanceFromReplay(closest.createdOn, createdAt)
      ? snapshot
      : closest
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<Params> }
) {
  const { id } = await params;

  const interaction = await prisma.interaction.findUnique({
    where: { id },
    include: {
      events: true,
      page: true,
    },
  });

  if (!interaction) {
    return NextResponse.json({ error: 'Replay not found' }, { status: 404 });
  }

  const snapshotWeb = await findSnapshotForReplay(interaction.pagePath, interaction.createdAt);

  const page = snapshotWeb
    ? {
        id: snapshotWeb.id,
        pagePath: interaction.pagePath,
        pageUrl: snapshotWeb.pageUrl,
        content: snapshotWeb.data,
        recordedOn: snapshotWeb.createdOn,
      }
    : interaction.page;

  return NextResponse.json({
    ...interaction,
    page,
    pageSnapshot: page,
  });
}

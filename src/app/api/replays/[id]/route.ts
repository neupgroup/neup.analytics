import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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

function getSnapshotPagePath(details: unknown) {
  if (!details || typeof details !== 'object' || Array.isArray(details)) {
    return null;
  }

  const pagePath = (details as { pagePath?: unknown }).pagePath;
  return typeof pagePath === 'string' ? pagePath : null;
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

  let snapshotWeb = await prisma.snapshotWeb.findFirst({
    where: { sessionId: id },
    orderBy: { createdOn: 'desc' },
  });

  if (!snapshotWeb) {
    const recentSnapshots = await prisma.snapshotWeb.findMany({
      orderBy: { createdOn: 'desc' },
      take: 100,
    });

    snapshotWeb =
      recentSnapshots.find((snapshot) => {
        const snapshotPath =
          getSnapshotPagePath(snapshot.details) ?? getPagePathFromUrl(snapshot.pageUrl);
        return snapshotPath === interaction.pagePath;
      }) ?? null;
  }

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

import { NextResponse } from 'next/server';
import { prisma } from '#/core/database/prisma';

type Params = {
  id: string;
};

export async function POST(_request: Request, context: { params?: Params | Promise<Params> }) {
  const params = await (context.params as Promise<Params> | Params | undefined);
  const id = params?.id;

  if (!id) {
    return NextResponse.json({ error: 'Missing property id in route.' }, { status: 400 });
  }

  const application = await prisma.application.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!application) {
    return NextResponse.json({ error: 'Property not found.' }, { status: 404 });
  }

  const cutoff = new Date(Date.now() - 15 * 60 * 1000);
  const pageSnapshots = await prisma.pageSnapshot.findMany({
    where: { siteId: id },
    select: { id: true },
  });

  const pageIds = pageSnapshots.map((page) => page.id);
  // Check for recent interactions linked to the property's pages
  const interaction = pageIds.length
    ? await prisma.interaction.findFirst({
        where: {
          pageId: { in: pageIds },
          createdAt: { gte: cutoff },
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true, createdAt: true },
      })
    : null;

  if (!interaction) {
    // Provide diagnostics to help determine why verification failed
    const pageSnapshotCount = pageIds.length;
    const interactionCount = pageIds.length
      ? await prisma.interaction.count({ where: { pageId: { in: pageIds } } })
      : 0;

    const lastInteraction = pageIds.length
      ? await prisma.interaction.findFirst({
          where: { pageId: { in: pageIds } },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        })
      : null;

    const installed = interactionCount > 0;
    let message = 'No recent collector traffic found yet.';
    if (installed) {
      message = `SDK installed: ${interactionCount} interactions recorded; last at ${lastInteraction?.createdAt?.toISOString() ?? 'unknown'}. Refresh the tracked site to produce new events.`;
    }

    return NextResponse.json(
      {
        verified: false,
        installed,
        message,
        diagnostics: {
          pageSnapshotCount,
          interactionCount,
          lastInteractionAt: lastInteraction?.createdAt ?? null,
        },
      },
      { status: 200 }
    );
  }

  await prisma.application.update({
    where: { id },
    data: { status: 'active' },
  });

  return NextResponse.json({ verified: true, status: 'active' });
}
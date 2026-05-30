import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type Params = {
  id: string;
};

export async function POST(
  _request: Request,
  { params }: { params: Params }
) {
  const application = await prisma.application.findUnique({
    where: { id: params.id },
    select: { id: true },
  });

  if (!application) {
    return NextResponse.json({ error: 'Property not found.' }, { status: 404 });
  }

  const cutoff = new Date(Date.now() - 15 * 60 * 1000);
  const pageSnapshots = await prisma.pageSnapshot.findMany({
    where: { siteId: params.id },
    select: { id: true },
  });

  const pageIds = pageSnapshots.map((page) => page.id);

  const interaction = pageIds.length
    ? await prisma.interaction.findFirst({
        where: {
          pageId: { in: pageIds },
          createdAt: { gte: cutoff },
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      })
    : null;

  if (!interaction) {
    return NextResponse.json(
      { verified: false, message: 'No recent collector traffic found yet.' },
      { status: 200 }
    );
  }

  await prisma.application.update({
    where: { id: params.id },
    data: { status: 'active' },
  });

  return NextResponse.json({ verified: true, status: 'active' });
}
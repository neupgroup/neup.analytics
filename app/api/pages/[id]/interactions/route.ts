import { NextResponse } from 'next/server';
import { prisma } from '@/core/database/prisma';

interface Params {
  id: string;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<Params> }
) {
  const { id } = await params;

  const interactions = await prisma.interaction.findMany({
    where: { pageId: id },
    orderBy: { createdAt: 'desc' },
    include: {
      events: true,
    },
  });

  return NextResponse.json(interactions);
}

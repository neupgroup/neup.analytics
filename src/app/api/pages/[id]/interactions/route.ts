import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

interface Params {
  id: string;
}

export async function GET(
  request: Request,
  { params }: { params: Params }
) {
  const interactions = await prisma.interaction.findMany({
    where: { pageId: params.id },
    orderBy: { createdAt: 'desc' },
    include: {
      events: true,
    },
  });

  return NextResponse.json(interactions);
}

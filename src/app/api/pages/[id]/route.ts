import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

interface Params {
  id: string;
}

export async function GET(
  request: Request,
  { params }: { params: Params }
) {
  const page = await prisma.pageSnapshot.findUnique({
    where: { id: params.id },
  });

  if (!page) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 });
  }

  const interactionsCount = await prisma.interaction.count({
    where: { pageId: params.id },
  });

  return NextResponse.json({
    ...page,
    interactionsCount,
  });
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

interface Params {
  id: string;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<Params> }
) {
  const { id } = await params;

  const page = await prisma.pageSnapshot.findUnique({
    where: { id },
  });

  if (!page) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 });
  }

  const interactionsCount = await prisma.interaction.count({
    where: { pageId: id },
  });

  return NextResponse.json({
    ...page,
    interactionsCount,
  });
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get('page') || '1');
  const limit = Number(url.searchParams.get('limit') || '10');
  const offset = Math.max(page - 1, 0) * limit;

  const interactions = await prisma.interaction.findMany({
    orderBy: { createdAt: 'desc' },
    skip: offset,
    take: limit,
  });

  const total = await prisma.interaction.count();

  return NextResponse.json({ interactions, total, page, limit });
}

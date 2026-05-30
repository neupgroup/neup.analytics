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

  const snapshot = await prisma.snapshotWeb.findUnique({
    where: { id },
    select: {
      id: true,
      pageUrl: true,
      data: true,
      details: true,
      createdOn: true,
      sessionId: true,
    },
  });

  if (!snapshot) {
    return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
  }

  return NextResponse.json({
    snapshot: {
      ...snapshot,
      size: snapshot.data.length,
    },
  });
}

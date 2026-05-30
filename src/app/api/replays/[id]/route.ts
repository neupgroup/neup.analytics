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

  return NextResponse.json(interaction);
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

interface Params {
  id: string;
}

export async function GET(
  request: Request,
  { params }: { params: Params }
) {
  const interaction = await prisma.interaction.findUnique({
    where: { id: params.id },
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

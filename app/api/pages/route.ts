import { NextResponse } from 'next/server';
import { prisma } from '#/core/database/prisma';

export async function GET() {
  const pages = await prisma.pageSnapshot.findMany({
    orderBy: { recordedOn: 'desc' },
    select: {
      id: true,
      pagePath: true,
      siteId: true,
      version: true,
      recordedOn: true,
      content: true,
    },
  });

  return NextResponse.json(pages);
}

import { NextResponse } from 'next/server';
import { prisma } from '@neup/core/database/prisma';

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
    const configuredPage = await prisma.page.findUnique({ where: { id } });
    if (!configuredPage) return NextResponse.json({ error: 'Page not found' }, { status: 404 });

    return NextResponse.json({
      id: configuredPage.id,
      pagePath: configuredPage.pageName,
      siteId: configuredPage.projectId,
      version: Number(configuredPage.iteration) || 1,
      recordedOn: configuredPage.createdOn,
      content: '',
      interactionsCount: 0,
      pageTitle: configuredPage.pageTitle,
      description: configuredPage.description,
    });
  }

  const interactionsCount = await prisma.interaction.count({
    where: { pageId: id },
  });

  return NextResponse.json({
    ...page,
    interactionsCount,
  });
}

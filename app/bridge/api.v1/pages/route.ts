import { NextResponse } from 'next/server';
import { prisma } from '@neup/core/database/prisma';

function normalizePageUrl(value: string) {
  try {
    const url = new URL(value.includes('://') ? value : `https://${value}`);
    return `${url.host}${url.pathname}`.replace(/\/$/, '') || url.host;
  } catch {
    return value.split(/[?#]/, 1)[0].replace(/^https?:\/\//i, '').replace(/\/$/, '');
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('selectedProject')?.trim();
  if (!projectId) return NextResponse.json({ pages: [], recommendations: [] });

  const pages = await prisma.pageSnapshot.findMany({
    where: { siteId: projectId },
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

  const configuredPages = await prisma.page.findMany({
    where: { projectId },
    orderBy: { createdOn: 'desc' },
  });
  const activities = await prisma.activity.findMany({
    where: { projectId, pageUrl: { not: null } },
    select: { pageUrl: true },
  });
  const configuredNames = new Set(configuredPages.map((page) => page.pageName));
  const recommendations = [...new Set(activities.map((activity) => normalizePageUrl(activity.pageUrl!)))]
    .filter((pageName) => pageName && !configuredNames.has(pageName));

  return NextResponse.json({ pages, configuredPages, recommendations });
}

export async function POST(request: Request) {
  const body = await request.json() as { projectId?: string; pageName?: string };
  const projectId = body.projectId?.trim();
  const pageName = body.pageName?.trim();
  if (!projectId || !pageName) return NextResponse.json({ error: 'projectId and pageName are required' }, { status: 400 });

  const page = await prisma.page.create({
    data: { projectId, pageName: pageName.slice(0, 48), pageTitle: pageName.slice(0, 128), description: '', iteration: '1' },
  });
  return NextResponse.json(page, { status: 201 });
}

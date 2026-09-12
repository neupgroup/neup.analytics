import { NextResponse } from 'next/server';
import { prisma } from '@neup/core/database/prisma';

function pageUrl(path: string, projectPath: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const domain = projectPath.replace(/^https?:\/\//i, '').replace(/\/$/, '').split('/')[0];
  return `https://${domain}${normalizedPath}`;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const configuredPage = await prisma.page.findUnique({ where: { id }, include: { project: { select: { path: true } } } });
  const snapshot = configuredPage ? null : await prisma.pageSnapshot.findUnique({ where: { id } });

  if (!configuredPage && !snapshot) return NextResponse.json({ error: 'Page not found' }, { status: 404 });

  const path = configuredPage?.pageName ?? snapshot!.pagePath;
  const projectPath = configuredPage?.project.path ?? snapshot!.siteId;
  const response = await fetch(pageUrl(path, projectPath), { headers: { Accept: 'text/html' }, signal: AbortSignal.timeout(10000), cache: 'no-store' });

  return NextResponse.json({ html: await response.text(), status: response.status, statusText: response.statusText });
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/core/database/prisma';

function normalizeUrl(value: unknown) {
  if (typeof value !== 'string') {
    throw new Error('URL is required.');
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error('URL is required.');
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(withProtocol);

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only HTTP and HTTPS URLs can be captured.');
  }

  return url;
}

function escapeAttribute(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function injectBaseHref(html: string, pageUrl: string) {
  if (/<base\s/i.test(html)) {
    return html;
  }

  const baseTag = `<base href="${escapeAttribute(pageUrl)}">`;

  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`);
  }

  return `<!doctype html><html><head>${baseTag}</head><body>${html}</body></html>`;
}

function getPagePath(url: URL) {
  return `${url.pathname}${url.search}${url.hash}`;
}

function getTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1]?.replace(/\s+/g, ' ').trim() || null;
}

export async function GET(request: NextRequest) {
  const limit = Math.min(
    Math.max(Number(request.nextUrl.searchParams.get('limit') || '25'), 1),
    100
  );

  const snapshots = await prisma.snapshotWeb.findMany({
    orderBy: { createdOn: 'desc' },
    take: limit,
    select: {
      id: true,
      pageUrl: true,
      data: true,
      details: true,
      createdOn: true,
    },
  });

  return NextResponse.json({
    snapshots: snapshots.map((snapshot) => ({
      ...snapshot,
      size: snapshot.data.length,
    })),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const url = normalizeUrl(body.url);
    const pageUrl = url.toString();
    const capturedAt = new Date();

    const response = await fetch(pageUrl, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'NeupAnalyticsSnapshotBot/1.0',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL. Server returned ${response.status}.` },
        { status: 502 }
      );
    }

    const contentType = response.headers.get('content-type') ?? '';
    const rawHtml = await response.text();
    const data = injectBaseHref(rawHtml, pageUrl);

    const snapshot = await prisma.snapshotWeb.create({
      data: {
        sessionId: null,
        pageUrl,
        data,
        details: {
          capturedBy: 'manual',
          capturedAt: capturedAt.toISOString(),
          contentType,
          pagePath: getPagePath(url),
          status: response.status,
          title: getTitle(rawHtml),
        },
        createdOn: capturedAt,
      },
      select: {
        id: true,
        pageUrl: true,
        data: true,
        details: true,
        createdOn: true,
      },
    });

    return NextResponse.json({
      snapshot: {
        ...snapshot,
        size: snapshot.data.length,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to capture snapshot.' },
      { status: 400 }
    );
  }
}

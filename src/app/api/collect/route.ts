import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

function getRequestOrigin(request: NextRequest) {
  return request.headers.get('origin') || request.headers.get('referer');
}

function isAllowedSite(site: string, requestOrigin: string | null, referer: string | null) {
  if (!site) return false;

  try {
    const siteUrl = new URL(site);
    if (requestOrigin && siteUrl.origin === requestOrigin) {
      return true;
    }
    if (referer && referer.startsWith(siteUrl.href)) {
      return true;
    }
    return false;
  } catch {
    if (referer && referer.startsWith(site)) {
      return true;
    }
    return false;
  }
}

function getCorsHeaders(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Neup-Site-Id',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function withCors(body: unknown, status: number, origin: string | null) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders(origin),
    },
  });
}

export async function OPTIONS(request: NextRequest) {
  const siteId = request.nextUrl.searchParams.get('siteId');

  if (!siteId) {
    return withCors({ error: 'siteId is required.' }, 400, getRequestOrigin(request));
  }

  const application = await prisma.application.findUnique({
    where: { id: siteId },
    select: { sites: true },
  });

  if (!application) {
    return withCors({ error: 'Property not found.' }, 404, getRequestOrigin(request));
  }

  const requestOrigin = getRequestOrigin(request);
  const isAllowed = application.sites.some((site) =>
    isAllowedSite(site, requestOrigin, request.headers.get('referer'))
  );

  if (!isAllowed) {
    return withCors({ error: 'Origin is not allowed for this property.' }, 403, requestOrigin);
  }

  return withCors({ ok: true }, 200, requestOrigin);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const resolvedSiteId = String(
      request.nextUrl.searchParams.get('siteId') ?? body.siteId ?? ''
    ).trim();

    const now = new Date();
    const requestOrigin = getRequestOrigin(request);
    const referer = request.headers.get('referer');

    if (!resolvedSiteId) {
      return withCors({ error: 'siteId is required.' }, 400, requestOrigin);
    }

    const application = await prisma.application.findUnique({
      where: { id: resolvedSiteId },
      select: { sites: true },
    });

    if (!application) {
      return withCors({ error: 'Property not found.' }, 404, requestOrigin);
    }

    const isAllowed = application.sites.some((site) =>
      isAllowedSite(site, requestOrigin, referer)
    );

    if (!isAllowed) {
      return withCors({ error: 'Origin is not allowed for this property.' }, 403, requestOrigin);
    }

    // Upsert user if provided
    let userId: string | undefined = undefined;
    if (body.userId) {
      userId = body.userId;
      await prisma.user.upsert({
        where: { id: userId },
        create: { id: userId, createdAt: now, lastSeenAt: now, isLive: false },
        update: { lastSeenAt: now },
      });
    }

    // Find or create page snapshot
    let pageId: string | undefined = undefined;
    const pagePath = body.pagePath ?? body.page?.path ?? null;

    if (pagePath) {
      const existing = await prisma.pageSnapshot.findFirst({
        where: { pagePath, siteId: resolvedSiteId },
      });
      if (existing) {
        pageId = existing.id;
      } else {
        const created = await prisma.pageSnapshot.create({
          data: {
            pagePath,
            content: body.content || '',
            recordedOn: now,
            version: body.version ?? 1,
            siteId: resolvedSiteId,
          },
        });
        pageId = created.id;
      }
    }

    // Create interaction with nested events
    const created = await prisma.interaction.create({
      data: {
        userId: userId ?? null,
        pageId: pageId ?? null,
        pagePath: pagePath ?? body.page?.url ?? '',
        windowWidth: body.window?.width ?? body.device?.viewport?.width ?? 0,
        windowHeight: body.window?.height ?? body.device?.viewport?.height ?? 0,
        userAgent: body.userAgent ?? null,
        ip: body.ip ?? null,
        city: body.city ?? null,
        region: body.region ?? null,
        country: body.country ?? null,
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
        events: {
          create: (body.events || []).map((e: any) => ({
            type: e.type,
            x: e.x ?? null,
            y: e.y ?? null,
            element: e.element ?? null,
            value: e.value ?? null,
            key: e.key ?? null,
            scrollX: e.scrollX ?? null,
            scrollY: e.scrollY ?? null,
            timestamp: typeof e.timestamp === 'number' ? e.timestamp : Date.now(),
          })),
        },
      },
    });

    return withCors({ id: created.id }, 201, requestOrigin);
  } catch (err: any) {
    console.error('collect error', err);
    return withCors({ error: err.message || String(err) }, 500, null);
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

function normalizeTimestamp(value: unknown) {
  const maxInt32 = 2147483647;

  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value > maxInt32) {
      // Convert millisecond timestamps to seconds for the integer column.
      return Math.floor(value / 1000);
    }

    return Math.floor(value);
  }

  return Math.floor(Date.now() / 1000);
}

function getRequestOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin) return origin;

  const referer = request.headers.get('referer');
  if (!referer) return null;

  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
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

function getHourStart(value: Date) {
  return new Date(
    Date.UTC(
      value.getUTCFullYear(),
      value.getUTCMonth(),
      value.getUTCDate(),
      value.getUTCHours()
    )
  );
}

function getPagePathFromUrl(value: string | null) {
  if (!value) return null;

  try {
    const url = new URL(value);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

function getPlainObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function getCorsHeaders(origin: string | null) {
  const sanitizedOrigin = typeof origin === 'string' ? origin.trim() : null;

  // Do not fall back to wildcard for credentialed CORS. We only reflect a real origin.
  if (!sanitizedOrigin) {
    return {};
  }

  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': sanitizedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Neup-Site-Id',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };

  headers['Access-Control-Allow-Credentials'] = 'true';

  return headers;
}

const allowedEventTypes = new Set([
  'pageview',
  'heartbeat',
  'mousemove',
  'click',
  'scroll',
  'touch',
  'input',
  'keydown',
]);

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
    const sessionId = String(body.sessionId ?? request.nextUrl.searchParams.get('sessionId') ?? '').trim();

    const now = new Date();
    const requestOrigin = getRequestOrigin(request);
    const referer = request.headers.get('referer');

    if (!resolvedSiteId) {
      return withCors({ error: 'siteId is required.' }, 400, requestOrigin);
    }

    if (!sessionId) {
      return withCors({ error: 'sessionId is required.' }, 400, requestOrigin);
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

    const interactionEvents = (Array.isArray(body.events) ? body.events : [])
      .filter((e: any) => allowedEventTypes.has(e?.type))
      .map((e: any) => ({
        type: e.type,
        x: Number.isFinite(e.x) ? Math.floor(e.x) : null,
        y: Number.isFinite(e.y) ? Math.floor(e.y) : null,
        element: e.element ?? e.selector ?? null,
        value: e.value ?? null,
        key: e.key ?? null,
        scrollX: Number.isFinite(e.scrollX) ? Math.floor(e.scrollX) : null,
        scrollY: Number.isFinite(e.scrollY) ? Math.floor(e.scrollY) : null,
        timestamp: normalizeTimestamp(e.timestamp ?? e.ts),
      }));

    // Upsert user if provided
    let userId: string | undefined = undefined;
    if (body.userId) {
      userId = body.userId;
      await prisma.user.upsert({
        where: { id: userId },
        create: { id: userId, createdAt: now, lastSeen: now, isLive: false },
        update: { lastSeen: now },
      });
    }

    // Find or create page snapshot
    let pageId: string | undefined = undefined;
    const pageUrl = String(
      body.snapshot?.pageUrl ?? body.pageUrl ?? body.page?.url ?? referer ?? ''
    ).trim();
    const snapshotData =
      typeof body.snapshot?.data === 'string' && body.snapshot.data.trim()
        ? body.snapshot.data
        : typeof body.content === 'string'
          ? body.content
          : '';
    const pagePath =
      body.pagePath ?? body.page?.path ?? getPagePathFromUrl(pageUrl) ?? null;

    if (pagePath) {
      const existing = await prisma.pageSnapshot.findFirst({
        where: { pagePath, siteId: resolvedSiteId },
      });
      if (existing) {
        pageId = existing.id;
        if (snapshotData && !existing.content) {
          await prisma.pageSnapshot.update({
            where: { id: existing.id },
            data: {
              content: snapshotData,
              recordedOn: now,
              version: existing.version + 1,
            },
          });
        }
      } else {
        const created = await prisma.pageSnapshot.create({
          data: {
            pagePath,
            content: snapshotData,
            recordedOn: now,
            version: body.version ?? 1,
            siteId: resolvedSiteId,
          },
        });
        pageId = created.id;
      }
    }

    // Create interaction with nested events
    const created = await prisma.interaction.upsert({
      where: { id: sessionId },
      create: {
        id: sessionId,
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
          create: interactionEvents,
        },
      },
      update: {
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
          create: interactionEvents,
        },
      },
    });

    if (pageUrl && snapshotData) {
      const hourStart = getHourStart(now);
      const existingHourlySnapshot = await prisma.snapshotWeb.findFirst({
        where: {
          pageUrl,
          createdOn: {
            gte: hourStart,
          },
        },
        select: { id: true },
      });

      if (!existingHourlySnapshot) {
        const snapshotDetails = {
          ...getPlainObject(body.snapshot?.details),
          siteId: resolvedSiteId,
          pagePath: pagePath ?? getPagePathFromUrl(pageUrl),
          userAgent: body.userAgent ?? null,
          window: body.window ?? body.device?.viewport ?? null,
        };

        await prisma.snapshotWeb.create({
          data: {
            sessionId: null,
            pageUrl,
            data: snapshotData,
            details: snapshotDetails,
            createdOn: now,
          },
        });
      }
    }

    return withCors({ id: created.id }, 201, requestOrigin);
  } catch (err: any) {
    console.error('collect error', err);
    return withCors({ error: err.message || String(err) }, 500, null);
  }
}

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const now = new Date();

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
    if (body.pagePath) {
      const existing = await prisma.pageSnapshot.findFirst({ where: { pagePath: body.pagePath } });
      if (existing) {
        pageId = existing.id;
      } else {
        const created = await prisma.pageSnapshot.create({
          data: {
            pagePath: body.pagePath,
            content: body.content || '',
            recordedOn: now,
            version: body.version ?? 1,
            siteId: body.siteId ?? null,
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
        pagePath: body.pagePath ?? null,
        windowWidth: body.window?.width ?? 0,
        windowHeight: body.window?.height ?? 0,
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

    return new Response(JSON.stringify({ id: created.id }), { status: 201 });
  } catch (err: any) {
    console.error('collect error', err);
    return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 500 });
  }
}

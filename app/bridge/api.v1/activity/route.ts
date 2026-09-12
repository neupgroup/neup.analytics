import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { prisma } from '@neup/core/database/prisma';
import {
  createActivities,
  getRecordableActivityEvents,
  isProjectOriginAllowed,
  parseActivityEvents,
} from '@/services/activity/createActivity';

function getCorsHeaders(origin?: string): Record<string, string> {
  return {
    ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}),
    ...(origin ? { 'Access-Control-Allow-Credentials': 'true' } : {}),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function getRequestOrigin(request: Request): string | undefined {
  return request.headers.get('origin')?.trim() || undefined;
}

function getRequestIp(request: Request): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for');

  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || undefined;
  }

  return request.headers.get('x-real-ip')?.trim() || undefined;
}

function isValidServerIp(configured: string | null, requestIp?: string) {
  if (!configured || !requestIp) return false;
  return configured.split(',').map((value) => value.trim()).filter(Boolean).includes(requestIp);
}

function decryptContext(value: string | undefined) {
  const privateKey = process.env.NEUP_ANALYTICS_PROJECT_KEY;
  if (!value || !privateKey) return null;
  const parts = value.split('.');
  if (parts.length !== 4) return null;
  try {
    const [ephemeralPublic, iv, authTag, ciphertext] = parts.map((part) => Buffer.from(part, 'base64url'));
    const sharedSecret = crypto.diffieHellman({
      privateKey: crypto.createPrivateKey({ key: Buffer.from(privateKey, 'base64'), format: 'der', type: 'pkcs8' }),
      publicKey: crypto.createPublicKey({ key: ephemeralPublic, format: 'der', type: 'spki' }),
    });
    const decipher = crypto.createDecipheriv('aes-256-gcm', crypto.createHash('sha256').update(sharedSecret).digest(), iv);
    decipher.setAuthTag(authTag);
    const payload = JSON.parse(Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')) as { contextId?: unknown };
    return typeof payload.contextId === 'string' ? payload.contextId : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let allowedOrigin: string | undefined;

  try {
    const { searchParams } = new URL(request.url);
    const body = await request.json();
    const bodyRecord = body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : null;
    const projectId = searchParams.get('project')?.trim() || (typeof bodyRecord?.projectId === 'string' ? bodyRecord.projectId.trim() : undefined);

    if (!projectId) {
      return NextResponse.json(
        {
          success: false,
          message: 'project query parameter is required',
        },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
      },
      select: {
        id: true,
        path: true,
        ipAddress: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        {
          success: false,
          message: 'Project not found',
        },
        { status: 404, headers: getCorsHeaders() }
      );
    }

    const requestOrigin = getRequestOrigin(request);
    const requestIp = getRequestIp(request);
    const serverRequest = isValidServerIp(project.ipAddress, requestIp);

    if (!serverRequest && (!requestOrigin || !isProjectOriginAllowed(project.path, requestOrigin, request.url))) {
      return NextResponse.json(
        {
          success: false,
          message: 'Origin is not allowed for this project',
        },
        { status: 403, headers: getCorsHeaders() }
      );
    }

    allowedOrigin = requestOrigin;

    const events = parseActivityEvents(body);

    if (events.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'At least one activity event is required',
        },
        { status: 400, headers: getCorsHeaders(allowedOrigin) }
      );
    }

    const signedContext = typeof bodyRecord?.contextId === 'string' ? bodyRecord.contextId : typeof bodyRecord?.signedContextId === 'string' ? bodyRecord.signedContextId : undefined;
    const verifiedContextId = serverRequest ? decryptContext(signedContext) : null;
    if (serverRequest && signedContext && !verifiedContextId) {
      return NextResponse.json({ success: false, message: 'Invalid signed context' }, { status: 403, headers: getCorsHeaders(allowedOrigin) });
    }
    if (serverRequest && !signedContext) {
      return NextResponse.json({ success: false, message: 'Signed context is required for server requests' }, { status: 403, headers: getCorsHeaders(allowedOrigin) });
    }
    const suppliedTraceId = typeof bodyRecord?._neuptraceid === 'string' ? bodyRecord._neuptraceid.trim() : undefined;
    if (verifiedContextId && suppliedTraceId) {
      await prisma.analyticsContext.upsert({
        where: { contextId: verifiedContextId },
        create: { contextId: verifiedContextId, traceId: suppliedTraceId, projectId: project.id },
        update: { traceId: suppliedTraceId },
      });
    }
    const storedContext = verifiedContextId
      ? await prisma.analyticsContext.findUnique({ where: { contextId: verifiedContextId }, select: { traceId: true } })
      : null;
    const ip = requestIp;
    const userAgent = request.headers.get('user-agent')?.trim() || undefined;
    const activityEvents = events.map((event) => ({
      ...event,
      identifierId: event.identifierId ?? event.identifier ?? verifiedContextId ?? event.contextId ?? crypto.randomUUID(),
      contextId: verifiedContextId ?? event.contextId,
      traceId: suppliedTraceId ?? storedContext?.traceId,
      ip: event.ip ?? ip,
      userAgent: event.userAgent ?? userAgent,
    }));
    const recordableEvents = getRecordableActivityEvents(activityEvents);

    if (recordableEvents.length === 0) {
      return NextResponse.json(
        {
          success: true,
          message: 'Heartbeat accepted',
          active: true,
          data: [],
        },
        { status: 200, headers: getCorsHeaders(allowedOrigin) }
      );
    }

    const activity = await createActivities(
      project.id,
      recordableEvents
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Activity recorded successfully',
        data: activity,
      },
      { status: 201, headers: getCorsHeaders(allowedOrigin) }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to create activity';

    const status =
      message.includes('required') || message.includes('JSON object')
        ? 400
        : 500;

    console.error('Activity API error:', error);

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status, headers: getCorsHeaders(allowedOrigin) }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      message: 'Not Found',
    },
    { status: 404, headers: getCorsHeaders() }
  );
}

export async function OPTIONS(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('project')?.trim();

  if (!projectId) {
    return NextResponse.json(
      {
        success: false,
        message: 'project query parameter is required',
      },
      { status: 400, headers: getCorsHeaders() }
    );
  }

  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    select: {
      path: true,
    },
  });

  if (!project) {
    return NextResponse.json(
      {
        success: false,
        message: 'Project not found',
      },
      { status: 404, headers: getCorsHeaders() }
    );
  }

  const requestOrigin = getRequestOrigin(request);

  if (
    !requestOrigin
    || !isProjectOriginAllowed(project.path, requestOrigin, request.url)
  ) {
    return NextResponse.json(
      {
        success: false,
        message: 'Origin is not allowed for this project',
      },
      { status: 403, headers: getCorsHeaders() }
    );
  }

  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(requestOrigin),
  });
}

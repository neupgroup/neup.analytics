import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { verifyContextToken, matchesTrace } from '@/services/activity/context-token';
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
        projectSecret: true,
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

    // Validate before parsing can discard malformed or empty tokens.
    for (const record of (Array.isArray(body) ? body : [body])) {
      const tokens = ['signed_context_id', 'signedContextId', 'contextId']
        .filter((name) => record[name] !== undefined).map((name) => record[name]);
      if (new Set(tokens).size > 1 || tokens.some((token) => typeof token !== 'string' || !verifyContextToken(project.projectSecret, token))) {
        return NextResponse.json({ message: 'Invalid signed context' }, { status: 403, headers: getCorsHeaders(allowedOrigin) });
      }
    }

    if (events.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'At least one activity event is required',
        },
        { status: 400, headers: getCorsHeaders(allowedOrigin) }
      );
    }

    const aliases = ['signed_context_id', 'signedContextId', 'contextId'];
    const supplied = aliases.filter((name) => bodyRecord?.[name] !== undefined).map((name) => bodyRecord![name]);
    if (supplied.some((value) => typeof value !== 'string') || new Set(supplied).size > 1) {
      return NextResponse.json({ message: 'Invalid signed context' }, { status: 403, headers: getCorsHeaders(allowedOrigin) });
    }
    const topToken = supplied[0] as string | undefined;
    const suppliedTraceId = bodyRecord?._neuptraceid;
    const verified = events.map((event) => {
      const token = event.contextId ?? topToken;
      return { event, token, contextId: token === undefined ? null : verifyContextToken(project.projectSecret, token) };
    });
    if (verified.some(({ token, contextId }) => (token !== undefined || serverRequest) && !contextId)
      || (topToken !== undefined && !verifyContextToken(project.projectSecret, topToken))) {
      return NextResponse.json({ message: 'Invalid or missing signed context' }, { status: 403, headers: getCorsHeaders(allowedOrigin) });
    }
    if (suppliedTraceId !== undefined && (typeof suppliedTraceId !== 'string' || !suppliedTraceId || suppliedTraceId.length > 512
      || verified.some(({ contextId }) => !contextId || !project.projectSecret || !matchesTrace(project.projectSecret, contextId, suppliedTraceId)))) {
      return NextResponse.json({ message: 'Trace ID does not match signed context' }, { status: 403, headers: getCorsHeaders(allowedOrigin) });
    }
    const activityEvents = await Promise.all(verified.map(async ({ event, contextId }) => {
      if (contextId && typeof suppliedTraceId === 'string') {
        await prisma.analyticsContext.upsert({ where: { contextId }, create: { contextId, traceId: suppliedTraceId, projectId: project.id }, update: {} });
      }
      const storedContext = contextId ? await prisma.analyticsContext.findFirst({ where: { contextId, projectId: project.id }, select: { traceId: true } }) : null;
      return {
        ...event,
        identifierId: event.identifierId ?? event.identifier ?? contextId ?? crypto.randomUUID(),
        contextId: contextId ?? undefined,
        traceId: storedContext?.traceId,
        ip: event.ip ?? requestIp,
        userAgent: event.userAgent ?? request.headers.get('user-agent')?.trim(),
      };
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

import { NextResponse } from 'next/server';
import { prisma } from '#/core/database/prisma';
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

export async function POST(request: Request) {
  let allowedOrigin: string | undefined;

  try {
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
        id: true,
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
      requestOrigin
      && !isProjectOriginAllowed(project.path, requestOrigin, request.url)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Origin is not allowed for this project',
        },
        { status: 403, headers: getCorsHeaders() }
      );
    }

    allowedOrigin = requestOrigin;

    const body = await request.json();
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

    const ip = getRequestIp(request);
    const userAgent = request.headers.get('user-agent')?.trim() || undefined;
    const activityEvents = events.map((event) => ({
      ...event,
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

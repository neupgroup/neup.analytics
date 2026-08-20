import { NextResponse } from 'next/server';
import { prisma } from '@/core/database/prisma';
import { createActivities, parseActivityEvents } from '@/services/activity/createActivity';

function getRequestIp(request: Request): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for');

  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || undefined;
  }

  return request.headers.get('x-real-ip')?.trim() || undefined;
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project')?.trim();

    if (!projectId) {
      return NextResponse.json(
        {
          success: false,
          message: 'project query parameter is required',
        },
        { status: 400 }
      );
    }

    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
      },
      select: {
        id: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        {
          success: false,
          message: 'Project not found',
        },
        { status: 404 }
      );
    }

    const body = await request.json();
    const events = parseActivityEvents(body);

    if (events.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'At least one activity event is required',
        },
        { status: 400 }
      );
    }

    const ip = getRequestIp(request);
    const userAgent = request.headers.get('user-agent')?.trim() || undefined;
    const activity = await createActivities(
      project.id,
      events.map((event) => ({
        ...event,
        ip: event.ip ?? ip,
        userAgent: event.userAgent ?? userAgent,
      }))
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Webhook activity recorded successfully',
        data: activity,
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to record webhook activity';

    const status =
      message.includes('required') || message.includes('JSON object')
        ? 400
        : 500;

    console.error('Activity webhook error:', error);

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      message: 'Not Found',
    },
    { status: 404 }
  );
}

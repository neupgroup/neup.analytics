import { NextResponse } from "next/server";
import { prisma } from "@/core/database/prisma";
import { createActivity } from "@/services/activity/createActivity";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.identifierId) {
      return NextResponse.json(
        {
          success: false,
          message: "identifierId is required",
        },
        { status: 400 }
      );
    }

    if (!body.token) {
      return NextResponse.json(
        {
          success: false,
          message: "token is required",
        },
        { status: 400 }
      );
    }

    if (!body.pageUrl) {
      return NextResponse.json(
        {
          success: false,
          message: "pageUrl is required",
        },
        { status: 400 }
      );
    }

    const project = await prisma.project.findUnique({
      where: {
        token: String(body.token),
      },
      select: {
        id: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid project token",
        },
        { status: 404 }
      );
    }

    const activity = await createActivity({
      identifierId: String(body.identifierId),
      projectId: project.id,
      ip: body.ip,
      userAgent: body.userAgent,
      pageUrl: String(body.pageUrl),
      referral: body.referral,
    });

    return NextResponse.json({
      success: true,
      message: "Activity created successfully",
      data: activity,
    });
  } catch (error) {
    console.error("Activity API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create activity",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      message: "Not Found",
    },
    { status: 404 }
  );
}
import { NextResponse } from "next/server";
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

    if (!body.pageUrl) {
      return NextResponse.json(
        {
          success: false,
          message: "pageUrl is required",
        },
        { status: 400 }
      );
    }

    const activity = await createActivity({
      identifierId: body.identifierId,
      ip: body.ip,
      userAgent: body.userAgent,
      pageUrl: body.pageUrl,
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
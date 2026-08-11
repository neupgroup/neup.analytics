import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    success: true,
    message: "Activity API is working",
  });
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
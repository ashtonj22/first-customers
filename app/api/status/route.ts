import { NextResponse } from "next/server";
import { isLiveMode } from "@/lib/anthropic";

export async function GET() {
  return NextResponse.json({ live: isLiveMode() });
}

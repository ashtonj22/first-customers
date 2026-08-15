import { NextResponse } from "next/server";
import { getActivity } from "@/lib/store";

export async function GET() {
  const activity = getActivity();
  const sorted = [...activity].sort((a, b) => b.timestamp - a.timestamp);
  return NextResponse.json({ activity: sorted });
}

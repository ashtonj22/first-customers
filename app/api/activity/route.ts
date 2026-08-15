import { NextResponse } from "next/server";
import { getActivity } from "@/lib/store";
import { withStore } from "@/lib/state";

async function handleGET() {
  const activity = getActivity();
  const sorted = [...activity].sort((a, b) => b.timestamp - a.timestamp);
  return NextResponse.json({ activity: sorted });
}

export const GET = withStore(handleGET);

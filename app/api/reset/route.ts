import { NextResponse } from "next/server";
import { resetAllData } from "@/lib/store";
import { withStore } from "@/lib/state";

async function handlePOST() {
  resetAllData();
  return NextResponse.json({ ok: true });
}

export const POST = withStore(handlePOST);

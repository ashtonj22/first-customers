import { NextResponse } from "next/server";
import { resetAllData } from "@/lib/store";

export async function POST() {
  resetAllData();
  return NextResponse.json({ ok: true });
}

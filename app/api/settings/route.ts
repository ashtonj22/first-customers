import { NextResponse } from "next/server";
import { getSettings, saveSettings, appendActivity, makeId } from "@/lib/store";

export async function GET() {
  return NextResponse.json({ settings: getSettings() });
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const current = getSettings();
  const updated = { ...current, ...body };
  saveSettings(updated);

  appendActivity({
    id: makeId("act"),
    timestamp: Date.now(),
    actor: "user",
    action: "settings_changed",
    target: "guardrails",
    reasoning: `Settings updated: ${Object.keys(body).join(", ")}`,
    outcome: null,
    learned: null,
  });

  return NextResponse.json({ settings: updated });
}

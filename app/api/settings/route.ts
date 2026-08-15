import { NextResponse } from "next/server";
import { getSettings, saveSettings, appendActivity, makeId } from "@/lib/store";
import { withStore } from "@/lib/state";

async function handleGET() {
  return NextResponse.json({ settings: getSettings() });
}

async function handlePATCH(req: Request) {
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

export const GET = withStore(handleGET);
export const PATCH = withStore(handlePATCH);

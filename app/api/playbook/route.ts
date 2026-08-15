import { NextResponse } from "next/server";
import { getPlaybook, savePlaybook, appendActivity, makeId } from "@/lib/store";
import type { Playbook } from "@/lib/types";
import { withStore } from "@/lib/state";

async function handleGET() {
  return NextResponse.json({ playbook: getPlaybook() });
}

type Section = "globalRules" | "tierRules.close" | "tierRules.warm" | "tierRules.acquaintance" | "timing" | "askStyle";

function getSectionArray(pb: Playbook, section: Section): string[] {
  if (section.startsWith("tierRules.")) {
    const tier = section.split(".")[1] as "close" | "warm" | "acquaintance";
    return pb.tierRules[tier];
  }
  return pb[section as "globalRules" | "timing" | "askStyle"];
}

function setSectionArray(pb: Playbook, section: Section, arr: string[]) {
  if (section.startsWith("tierRules.")) {
    const tier = section.split(".")[1] as "close" | "warm" | "acquaintance";
    pb.tierRules[tier] = arr;
  } else {
    (pb as unknown as Record<string, string[]>)[section] = arr;
  }
}

async function handlePATCH(req: Request) {
  const body = await req.json();
  const { action, section, index, value } = body as {
    action: "add" | "edit" | "delete";
    section: Section;
    index?: number;
    value?: string;
  };

  const playbook = getPlaybook();
  const arr = [...getSectionArray(playbook, section)];

  if (action === "add" && value) {
    arr.push(value);
  } else if (action === "edit" && typeof index === "number" && value) {
    arr[index] = value;
  } else if (action === "delete" && typeof index === "number") {
    arr.splice(index, 1);
  } else {
    return NextResponse.json({ error: "Invalid patch" }, { status: 400 });
  }

  setSectionArray(playbook, section, arr);
  savePlaybook(playbook);

  appendActivity({
    id: makeId("act"),
    timestamp: Date.now(),
    actor: "user",
    action: `manual_playbook_${action}`,
    target: section,
    reasoning: `Maya manually ${action}ed a rule in ${section}.`,
    outcome: null,
    learned: null,
  });

  return NextResponse.json({ playbook });
}

export const GET = withStore(handleGET);
export const PATCH = withStore(handlePATCH);

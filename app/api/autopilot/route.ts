import { NextResponse } from "next/server";
import {
  getContacts,
  getSettings,
  getActivity,
  getPlaybook,
  savePlaybook,
  appendActivity,
  appendMessage,
  updateContact,
  makeId,
} from "@/lib/store";
import { canAutopilotSend, countTodaysAutopilotSends } from "@/lib/guardrails";
import { draftMessage } from "@/lib/draft";
import { simulateReply } from "@/lib/simulate";
import { reflect } from "@/lib/reflect";
import type { ContactStatus } from "@/lib/types";

export async function POST() {
  const settings = getSettings();
  const contacts = getContacts();
  const activity = getActivity();
  let todaysSends = countTodaysAutopilotSends(activity);

  const results: Array<{ contact: string; decision: string; reason: string }> = [];

  if (settings.paused || settings.mode !== "autopilot") {
    appendActivity({
      id: makeId("act"),
      timestamp: Date.now(),
      actor: "autopilot",
      action: "cycle_skipped",
      target: "all",
      reasoning: settings.paused ? "Autopilot cycle requested but agent is paused." : "Autopilot cycle requested but mode is set to propose.",
      outcome: null,
      learned: null,
    });
    return NextResponse.json({ results, ran: false });
  }

  const eligible = contacts.filter((c) => c.status === "replied");

  for (const contact of eligible) {
    const decision = canAutopilotSend(contact, settings, todaysSends);
    if (!decision.allowed) {
      appendActivity({
        id: makeId("act"),
        timestamp: Date.now(),
        actor: "autopilot",
        action: "deferred_to_human",
        target: contact.name,
        reasoning: decision.reason,
        outcome: null,
        learned: null,
      });
      results.push({ contact: contact.name, decision: "deferred", reason: decision.reason });
      continue;
    }

    // draft + send the follow-up automatically
    const playbook = getPlaybook();
    const draft = await draftMessage(contact, playbook, { isFollowUp: true });

    appendMessage(contact.id, {
      id: makeId("msg"),
      sender: "agent",
      text: draft.message,
      timestamp: Date.now(),
    });

    appendActivity({
      id: makeId("act"),
      timestamp: Date.now(),
      actor: "autopilot",
      action: "auto_sent",
      target: contact.name,
      reasoning: `${decision.reason} Draft: "${draft.message}"`,
      outcome: null,
      learned: null,
    });
    todaysSends += 1;

    const sim = await simulateReply(contact, draft.message);
    let newStatus: ContactStatus = "sent";
    switch (sim.outcome) {
      case "purchase":
        newStatus = "customer";
        break;
      case "opt_out":
        newStatus = "opted_out";
        break;
      case "reply":
      case "meeting":
        newStatus = "replied";
        break;
      default:
        newStatus = "sent";
    }
    if (contact.status === "customer" && sim.outcome !== "opt_out") {
      newStatus = "customer";
    }
    updateContact(contact.id, { status: newStatus });

    if (sim.reply) {
      appendMessage(contact.id, {
        id: makeId("msg"),
        sender: "contact",
        text: sim.reply,
        timestamp: Date.now() + 1500,
      });
    }

    appendActivity({
      id: makeId("act"),
      timestamp: Date.now() + 1,
      actor: "agent",
      action: "outcome",
      target: contact.name,
      reasoning: `Autopilot follow-up outcome: ${sim.outcome}`,
      outcome: sim.outcome,
      learned: null,
    });

    const pb2 = getPlaybook();
    const reflection = await reflect({
      trigger: "outcome",
      contact,
      playbook: pb2,
      outcome: sim.outcome,
      sentMessage: draft.message,
    });
    savePlaybook(reflection.playbook);

    results.push({ contact: contact.name, decision: "sent", reason: decision.reason });
  }

  return NextResponse.json({ results, ran: true });
}

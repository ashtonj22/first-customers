import { NextResponse } from "next/server";
import {
  getContact,
  getPlaybook,
  savePlaybook,
  appendActivity,
  appendMessage,
  updateContact,
  addContact,
  makeId,
} from "@/lib/store";
import { simulateReply } from "@/lib/simulate";
import { reflect } from "@/lib/reflect";
import type { Contact, ContactStatus } from "@/lib/types";
import { withStore } from "@/lib/state";

async function handlePOST(req: Request) {
  const body = await req.json();
  const { contactId, message, askType, reasoning, actor } = body as {
    contactId: string;
    message: string;
    askType: string;
    reasoning?: string;
    actor?: "user" | "autopilot";
  };

  const contact = getContact(contactId);
  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }
  const sendingActor = actor === "autopilot" ? "autopilot" : "user";

  // 1. record the outgoing message
  appendMessage(contactId, {
    id: makeId("msg"),
    sender: "agent",
    text: message,
    timestamp: Date.now(),
  });

  appendActivity({
    id: makeId("act"),
    timestamp: Date.now(),
    actor: sendingActor,
    action: sendingActor === "autopilot" ? "auto_sent" : "approved_send",
    target: contact.name,
    reasoning: reasoning || `Approved and sent (${askType} ask).`,
    outcome: null,
    learned: null,
  });

  // 2. simulate the contact's reaction
  const sim = await simulateReply(contact, message);

  let newStatus: ContactStatus = "sent";
  let newContactRecord: Contact | null = null;

  switch (sim.outcome) {
    case "purchase":
      newStatus = "customer";
      break;
    case "opt_out":
      newStatus = "opted_out";
      break;
    case "referral":
      newStatus = "referred_out";
      if (sim.referral) {
        newContactRecord = {
          id: makeId("c"),
          name: sim.referral.name,
          relationship: `intro from ${contact.name}`,
          closenessTier: "warm",
          lastContactDaysAgo: 0,
          notes: `Intro from ${contact.name} — ${sim.referral.context}`,
          status: "not_contacted",
          referredBy: contact.name,
          personaTraits: {
            responsiveness: 0.7,
            productInterest: 0.65,
            tonePreference: "warm",
            referralLikelihood: 0.2,
            quirk: "New warm intro — no track record yet.",
          },
        };
        addContact(newContactRecord);
      }
      break;
    case "reply":
    case "meeting":
      newStatus = "replied";
      break;
    case "silence":
      newStatus = "sent";
      break;
  }

  // A customer stays a customer — later outcomes (referral, reply, silence)
  // must not erase the purchase; only an explicit opt-out can.
  if (contact.status === "customer" && sim.outcome !== "opt_out") {
    newStatus = "customer";
  }
  updateContact(contactId, { status: newStatus });

  if (sim.reply) {
    appendMessage(contactId, {
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
    reasoning: `Simulated outcome: ${sim.outcome}${sim.reply ? ` — "${sim.reply}"` : " (no reply)"}`,
    outcome: sim.outcome,
    learned: null,
  });

  // 3. reflect on the outcome to keep the playbook current
  const playbook = getPlaybook();
  const reflection = await reflect({
    trigger: "outcome",
    contact,
    playbook,
    outcome: sim.outcome,
    sentMessage: message,
  });
  savePlaybook(reflection.playbook);

  appendActivity({
    id: makeId("act"),
    timestamp: Date.now() + 2,
    actor: "agent",
    action: "learned",
    target: contact.name,
    reasoning: reflection.changelogEntry.insight,
    outcome: sim.outcome,
    learned: reflection.changelogEntry.insight,
  });

  return NextResponse.json({
    sim,
    contactStatus: newStatus,
    newContact: newContactRecord,
    playbook: reflection.playbook,
    changelogEntry: reflection.changelogEntry,
  });
}

export const POST = withStore(handlePOST);

import { NextResponse } from "next/server";
import { getContact, getPlaybook, getMessages, appendActivity, makeId, updateContact } from "@/lib/store";
import { draftMessage } from "@/lib/draft";

export async function POST(req: Request) {
  const body = await req.json();
  const { contactId, followUp } = body as { contactId: string; followUp?: boolean };

  const contact = getContact(contactId);
  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }
  const playbook = getPlaybook();

  const thread = getMessages()[contactId] ?? [];
  const isFollowUp = !!followUp || contact.status === "replied";
  const priorReply = isFollowUp
    ? [...thread].reverse().find((m) => m.sender === "contact")?.text
    : undefined;
  const draft = await draftMessage(contact, playbook, { isFollowUp, priorReply });

  if (contact.status === "not_contacted") {
    updateContact(contactId, { status: "proposed" });
  }

  appendActivity({
    id: makeId("act"),
    timestamp: Date.now(),
    actor: "agent",
    action: isFollowUp ? "proposed_followup" : "proposed",
    target: contact.name,
    reasoning: draft.reasoning,
    outcome: null,
    learned: null,
  });

  return NextResponse.json({ draft, contact });
}

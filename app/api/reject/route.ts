import { NextResponse } from "next/server";
import { getContact, getPlaybook, savePlaybook, appendActivity, makeId } from "@/lib/store";
import { reflect } from "@/lib/reflect";
import { withStore } from "@/lib/state";

async function handlePOST(req: Request) {
  const body = await req.json();
  const { contactId, message, reason, followUp } = body as {
    contactId: string;
    message: string;
    reason: string;
    followUp?: boolean;
  };

  const contact = getContact(contactId);
  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }
  if (!reason || !reason.trim()) {
    return NextResponse.json({ error: "A reason is required to reject." }, { status: 400 });
  }

  appendActivity({
    id: makeId("act"),
    timestamp: Date.now(),
    actor: "user",
    action: "rejected",
    target: contact.name,
    reasoning: reason,
    outcome: null,
    learned: null,
  });

  const playbook = getPlaybook();
  const reflection = await reflect({
    trigger: "rejection",
    contact,
    playbook,
    isFollowUp: !!followUp,
    reason,
    rejectedMessage: message,
  });
  savePlaybook(reflection.playbook);

  appendActivity({
    id: makeId("act"),
    timestamp: Date.now() + 1,
    actor: "agent",
    action: "learned",
    target: contact.name,
    reasoning: reflection.changelogEntry.insight,
    outcome: null,
    learned: reflection.changelogEntry.insight,
  });

  return NextResponse.json({ playbook: reflection.playbook, changelogEntry: reflection.changelogEntry });
}

export const POST = withStore(handlePOST);

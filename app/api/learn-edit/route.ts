import { NextResponse } from "next/server";
import { getContact, getPlaybook, savePlaybook, appendActivity, makeId } from "@/lib/store";
import { reflect } from "@/lib/reflect";
import { withStore } from "@/lib/state";

async function handlePOST(req: Request) {
  const body = await req.json();
  const { contactId, oldMessage, newMessage } = body as {
    contactId: string;
    oldMessage: string;
    newMessage: string;
  };

  const contact = getContact(contactId);
  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }
  if (oldMessage.trim() === newMessage.trim()) {
    return NextResponse.json({ playbook: getPlaybook(), changelogEntry: null, noChange: true });
  }

  appendActivity({
    id: makeId("act"),
    timestamp: Date.now(),
    actor: "user",
    action: "edited",
    target: contact.name,
    reasoning: `Edited draft before sending (diff captured).`,
    outcome: null,
    learned: null,
  });

  const playbook = getPlaybook();
  const reflection = await reflect({
    trigger: "edit",
    contact,
    playbook,
    oldMessage,
    newMessage,
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

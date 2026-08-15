import { NextResponse } from "next/server";
import { getMessages, getContacts } from "@/lib/store";
import { withStore } from "@/lib/state";

async function handleGET() {
  const messages = getMessages();
  const contacts = getContacts();
  return NextResponse.json({ messages, contacts });
}

export const GET = withStore(handleGET);

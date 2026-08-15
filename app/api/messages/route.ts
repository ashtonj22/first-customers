import { NextResponse } from "next/server";
import { getMessages, getContacts } from "@/lib/store";

export async function GET() {
  const messages = getMessages();
  const contacts = getContacts();
  return NextResponse.json({ messages, contacts });
}

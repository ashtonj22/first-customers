import { NextResponse } from "next/server";
import { getContacts } from "@/lib/store";
import { rankContacts } from "@/lib/scoring";
import { withStore } from "@/lib/state";

async function handleGET() {
  const contacts = getContacts();
  const ranked = rankContacts(contacts);
  return NextResponse.json({ contacts, ranked });
}

export const GET = withStore(handleGET);

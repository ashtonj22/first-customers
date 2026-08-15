import { NextResponse } from "next/server";
import { getContacts } from "@/lib/store";
import { rankContacts } from "@/lib/scoring";

export async function GET() {
  const contacts = getContacts();
  const ranked = rankContacts(contacts);
  return NextResponse.json({ contacts, ranked });
}

import fs from "fs";
import path from "path";
import type {
  Contact,
  Playbook,
  Settings,
  ActivityEntry,
  MessagesStore,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const SEEDS_DIR = path.join(DATA_DIR, "seeds");

function readJSON<T>(file: string): T {
  const p = path.join(DATA_DIR, file);
  const raw = fs.readFileSync(p, "utf-8");
  return JSON.parse(raw) as T;
}

function writeJSON<T>(file: string, data: T): void {
  const p = path.join(DATA_DIR, file);
  fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf-8");
}

export function getContacts(): Contact[] {
  return readJSON<Contact[]>("contacts.json");
}

export function saveContacts(contacts: Contact[]): void {
  writeJSON("contacts.json", contacts);
}

export function getContact(id: string): Contact | undefined {
  return getContacts().find((c) => c.id === id);
}

export function updateContact(id: string, patch: Partial<Contact>): Contact | undefined {
  const contacts = getContacts();
  const idx = contacts.findIndex((c) => c.id === id);
  if (idx === -1) return undefined;
  contacts[idx] = { ...contacts[idx], ...patch };
  saveContacts(contacts);
  return contacts[idx];
}

export function addContact(contact: Contact): void {
  const contacts = getContacts();
  contacts.push(contact);
  saveContacts(contacts);
}

export function getPlaybook(): Playbook {
  return readJSON<Playbook>("playbook.json");
}

export function savePlaybook(playbook: Playbook): void {
  writeJSON("playbook.json", playbook);
}

export function getSettings(): Settings {
  return readJSON<Settings>("settings.json");
}

export function saveSettings(settings: Settings): void {
  writeJSON("settings.json", settings);
}

export function getActivity(): ActivityEntry[] {
  return readJSON<ActivityEntry[]>("activity.json");
}

export function appendActivity(entry: ActivityEntry): void {
  const activity = getActivity();
  activity.push(entry);
  writeJSON("activity.json", activity);
}

export function getMessages(): MessagesStore {
  return readJSON<MessagesStore>("messages.json");
}

export function saveMessages(store: MessagesStore): void {
  writeJSON("messages.json", store);
}

export function appendMessage(
  contactId: string,
  message: { id: string; sender: "agent" | "contact"; text: string; timestamp: number },
): void {
  const store = getMessages();
  if (!store[contactId]) store[contactId] = [];
  store[contactId].push(message);
  saveMessages(store);
}

export function resetAllData(): void {
  const files = [
    "contacts.json",
    "playbook.json",
    "settings.json",
    "activity.json",
    "messages.json",
  ];
  for (const file of files) {
    const seedPath = path.join(SEEDS_DIR, file);
    const raw = fs.readFileSync(seedPath, "utf-8");
    fs.writeFileSync(path.join(DATA_DIR, file), raw, "utf-8");
  }
}

export function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

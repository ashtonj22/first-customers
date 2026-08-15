import { currentState, markDirty, replaceState, freshState } from "./state";
import type {
  Contact,
  Playbook,
  Settings,
  ActivityEntry,
  MessagesStore,
} from "./types";

/**
 * These accessors stay synchronous on purpose. `withStore` loads the whole
 * document before the handler runs and writes it back afterwards, so reads and
 * writes here are just in-memory operations on the request's state.
 */

export function getContacts(): Contact[] {
  return currentState().contacts;
}

export function saveContacts(contacts: Contact[]): void {
  currentState().contacts = contacts;
  markDirty();
}

export function getContact(id: string): Contact | undefined {
  return getContacts().find((c) => c.id === id);
}

export function updateContact(id: string, patch: Partial<Contact>): Contact | undefined {
  const contacts = getContacts();
  const idx = contacts.findIndex((c) => c.id === id);
  if (idx === -1) return undefined;
  contacts[idx] = { ...contacts[idx], ...patch };
  markDirty();
  return contacts[idx];
}

export function addContact(contact: Contact): void {
  getContacts().push(contact);
  markDirty();
}

export function getPlaybook(): Playbook {
  return currentState().playbook;
}

export function savePlaybook(playbook: Playbook): void {
  currentState().playbook = playbook;
  markDirty();
}

export function getSettings(): Settings {
  return currentState().settings;
}

export function saveSettings(settings: Settings): void {
  currentState().settings = settings;
  markDirty();
}

export function getActivity(): ActivityEntry[] {
  return currentState().activity;
}

export function appendActivity(entry: ActivityEntry): void {
  getActivity().push(entry);
  markDirty();
}

export function getMessages(): MessagesStore {
  return currentState().messages;
}

export function saveMessages(store: MessagesStore): void {
  currentState().messages = store;
  markDirty();
}

export function appendMessage(
  contactId: string,
  message: { id: string; sender: "agent" | "contact"; text: string; timestamp: number },
): void {
  const store = getMessages();
  if (!store[contactId]) store[contactId] = [];
  store[contactId].push(message);
  markDirty();
}

export function resetAllData(): void {
  replaceState(freshState());
}

export function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

import { AsyncLocalStorage } from "node:async_hooks";
import fs from "fs";
import path from "path";
import { cookies } from "next/headers";
import { get, put } from "@vercel/blob";
import type { Contact, Playbook, Settings, ActivityEntry, MessagesStore } from "./types";

import seedContacts from "@/data/seeds/contacts.json";
import seedPlaybook from "@/data/seeds/playbook.json";
import seedSettings from "@/data/seeds/settings.json";
import seedActivity from "@/data/seeds/activity.json";
import seedMessages from "@/data/seeds/messages.json";

export const SESSION_COOKIE = "fc_sid";

/**
 * The whole demo lives in one document. It is ~10KB, so a single read at the
 * start of a request and a single write at the end is cheaper — and far simpler
 * — than talking to a store per collection.
 */
export interface State {
  contacts: Contact[];
  playbook: Playbook;
  settings: Settings;
  activity: ActivityEntry[];
  messages: MessagesStore;
}

/** A clean demo, straight from the seeds. Cloned so callers can mutate freely. */
export function freshState(): State {
  return structuredClone({
    contacts: seedContacts,
    playbook: seedPlaybook,
    settings: seedSettings,
    activity: seedActivity,
    messages: seedMessages,
  }) as unknown as State;
}

/**
 * Sessions persisted before a playbook section existed are missing it entirely,
 * and every consumer maps over these arrays unguarded. Backfill on load so a
 * schema addition never breaks a visitor mid-demo.
 */
function normalizePlaybook(playbook: Playbook): Playbook {
  const stage = playbook.stageRules ?? { firstTouch: [], followUp: [] };
  playbook.stageRules = {
    firstTouch: Array.isArray(stage.firstTouch) ? stage.firstTouch : [],
    followUp: Array.isArray(stage.followUp) ? stage.followUp : [],
  };
  return playbook;
}

interface Backend {
  load(sessionId: string): Promise<State | null>;
  save(sessionId: string, state: State): Promise<void>;
}

/**
 * Local development: keep using the JSON files on disk, so the data stays
 * readable and hand-editable while building. Sessions do not apply here.
 */
const DATA_DIR = path.join(process.cwd(), "data");
const FILES: Record<keyof State, string> = {
  contacts: "contacts.json",
  playbook: "playbook.json",
  settings: "settings.json",
  activity: "activity.json",
  messages: "messages.json",
};

const fileBackend: Backend = {
  async load() {
    const state = {} as State;
    for (const key of Object.keys(FILES) as (keyof State)[]) {
      const p = path.join(DATA_DIR, FILES[key]);
      if (!fs.existsSync(p)) return null;
      state[key] = JSON.parse(fs.readFileSync(p, "utf-8"));
    }
    return state;
  },
  async save(_sessionId, state) {
    for (const key of Object.keys(FILES) as (keyof State)[]) {
      const p = path.join(DATA_DIR, FILES[key]);
      fs.writeFileSync(p, JSON.stringify(state[key], null, 2), "utf-8");
    }
  },
};

/**
 * Production: one private blob per visitor. Vercel gives deployed code a
 * read-only filesystem, so the file backend cannot be used there.
 */
const blobBackend: Backend = {
  async load(sessionId) {
    try {
      const result = await get(`sessions/${sessionId}.json`, {
        access: "private",
        // Without this we can read back a stale copy of a blob we just wrote.
        useCache: false,
      });
      if (!result || result.statusCode !== 200 || !result.stream) return null;
      return JSON.parse(await new Response(result.stream).text()) as State;
    } catch {
      // A missing blob is the normal first-visit case, not an error.
      return null;
    }
  },
  async save(sessionId, state) {
    await put(`sessions/${sessionId}.json`, JSON.stringify(state), {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
  },
};

/**
 * Last resort: if the app is deployed before a Blob store is attached, keep the
 * demo working in memory rather than crashing. State is per-instance and will
 * reset, which is why a Blob store is the supported setup.
 */
const memory = new Map<string, State>();
const memoryBackend: Backend = {
  async load(sessionId) {
    return memory.get(sessionId) ?? null;
  },
  async save(sessionId, state) {
    memory.set(sessionId, state);
  },
};

/**
 * Deployed: a blob per visitor, or memory if no store is attached yet.
 * Local: always the JSON files.
 *
 * The blob token has to be checked *inside* the deployed branch. Attaching a
 * Blob store also writes BLOB_READ_WRITE_TOKEN into `.env.local`, so a
 * token-first check silently moves local dev onto the blob backend — whose
 * `load()` treats every failure as "no blob yet" and restarts from the seeds.
 * The symptom is that nothing a developer does locally ever sticks, which reads
 * exactly like the agent refusing to learn.
 */
function pickBackend(): Backend {
  if (process.env.VERCEL) {
    return process.env.BLOB_READ_WRITE_TOKEN ? blobBackend : memoryBackend;
  }
  return fileBackend;
}

interface StoreContext {
  state: State;
  dirty: boolean;
}

const context = new AsyncLocalStorage<StoreContext>();

/** The state for the request in flight. Throws if called outside `withStore`. */
export function currentState(): State {
  const ctx = context.getStore();
  if (!ctx) {
    throw new Error("Store accessed outside of a withStore() request scope.");
  }
  return ctx.state;
}

/** Flag the request as needing a write. Read-only requests skip persistence. */
export function markDirty(): void {
  const ctx = context.getStore();
  if (ctx) ctx.dirty = true;
}

/** Replace the whole document, e.g. when resetting the demo. */
export function replaceState(next: State): void {
  const ctx = context.getStore();
  if (!ctx) {
    throw new Error("Store accessed outside of a withStore() request scope.");
  }
  ctx.state = next;
  ctx.dirty = true;
}

async function sessionId(): Promise<string> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value ?? "shared";
}

/**
 * Wraps a route handler so it loads state once up front and writes it back once
 * at the end, leaving every accessor in `store.ts` synchronous.
 */
export function withStore<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    const id = await sessionId();
    const backend = pickBackend();
    const state = (await backend.load(id)) ?? freshState();
    normalizePlaybook(state.playbook);
    const ctx: StoreContext = { state, dirty: false };

    return context.run(ctx, async () => {
      const response = await handler(...args);
      if (ctx.dirty) await backend.save(id, ctx.state);
      return response;
    });
  };
}

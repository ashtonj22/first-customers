"use client";

import { useEffect, useState } from "react";
import type { Contact, Draft, Message, MessagesStore } from "@/lib/types";

const STATUS_BADGE: Partial<Record<Contact["status"], { label: string; cls: string }>> = {
  customer: { label: "💜 Customer", cls: "bg-[#a585c8]/15 text-[#7d5ba0]" },
  referred_out: { label: "🔁 Referral", cls: "bg-accent/15 text-[#5a6e42]" },
  opted_out: { label: "🚫 Opted out", cls: "bg-destructive/15 text-destructive" },
  replied: { label: "Replied", cls: "bg-[#6fa085]/15 text-[#4a7d61]" },
};

// Every thread can continue except an explicit opt-out — respecting that
// is one of the agent's guardrails.
const FOLLOWABLE: Contact["status"][] = ["sent", "replied", "customer", "referred_out", "proposed"];

export default function Conversations({
  refreshKey,
  onDataChanged,
}: {
  refreshKey: number;
  onDataChanged: () => void;
}) {
  const [messages, setMessages] = useState<MessagesStore>({});
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [followDraft, setFollowDraft] = useState<Draft | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch("/api/messages")
      .then((r) => r.json())
      .then((data) => {
        setMessages(data.messages);
        setContacts(data.contacts);
      });
  }, [refreshKey]);

  const threaded = contacts.filter((c) => (messages[c.id]?.length ?? 0) > 0);
  const selected = threaded.find((c) => c.id === selectedId) ?? threaded[0] ?? null;
  const thread: Message[] = selected ? messages[selected.id] ?? [] : [];

  const draftFollowUp = async () => {
    if (!selected) return;
    setDrafting(true);
    setFollowDraft(null);
    try {
      const res = await fetch("/api/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: selected.id, followUp: true }),
      });
      const data = await res.json();
      setFollowDraft(data.draft);
    } finally {
      setDrafting(false);
    }
  };

  const sendFollowUp = async () => {
    if (!selected || !followDraft) return;
    setSending(true);
    try {
      await fetch("/api/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: selected.id,
          message: followDraft.message,
          askType: followDraft.askType,
          reasoning: followDraft.reasoning,
        }),
      });
      setFollowDraft(null);
    } finally {
      setSending(false);
      onDataChanged();
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <div className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Conversations
        </h2>
        {threaded.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No conversations yet — approve and send a draft to start one.
          </div>
        )}
        {threaded.map((c) => {
          const badge = STATUS_BADGE[c.status];
          return (
            <button
              key={c.id}
              onClick={() => {
                setSelectedId(c.id);
                setFollowDraft(null);
              }}
              className={`w-full rounded-lg border bg-card p-3 text-left text-sm transition-colors ${
                selected?.id === c.id
                  ? "border-accent ring-1 ring-accent"
                  : "border-border hover:border-input"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-foreground">{c.name}</span>
                {badge && (
                  <span className={`rounded-[2px] px-2 py-0.5 text-[10px] font-medium ${badge.cls}`}>
                    {badge.label}
                  </span>
                )}
              </div>
              <div className="mt-0.5 truncate text-xs text-muted-foreground">
                {messages[c.id]?.[messages[c.id].length - 1]?.text}
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-lg border border-sage-border bg-sage p-5">
        {!selected && (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            No conversation selected.
          </div>
        )}
        {selected && (
          <>
            <div className="mb-4 flex items-center justify-between border-b border-sage-border pb-3">
              <div>
                <div className="font-medium text-foreground">{selected.name}</div>
                <div className="text-xs text-muted-foreground">
                  {selected.relationship} · {selected.closenessTier} tier
                </div>
              </div>
              {STATUS_BADGE[selected.status] && (
                <span
                  className={`rounded-[2px] px-2.5 py-1 text-xs font-medium ${STATUS_BADGE[selected.status]!.cls}`}
                >
                  {STATUS_BADGE[selected.status]!.label}
                </span>
              )}
            </div>
            <div className="scrollbar-thin max-h-[28rem] space-y-2 overflow-y-auto pr-1">
              {thread.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.sender === "agent" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-[14px] leading-snug ${
                      m.sender === "agent"
                        ? "rounded-br-sm bg-accent text-white"
                        : "rounded-bl-sm bg-card text-foreground"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            {FOLLOWABLE.includes(selected.status) && (
              <div className="mt-4 border-t border-sage-border pt-3">
                {!followDraft && (
                  <button
                    onClick={draftFollowUp}
                    disabled={drafting}
                    className="rounded-[2px] border border-sage-border bg-card px-4 py-2 text-sm font-semibold text-sage-foreground hover:bg-muted disabled:opacity-50"
                  >
                    {drafting
                      ? "Drafting…"
                      : selected.status === "customer"
                        ? "Draft thank-you & referral ask"
                        : selected.status === "referred_out"
                          ? "Draft thank-you"
                          : "Draft follow-up"}
                  </button>
                )}
                {followDraft && (
                  <div className="space-y-2">
                    <div className="flex justify-end">
                      <div className="max-w-[75%] rounded-2xl rounded-br-sm border border-dashed border-sage-foreground/40 bg-card px-3.5 py-2 text-[14px] leading-snug text-foreground">
                        {followDraft.message}
                      </div>
                    </div>
                    <p className="text-right text-xs text-muted-foreground">{followDraft.reasoning}</p>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={sendFollowUp}
                        disabled={sending}
                        className="flex items-center gap-2 rounded-[2px] bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
                      >
                        {sending && (
                          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        )}
                        {sending ? "Sending…" : "Approve & Send"}
                      </button>
                      <button
                        onClick={() => setFollowDraft(null)}
                        disabled={sending}
                        className="rounded-[2px] border border-input bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"
                      >
                        Discard
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

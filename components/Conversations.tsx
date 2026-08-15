"use client";

import { useEffect, useState } from "react";
import type { Contact, Draft, Message, MessagesStore } from "@/lib/types";
import ProposeCard from "./ProposeCard";

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
  const [busyAction, setBusyAction] = useState<"approve" | "reject" | null>(null);
  const [learnedFlash, setLearnedFlash] = useState<string | null>(null);

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

  const draftFollowUp = async (contactId?: string) => {
    const id = contactId ?? selected?.id;
    if (!id) return;
    setDrafting(true);
    setFollowDraft(null);
    try {
      const res = await fetch("/api/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: id, followUp: true }),
      });
      const data = await res.json();
      setFollowDraft(data.draft);
    } finally {
      setDrafting(false);
    }
  };

  const handleApprove = async (message: string) => {
    if (!selected || !followDraft) return;
    setBusyAction("approve");
    try {
      await fetch("/api/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: selected.id,
          message,
          askType: followDraft.askType,
          reasoning: followDraft.reasoning,
        }),
      });
      setFollowDraft(null);
      setLearnedFlash(null);
    } finally {
      setBusyAction(null);
      onDataChanged();
    }
  };

  // Every draft in this tab is a reply inside an existing thread, so feedback
  // here is scoped to the follow-up stage and never rewrites first-touch rules.
  const handleReject = async (message: string, reason: string) => {
    if (!selected) return;
    const contactId = selected.id;
    setBusyAction("reject");
    try {
      const res = await fetch("/api/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, message, reason, followUp: true }),
      });
      const data = await res.json();
      setLearnedFlash(data.changelogEntry?.insight ?? null);
    } finally {
      setBusyAction(null);
      onDataChanged();
      // Redraft immediately so the corrected message appears without another
      // click — the point of rejecting is to see the lesson applied.
      await draftFollowUp(contactId);
    }
  };

  const handleLearnEdit = async (oldMessage: string, newMessage: string) => {
    if (!selected) return;
    try {
      const res = await fetch("/api/learn-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: selected.id,
          oldMessage,
          newMessage,
          followUp: true,
        }),
      });
      const data = await res.json();
      if (data.changelogEntry) setLearnedFlash(data.changelogEntry.insight);
      setFollowDraft((d) => (d ? { ...d, message: newMessage } : d));
    } finally {
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
                setLearnedFlash(null);
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
                {!followDraft && !drafting && (
                  <button
                    onClick={() => {
                      setLearnedFlash(null);
                      draftFollowUp();
                    }}
                    className="rounded-[2px] border border-sage-border bg-card px-4 py-2 text-sm font-semibold text-sage-foreground hover:bg-muted"
                  >
                    {selected.status === "customer"
                      ? "Draft thank-you & referral ask"
                      : selected.status === "referred_out"
                        ? "Draft thank-you"
                        : "Draft follow-up"}
                  </button>
                )}
                {drafting && (
                  <div className="flex items-center gap-2 rounded-lg border border-sage-border bg-card px-3 py-2 text-sm text-muted-foreground">
                    <span className="inline-block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
                    {learnedFlash
                      ? "Redrafting with the rule it just learned…"
                      : `Drafting a reply for ${selected.name}…`}
                  </div>
                )}
                {followDraft && !drafting && (
                  <ProposeCard
                    key={selected.id}
                    contact={selected}
                    draft={followDraft}
                    busyAction={busyAction}
                    learnedFlash={learnedFlash}
                    title={
                      selected.status === "customer" || selected.status === "referred_out"
                        ? `Thank-you: ${selected.name}`
                        : `Follow-up: ${selected.name}`
                    }
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onLearnEdit={handleLearnEdit}
                    onClose={() => {
                      setFollowDraft(null);
                      setLearnedFlash(null);
                    }}
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

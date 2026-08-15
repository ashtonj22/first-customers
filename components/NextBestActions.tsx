"use client";

import { useRef, useState } from "react";
import type { Contact, Draft, ScoreBreakdown } from "@/lib/types";
import ScoreBars from "./ScoreBars";
import ProposeCard from "./ProposeCard";

type RankedContact = Contact & { score: ScoreBreakdown };

export default function NextBestActions({
  ranked,
  onDataChanged,
  onGoToConversations,
}: {
  ranked: RankedContact[];
  onDataChanged: () => void;
  onGoToConversations: () => void;
}) {
  const [selected, setSelected] = useState<RankedContact | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [busyAction, setBusyAction] = useState<"approve" | "reject" | null>(null);
  const [learnedFlash, setLearnedFlash] = useState<string | null>(null);
  const [outcomeFlash, setOutcomeFlash] = useState<string | null>(null);
  // Guards against out-of-order responses: only the latest click's draft
  // may render, so the message always matches the highlighted contact.
  const activeRequest = useRef(0);

  const selectContact = async (contact: RankedContact) => {
    const requestId = ++activeRequest.current;
    setSelected(contact);
    setDraft(null);
    setLearnedFlash(null);
    setOutcomeFlash(null);
    setLoadingDraft(true);
    try {
      const res = await fetch("/api/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: contact.id }),
      });
      const data = await res.json();
      if (activeRequest.current === requestId) {
        setDraft(data.draft);
      }
    } finally {
      if (activeRequest.current === requestId) {
        setLoadingDraft(false);
        onDataChanged();
      }
    }
  };

  const handleApprove = async (message: string) => {
    if (!selected || !draft) return;
    setBusyAction("approve");
    setOutcomeFlash("Sending…");
    try {
      await fetch("/api/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: selected.id,
          message,
          askType: draft.askType,
          reasoning: draft.reasoning,
        }),
      });
      await new Promise((r) => setTimeout(r, 1200));
      // Don't reveal the outcome here — the reply lives in Conversations,
      // where the user is pointed next.
      setOutcomeFlash("sent");
    } finally {
      setBusyAction(null);
      onDataChanged();
    }
  };

  const handleReject = async (message: string, reason: string) => {
    if (!selected) return;
    setBusyAction("reject");
    try {
      const res = await fetch("/api/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: selected.id, message, reason }),
      });
      const data = await res.json();
      setLearnedFlash(data.changelogEntry?.insight ?? null);
      setDraft(null);
      setSelected(null);
    } finally {
      setBusyAction(null);
      onDataChanged();
    }
  };

  const handleLearnEdit = async (oldMessage: string, newMessage: string) => {
    if (!selected) return;
    try {
      const res = await fetch("/api/learn-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: selected.id, oldMessage, newMessage }),
      });
      const data = await res.json();
      if (data.changelogEntry) {
        setLearnedFlash(data.changelogEntry.insight);
      }
      setDraft((d) => (d ? { ...d, message: newMessage } : d));
    } finally {
      onDataChanged();
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Next best actions
        </h2>
        {ranked.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No open opportunities right now — everyone&apos;s been reached or is mid-conversation.
          </div>
        )}
        <div className="space-y-3">
          {ranked.map((c) => (
            <button
              key={c.id}
              onClick={() => selectContact(c)}
              className={`w-full rounded-lg border bg-card p-4 text-left transition-colors ${
                selected?.id === c.id
                  ? "border-accent ring-1 ring-accent"
                  : "border-border hover:border-input"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-foreground">{c.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.relationship} · {c.closenessTier} tier · last contact {c.lastContactDaysAgo}d ago
                    {c.referredBy && (
                      <span className="ml-1 text-[#5a6e42]">· via {c.referredBy} →</span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 rounded-[2px] bg-accent px-2.5 py-1 text-xs font-semibold text-[#f2f5e8]">
                  {c.score.total}
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{c.score.whyNow}</p>
              <div className="mt-3">
                <ScoreBars score={c.score} />
              </div>
              {c.status === "replied" && (
                <span className="mt-2 inline-block rounded-[2px] bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-[#5a6e42]">
                  Follow-up due — already replied
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Propose
        </h2>
        {!selected && (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Select a contact on the left to generate a draft.
          </div>
        )}
        {selected && loadingDraft && (
          <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Drafting a personal message for {selected.name}…
          </div>
        )}
        {selected && draft && !loadingDraft && (
          <>
            {outcomeFlash && outcomeFlash !== "sent" && (
              <div
                className={`fade-in-up mb-3 flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm text-white ${
                  busyAction === "approve" ? "animate-pulse" : ""
                }`}
              >
                {busyAction === "approve" && (
                  <span className="inline-block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                )}
                {outcomeFlash}
              </div>
            )}
            {outcomeFlash === "sent" && (
              <button
                onClick={onGoToConversations}
                className="fade-in-up mb-3 flex w-full items-center gap-2 rounded-lg border border-sage-border bg-sage px-3 py-2 text-left text-sm text-sage-foreground hover:brightness-[0.98]"
              >
                <span className="font-semibold">✓ Sent.</span>
                Follow their reply in the Conversations tab →
              </button>
            )}
            <ProposeCard
              key={selected.id}
              contact={selected}
              draft={draft}
              busyAction={busyAction}
              learnedFlash={learnedFlash}
              onApprove={handleApprove}
              onReject={handleReject}
              onLearnEdit={handleLearnEdit}
              onClose={() => {
                setSelected(null);
                setDraft(null);
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}

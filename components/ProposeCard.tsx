"use client";

import { useState } from "react";
import type { Contact, Draft } from "@/lib/types";
import RejectModal from "./RejectModal";

const ASK_LABEL: Record<string, string> = {
  direct: "Direct ask",
  referral: "Referral ask",
  both: "Direct + referral",
};

export default function ProposeCard({
  contact,
  draft,
  busyAction,
  learnedFlash,
  onApprove,
  onReject,
  onLearnEdit,
  onClose,
}: {
  contact: Contact;
  draft: Draft;
  busyAction: "approve" | "reject" | null;
  learnedFlash: string | null;
  onApprove: (message: string) => void;
  onReject: (message: string, reason: string) => void;
  onLearnEdit: (oldMessage: string, newMessage: string) => void;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(draft.message);
  const [showReject, setShowReject] = useState(false);
  const [savedEdit, setSavedEdit] = useState(false);

  const saveEdit = () => {
    if (text.trim() !== draft.message.trim()) {
      onLearnEdit(draft.message, text.trim());
      setSavedEdit(true);
      setTimeout(() => setSavedEdit(false), 2500);
    }
    setEditing(false);
  };

  return (
    <div className="fade-in-up rounded-lg border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold text-foreground">
            Propose: {contact.name}
          </div>
          <div className="text-xs text-muted-foreground">
            {contact.relationship} · {contact.closenessTier} tier
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-[2px] bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {ASK_LABEL[draft.askType] ?? draft.askType}
          </span>
          {draft.usedFallback && (
            <span className="rounded-[2px] bg-[#e8a060]/15 px-2 py-0.5 text-[11px] font-medium text-[#a8632e]">
              fallback draft
            </span>
          )}
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* iMessage-style bubble; editing expands to the full card width */}
      <div className="mt-4 flex justify-end">
        <div className={editing ? "w-full" : "max-w-[85%]"}>
          {editing ? (
            <textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={Math.max(8, Math.ceil(text.length / 60))}
              className="w-full rounded-lg bg-muted p-4 text-[15px] leading-relaxed text-foreground outline-none ring-1 ring-accent/40 focus:ring-2 focus:ring-accent"
            />
          ) : (
            <div className="rounded-2xl rounded-br-sm bg-accent px-4 py-2.5 text-[15px] leading-snug text-white">
              {text}
            </div>
          )}
        </div>
      </div>

      {savedEdit && (
        <div className="mt-2 flex justify-end">
          <span className="rounded-[2px] bg-sage/60 px-2 py-0.5 text-[11px] font-medium text-sage-foreground">
            Edit captured — agent learning from the diff
          </span>
        </div>
      )}

      <div className="mt-4 space-y-3">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Reasoning
          </div>
          <p className="mt-0.5 text-sm text-foreground/90">{draft.reasoning}</p>
        </div>

        {draft.evidence.length > 0 && (
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Evidence
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {draft.evidence.map((e, i) => (
                <span
                  key={i}
                  className="rounded-[2px] bg-muted px-2.5 py-1 text-xs text-foreground/90"
                >
                  {e}
                </span>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Expected effect
          </div>
          <p className="mt-0.5 text-sm text-foreground/90">{draft.expectedEffect}</p>
        </div>
      </div>

      {learnedFlash && (
        <div className="learned-flash mt-4 rounded-lg border border-sage-border bg-sage px-3 py-2 text-sm text-sage-foreground">
          <span className="font-semibold">Learned just now:</span> {learnedFlash}
        </div>
      )}

      {busyAction === "reject" && (
        <div className="mt-4 flex animate-pulse items-center gap-2 rounded-lg border border-sage-border bg-sage px-3 py-2 text-sm text-sage-foreground">
          <span className="inline-block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-sage-foreground/30 border-t-sage-foreground" />
          Learning from your feedback — updating the playbook…
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          disabled={busyAction !== null}
          onClick={() => onApprove(text.trim())}
          className="flex items-center gap-2 rounded-[2px] bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {busyAction === "approve" && (
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          )}
          {busyAction === "approve" ? "Sending…" : "Approve & Send"}
        </button>
        {editing ? (
          <button
            onClick={saveEdit}
            className="rounded-[2px] border border-accent text-accent px-4 py-2 text-sm font-semibold hover:bg-accent/10"
          >
            Save edit
          </button>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="rounded-[2px] border border-input px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
          >
            Edit
          </button>
        )}
        <button
          disabled={busyAction !== null}
          onClick={() => setShowReject(true)}
          className="rounded-[2px] border border-input px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"
        >
          {busyAction === "reject" ? "Learning…" : "Reject"}
        </button>
      </div>

      {showReject && (
        <RejectModal
          contactName={contact.name}
          onCancel={() => setShowReject(false)}
          onConfirm={(reason) => {
            setShowReject(false);
            onReject(text.trim(), reason);
          }}
        />
      )}
    </div>
  );
}

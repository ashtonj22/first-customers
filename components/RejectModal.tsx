"use client";

import { useState } from "react";

const PRESET_REASONS = [
  "Too salesy for how close we are",
  "Wrong timing right now",
  "Doesn't match this person's style",
  "Ask is too pushy",
  "Other",
];

export default function RejectModal({
  contactName,
  onCancel,
  onConfirm,
}: {
  contactName: string;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [preset, setPreset] = useState(PRESET_REASONS[0]);
  const [custom, setCustom] = useState("");

  const reason = preset === "Other" ? custom.trim() : preset;
  const canSubmit = reason.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="fade-in-up w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-xl">
        <h3 className="text-base font-semibold text-foreground">
          Why reject this draft for {contactName}?
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          A reason is required — the agent learns from it and updates its playbook.
        </p>

        <div className="mt-4 space-y-2">
          {PRESET_REASONS.map((r) => (
            <label
              key={r}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent/10"
            >
              <input
                type="radio"
                name="reason"
                value={r}
                checked={preset === r}
                onChange={() => setPreset(r)}
                className="accent-accent"
              />
              {r}
            </label>
          ))}
          {preset === "Other" && (
            <textarea
              autoFocus
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="Tell the agent what to fix…"
              className="w-full rounded-lg border border-input p-2 text-sm focus:border-accent focus:outline-none"
              rows={2}
            />
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-[2px] border border-input px-4 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            disabled={!canSubmit}
            onClick={() => onConfirm(reason)}
            className="rounded-[2px] bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-40"
          >
            Reject &amp; explain why
          </button>
        </div>
      </div>
    </div>
  );
}

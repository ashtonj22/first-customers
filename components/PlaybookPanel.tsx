"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangelogEntry, Playbook } from "@/lib/types";

type Section =
  | "globalRules"
  | "stageRules.firstTouch"
  | "stageRules.followUp"
  | "tierRules.close"
  | "tierRules.warm"
  | "tierRules.acquaintance"
  | "timing"
  | "askStyle";

const SECTIONS: { key: Section; label: string }[] = [
  { key: "globalRules", label: "Global rules" },
  { key: "stageRules.firstTouch", label: "First-touch rules" },
  { key: "stageRules.followUp", label: "Follow-up / reply rules" },
  { key: "tierRules.close", label: "Close tier" },
  { key: "tierRules.warm", label: "Warm tier" },
  { key: "tierRules.acquaintance", label: "Acquaintance tier" },
  { key: "timing", label: "Timing" },
  { key: "askStyle", label: "Ask style" },
];

function getSection(pb: Playbook, key: Section): string[] {
  if (key.startsWith("tierRules.")) {
    const tier = key.split(".")[1] as "close" | "warm" | "acquaintance";
    return pb.tierRules[tier];
  }
  if (key.startsWith("stageRules.")) {
    const stage = key.split(".")[1] as "firstTouch" | "followUp";
    // A session saved before this section existed has no stageRules at all.
    return pb.stageRules?.[stage] ?? [];
  }
  return pb[key as "globalRules" | "timing" | "askStyle"];
}

export default function PlaybookPanel({ refreshKey }: { refreshKey: number }) {
  const [playbook, setPlaybook] = useState<Playbook | null>(null);
  const [addingSection, setAddingSection] = useState<Section | null>(null);
  const [newRuleText, setNewRuleText] = useState("");
  const [editing, setEditing] = useState<{ section: Section; index: number } | null>(null);
  const [editText, setEditText] = useState("");
  const [flashEntry, setFlashEntry] = useState<ChangelogEntry | null>(null);
  const prevChangelogLen = useRef<number | null>(null);

  const load = () => {
    fetch("/api/playbook")
      .then((r) => r.json())
      .then((data: { playbook: Playbook }) => {
        const pb = data.playbook;
        if (prevChangelogLen.current !== null && pb.changelog.length > prevChangelogLen.current) {
          const latest = pb.changelog[pb.changelog.length - 1];
          if (latest.ruleChanged !== "none" && latest.trigger !== "seed") {
            setFlashEntry(latest);
            setTimeout(() => setFlashEntry(null), 6000);
          }
        }
        prevChangelogLen.current = pb.changelog.length;
        setPlaybook(pb);
      });
  };

  useEffect(load, [refreshKey]);

  if (!playbook) {
    return <div className="text-sm text-muted-foreground">Loading playbook…</div>;
  }

  const patch = async (body: { action: "add" | "edit" | "delete"; section: Section; index?: number; value?: string }) => {
    const res = await fetch("/api/playbook", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setPlaybook(data.playbook);
  };

  const reversedChangelog = [...playbook.changelog].reverse();

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Playbook — the agent&apos;s editable memory
        </h2>

        {flashEntry && (
          <div className="learned-flash fade-in-up rounded-lg border border-sage-border bg-sage p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-sage-foreground">
              Learned just now
            </div>
            <p className="mt-1 text-sm text-foreground">{flashEntry.insight}</p>
            {(flashEntry.before || flashEntry.after) && (
              <div className="mt-2 space-y-1 text-sm">
                {flashEntry.before && (
                  <div className="text-muted-foreground line-through decoration-destructive/50">
                    {flashEntry.before}
                  </div>
                )}
                {flashEntry.after && (
                  <div className="rounded-[2px] bg-card px-2 py-1 font-medium text-foreground ring-1 ring-sage-border">
                    {flashEntry.after}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {SECTIONS.map(({ key, label }) => {
          const rules = getSection(playbook, key);
          return (
            <div key={key} className="rounded-lg border border-border bg-card p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">{label}</h3>
                <button
                  onClick={() => {
                    setAddingSection(key);
                    setNewRuleText("");
                  }}
                  className="text-xs font-medium text-[#5a6e42] hover:underline"
                >
                  + Add rule
                </button>
              </div>
              <ul className="space-y-1.5">
                {rules.length === 0 && (
                  <li className="text-sm italic text-muted-foreground">No rules yet.</li>
                )}
                {rules.map((rule, idx) => (
                  <li
                    key={idx}
                    className="group flex items-start gap-2 rounded-[2px] px-2 py-1.5 text-sm text-foreground/90 hover:bg-muted"
                  >
                    {editing?.section === key && editing.index === idx ? (
                      <div className="flex flex-1 items-center gap-2">
                        <input
                          autoFocus
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="flex-1 rounded-[2px] border border-input px-2 py-1 text-sm focus:border-accent focus:outline-none"
                        />
                        <button
                          onClick={async () => {
                            await patch({ action: "edit", section: key, index: idx, value: editText });
                            setEditing(null);
                          }}
                          className="text-xs font-medium text-[#5a6e42]"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditing(null)}
                          className="text-xs text-muted-foreground"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1">{rule}</span>
                        <span className="hidden shrink-0 gap-2 group-hover:flex">
                          <button
                            onClick={() => {
                              setEditing({ section: key, index: idx });
                              setEditText(rule);
                            }}
                            className="text-xs text-muted-foreground hover:text-[#5a6e42]"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => patch({ action: "delete", section: key, index: idx })}
                            className="text-xs text-muted-foreground hover:text-destructive"
                          >
                            Delete
                          </button>
                        </span>
                      </>
                    )}
                  </li>
                ))}
              </ul>

              {addingSection === key && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    autoFocus
                    value={newRuleText}
                    onChange={(e) => setNewRuleText(e.target.value)}
                    placeholder="New rule…"
                    className="flex-1 rounded-[2px] border border-input px-2 py-1 text-sm focus:border-accent focus:outline-none"
                  />
                  <button
                    onClick={async () => {
                      if (!newRuleText.trim()) return;
                      await patch({ action: "add", section: key, value: newRuleText.trim() });
                      setAddingSection(null);
                    }}
                    className="text-xs font-medium text-[#5a6e42]"
                  >
                    Add
                  </button>
                  <button onClick={() => setAddingSection(null)} className="text-xs text-muted-foreground">
                    Cancel
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Changelog</h3>
        <div className="scrollbar-thin max-h-[36rem] space-y-3 overflow-y-auto pr-1">
          {reversedChangelog.map((entry) => (
            <div key={entry.id} className="border-b border-border pb-3 last:border-0">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="uppercase tracking-wide">{entry.trigger}</span>
                <span>
                  {entry.timestamp
                    ? new Date(entry.timestamp).toLocaleTimeString()
                    : "seed"}
                </span>
              </div>
              <p className="mt-1 text-sm text-foreground/90">{entry.insight}</p>
              {entry.before && (
                <p className="mt-1 text-xs text-muted-foreground line-through">{entry.before}</p>
              )}
              {entry.after && (
                <p className="mt-0.5 text-xs font-medium text-foreground">{entry.after}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

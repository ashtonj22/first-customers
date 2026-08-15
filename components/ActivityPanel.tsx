"use client";

import { useEffect, useState } from "react";
import type { ActivityEntry, ActorType } from "@/lib/types";

const ACTOR_ICON: Record<ActorType, string> = {
  agent: "🤖",
  user: "🧑",
  autopilot: "⚡",
};

const ACTOR_LABEL: Record<ActorType, string> = {
  agent: "Agent",
  user: "Maya",
  autopilot: "Autopilot",
};

export default function ActivityPanel({ refreshKey }: { refreshKey: number }) {
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [filter, setFilter] = useState<ActorType | "all">("all");

  useEffect(() => {
    fetch("/api/activity")
      .then((r) => r.json())
      .then((data) => setActivity(data.activity));
  }, [refreshKey]);

  const filtered = filter === "all" ? activity : activity.filter((a) => a.actor === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Activity trail
        </h2>
        <div className="flex items-center gap-1 rounded-[2px] bg-muted p-1 text-xs">
          {(["all", "agent", "user", "autopilot"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-[2px] px-2.5 py-1 font-medium capitalize transition-colors ${
                filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? "All" : ACTOR_LABEL[f]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nothing here yet.
          </div>
        )}
        {filtered.map((entry) => (
          <div
            key={entry.id}
            className="flex gap-3 rounded-lg border border-border bg-card p-3"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm">
              {ACTOR_ICON[entry.actor]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <span className="font-medium text-foreground">
                  {ACTOR_LABEL[entry.actor]}
                </span>
                <span className="text-muted-foreground">{entry.action.replace(/_/g, " ")}</span>
                <span className="text-muted-foreground">→</span>
                <span className="font-medium text-foreground/80">{entry.target}</span>
                <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">{entry.reasoning}</p>
              {entry.learned && (
                <p className="mt-1 rounded-[2px] bg-sage px-2 py-1 text-xs text-sage-foreground">
                  Learned: {entry.learned}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

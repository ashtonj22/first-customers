"use client";

import { useState } from "react";
import type { Settings } from "@/lib/types";

export default function Header({
  settings,
  live,
  onSettingsChange,
  onReset,
  onRunAutopilot,
}: {
  settings: Settings | null;
  live: boolean;
  onSettingsChange: (patch: Partial<Settings>) => void;
  onReset: () => void;
  onRunAutopilot: () => void;
}) {
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    if (!confirm("Reset the demo? This restores all seed data.")) return;
    setResetting(true);
    await onReset();
    setResetting(false);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-baseline gap-3">
          <h1 className="font-serif text-xl font-normal tracking-tight text-foreground">
            First Customers
          </h1>
          <span className="rounded-[2px] bg-sage px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-sage-foreground">
            Marketing
          </span>
          <span className="text-sm text-muted-foreground">
            an AI employee for <em className="font-serif italic">Ember &amp; Oak</em>
          </span>
          <span
            className={`ml-1 rounded-[2px] px-2 py-0.5 text-xs font-medium ${
              live
                ? "bg-[#6fa085]/15 text-[#4a7d61]"
                : "bg-[#e8a060]/15 text-[#a8632e]"
            }`}
            title={
              live
                ? "Connected to Claude — live drafts, simulations, and reflection."
                : "No ANTHROPIC_API_KEY detected — running on deterministic fallback logic."
            }
          >
            {live ? "● live" : "● fallback mode"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {settings && (
            <>
              <div className="flex items-center gap-1 rounded-[2px] bg-muted p-1 text-sm">
                {(["propose", "autopilot"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      onSettingsChange({ mode: m });
                      if (m === "autopilot") onRunAutopilot();
                    }}
                    className={`rounded-[2px] px-3 py-1 font-medium capitalize transition-colors ${
                      settings.mode === m
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <label className="flex items-center gap-2 text-sm text-foreground">
                <span className="hidden sm:inline">Pause</span>
                <button
                  role="switch"
                  aria-checked={settings.paused}
                  onClick={() => onSettingsChange({ paused: !settings.paused })}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    settings.paused ? "bg-accent" : "bg-muted"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-card shadow transition-transform ${
                      settings.paused ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </label>
            </>
          )}

          <button
            onClick={handleReset}
            disabled={resetting}
            className="rounded-[2px] border border-input px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
          >
            {resetting ? "Resetting…" : "Reset demo"}
          </button>
        </div>
      </div>
    </header>
  );
}

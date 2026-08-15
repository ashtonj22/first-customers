"use client";

import { useState } from "react";
import type { ClosenessTier, Settings } from "@/lib/types";
import type { AutopilotRunResult } from "@/app/page";

const TIERS: ClosenessTier[] = ["close", "warm", "acquaintance"];

export default function AutopilotBar({
  settings,
  onSettingsChange,
  onRunNow,
  onGoToActivity,
}: {
  settings: Settings;
  onSettingsChange: (patch: Partial<Settings>) => void;
  onRunNow: () => Promise<AutopilotRunResult>;
  onGoToActivity: () => void;
}) {
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);

  const runNow = async () => {
    setRunning(true);
    setLastRun(null);
    try {
      const data = await onRunNow();
      if (!data.ran) {
        setLastRun("Cycle skipped — autopilot is paused or off.");
      } else {
        const sent = data.results.filter((r) => r.decision === "sent").length;
        const deferred = data.results.filter((r) => r.decision === "deferred").length;
        if (sent === 0 && deferred === 0) {
          setLastRun(
            "Cycle complete — nothing eligible right now. Autopilot only follow-ups with contacts who already replied, in the allowed tiers.",
          );
        } else {
          const parts = [];
          if (sent) parts.push(`sent ${sent} follow-up${sent > 1 ? "s" : ""}`);
          if (deferred) parts.push(`deferred ${deferred} to you for approval`);
          setLastRun(`Cycle complete — ${parts.join(", ")}.`);
        }
      }
    } finally {
      setRunning(false);
    }
  };

  const toggleTier = (tier: ClosenessTier) => {
    const has = settings.allowedTiers.includes(tier);
    const next = has
      ? settings.allowedTiers.filter((t) => t !== tier)
      : [...settings.allowedTiers, tier];
    onSettingsChange({ allowedTiers: next });
  };

  return (
    <div className="mx-auto mt-4 flex max-w-6xl flex-wrap items-center gap-4 rounded-lg border border-border bg-muted px-5 py-3 text-sm">
      <span className="font-semibold text-foreground">⚡ Autopilot armed</span>
      <span className="text-muted-foreground">
        Only sends follow-ups to contacts who already replied positively. First-touch, referral first-touch, and close-tier always require approval.
      </span>
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-foreground">Tiers:</span>
        {TIERS.map((t) => (
          <label
            key={t}
            className="flex items-center gap-1 text-xs text-foreground"
          >
            <input
              type="checkbox"
              disabled={t === "close"}
              checked={t === "close" ? false : settings.allowedTiers.includes(t)}
              onChange={() => toggleTier(t)}
              className="accent-accent"
            />
            {t}
            {t === "close" && <span className="text-muted-foreground">(locked)</span>}
          </label>
        ))}
      </div>
      <div className="flex items-center gap-2 text-xs text-foreground">
        <span className="font-medium">Max sends/day:</span>
        <input
          type="number"
          min={1}
          max={20}
          value={settings.maxSendsPerDay}
          onChange={(e) => onSettingsChange({ maxSendsPerDay: Number(e.target.value) })}
          className="w-14 rounded-[2px] border border-input bg-card px-2 py-0.5"
        />
      </div>
      <button
        onClick={runNow}
        disabled={running || settings.paused}
        className="ml-auto flex items-center gap-2 rounded-[2px] bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
      >
        {running && (
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        )}
        {running ? "Running cycle…" : "Run autopilot now"}
      </button>
      {(running || lastRun) && (
        <div className="fade-in-up flex w-full items-center gap-2 border-t border-border pt-2 text-xs">
          {running ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-sage-border border-t-sage-foreground" />
              Scanning conversations and checking guardrails…
            </span>
          ) : (
            <>
              <span className="text-foreground">✓ {lastRun}</span>
              <button
                onClick={onGoToActivity}
                className="font-semibold text-sage-foreground hover:underline"
              >
                See the full log in Activity →
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

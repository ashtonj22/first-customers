"use client";

import { useEffect, useState } from "react";
import type { Contact, ScoreBreakdown, Settings } from "@/lib/types";
import Header from "@/components/Header";
import StatsStrip from "@/components/StatsStrip";
import AutopilotBar from "@/components/AutopilotBar";
import NextBestActions from "@/components/NextBestActions";
import Conversations from "@/components/Conversations";
import PlaybookPanel from "@/components/PlaybookPanel";
import NetworkPanel from "@/components/NetworkPanel";
import ActivityPanel from "@/components/ActivityPanel";

type RankedContact = Contact & { score: ScoreBreakdown };

export type AutopilotRunResult = {
  ran: boolean;
  results: Array<{ contact: string; decision: string; reason: string }>;
};

const TABS = [
  { key: "actions", label: "Next Best Actions" },
  { key: "conversations", label: "Conversations" },
  { key: "playbook", label: "Playbook" },
  { key: "network", label: "Network" },
  { key: "activity", label: "Activity" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function Dashboard() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [ranked, setRanked] = useState<RankedContact[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [live, setLive] = useState(false);
  const [tab, setTab] = useState<TabKey>("actions");
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshCore = () => {
    fetch("/api/contacts")
      .then((r) => r.json())
      .then((data) => {
        setContacts(data.contacts);
        setRanked(data.ranked);
      });
  };

  useEffect(() => {
    refreshCore();
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => setSettings(data.settings));
    fetch("/api/status")
      .then((r) => r.json())
      .then((data) => setLive(data.live));
  }, [refreshKey]);

  const bump = () => setRefreshKey((k) => k + 1);

  const handleSettingsChange = async (patch: Partial<Settings>) => {
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    setSettings(data.settings);
  };

  const handleReset = async () => {
    await fetch("/api/reset", { method: "POST" });
    setTab("actions");
    bump();
  };

  const handleRunAutopilot = async (): Promise<AutopilotRunResult> => {
    const res = await fetch("/api/autopilot", { method: "POST" });
    const data = (await res.json()) as AutopilotRunResult;
    bump();
    return data;
  };

  // Autopilot heartbeat: while armed and not paused, run a cycle every 60s
  // so the agent works proactively — guardrails still gate every send.
  useEffect(() => {
    if (settings?.mode !== "autopilot" || settings.paused) return;
    const tick = setInterval(() => {
      fetch("/api/autopilot", { method: "POST" }).then(() => bump());
    }, 60_000);
    return () => clearInterval(tick);
  }, [settings?.mode, settings?.paused]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        settings={settings}
        live={live}
        onSettingsChange={handleSettingsChange}
        onReset={handleReset}
        onRunAutopilot={handleRunAutopilot}
      />

      <StatsStrip contacts={contacts} />

      {settings?.mode === "autopilot" && (
        <AutopilotBar
          settings={settings}
          onSettingsChange={handleSettingsChange}
          onRunNow={handleRunAutopilot}
          onGoToActivity={() => setTab("activity")}
        />
      )}

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-6">
        <nav className="mb-6 flex flex-wrap gap-1 rounded-[2px] bg-muted p-1 text-sm">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-[2px] px-4 py-1.5 font-medium transition-colors ${
                tab === t.key
                  ? "border border-border bg-card text-foreground"
                  : "text-sage-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {tab === "actions" && (
          <NextBestActions
            ranked={ranked}
            onDataChanged={bump}
            onGoToConversations={() => setTab("conversations")}
          />
        )}
        {tab === "conversations" && (
          <Conversations refreshKey={refreshKey} onDataChanged={bump} />
        )}
        {tab === "playbook" && <PlaybookPanel refreshKey={refreshKey} />}
        {tab === "network" && <NetworkPanel contacts={contacts} />}
        {tab === "activity" && <ActivityPanel refreshKey={refreshKey} />}
      </main>

      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        First Customers — a hackathon prototype for MadeThis. No real messages are sent; everything is simulated.
      </footer>
    </div>
  );
}

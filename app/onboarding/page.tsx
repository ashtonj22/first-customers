"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  REAL_CONTACTS,
  NOISE_CONTACTS,
  TOTAL_IMPORTED,
  TIER_LABEL,
  INTERVIEW_CONTACTS,
  type ClosenessTier,
} from "@/lib/onboarding-data";

const STEPS = [
  { key: 1, label: "Import contacts" },
  { key: 2, label: "Cross-reference email" },
  { key: 3, label: "Pick who to start with" },
  { key: 4, label: "The agent gets to know them" },
] as const;

const TIER_DOT: Record<ClosenessTier, string> = {
  close: "bg-accent",
  warm: "bg-[#7d9663]",
  acquaintance: "bg-muted-foreground",
};

function Stepper({ step }: { step: number }) {
  return (
    <div className="mb-10 flex items-center justify-center gap-3">
      {STEPS.map((s, i) => (
        <div key={s.key} className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                step === s.key
                  ? "bg-accent text-white"
                  : step > s.key
                    ? "bg-sage-foreground/20 text-sage-foreground"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {step > s.key ? "✓" : s.key}
            </span>
            <span
              className={`hidden text-sm sm:inline ${
                step === s.key ? "font-medium text-foreground" : "text-muted-foreground"
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && <span className="h-px w-8 bg-border" />}
        </div>
      ))}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-2xl rounded-lg border border-border bg-card p-8 shadow-sm sm:p-10">
      {children}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 1 state
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);

  // Step 2 state
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [scanIndex, setScanIndex] = useState(0);

  // Step 3 state
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(REAL_CONTACTS.map((c) => c.name)),
  );
  const [noiseExpanded, setNoiseExpanded] = useState(false);
  const [launching, setLaunching] = useState(false);

  // Step 4 state
  const [interviewIndex, setInterviewIndex] = useState(0);
  const [interviewNotes, setInterviewNotes] = useState<Record<string, string>>({});
  const [answerDraft, setAnswerDraft] = useState("");

  const allContacts = useMemo(
    () => [...REAL_CONTACTS.map((c) => c.name), ...NOISE_CONTACTS.map((n) => n.name)],
    [],
  );

  const handleImport = () => {
    setImporting(true);
    setTimeout(() => {
      setImporting(false);
      setImported(true);
    }, 1400);
  };

  const handleScan = () => {
    setScanning(true);
    setScanIndex(0);
    const total = allContacts.length;
    const interval = setInterval(() => {
      setScanIndex((i) => {
        if (i + 1 >= total) {
          clearInterval(interval);
          return i;
        }
        return i + 1;
      });
    }, 2500 / total);
    setTimeout(() => {
      clearInterval(interval);
      setScanning(false);
      setScanned(true);
    }, 2500);
  };

  const toggleContact = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleSubmitAnswer = () => {
    const contact = INTERVIEW_CONTACTS[interviewIndex];
    if (!contact || !answerDraft.trim()) return;
    setInterviewNotes((prev) => ({ ...prev, [contact.name]: answerDraft.trim() }));
    setAnswerDraft("");
    setInterviewIndex((i) => i + 1);
  };

  const handleStart = () => {
    setLaunching(true);
    setTimeout(() => {
      router.push("/");
    }, 700);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-serif text-lg font-normal tracking-tight text-foreground">
          First Customers
        </span>
        <span className="text-xs text-muted-foreground">Onboarding demo · nothing here is saved</span>
      </div>

      <main className="flex flex-1 flex-col justify-center px-6 pb-16">
        <Stepper step={step} />

        {step === 1 && (
          <Card>
            <h1 className="mb-2 text-center font-serif text-3xl font-normal tracking-tight text-foreground">
              Let&apos;s find your <em className="italic">first customers</em>
            </h1>
            <p className="mb-8 text-center text-sm text-muted-foreground">
              They&apos;re already in your phone.
            </p>

            {!imported && (
              <div className="flex flex-col items-center gap-4">
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="rounded-[2px] bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
                >
                  {importing ? "Importing…" : "Connect phone contacts"}
                </button>
                {importing && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                    Reading your address book…
                  </div>
                )}
              </div>
            )}

            {imported && (
              <div className="fade-in-up">
                <p className="mb-4 text-center text-sm font-medium text-foreground">
                  {TOTAL_IMPORTED} contacts imported
                </p>
                <div className="mb-6 max-h-64 overflow-y-auto rounded-[2px] border border-border bg-muted/50">
                  <ul className="divide-y divide-border">
                    {REAL_CONTACTS.map((c) => (
                      <li
                        key={c.name}
                        className="flex items-center justify-between gap-3 px-4 py-2 text-sm"
                      >
                        <span className="text-foreground">{c.name}</span>
                        <span className="text-xs text-muted-foreground">{c.relationship}</span>
                      </li>
                    ))}
                    {NOISE_CONTACTS.map((n) => (
                      <li
                        key={n.name}
                        className="flex items-center justify-between gap-3 px-4 py-2 text-sm text-muted-foreground/70"
                      >
                        <span>{n.name}</span>
                        <span className="text-xs">—</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={() => setStep(2)}
                    className="rounded-[2px] bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}
          </Card>
        )}

        {step === 2 && (
          <Card>
            <h1 className="mb-2 text-center font-serif text-3xl font-normal tracking-tight text-foreground">
              Cross-reference your <em className="italic">email</em>
            </h1>
            <p className="mx-auto mb-8 max-w-md text-center text-sm text-muted-foreground">
              We look for real two-way correspondence — newsletters and receipts don&apos;t count.
            </p>

            {!scanning && !scanned && (
              <div className="flex justify-center">
                <button
                  onClick={handleScan}
                  className="rounded-[2px] bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
                >
                  Scan Gmail
                </button>
              </div>
            )}

            {scanning && (
              <div className="flex flex-col items-center gap-4">
                <div className="h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-150 ease-linear"
                    style={{ width: `${((scanIndex + 1) / allContacts.length) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Checking{" "}
                  <span className="font-medium text-foreground">
                    {allContacts[scanIndex]}
                  </span>
                  …
                </p>
              </div>
            )}

            {scanned && (
              <div className="fade-in-up">
                <p className="mb-4 text-center text-sm font-medium text-foreground">
                  {REAL_CONTACTS.length} of {TOTAL_IMPORTED} look like real relationships
                </p>
                <div className="mb-6 max-h-72 overflow-y-auto rounded-[2px] border border-border bg-muted/50">
                  <ul className="divide-y divide-border">
                    {REAL_CONTACTS.map((c) => (
                      <li
                        key={c.name}
                        className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                      >
                        <div>
                          <p className="text-foreground">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.relationship}</p>
                        </div>
                        <span className="shrink-0 rounded-[2px] bg-sage px-2 py-0.5 text-[11px] font-medium text-sage-foreground">
                          ✉ {c.emailCount} emails · {c.emailWindowDays}d — regular correspondence
                        </span>
                      </li>
                    ))}
                    {NOISE_CONTACTS.map((n) => (
                      <li
                        key={n.name}
                        className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-muted-foreground/50"
                      >
                        <span>{n.name}</span>
                        <span className="shrink-0 rounded-[2px] bg-muted px-2 py-0.5 text-[11px]">
                          no two-way email
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={() => setStep(3)}
                    className="rounded-[2px] bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}
          </Card>
        )}

        {step === 3 && (
          <Card>
            <h1 className="mb-2 text-center font-serif text-3xl font-normal tracking-tight text-foreground">
              Pick who Maya should <em className="italic">start</em> with
            </h1>
            <p className="mb-6 text-center text-sm text-muted-foreground">
              All 15 look like real relationships — deselect any you&apos;d rather leave out.
            </p>

            <div className="mb-4 max-h-80 overflow-y-auto rounded-[2px] border border-border">
              <ul className="divide-y divide-border">
                {REAL_CONTACTS.map((c) => (
                  <li key={c.name} className="flex items-center gap-3 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(c.name)}
                      onChange={() => toggleContact(c.name)}
                      className="h-4 w-4 shrink-0 accent-[#5a6e42]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-foreground">{c.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{c.relationship}</p>
                    </div>
                    <span className="hidden shrink-0 rounded-[2px] bg-muted px-2 py-0.5 text-[11px] text-muted-foreground sm:inline">
                      ✉ {c.emailCount} · {c.emailWindowDays}d
                    </span>
                    <span className="flex shrink-0 items-center gap-1 rounded-[2px] px-2 py-0.5 text-[11px] font-medium">
                      <span className={`h-1.5 w-1.5 rounded-full ${TIER_DOT[c.tier]}`} />
                      {TIER_LABEL[c.tier]}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => setNoiseExpanded((v) => !v)}
              className="mb-6 w-full rounded-[2px] border border-border bg-muted/40 px-4 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted"
            >
              {noiseExpanded ? "▾" : "▸"} {NOISE_CONTACTS.length} filtered out — no real
              correspondence found
              {noiseExpanded && (
                <ul className="mt-2 space-y-1 border-t border-border pt-2">
                  {NOISE_CONTACTS.map((n) => (
                    <li key={n.name} className="text-muted-foreground/70">
                      {n.name}
                    </li>
                  ))}
                </ul>
              )}
            </button>

            <div className="flex justify-center">
              <button
                onClick={() => setStep(4)}
                disabled={selected.size === 0}
                className="rounded-[2px] bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
              >
                Continue
              </button>
            </div>
          </Card>
        )}

        {step === 4 && (
          <Card>
            <h1 className="mb-2 text-center font-serif text-3xl font-normal tracking-tight text-foreground">
              The agent gets to <em className="italic">know</em> them
            </h1>
            <p className="mx-auto mb-8 max-w-md text-center text-sm text-muted-foreground">
              A quick interview produces richer context than anything scrapeable — Maya asks
              about a few contacts now, and the rest as she goes.
            </p>

            {interviewIndex < INTERVIEW_CONTACTS.length ? (
              <div className="fade-in-up">
                {(() => {
                  const contact = INTERVIEW_CONTACTS[interviewIndex];
                  return (
                    <>
                      <div className="mb-5 flex justify-start">
                        <div className="max-w-sm rounded-[2px] rounded-tl-none bg-sage px-4 py-3 text-sm text-sage-foreground">
                          {contact.question}
                        </div>
                      </div>

                      <textarea
                        value={answerDraft}
                        onChange={(e) => setAnswerDraft(e.target.value)}
                        placeholder={`Write anything about your relationship with ${contact.name.split(" ")[0]}…`}
                        rows={3}
                        className="mb-3 w-full resize-none rounded-[2px] border border-input bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                      />

                      <div className="mb-6 flex items-center justify-between gap-3">
                        <button
                          onClick={() => setAnswerDraft(contact.exampleAnswer)}
                          className="rounded-[2px] border border-input px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                        >
                          Use example answer
                        </button>
                        <button
                          onClick={handleSubmitAnswer}
                          disabled={!answerDraft.trim()}
                          className="rounded-[2px] bg-primary px-5 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
                        >
                          Submit
                        </button>
                      </div>
                    </>
                  );
                })()}

                <ul className="space-y-2 border-t border-border pt-4">
                  {INTERVIEW_CONTACTS.map((c) => (
                    <li key={c.name} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-foreground">{c.name}</span>
                      {interviewNotes[c.name] ? (
                        <span className="max-w-[70%] truncate rounded-[2px] bg-sage px-2 py-0.5 text-[11px] font-medium text-sage-foreground">
                          ✓ Noted — this becomes the agent&apos;s context
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">pending</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="fade-in-up">
                <ul className="mb-6 space-y-2 rounded-[2px] border border-border p-4">
                  {INTERVIEW_CONTACTS.map((c) => (
                    <li key={c.name} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-foreground">{c.name}</span>
                      <span className="max-w-[70%] truncate rounded-[2px] bg-sage px-2 py-0.5 text-[11px] font-medium text-sage-foreground">
                        ✓ Noted — this becomes the agent&apos;s context
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mb-6 text-center text-sm text-muted-foreground">
                  3 interviewed now · the agent asks about the rest as it goes
                </p>
                <div className="flex justify-center">
                  <button
                    onClick={handleStart}
                    disabled={launching}
                    className="rounded-[2px] bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
                  >
                    {launching
                      ? "Starting…"
                      : `Start outreach with ${selected.size} contact${selected.size === 1 ? "" : "s"}`}
                  </button>
                </div>
              </div>
            )}
          </Card>
        )}
      </main>
    </div>
  );
}

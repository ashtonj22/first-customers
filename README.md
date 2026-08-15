# First Customers — a self-improving GTM agent

**MadeThis Bounty submission.** An AI employee that gets a brand-new founder their first customers through the one channel every founder already has: **the people who already know them** — and, through referrals, the people *those* people know.

The demo founder is Maya, who just launched **Ember & Oak** (hand-poured candles, $28 gift sets) on MadeThis. The agent's job: turn her existing relationships into first revenue, learning from every piece of feedback she gives it.

## The closed GTM loop

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  SIGNAL            contacts scored: warmth × fit × timing        │
│    ↓                                                             │
│  OPPORTUNITY       ranked "next best actions" feed               │
│    ↓                                                             │
│  PROPOSED ACTION   personal SMS drafted from playbook + notes    │
│    ↓                                                             │
│  HUMAN DECISION    approve / edit / reject-with-reason           │
│    ↓                                                             │
│  EXECUTE           simulated send (SMS thread)                   │
│    ↓                                                             │
│  OUTCOME           reply · purchase · silence · referral · opt-out│
│    ↓                                                             │
│  LEARN             reflection updates the editable Playbook ─────┘
│                    (every future draft obeys the new rules)
└─ referrals feed new warm contacts back into SIGNAL
```

## How feedback changes future actions (the self-improving part)

Every rejection, edit, and outcome triggers a **reflection** (`lib/reflect.ts`) that rewrites the Playbook — the agent's editable memory (`data/playbook.json`). The Playbook is injected verbatim into every subsequent drafting prompt, so a learned rule immediately changes behavior.

**Concrete example from a real run:**
1. Agent drafts a message to Jess (close friend) that pivots from "how have you been?" straight into a product pitch.
2. Maya rejects it: *"Too salesy for how close we are."*
3. Reflection writes a new close-tier rule: *"Don't pivot straight from the personal catch-up into a product pitch in the same message — let the relationship-first message stand on its own, or soften the ask."* The Playbook tab shows the before/after diff.
4. The very next close-tier draft (Nina) leads with her dinner parties and keeps the pitch soft — reasoning cites the new rule — and she converts. The agent then logs a *positive* learning: this approach works for similar contacts.

Outcomes teach too: when Tom (visible notes: "not really a candle person") redirects to a referral instead of buying, the ask-style rule is refined to lead with referral asks for weak-fit contacts.

## Permission model & guardrails (`lib/guardrails.ts`)

- **Propose mode (default):** every action is a card — message, reasoning, evidence, expected effect — awaiting approve / edit / reject-with-reason.
- **Autopilot mode:** may auto-send **only follow-ups to contacts who already replied positively**, within `maxSendsPerDay`, only to user-allowed tiers, outside quiet hours. **First-touch messages, referral first-touches, and anything close-tier always require human approval** — close tier is locked in the UI.
- Every autopilot decision (sent *or* deferred-to-human) is logged to the Activity trail with its reason.
- A global **Pause** switch halts all agent action instantly.

## Architecture

- **Next.js (App Router) + TypeScript + Tailwind.** No database — state is a single ~10KB JSON document, reset anytime via the Reset demo button (restores `data/seeds/`). Locally it lives in `data/*.json` so it stays hand-editable; deployed, each visitor gets their own private copy (see [Deployment](#deployment)).
- **Claude API, model `claude-sonnet-5`** (`lib/anthropic.ts`), used three ways:
  - `lib/draft.ts` — drafts each personal SMS (playbook + visible contact fields only).
  - `lib/reflect.ts` — turns feedback/outcomes into playbook rule changes + changelog entries.
  - `lib/simulate.ts` — roleplays each contact using **hidden persona traits** to generate realistic replies.
- **Deterministic opportunity scoring** (`lib/scoring.ts`) — warmth × fit × timing with a visible per-contact breakdown, so ranking is explainable math, not a black box.
- **Graceful fallback:** if no API key is set (or a call fails), deterministic template drafting/reflection/replies keep the entire loop functional. A badge shows `live` vs fallback mode.

### Information boundary (why the simulation is honest)

Each synthetic contact has two layers: **visible fields** (relationship, closeness tier, notes — what Maya actually knows) and **hidden persona traits** (responsiveness, product interest, tone preference, referral likelihood). The drafting side reads *only* visible fields; hidden traits are reserved for the outcome simulator. Better messages genuinely earn better outcomes — the agent can't cheat.

## Production data strategy (beyond the demo)

The demo uses synthetic contacts; with real data, context comes from a four-step funnel — **import the who, elicit the why**:

1. **Import** phone contacts — the full universe, zero effort, but context-free.
2. **Cross-reference Gmail/Calendar (OAuth)** — contacts with regular *two-way* correspondence get flagged as recommended, with recency/frequency seeding the warmth score. (Call/text history is not accessible on iOS, and Google Play restricts it on Android — email/calendar is the viable automatic signal.)
3. **Review** — the founder triages the ranked list: keep or dismiss. Seconds per contact.
4. **Interview** — the agent asks about only the keepers ("one thing about your relationship with Sarah — would she love this, or know someone who would?"). Two minutes of voice answers produce richer notes than anything scrapeable.

The interview is the expensive step (founder time), so steps 1–3 ensure it covers the ~15–25 relationships that matter, not 800 contacts. From there the system is self-maintaining: every observed reply updates warmth and per-contact insights automatically (`contactInsights`), so the interview is a seed, not a recurring chore. Social media scraping is deliberately excluded — locked-down APIs and terms-of-service risk make it a poor foundation.

## Data & safety

All contacts are synthetic; all sends are simulated. No real person is contacted, nothing is published, no money is spent.

## Run it

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY (optional — fallback mode works without it)
npm run dev                  # http://localhost:3000
```

See `DEMO-SCRIPT.md` for the 3–5 minute walkthrough.

## Routes

| Route | What it is |
| --- | --- |
| `/` | Intro — the problem, the GTM first principles, and the strategy behind the build |
| `/onboarding` | Onboarding demo — contact import, email cross-reference, selection, agent interview |
| `/dashboard` | The agent itself — next best actions, conversations, playbook, network, activity |

## Deployment

Deployed code on Vercel gets a **read-only filesystem**, so the local JSON-file
store cannot be used there. State is loaded once per request and written back
once at the end, behind a `withStore()` wrapper on each route (`lib/state.ts`) —
which keeps every accessor in `lib/store.ts` synchronous and costs one read plus
at most one write per request. Read-only requests skip the write entirely.

The backend is chosen at runtime:

| Environment | Store | Notes |
| --- | --- | --- |
| Local dev | `data/*.json` | Same files as before, still hand-editable |
| Vercel + Blob store | One private blob per visitor | Keyed by an `fc_sid` session cookie issued in `proxy.ts` |
| Vercel, no Blob store | In-memory | Fallback so a deploy still runs; state resets per instance |

Giving each visitor their own session matters for judging: the learning loop
only demonstrates itself if a rejection you made is still in the playbook on the
next click, and one reviewer's actions must not leak into another's demo.

Seed data is imported statically rather than read with `fs`, so it survives
bundling without any `outputFileTracingIncludes` configuration.

```bash
vercel link
vercel blob create-store <name> --access private --yes   # injects BLOB_READ_WRITE_TOKEN
vercel deploy --prod
```

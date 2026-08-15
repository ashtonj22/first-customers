import type { Contact, ScoreBreakdown } from "./types";

const TIER_WEIGHT: Record<Contact["closenessTier"], number> = {
  close: 1.0,
  warm: 0.62,
  acquaintance: 0.32,
};

const FIT_KEYWORDS = [
  "candle",
  "cozy",
  "home",
  "house",
  "gift",
  "gifting",
  "self-care",
  "self care",
  "hosting",
  "hosts",
  "dinner part",
  "decor",
  "redecorat",
  "aesthetic",
  "wedding",
  "registry",
  "subscription",
  "relax",
  "bath",
  "book club",
  "small business",
  "support",
  "founder",
  "housewarming",
];

/**
 * Deterministic fit score: how much the contact's notes match language
 * associated with candles / gifting / cozy-home occasions.
 */
function fitScore(notes: string): number {
  const lower = notes.toLowerCase();
  let hits = 0;
  for (const kw of FIT_KEYWORDS) {
    if (lower.includes(kw)) hits += 1;
  }
  // baseline 0.15 so nobody scores literally zero, cap contribution at 0.85
  const raw = 0.15 + hits * 0.18;
  return Math.min(1, raw);
}

/**
 * Timing score: rewards a "sweet spot" recency window — not so recent that
 * outreach feels random, not so stale that it's cold. Also nudges up if a
 * follow-up is due (handled by caller via status).
 */
function timingScore(daysAgo: number): number {
  if (daysAgo <= 3) return 0.35; // just talked, a bit soon
  if (daysAgo <= 14) return 0.95; // sweet spot
  if (daysAgo <= 45) return 0.8;
  if (daysAgo <= 90) return 0.55;
  if (daysAgo <= 180) return 0.35;
  return 0.2; // very cold
}

export function scoreContact(contact: Contact): ScoreBreakdown {
  const warmth = TIER_WEIGHT[contact.closenessTier];
  const fit = fitScore(contact.notes);
  const timing = timingScore(contact.lastContactDaysAgo);

  const total = Math.round((warmth * 0.4 + fit * 0.35 + timing * 0.25) * 100);

  let whyNow: string;
  if (contact.lastContactDaysAgo <= 14 && contact.closenessTier === "close") {
    whyNow = "Close contact, still fresh in mind — good moment to reach out personally.";
  } else if (fit > 0.6) {
    whyNow = "Notes strongly match Ember & Oak's vibe (gifting, cozy home, hosting).";
  } else if (contact.lastContactDaysAgo > 90) {
    whyNow = "Long gap since last contact — a warm re-connect is overdue.";
  } else {
    whyNow = "Solid overall fit between relationship warmth and timing.";
  }

  return { warmth, fit, timing, total, whyNow };
}

export function rankContacts(contacts: Contact[]): Array<Contact & { score: ScoreBreakdown }> {
  return contacts
    // "proposed" stays in the feed: a draft that was never approved or
    // rejected (or was rejected outright) hasn't been acted on — the
    // opportunity is still open until a message is actually sent.
    .filter((c) =>
      ["not_contacted", "proposed", "replied"].includes(c.status),
    )
    .map((c) => ({ ...c, score: scoreContact(c) }))
    .sort((a, b) => b.score.total - a.score.total);
}

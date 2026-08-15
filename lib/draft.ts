import { callClaudeJSON } from "./anthropic";
import type { AskType, Contact, Draft, Playbook } from "./types";
import { PRODUCT } from "./types";

function allRules(playbook: Playbook): string[] {
  return [
    ...playbook.globalRules,
    ...playbook.tierRules.close,
    ...playbook.tierRules.warm,
    ...playbook.tierRules.acquaintance,
    ...playbook.timing,
    ...playbook.askStyle,
  ];
}

/** Does any rule in the playbook contain one of the given signal phrases? */
function playbookSignals(playbook: Playbook, tier: Contact["closenessTier"], keywords: string[]): boolean {
  const relevant = [
    ...playbook.globalRules,
    ...playbook.tierRules[tier],
    ...playbook.askStyle,
  ]
    .join(" ")
    .toLowerCase();
  return keywords.some((kw) => relevant.includes(kw));
}

function buildPrompt(
  contact: Contact,
  playbook: Playbook,
  isFollowUp: boolean,
  priorReply?: string,
): string {
  const insights = playbook.contactInsights[contact.id] ?? [];
  return `You are drafting a single warm, personal SMS text on behalf of Maya, founder of ${PRODUCT.brand} (a hand-poured candle brand, ${PRODUCT.itemName}s at $${PRODUCT.price}, with a subscription option). The text goes to someone Maya already knows personally — never to a stranger.

CONTACT
- Name: ${contact.name}
- Relationship to Maya: ${contact.relationship}
- Closeness tier: ${contact.closenessTier}
- Notes: ${contact.notes}
- Days since last contact: ${contact.lastContactDaysAgo}
${insights.length ? `- Things learned about this specific contact from past interactions: ${insights.join("; ")}` : ""}
${isFollowUp && priorReply ? `- This is a FOLLOW-UP. Their last reply: "${priorReply}" — continue that conversation naturally and move it toward a purchase or a referral.` : ""}
${isFollowUp && !priorReply ? `- This is a FOLLOW-UP to a message that got no reply yet — keep it light and zero-pressure.` : ""}
${isFollowUp && contact.status === "customer" ? `- They already PURCHASED. This follow-up is a thank-you + check-in, and ALWAYS includes a referral ask in some natural form ("who else do you know that would love this?"). Never re-pitch the product to them.` : ""}
${isFollowUp && contact.status === "referred_out" ? `- They gave Maya a REFERRAL instead of buying. This follow-up is a genuine thank-you for the intro and a quick update — no product pitch, no pressure. If natural, mention you'll let them know how it goes with the person they referred.` : ""}

CURRENT PLAYBOOK (the agent's evolving rules — follow these verbatim, they reflect real feedback Maya has given):
Global rules:
${playbook.globalRules.map((r) => `- ${r}`).join("\n") || "- (none yet)"}
Rules for "${contact.closenessTier}" tier contacts:
${playbook.tierRules[contact.closenessTier].map((r) => `- ${r}`).join("\n") || "- (none yet)"}
Timing rules:
${playbook.timing.map((r) => `- ${r}`).join("\n") || "- (none yet)"}
Ask-style rules:
${playbook.askStyle.map((r) => `- ${r}`).join("\n") || "- (none yet)"}

INSTRUCTIONS
Write ONE text message Maya could send as-is. It must include a primary ask (try it or buy it). Where it fits naturally, OR where the playbook's ask-style rules suggest a direct ask doesn't fit this person, also include a referral ask ("who do you know that might love this?"). Follow the playbook rules above exactly — they are hard-won lessons, not suggestions.

Respond with ONLY a JSON object, no prose, no markdown fences, matching exactly this shape:
{
  "message": "the SMS text itself, ready to send",
  "reasoning": "1-2 sentences on why this angle, referencing specifics about the contact",
  "evidence": ["short evidence chip 1", "short evidence chip 2", "short evidence chip 3"],
  "expectedEffect": "one sentence prediction of how they'll likely respond",
  "askType": "direct" | "referral" | "both"
}`;
}

// ---------- deterministic fallback ----------

const SALESY_PHRASES = [
  "% off",
  "discount",
  "code",
  "limited time",
  "buy now",
  "order today",
  "don't miss",
  "hurry",
  "sale ends",
];

function fallbackDraft(
  contact: Contact,
  playbook: Playbook,
  isFollowUp: boolean,
): Draft {
  const casualClose = playbookSignals(playbook, "close", [
    "casual",
    "no-pitch",
    "no pitch",
    "sound like a text from a friend",
    "skip the discount",
  ]);
  const lowPressureAcq = playbookSignals(playbook, "acquaintance", [
    "low-pressure",
    "low pressure",
    "no hard",
  ]);
  // Referral-first applies when this specific contact is a weak personal fit
  // (either flagged explicitly, or their own product-interest signal is low)
  // — per the playbook's ask-style default. We deliberately do NOT substring
  // -match the playbook's rule text here: the seed ask-style rule describes
  // this policy in prose ("...then lead with a referral ask instead"), and
  // matching against it would false-trigger for every contact.
  // Referral-first must key off the VISIBLE notes only (e.g. "not really a
  // candle person") — hidden persona traits belong to the outcome simulator,
  // and the drafting side reading them breaks the "agent only knows what
  // Maya knows" premise.
  const preferReferral = /\bnot (really |much )?(a |an |into )/i.test(contact.notes);

  const firstName = contact.name.split(" ")[0];
  let message: string;
  let askType: AskType = "direct";
  let reasoning: string;
  const evidence: string[] = [];
  let expectedEffect: string;

  if (isFollowUp && contact.status === "referred_out") {
    message = `Hey ${firstName}, thank you again for the intro — seriously means a lot as I get this off the ground. I'll let you know how it goes! And no pressure ever, but if you ever want to try a ${PRODUCT.itemName} yourself, it's on me.`;
    reasoning = "They referred someone instead of buying — thanking them warmly with zero pitch keeps the relationship strong.";
    evidence.push("Gave a referral", "Gratitude, not pressure");
    expectedEffect = "Keeps the relationship warm and the referral pipeline open.";
    askType = "referral";
    return { message, reasoning, evidence, expectedEffect, askType, usedFallback: true };
  }
  if (isFollowUp && contact.status === "customer") {
    message = `Hey ${firstName}! Just wanted to say thank you again for the order — it means a lot. Quick thought: who do you know that might love a cozy ${PRODUCT.itemName}? Would love an intro if anyone comes to mind!`;
    reasoning = "They already purchased — thanking them and asking for a referral instead of re-pitching.";
    evidence.push("Already a customer", "Referral ask at the moment of goodwill");
    expectedEffect = "Likely to name a friend or two — happy customers refer.";
    askType = "referral";
    return { message, reasoning, evidence, expectedEffect, askType, usedFallback: true };
  }
  if (isFollowUp) {
    message = `Hey ${firstName}! Following up — did the ${PRODUCT.itemName} end up being your thing? Would love to hear what you think, and if you're into it, happy to hook you up with a friends discount for a refill.`;
    reasoning = `They already replied positively once, so this is a light, no-pressure follow-up rather than a first pitch.`;
    evidence.push("Already replied positively", "Follow-up spacing rule respected");
    expectedEffect = "Likely to reply with feedback or a repeat order.";
    askType = "direct";
  } else if (preferReferral) {
    message = casualClose
      ? `Hey ${firstName}! Random but — I launched Ember & Oak, hand-poured candles. Not really your thing I know, but who do you know that's into cozy home stuff?`
      : `Hi ${firstName}! I just launched a little candle brand, Ember & Oak — ${PRODUCT.itemName}s at $${PRODUCT.price}. Probably not your thing, but who do you know that would love it?`;
    askType = "referral";
    reasoning = `${contact.notes.split(",")[0]} suggests this isn't a strong personal fit, so leading with a referral ask instead of a hard sell.`;
    evidence.push("Low personal product fit", "Playbook: referral-first for weak-fit contacts");
    expectedEffect = "Likely to point Maya toward someone else rather than buy themselves.";
  } else if (contact.closenessTier === "close") {
    if (casualClose) {
      message = `Hey ${firstName}, how's it going? Random update — I actually launched my own thing, Ember & Oak, hand-poured candles. No pressure at all, just wanted you to know in case you're ever in the market for a gift or something cozy for yourself.`;
      reasoning = "Playbook now says close friends want a casual, no-pitch tone — leading with the relationship, keeping the ask soft.";
      evidence.push("Playbook: casual tone for close tier", "Close relationship — lead with connection");
    } else {
      message = `Hey ${firstName}! I just launched Ember & Oak, my own candle line — ${PRODUCT.itemName}s are $${PRODUCT.price} and honestly perfect for ${contact.notes.split(",")[0].toLowerCase()}. Use code FRIEND for 20% off your first order — would mean the world if you checked it out!`;
      reasoning = `Close relationship + strong notes fit (${contact.notes.split(",")[0]}), so leaning into a direct, enthusiastic ask.`;
      evidence.push("Close tier — high responsiveness", "Notes match product (cozy/hosting)");
    }
    expectedEffect = casualClose
      ? "Likely to reply warmly and ask more before deciding."
      : "Likely to reply quickly given the relationship, but tone risk if it reads salesy.";
  } else if (contact.closenessTier === "acquaintance") {
    message = lowPressureAcq
      ? `Hi ${firstName}, it's Maya — long time! I started a little candle brand, Ember & Oak. No agenda, just thought I'd share in case you're ever looking for a cozy gift idea.`
      : `Hi ${firstName}! It's Maya. I recently launched Ember & Oak, hand-poured candles, ${PRODUCT.itemName}s at $${PRODUCT.price}. Would love for you to check it out if it's your kind of thing!`;
    reasoning = "Acquaintance tier — keeping this low-pressure and easy to ignore per playbook.";
    evidence.push("Playbook: low-pressure for acquaintance tier", `Last contact ${contact.lastContactDaysAgo}d ago`);
    expectedEffect = "Might not respond right away — this is a light touch, not a hard ask.";
  } else {
    // warm
    message = `Hey ${firstName}! It's been a bit — hope you're doing well. Wanted to share something: I launched my own candle brand, Ember & Oak (${PRODUCT.itemName}s at $${PRODUCT.price}). Thought of you given ${contact.notes.split(",")[0].toLowerCase()} — would love for you to check it out!`;
    reasoning = `Warm relationship, and notes (${contact.notes.split(",")[0]}) line up well with the product.`;
    evidence.push("Warm tier fit", "Notes reference relevant occasion/interest");
    expectedEffect = "Good chance of a reply and possible purchase given the fit.";
  }

  // Guardrail: flag salesy phrasing for close-tier contacts until the
  // playbook has learned a softer tone (visible-data check only).
  if (contact.closenessTier === "close" && !casualClose) {
    const hasSalesy = SALESY_PHRASES.some((p) => message.toLowerCase().includes(p));
    if (hasSalesy) {
      evidence.push("Note: discount phrasing may read salesy for a close friend");
    }
  }

  return {
    message,
    reasoning,
    evidence,
    expectedEffect,
    askType,
    usedFallback: true,
  };
}

export async function draftMessage(
  contact: Contact,
  playbook: Playbook,
  opts: { isFollowUp?: boolean; priorReply?: string } = {},
): Promise<Draft> {
  const isFollowUp = !!opts.isFollowUp;
  const { data, usedFallback } = await callClaudeJSON<{
    message: string;
    reasoning: string;
    evidence: string[];
    expectedEffect: string;
    askType: AskType;
  }>({
    system:
      "You write short, natural-sounding personal SMS messages. You always follow the supplied playbook rules exactly, and you always respond with raw JSON only — no prose, no markdown fences.",
    prompt: buildPrompt(contact, playbook, isFollowUp, opts.priorReply),
    maxTokens: 1500,
  });

  if (!usedFallback && data && data.message) {
    return {
      message: data.message,
      reasoning: data.reasoning ?? "",
      evidence: Array.isArray(data.evidence) ? data.evidence.slice(0, 5) : [],
      expectedEffect: data.expectedEffect ?? "",
      askType: (["direct", "referral", "both"] as AskType[]).includes(data.askType)
        ? data.askType
        : "direct",
      usedFallback: false,
    };
  }

  return fallbackDraft(contact, playbook, isFollowUp);
}

export { allRules };

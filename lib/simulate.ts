import { callClaudeJSON } from "./anthropic";
import type { Contact, SimOutcome, SimResult } from "./types";

const SALESY_REGEX =
  /(%\s?off|discount|promo\s?code|code\s+[a-z0-9]+|limited time|buy now|order today|don't miss|hurry|sale ends)/i;

/** Simple deterministic hash -> [0,1) float, stable per input string. */
function seededRandom(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // convert to unsigned 0..1
  return (h >>> 0) / 4294967295;
}

function buildPrompt(contact: Contact, message: string): string {
  const t = contact.personaTraits;
  return `You are roleplaying as ${contact.name}, receiving a text message from their ${contact.relationship} Maya, who just launched a candle brand called Ember & Oak.

YOUR HIDDEN CHARACTER (never reveal these numbers, just embody them):
- Responsiveness: ${t.responsiveness} (0=ignores texts, 1=always replies fast)
- Interest in candles/home fragrance: ${t.productInterest} (0=not interested at all, 1=would buy immediately)
- Preferred tone: ${t.tonePreference}
- Likelihood to redirect to someone else instead of buying: ${t.referralLikelihood}
- Personality quirk: ${t.quirk}
${t.salesySensitive ? "- You get annoyed and disengage if a message feels like a sales pitch (discount codes, urgency language)." : ""}
${t.referralTrigger ? `- You are very likely to redirect to ${t.referralName} (${t.referralRelationship}) instead of buying yourself.` : ""}

THE MESSAGE YOU RECEIVED FROM MAYA:
"${message}"

Write a realistic text reply as this character would actually send (or decide not to reply at all). Consider the message's tone — a pushy/salesy message should feel worse to a salesy-sensitive character.

Respond with ONLY a JSON object, no prose, matching exactly this shape:
{
  "reply": "the text reply, or null if they would just not respond",
  "outcome": "reply" | "silence" | "meeting" | "purchase" | "opt_out" | "referral",
  "referral": { "name": "string", "relationship": "string", "context": "string" } // ONLY include if outcome is "referral"
}`;
}

function fallbackSimulate(contact: Contact, message: string): SimResult {
  const t = contact.personaTraits;
  const isSalesy = SALESY_REGEX.test(message);
  const firstName = contact.name.split(" ")[0];

  if (t.salesySensitive && isSalesy) {
    return {
      reply: `Hey, appreciate you thinking of me but please take me off any promo lists — this feels like a sales blast, not you. All good, just wanted to say.`,
      outcome: "opt_out",
      usedFallback: true,
    };
  }

  // Referral-trigger personas redirect reliably regardless of general
  // responsiveness — that's their defining trait for this demo, so check it
  // before the silence roll rather than after.
  if (t.referralTrigger) {
    const name = t.referralName ?? "a friend of mine";
    const relationship = t.referralRelationship ?? "someone I know";
    return {
      reply: `Ha, honestly not really my thing, but you HAVE to text ${name} — ${relationship}, and ${name.split(" ")[0]} would be obsessed. Want their number?`,
      outcome: "referral",
      referral: {
        name,
        relationship,
        context: `Referred by ${contact.name} after ${contact.name.split(" ")[0]} said it wasn't really their own thing.`,
      },
      usedFallback: true,
    };
  }

  const roll = seededRandom(contact.id + message.length);
  if (roll > t.responsiveness) {
    return { reply: null, outcome: "silence", usedFallback: true };
  }

  if (t.productInterest >= 0.6) {
    return {
      reply: `Omg yes, I'm so in! Send me the link, I need this in my life 🕯️`,
      outcome: "purchase",
      usedFallback: true,
    };
  }

  if (t.productInterest >= 0.4 && t.referralLikelihood >= 0.4) {
    return {
      reply: `Sweet, congrats on launching! Not sure it's for me but let me think of who might want one.`,
      outcome: "meeting",
      usedFallback: true,
    };
  }

  if (t.productInterest >= 0.3) {
    return {
      reply: `That's awesome, congrats ${firstName === contact.name ? "" : ""}on the launch! I'll keep it in mind.`,
      outcome: "reply",
      usedFallback: true,
    };
  }

  return {
    reply: `Congrats on launching! Not really my thing but good luck with it 🙂`,
    outcome: "reply",
    usedFallback: true,
  };
}

export async function simulateReply(contact: Contact, message: string): Promise<SimResult> {
  const { data, usedFallback } = await callClaudeJSON<{
    reply: string | null;
    outcome: SimOutcome;
    referral?: { name: string; relationship: string; context: string };
  }>({
    system:
      "You roleplay as a text-message recipient with a specific hidden personality. You always respond with raw JSON only — no prose, no markdown fences.",
    prompt: buildPrompt(contact, message),
    maxTokens: 1000,
  });

  if (!usedFallback && data) {
    const validOutcomes: SimOutcome[] = [
      "reply",
      "silence",
      "meeting",
      "purchase",
      "opt_out",
      "referral",
    ];
    const outcome = validOutcomes.includes(data.outcome) ? data.outcome : "reply";
    return {
      reply: data.reply ?? null,
      outcome,
      referral: outcome === "referral" ? data.referral : undefined,
      usedFallback: false,
    };
  }

  return fallbackSimulate(contact, message);
}

import { callClaudeJSON } from "./anthropic";
import { makeId } from "./store";
import type { ChangelogEntry, Contact, Playbook } from "./types";

export type ReflectTrigger = "rejection" | "edit" | "outcome";

export interface ReflectInput {
  trigger: ReflectTrigger;
  contact: Contact;
  playbook: Playbook;
  /** Was the message being learned from a reply inside an existing thread?
   *  Decides which stage bucket a stage-specific lesson lands in. */
  isFollowUp?: boolean;
  // rejection
  reason?: string;
  rejectedMessage?: string;
  // edit
  oldMessage?: string;
  newMessage?: string;
  // outcome
  outcome?: string;
  sentMessage?: string;
}

export interface ReflectResult {
  playbook: Playbook;
  changelogEntry: ChangelogEntry;
  usedFallback: boolean;
}

function clonePlaybook(pb: Playbook): Playbook {
  return JSON.parse(JSON.stringify(pb)) as Playbook;
}

/** Coerce every contactInsights value to an array — a model response may
 *  have written a bare string, which would crash later .push() calls. */
function normalizeInsights(pb: Playbook): Playbook {
  const ci = pb.contactInsights ?? {};
  for (const key of Object.keys(ci)) {
    const v = ci[key] as unknown;
    if (typeof v === "string") ci[key] = [v];
    else if (!Array.isArray(v)) ci[key] = [];
  }
  pb.contactInsights = ci;
  return pb;
}

const strArr = (v: unknown): string[] | null =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : null;

/** Never trust the model's playbook shape. Any section it dropped or
 *  malformed falls back to the previous playbook's section, so one bad
 *  response can't wipe rules or crash the UI. */
function sanitizePlaybook(previous: Playbook, candidate: Playbook): Playbook {
  const prevTiers = previous.tierRules ?? { close: [], warm: [], acquaintance: [] };
  const candTiers = (candidate.tierRules ?? {}) as Partial<Playbook["tierRules"]>;
  const prevStages = previous.stageRules ?? { firstTouch: [], followUp: [] };
  const candStages = (candidate.stageRules ?? {}) as Partial<Playbook["stageRules"]>;
  return normalizeInsights({
    globalRules: strArr(candidate.globalRules) ?? previous.globalRules ?? [],
    stageRules: {
      firstTouch: strArr(candStages.firstTouch) ?? prevStages.firstTouch ?? [],
      followUp: strArr(candStages.followUp) ?? prevStages.followUp ?? [],
    },
    tierRules: {
      close: strArr(candTiers.close) ?? prevTiers.close ?? [],
      warm: strArr(candTiers.warm) ?? prevTiers.warm ?? [],
      acquaintance: strArr(candTiers.acquaintance) ?? prevTiers.acquaintance ?? [],
    },
    timing: strArr(candidate.timing) ?? previous.timing ?? [],
    askStyle: strArr(candidate.askStyle) ?? previous.askStyle ?? [],
    contactInsights:
      candidate.contactInsights && typeof candidate.contactInsights === "object"
        ? candidate.contactInsights
        : previous.contactInsights ?? {},
    changelog: previous.changelog ?? [],
  });
}

function buildPrompt(input: ReflectInput): string {
  const { trigger, contact, playbook } = input;
  const stageKey = input.isFollowUp ? "followUp" : "firstTouch";
  const stageLabel = input.isFollowUp
    ? "a FOLLOW-UP (a reply inside a thread that already exists)"
    : "a FIRST TOUCH (the opening reach-out of the conversation)";
  let eventDescription = "";
  if (trigger === "rejection") {
    eventDescription = `Maya REJECTED a proposed message to ${contact.name} (${contact.closenessTier} tier, ${contact.relationship}). Rejected message: "${input.rejectedMessage}". Reason given: "${input.reason}".`;
  } else if (trigger === "edit") {
    eventDescription = `Maya EDITED a proposed message to ${contact.name} (${contact.closenessTier} tier, ${contact.relationship}) before sending. Original draft: "${input.oldMessage}". Maya's edited version: "${input.newMessage}".`;
  } else {
    eventDescription = `A message was sent to ${contact.name} (${contact.closenessTier} tier, ${contact.relationship}) and the outcome was "${input.outcome}". Sent message: "${input.sentMessage}".`;
  }

  // The changelog is server-managed and can grow large — never round-trip it
  // through the model (it wastes tokens and risks truncated JSON responses).
  const { changelog: _changelog, ...playbookForPrompt } = playbook;

  return `You maintain a GTM agent's playbook — its evolving memory of what works when reaching out to Maya's personal network for her candle brand Ember & Oak.

CURRENT PLAYBOOK (JSON):
${JSON.stringify(playbookForPrompt, null, 2)}

NEW EVENT TO LEARN FROM:
${eventDescription}
The message involved was ${stageLabel}.

Update the playbook to reflect this lesson. First decide the SCOPE of the lesson, then apply it at that scope:
- Specific to this one person only → add a note to contactInsights["${contact.id}"].
- About how to write at THIS STAGE (opening a conversation vs. continuing one) → add the rule to stageRules.${stageKey} and NOWHERE ELSE. Do not also copy it into tierRules or globalRules — those apply at every stage, and a lesson about follow-ups must never change how first-touch messages are written (or the reverse). Feedback like "don't re-pitch, continue the conversation they started" or "don't open with an announcement" is stage-specific.
- Applies to one closeness tier → add/edit a rule in that tier's tierRules.
- Applies to MULTIPLE tiers (e.g. "lead with the friends & family discount" makes sense for close AND warm AND acquaintance contacts) → add the rule to EACH applicable tier, phrased appropriately for that tier. Do NOT under-scope: if Maya's feedback would clearly improve messages to other tiers too, apply it to those tiers now — she should not have to repeat the same feedback per tier.
- Universal to every message, at every tier AND every stage → add to globalRules instead of duplicating across tiers.
Beyond the scoped change, keep edits small and targeted — don't rewrite unrelated rules. Keep the full existing playbook structure and all other rules unchanged.

Respond with ONLY a JSON object, no prose, matching exactly this shape:
{
  "playbook": { ...the full updated playbook object, same shape as above (no changelog field — it is managed elsewhere). Every value in contactInsights must be an ARRAY of strings... },
  "changelogEntry": {
    "trigger": "${trigger}",
    "insight": "one sentence describing what the agent learned",
    "ruleChanged": "which rule/section(s) changed, e.g. tierRules.close or tierRules.close + tierRules.warm",
    "before": "the old rule text, or null if this is a brand new rule",
    "after": "the new rule text, or null if a rule was removed"
  }
}`;
}

// ---------- deterministic fallback ----------

/** Feedback about how to open vs. how to continue a conversation, which must
 *  land in the stage bucket rather than leaking across every message. */
const STAGE_REASON_SIGNALS = [
  "re-pitch",
  "repitch",
  "pitch again",
  "already pitched",
  "restating",
  "restate",
  "continue the conversation",
  "announce",
  "announcement",
  "update",
];

function fallbackReflect(input: ReflectInput): { playbook: Playbook; changelogEntry: Omit<ChangelogEntry, "id" | "timestamp"> } {
  const pb = normalizeInsights(clonePlaybook(input.playbook));
  const { contact } = input;
  const stageKey: "firstTouch" | "followUp" = input.isFollowUp ? "followUp" : "firstTouch";
  if (!pb.stageRules) pb.stageRules = { firstTouch: [], followUp: [] };

  if (input.trigger === "rejection") {
    const reason = (input.reason ?? "").toLowerCase();
    if (STAGE_REASON_SIGNALS.some((s) => reason.includes(s))) {
      const before = pb.stageRules[stageKey][0] ?? null;
      const newRule = input.isFollowUp
        ? `On follow-ups, continue the conversation they actually started — reference what they said instead of re-pitching or restating the original message. (Maya's feedback: "${input.reason}")`
        : `On a first touch, don't open with an announcement or update about the business — lead with the person. (Maya's feedback: "${input.reason}")`;
      if (!pb.stageRules[stageKey].some((r) => r.includes(input.reason ?? ""))) {
        pb.stageRules[stageKey].unshift(newRule);
      }
      return {
        playbook: pb,
        changelogEntry: {
          trigger: "rejection",
          insight: `Rejected for how the ${input.isFollowUp ? "follow-up" : "first touch"} was framed — the lesson was scoped to that stage only, leaving the other stage untouched.`,
          ruleChanged: `stageRules.${stageKey}`,
          before,
          after: newRule,
        },
      };
    }
    if (
      (reason.includes("salesy") || reason.includes("sales") || reason.includes("pushy")) &&
      contact.closenessTier === "close"
    ) {
      const before = pb.tierRules.close[0] ?? null;
      const newRule =
        "Close friends respond better to a casual, no-pitch tone — sound like a text from a friend, not a sales message. Skip discount codes, urgency language, and hard calls-to-action; lead with the relationship and let the ask stay soft.";
      if (!pb.tierRules.close.some((r) => r.includes("no-pitch tone"))) {
        pb.tierRules.close.unshift(newRule);
      }
      return {
        playbook: pb,
        changelogEntry: {
          trigger: "rejection",
          insight: `Rejected for feeling too salesy with a close contact — close-tier messages now default to a casual, no-pitch tone.`,
          ruleChanged: "tierRules.close",
          before,
          after: newRule,
        },
      };
    }
    if (reason.includes("timing") || reason.includes("too soon") || reason.includes("wait")) {
      const before = pb.timing[0] ?? null;
      const newRule = `Give it more breathing room before reaching out to ${contact.name} again — recent rejection suggests timing was off.`;
      pb.timing.push(newRule);
      return {
        playbook: pb,
        changelogEntry: {
          trigger: "rejection",
          insight: `Rejected for bad timing — added a timing note for this contact.`,
          ruleChanged: "timing",
          before,
          after: newRule,
        },
      };
    }
    // generic rejection -> contact-specific insight
    const insight = `Maya rejected a draft to ${contact.name}${input.reason ? ` — reason: "${input.reason}"` : ""}. Be more careful with this contact's tone next time.`;
    if (!pb.contactInsights[contact.id]) pb.contactInsights[contact.id] = [];
    pb.contactInsights[contact.id].push(insight);
    return {
      playbook: pb,
      changelogEntry: {
        trigger: "rejection",
        insight,
        ruleChanged: `contactInsights.${contact.id}`,
        before: null,
        after: insight,
      },
    };
  }

  if (input.trigger === "edit") {
    const oldMsg = input.oldMessage ?? "";
    const newMsg = input.newMessage ?? "";
    const gotShorter = newMsg.length < oldMsg.length * 0.75;
    const removedEmoji = /\p{Extended_Pictographic}/u.test(oldMsg) && !/\p{Extended_Pictographic}/u.test(newMsg);
    const removedSalesy = /(%\s?off|discount|code|limited time)/i.test(oldMsg) && !/(%\s?off|discount|code|limited time)/i.test(newMsg);

    if (removedSalesy) {
      const before = pb.globalRules.find((r) => r.toLowerCase().includes("discount")) ?? null;
      const newRule = "Avoid discount codes and urgency language in first-touch messages — Maya consistently edits these out.";
      if (!pb.globalRules.some((r) => r.includes("Avoid discount codes"))) {
        pb.globalRules.push(newRule);
      }
      return {
        playbook: pb,
        changelogEntry: {
          trigger: "edit",
          insight: "Maya removed discount/urgency language when editing a draft — added a rule against it.",
          ruleChanged: "globalRules",
          before,
          after: newRule,
        },
      };
    }
    if (gotShorter) {
      const newRule = "Keep messages tight — Maya tends to trim drafts down when they run long.";
      if (!pb.globalRules.some((r) => r.includes("Keep messages tight"))) {
        pb.globalRules.push(newRule);
      }
      return {
        playbook: pb,
        changelogEntry: {
          trigger: "edit",
          insight: "Maya shortened the draft significantly — reinforcing conciseness.",
          ruleChanged: "globalRules",
          before: null,
          after: newRule,
        },
      };
    }
    if (removedEmoji) {
      const newRule = `Skip emoji for ${contact.closenessTier}-tier contacts like ${contact.relationship}s unless the draft already reads casual.`;
      pb.tierRules[contact.closenessTier].push(newRule);
      return {
        playbook: pb,
        changelogEntry: {
          trigger: "edit",
          insight: "Maya removed emoji when editing — noted a tone preference for this tier.",
          ruleChanged: `tierRules.${contact.closenessTier}`,
          before: null,
          after: newRule,
        },
      };
    }
    const insight = `Maya edited the draft to ${contact.name} — noting the adjusted phrasing as a preference for this contact.`;
    if (!pb.contactInsights[contact.id]) pb.contactInsights[contact.id] = [];
    pb.contactInsights[contact.id].push(insight);
    return {
      playbook: pb,
      changelogEntry: {
        trigger: "edit",
        insight,
        ruleChanged: `contactInsights.${contact.id}`,
        before: null,
        after: insight,
      },
    };
  }

  // trigger === "outcome"
  const outcome = input.outcome ?? "";
  if (outcome === "purchase") {
    const insight = `${contact.name} converted quickly — the ${contact.closenessTier}-tier approach used here is working well for similar contacts.`;
    if (!pb.contactInsights[contact.id]) pb.contactInsights[contact.id] = [];
    pb.contactInsights[contact.id].push(`Converted to customer — this angle worked.`);
    return {
      playbook: pb,
      changelogEntry: {
        trigger: "outcome",
        insight,
        ruleChanged: `contactInsights.${contact.id}`,
        before: null,
        after: `Converted to customer — this angle worked.`,
      },
    };
  }
  if (outcome === "opt_out") {
    const before = pb.tierRules[contact.closenessTier][0] ?? null;
    const newRule = `Be extra careful with ${contact.closenessTier}-tier contacts who've gone quiet a long time — a pitch that feels salesy can cause an opt-out. Keep it low-key and give an easy out.`;
    if (!pb.tierRules[contact.closenessTier].some((r) => r.includes("opt-out"))) {
      pb.tierRules[contact.closenessTier].unshift(newRule);
    }
    return {
      playbook: pb,
      changelogEntry: {
        trigger: "outcome",
        insight: `${contact.name} opted out — tightened the ${contact.closenessTier}-tier tone rules to avoid this again.`,
        ruleChanged: `tierRules.${contact.closenessTier}`,
        before,
        after: newRule,
      },
    };
  }
  if (outcome === "referral") {
    const before = pb.askStyle[0] ?? null;
    const newRule = "When a contact's notes suggest weak personal fit, lead with a referral ask — it's converting well.";
    if (!pb.askStyle.some((r) => r.includes("leading with the referral ask"))) {
      pb.askStyle.push(newRule);
    }
    return {
      playbook: pb,
      changelogEntry: {
        trigger: "outcome",
        insight: `${contact.name} redirected to a referral instead of buying — reinforcing the referral-ask pattern for weak-fit contacts.`,
        ruleChanged: "askStyle",
        before,
        after: newRule,
      },
    };
  }

  const insight = `Logged outcome "${outcome}" for ${contact.name} — no rule change needed yet.`;
  return {
    playbook: pb,
    changelogEntry: {
      trigger: "outcome",
      insight,
      ruleChanged: "none",
      before: null,
      after: null,
    },
  };
}

export async function reflect(input: ReflectInput): Promise<ReflectResult> {
  const { data, usedFallback } = await callClaudeJSON<{
    playbook: Playbook;
    changelogEntry: Omit<ChangelogEntry, "id" | "timestamp">;
  }>({
    system:
      "You maintain an agent's playbook (its long-term memory) by making small, targeted edits based on new feedback. You always respond with raw JSON only — no prose, no markdown fences. Never remove unrelated rules.",
    prompt: buildPrompt(input),
    maxTokens: 4000,
  });

  let playbook: Playbook;
  let changelogEntryData: Omit<ChangelogEntry, "id" | "timestamp">;
  let fellBack = usedFallback;

  if (!usedFallback && data && data.playbook && data.changelogEntry) {
    playbook = sanitizePlaybook(input.playbook, data.playbook);
    changelogEntryData = data.changelogEntry;
  } else {
    const fb = fallbackReflect(input);
    playbook = fb.playbook;
    changelogEntryData = fb.changelogEntry;
    fellBack = true;
  }

  const changelogEntry: ChangelogEntry = {
    id: makeId("log"),
    timestamp: Date.now(),
    ...changelogEntryData,
  };
  // The model never sees or returns the changelog — always carry the real
  // history forward from the input playbook.
  playbook.changelog = [...(input.playbook.changelog ?? []), changelogEntry];

  return { playbook, changelogEntry, usedFallback: fellBack };
}

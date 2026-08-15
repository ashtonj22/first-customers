import type { ActivityEntry, Contact, Settings } from "./types";

export interface AutopilotDecision {
  allowed: boolean;
  reason: string;
}

/**
 * Decide whether autopilot may auto-send a follow-up to this contact right
 * now. Hard rules (never overridable by settings):
 *  - paused halts everything
 *  - mode must be "autopilot"
 *  - only follow-ups to contacts who already replied positively are eligible
 *    (never first-touch, never a referral first-touch)
 *  - "close" tier ALWAYS requires human approval, regardless of allowedTiers
 *  - contact's tier must be in settings.allowedTiers
 *  - today's autopilot send count must be under maxSendsPerDay
 */
export function canAutopilotSend(
  contact: Contact,
  settings: Settings,
  todaysAutopilotSends: number,
): AutopilotDecision {
  if (settings.paused) {
    return { allowed: false, reason: "Autopilot is paused." };
  }
  if (settings.mode !== "autopilot") {
    return { allowed: false, reason: "Not in autopilot mode." };
  }
  if (contact.status !== "replied") {
    return {
      allowed: false,
      reason: "Not an existing positive reply — first-touch messages always require human approval.",
    };
  }
  if (contact.closenessTier === "close") {
    return {
      allowed: false,
      reason: "Close-tier contacts always require human approval, regardless of autopilot settings.",
    };
  }
  if (!settings.allowedTiers.includes(contact.closenessTier)) {
    return {
      allowed: false,
      reason: `Tier "${contact.closenessTier}" is not in the autopilot-allowed tiers (${settings.allowedTiers.join(", ")}).`,
    };
  }
  if (todaysAutopilotSends >= settings.maxSendsPerDay) {
    return {
      allowed: false,
      reason: `Daily autopilot send cap reached (${settings.maxSendsPerDay}/day).`,
    };
  }
  return { allowed: true, reason: "Follow-up to a warm/acquaintance contact who already replied positively, within caps." };
}

export function countTodaysAutopilotSends(activity: ActivityEntry[]): number {
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  return activity.filter(
    (a) => a.actor === "autopilot" && a.action === "auto_sent" && a.timestamp >= oneDayAgo,
  ).length;
}

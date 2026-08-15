export type ClosenessTier = "close" | "warm" | "acquaintance";

export type ContactStatus =
  | "not_contacted"
  | "proposed"
  | "sent"
  | "replied"
  | "customer"
  | "referred_out"
  | "opted_out";

export type TonePreference = "casual" | "warm" | "direct";

export interface PersonaTraits {
  responsiveness: number; // 0-1
  productInterest: number; // 0-1
  tonePreference: TonePreference;
  referralLikelihood: number; // 0-1
  quirk: string;
  salesySensitive?: boolean;
  referralTrigger?: boolean;
  referralName?: string;
  referralRelationship?: string;
}

export interface Contact {
  id: string;
  name: string;
  relationship: string;
  closenessTier: ClosenessTier;
  lastContactDaysAgo: number;
  notes: string;
  status: ContactStatus;
  personaTraits: PersonaTraits;
  referredBy?: string; // name of the referrer
}

export type AskType = "direct" | "referral" | "both";

export interface Draft {
  message: string;
  reasoning: string;
  evidence: string[];
  expectedEffect: string;
  askType: AskType;
  usedFallback: boolean;
}

export interface ScoreBreakdown {
  warmth: number;
  fit: number;
  timing: number;
  total: number;
  whyNow: string;
}

export interface ChangelogEntry {
  id: string;
  timestamp: number;
  trigger: string;
  insight: string;
  ruleChanged: string;
  before: string | null;
  after: string | null;
}

/** Where a message sits in the relationship: an opening reach-out, or a reply
 *  inside a thread that already exists. Lessons rarely transfer between the
 *  two, so the playbook keeps their rules apart. */
export type MessageStage = "firstTouch" | "followUp";

export interface Playbook {
  globalRules: string[];
  stageRules: {
    firstTouch: string[];
    followUp: string[];
  };
  tierRules: {
    close: string[];
    warm: string[];
    acquaintance: string[];
  };
  timing: string[];
  askStyle: string[];
  contactInsights: Record<string, string[]>;
  changelog: ChangelogEntry[];
}

export type ActorType = "agent" | "user" | "autopilot";

export interface ActivityEntry {
  id: string;
  timestamp: number;
  actor: ActorType;
  action: string;
  target: string; // contact name or id
  reasoning: string;
  outcome: string | null;
  learned: string | null;
}

export interface Settings {
  mode: "propose" | "autopilot";
  paused: boolean;
  maxSendsPerDay: number;
  allowedTiers: ClosenessTier[];
  quietHours: { start: string; end: string };
}

export interface Message {
  id: string;
  sender: "agent" | "contact";
  text: string;
  timestamp: number;
}

export type MessagesStore = Record<string, Message[]>;

export type SimOutcome =
  | "reply"
  | "silence"
  | "meeting"
  | "purchase"
  | "opt_out"
  | "referral";

export interface SimResult {
  reply: string | null;
  outcome: SimOutcome;
  referral?: {
    name: string;
    relationship: string;
    context: string;
  };
  usedFallback: boolean;
}

export const PRODUCT = {
  brand: "Ember & Oak",
  founder: "Maya",
  itemName: "gift set",
  price: 28,
  description:
    "hand-poured candle brand — $28 gift sets, with a subscription option",
};

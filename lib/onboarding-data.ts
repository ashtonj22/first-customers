// Purely presentational data for the /onboarding demo flow.
// Nothing here touches real app data (data/*.json) or hits real APIs.

export type ClosenessTier = "close" | "warm" | "acquaintance";

export interface OnboardingContact {
  name: string;
  relationship: string;
  tier: ClosenessTier;
  emailCount: number;
  emailWindowDays: number;
}

export interface NoiseContact {
  name: string;
}

// The app's real 15 seed contacts, with invented-but-plausible email stats.
export const REAL_CONTACTS: OnboardingContact[] = [
  { name: "Jess Kane", relationship: "college roommate", tier: "close", emailCount: 22, emailWindowDays: 90 },
  { name: "Nina Alvarez", relationship: "former roommate", tier: "close", emailCount: 17, emailWindowDays: 90 },
  { name: "Olivia Marsh", relationship: "cousin", tier: "close", emailCount: 9, emailWindowDays: 90 },
  { name: "Chris Jessup", relationship: "brother-in-law", tier: "close", emailCount: 14, emailWindowDays: 90 },
  { name: "Mia Jessup", relationship: "sister", tier: "close", emailCount: 31, emailWindowDays: 90 },
  { name: "Grace Liu", relationship: "high school friend", tier: "warm", emailCount: 6, emailWindowDays: 90 },
  { name: "Whitney Park", relationship: "mastermind friend", tier: "warm", emailCount: 11, emailWindowDays: 90 },
  { name: "Sam Ortega", relationship: "gym friend", tier: "warm", emailCount: 4, emailWindowDays: 90 },
  { name: "Dana Whitfield", relationship: "neighbor", tier: "warm", emailCount: 8, emailWindowDays: 90 },
  { name: "Ashley Byrne", relationship: "book club friend", tier: "warm", emailCount: 7, emailWindowDays: 90 },
  { name: "Priya Anand", relationship: "former coworker", tier: "warm", emailCount: 13, emailWindowDays: 90 },
  { name: "Tom Reyes", relationship: "college friend", tier: "warm", emailCount: 5, emailWindowDays: 90 },
  { name: "Ben Okafor", relationship: "neighbor", tier: "acquaintance", emailCount: 2, emailWindowDays: 90 },
  { name: "Derek Holt", relationship: "gym friend", tier: "acquaintance", emailCount: 3, emailWindowDays: 90 },
  { name: "Carlos Nguyen", relationship: "former coworker", tier: "acquaintance", emailCount: 2, emailWindowDays: 90 },
];

// Realistic noise entries that get filtered out — no real relationship.
export const NOISE_CONTACTS: NoiseContact[] = [
  { name: "Dentist — Dr. Patel" },
  { name: "Landlord Mike" },
  { name: "Pizza Palace" },
  { name: "DoorDash Rider" },
  { name: "AT&T Support" },
  { name: "Uncle Ray (do not call)" },
  { name: "Chase Fraud Alerts" },
  { name: "Nail Salon Booking" },
  { name: "Comcast Xfinity" },
  { name: "Car Wash Rewards" },
  { name: "Vet Clinic Front Desk" },
];

export const TOTAL_IMPORTED = REAL_CONTACTS.length + NOISE_CONTACTS.length;

export const TIER_LABEL: Record<ClosenessTier, string> = {
  close: "Close",
  warm: "Warm",
  acquaintance: "Acquaintance",
};

export interface InterviewContact {
  name: string;
  question: string;
  exampleAnswer: string;
}

// Sample contacts the agent interviews live during onboarding. The example
// answers are the real seed notes from data/seeds/contacts.json, verbatim.
export const INTERVIEW_CONTACTS: InterviewContact[] = [
  {
    name: "Jess Kane",
    question:
      "Tell me one thing about you and Jess — would she love Ember & Oak, or know someone who would?",
    exampleAnswer: "Hosts dinner parties almost every month, loves cozy aesthetics",
  },
  {
    name: "Tom Reyes",
    question:
      "What's Tom like? Would he be into candles himself, or is there someone in his life who might be?",
    exampleAnswer:
      "Not really a candle person, but his girlfriend Kayla is obsessed with home fragrance",
  },
  {
    name: "Olivia Marsh",
    question:
      "What's going on in Olivia's life right now that might connect to Ember & Oak?",
    exampleAnswer: "Getting married next spring, loves boho aesthetic and registry-style gifts",
  },
];

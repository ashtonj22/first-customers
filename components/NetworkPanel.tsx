"use client";

import type { Contact } from "@/lib/types";

const TIER_DOT: Record<Contact["closenessTier"], string> = {
  close: "bg-accent",
  warm: "bg-[#e8a060]",
  acquaintance: "bg-muted-foreground",
};

const STATUS_LABEL: Record<Contact["status"], string> = {
  not_contacted: "Not contacted",
  proposed: "Draft proposed",
  sent: "Sent, no reply yet",
  replied: "Replied",
  customer: "💜 Customer",
  referred_out: "🔁 Gave a referral",
  opted_out: "🚫 Opted out",
};

export default function NetworkPanel({ contacts }: { contacts: Contact[] }) {
  const original = contacts.filter((c) => !c.referredBy);
  const referred = contacts.filter((c) => !!c.referredBy);

  return (
    <div className="space-y-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Network
      </h2>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Original contacts
        </h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {original.map((c) => (
            <div key={c.id} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${TIER_DOT[c.closenessTier]}`} />
                <span className="font-medium text-foreground">{c.name}</span>
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">{c.relationship}</div>
              <div className="mt-1 text-xs font-medium text-foreground/80">
                {STATUS_LABEL[c.status]}
              </div>
            </div>
          ))}
        </div>
      </div>

      {referred.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Referred contacts
          </h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {referred.map((c) => (
              <div
                key={c.id}
                className="rounded-lg border border-accent/30 bg-accent/10 p-3"
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${TIER_DOT[c.closenessTier]}`} />
                  <span className="font-medium text-foreground">{c.name}</span>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">{c.notes}</div>
                <div className="mt-1 inline-flex items-center gap-1 rounded-[2px] bg-card px-2 py-0.5 text-[11px] font-medium text-[#5a6e42] ring-1 ring-accent/30">
                  via {c.referredBy} →
                </div>
                <div className="mt-1 text-xs font-medium text-foreground/80">
                  {STATUS_LABEL[c.status]}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

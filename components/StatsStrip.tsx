"use client";

import type { Contact } from "@/lib/types";

export default function StatsStrip({ contacts }: { contacts: Contact[] }) {
  const reached = contacts.filter((c) =>
    ["sent", "replied", "customer", "referred_out", "opted_out"].includes(c.status),
  ).length;
  const replies = contacts.filter((c) =>
    ["replied", "customer", "referred_out"].includes(c.status),
  ).length;
  const customers = contacts.filter((c) => c.status === "customer").length;
  const referrals = contacts.filter((c) => !!c.referredBy).length;
  const revenue = customers * 28;

  const stats = [
    { label: "Contacts reached", value: reached },
    { label: "Replies", value: replies },
    { label: "Customers", value: customers },
    { label: "Referrals", value: referrals },
    { label: "Revenue (sim)", value: `$${revenue}` },
  ];

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 px-6 pt-6 sm:grid-cols-5">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-lg border border-border bg-card px-4 py-3 text-center sm:text-left"
        >
          <div className="font-serif text-2xl font-normal tracking-tight text-foreground">
            {s.value}
          </div>
          <div className="text-xs text-muted-foreground">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

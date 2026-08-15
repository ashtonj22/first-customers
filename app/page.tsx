import Link from "next/link";

const PRINCIPLES = [
  {
    title: "The digital space is crowded",
    body: "Ads and cold outreach get more expensive and less heard every month. A first-time founder can't win there.",
  },
  {
    title: "Relationships are the fastest path to revenue",
    body: "A message from someone you actually know converts on trust, not on ad spend. Word of mouth is the shortest line to a first sale.",
  },
  {
    title: "People know people",
    body: "Every warm contact is also a door to their network. Referrals compound — one sale becomes the next three.",
  },
];

export default function IntroPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-6">
        <span className="font-serif text-lg font-normal tracking-tight text-foreground">
          First Customers
        </span>
        <span className="rounded-[2px] bg-sage px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-sage-foreground">
          MadeThis bounty
        </span>
      </div>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-16">
        <header className="mb-12">
          <h1 className="mb-3 font-serif text-4xl font-normal leading-tight tracking-tight text-foreground">
            Why I built it <em className="italic">this</em> way
          </h1>
          <p className="text-base text-muted-foreground">
            Thirty seconds on the problem and the first principles behind it — then the demo.
          </p>
        </header>

        <section className="mb-12">
          <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-sage-foreground">
            The problem
          </h2>
          <div className="space-y-4">
            <p className="border-l-2 border-sage-border pl-4 text-[15px] leading-relaxed text-foreground">
              <strong className="font-medium">MadeThis customers need revenue fast.</strong> Early
              revenue is what makes the business viable — and what makes the subscription worth
              renewing.
            </p>
            <p className="border-l-2 border-sage-border pl-4 text-[15px] leading-relaxed text-foreground">
              <strong className="font-medium">They aren&apos;t one audience.</strong> Thousands of
              makers selling wildly different things at wildly different stages. Any single canned
              playbook fits almost none of them.
            </p>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-sage-foreground">
            GTM first principles
          </h2>
          <ol className="grid gap-3 sm:grid-cols-3">
            {PRINCIPLES.map((p, i) => (
              <li
                key={p.title}
                className="rounded-lg border border-border bg-card p-5 shadow-sm"
              >
                <span className="mb-3 flex h-6 w-6 items-center justify-center rounded-full bg-sage text-xs font-medium text-sage-foreground">
                  {i + 1}
                </span>
                <h3 className="mb-1.5 text-sm font-medium text-foreground">{p.title}</h3>
                <p className="text-[13px] leading-relaxed text-muted-foreground">{p.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mb-12">
          <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-sage-foreground">
            The strategy
          </h2>
          <div className="rounded-lg border border-sage-border bg-sage/50 p-6">
            <p className="text-[15px] leading-relaxed text-foreground">
              Shorten every founder&apos;s time to first revenue by giving them one
              ultra-simplified, guided place to <strong className="font-medium">target</strong> the
              contacts who matter,{" "}
              <strong className="font-medium">reach out personally</strong>, and let the agent{" "}
              <strong className="font-medium">learn from every response</strong> — so the machine
              improves itself with each send, whatever the founder happens to sell.
            </p>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-5">
          <Link
            href="/onboarding"
            className="rounded-[2px] bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Enter the demo →
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Skip to the agent
          </Link>
        </div>
      </main>

      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        First Customers — a hackathon prototype for MadeThis. No real messages are sent; everything
        is simulated.
      </footer>
    </div>
  );
}

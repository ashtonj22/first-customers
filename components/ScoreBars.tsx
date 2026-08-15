import type { ScoreBreakdown } from "@/lib/types";

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-[#7d9663]"
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </div>
    </div>
  );
}

export default function ScoreBars({ score }: { score: ScoreBreakdown }) {
  return (
    <div className="space-y-1.5">
      <Bar label="Warmth" value={score.warmth} />
      <Bar label="Fit" value={score.fit} />
      <Bar label="Timing" value={score.timing} />
    </div>
  );
}

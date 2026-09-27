import { runInsights, medianSeconds, type Answer } from "@/lib/insights";

/**
 * What the run says about how you played.
 *
 * Sits BELOW the results card, never inside it, for the same reason the
 * mistake review does: the card is the screenshot that spreads the site, and
 * this is the part worth reading once, here, and never again.
 *
 * Renders nothing at all on a short run. Six answers is not enough to support
 * a claim about somebody's play, and a confident sentence built on four is
 * worse than silence - `runInsights` enforces that and this component just
 * disappears when it returns nothing.
 */
export function RunInsights({
  tape,
  mistakes,
}: {
  tape: Answer[];
  mistakes?: Record<string, { label: string; fix: string; count: number }>;
}) {
  const insights = runInsights(tape, mistakes ?? {});
  if (!insights.length) return null;

  const correct = tape.filter((a) => a.ok).length;

  return (
    <div className="w-full max-w-md border border-hairline">
      <div className="flex items-baseline justify-between border-b border-hairline px-4 py-2">
        <span className="text-[10px] uppercase tracking-[0.18em] text-secondary">
          What happened
        </span>
        <span className="tabular text-[10px] text-muted">
          {medianSeconds(tape).toFixed(1)}s median · {correct}/{tape.length}
        </span>
      </div>

      <ul className="divide-y divide-hairline">
        {insights.map((insight) => (
          <li key={insight.key} className="px-4 py-3">
            <div className="flex items-baseline gap-2">
              <span
                aria-hidden
                className={`mt-[3px] h-1.5 w-1.5 shrink-0 ${
                  insight.tone === "good"
                    ? "bg-data-pos"
                    : insight.tone === "warn"
                      ? "bg-data-neg"
                      : "bg-secondary"
                }`}
              />
              <p className="text-[13px] leading-snug text-primary">{insight.headline}</p>
            </div>
            <p className="mt-1.5 pl-3.5 text-[11px] leading-relaxed text-secondary">
              {insight.detail}
            </p>
          </li>
        ))}
      </ul>

      {/* Said once, plainly. Every number above came out of this run and
          nothing else - there is no server and nobody to be compared to. */}
      <p className="border-t border-hairline px-4 py-2 text-[10px] leading-relaxed text-muted">
        Worked out from this run only. Nothing was uploaded and nobody else was
        involved in the comparison.
      </p>
    </div>
  );
}

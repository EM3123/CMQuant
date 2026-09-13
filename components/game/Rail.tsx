import type { ReactNode } from "react";

/**
 * The status rail that runs across the top of every game in play.
 *
 * A terminal tells you the state of the machine on one line and gets out of
 * the way. The games were doing the opposite: a seventy-two pixel clock in the
 * dead centre of a 1440px screen with the question floating under it, which is
 * a quiz template with a dark theme on it.
 *
 * So the clock moves into the rail with everything else and the screen belongs
 * to the question. The drain bar under the rail carries the urgency the giant
 * numerals were carrying, and it does it in three pixels.
 */

export function Rail({
  code,
  cells,
  remainingMs,
  totalMs,
  penalty,
}: {
  /** Short game code, e.g. EQZ. */
  code: string;
  cells: RailCell[];
  remainingMs: number;
  totalMs: number;
  /** Shown briefly when a wrong answer costs time. Keyed by the caller. */
  penalty?: { id: number; label: string } | null;
}) {
  const left = Math.max(0, Math.min(1, remainingMs / totalMs));
  const urgent = remainingMs <= 10_000;

  return (
    <header className="relative shrink-0 border-b border-hairline">
      <div className="flex items-stretch divide-x divide-hairline">
        <div className="flex items-center gap-2 px-3 py-1.5">
          <span className="tabular text-[11px] tracking-[0.18em] text-accent-ink">
            {code}
          </span>
        </div>

        {cells.map((cell) => (
          <Cell key={cell.label} {...cell} />
        ))}

        <div className="ml-auto flex items-center gap-2 px-3 py-1.5">
          <span className="text-[9px] uppercase tracking-[0.18em] text-secondary">
            Clock
          </span>
          <span
            className={`tabular text-base leading-none ${
              urgent ? "text-data-neg" : "text-primary"
            }`}
          >
            {formatClock(remainingMs)}
          </span>
          {penalty && (
            <span
              key={penalty.id}
              className="rise-away tabular text-[11px] text-data-neg"
            >
              {penalty.label}
            </span>
          )}
        </div>
      </div>

      {/* The clock, again, as a thing that is visibly running out. */}
      <div
        className={`h-[3px] origin-left transition-none ${
          urgent ? "bg-data-neg" : "bg-accent"
        }`}
        style={{ transform: `scaleX(${left})` }}
      />
    </header>
  );
}

export type RailCell = {
  label: string;
  value: string;
  tone?: "pos" | "neg" | "accent" | "muted";
};

function Cell({ label, value, tone }: RailCell) {
  const colour =
    tone === "pos"
      ? "text-data-pos"
      : tone === "neg"
        ? "text-data-neg"
        : tone === "accent"
          ? "text-accent-ink"
          : tone === "muted"
            ? "text-muted"
            : "text-primary";

  return (
    <div className="flex items-baseline gap-2 px-3 py-1.5">
      <span className="text-[9px] uppercase tracking-[0.18em] text-secondary">
        {label}
      </span>
      <span className={`tabular text-[12px] ${colour}`}>{value}</span>
    </div>
  );
}

export function formatClock(ms: number): string {
  const seconds = ms / 1000;
  // Under ten seconds the tenths do the work of making it feel urgent.
  if (seconds <= 10) return (Math.ceil(ms / 100) / 10).toFixed(1);
  const total = Math.ceil(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * The tape: the last handful of answers, newest on the right.
 *
 * Every trading screen has one, and here it is doing real work rather than
 * decoration - it is the only place you can see that you have started rushing,
 * because the times are printed next to the results.
 */
export function Tape({
  entries,
  hint,
}: {
  entries: { id: number; ok: boolean; ms: number }[];
  hint: ReactNode;
}) {
  const shown = entries.slice(-14);

  return (
    <footer className="shrink-0 border-t border-hairline">
      <div className="flex items-center gap-3 px-3 py-1">
        <span className="text-[9px] uppercase tracking-[0.18em] text-secondary">
          Tape
        </span>
        <div className="flex min-h-[18px] flex-1 items-center gap-px overflow-hidden">
          {shown.map((entry) => (
            <span
              key={entry.id}
              className={`tabular px-1.5 py-[1px] text-[9px] leading-none ${
                entry.ok
                  ? "bg-data-pos/15 text-data-pos"
                  : "bg-data-neg/15 text-data-neg"
              }`}
            >
              {(entry.ms / 1000).toFixed(1)}
            </span>
          ))}
        </div>
        <span className="hidden text-[9px] text-muted sm:block">{hint}</span>
      </div>
    </footer>
  );
}

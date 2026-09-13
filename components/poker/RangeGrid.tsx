import { RANKS } from "@/lib/cards";
import {
  FLOP_STRENGTH,
  FLOP_STRENGTH_MIN,
  FLOP_STRENGTH_MAX,
} from "@/lib/poker/flop-strength";

/**
 * The 13 x 13 starting-hand matrix, shaded by intensity.
 *
 * design.md asks for "varying intensities of dark red and charcoal to indicate
 * strategic EV distributions". The intensity is real and the quantity is
 * stated on screen, because an invented EV distribution is precisely the
 * failure this wing exists to avoid.
 *
 * What shades it: for each of the 169 hands, the exact share of the 19,600
 * possible flops on which it makes two pair or better. Every flop enumerated,
 * none sampled. `scripts/build-flop-strength.ts` computes the table and
 * `scripts/verify-flop-strength.ts` recomputes a sample of it a second way.
 *
 * Preflop equity would have been the natural quantity and is not reachable
 * here - exact equity against a random hand is on the order of a billion
 * evaluations per starting hand, and this project does not Monte Carlo. Two
 * pair or better is the strongest thing that is exactly computable in seconds,
 * and it separates the hands that can flop a straight or a flush from the ones
 * that cannot, which is most of what a range chart is for.
 */

function shapeAt(row: number, col: number) {
  if (row === col) return "pair" as const;
  return col > row ? ("suited" as const) : ("offsuit" as const);
}

/**
 * RANKS is already ace-first, which is the order a hand grid wants: AA top
 * left, 22 bottom right, suited above the diagonal, offsuit below. Reversing
 * it - which the first version did - builds the chart upside down and
 * mirrored, and any poker player would know at a glance.
 */
function label(row: number, col: number): string {
  const high = RANKS[Math.min(row, col)];
  const low = RANKS[Math.max(row, col)];
  const shape = shapeAt(row, col);
  if (shape === "pair") return `${high}${high}`;
  return `${high}${low}${shape === "suited" ? "s" : "o"}`;
}

/**
 * Charcoal at the weakest cell, deep red at the strongest. Normalised across
 * the table's own range, because the raw numbers run 6% to 28% and a ramp
 * anchored at zero would show almost no variation at all.
 */
function cellStyle(value: number) {
  const t = (value - FLOP_STRENGTH_MIN) / (FLOP_STRENGTH_MAX - FLOP_STRENGTH_MIN);
  const eased = Math.pow(t, 0.7);
  return {
    backgroundColor: `color-mix(in oklab, var(--color-deep-red) ${(
      8 +
      eased * 74
    ).toFixed(1)}%, var(--color-charcoal))`,
  };
}

export function RangeGrid({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between border-b border-hairline pb-1.5">
        <span className="text-[9px] uppercase tracking-[0.18em] text-secondary">
          Range matrix
        </span>
        <span className="text-[9px] uppercase tracking-[0.18em] text-muted">
          169 hands
        </span>
      </div>

      <div
        className="mt-2 grid gap-px"
        style={{ gridTemplateColumns: "repeat(13, minmax(0, 1fr))" }}
      >
        {FLOP_STRENGTH.flatMap((cells, row) =>
          cells.map((value, col) => (
            <div
              key={`${row}-${col}`}
              title={`${label(row, col)} — flops two pair or better ${(
                value * 100
              ).toFixed(1)}% of the time`}
              style={cellStyle(value)}
              className="flex aspect-square items-center justify-center text-[6px] leading-none text-ash-red/85 sm:text-[8px]"
            >
              {label(row, col)}
            </div>
          ))
        )}
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <span className="tabular text-[9px] text-muted">
          {(FLOP_STRENGTH_MIN * 100).toFixed(0)}%
        </span>
        <span
          className="h-1.5 flex-1"
          style={{
            backgroundImage:
              "linear-gradient(to right, color-mix(in oklab, var(--color-deep-red) 8%, var(--color-charcoal)), var(--color-deep-red))",
          }}
        />
        <span className="tabular text-[9px] text-muted">
          {(FLOP_STRENGTH_MAX * 100).toFixed(0)}%
        </span>
      </div>
      <p className="mt-2 text-[9px] leading-relaxed text-muted">
        Shaded by how often the hand flops two pair or better. All 19,600 flops
        enumerated for each of the 169 hands. Not an EV estimate and not a
        range.
      </p>
    </div>
  );
}

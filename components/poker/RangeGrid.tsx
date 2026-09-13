import { RANKS } from "@/lib/cards";

/**
 * The 13 x 13 starting-hand matrix.
 *
 * This is the single most recognisable object in poker analysis, and putting
 * it at the top of the Poker Lab does the job a felt table and a fanned hand
 * were failing at: it says at a glance that this wing is a study tool and not
 * a casino. Every solver, every range chart and every training site draws this
 * grid. Nobody has ever drawn it on a slot machine.
 *
 * WHAT THE COLOURS MEAN, AND WHY THEY ARE NOT A RANGE.
 *
 * The obvious thing to shade it by is an opening range, and that is exactly
 * the thing this project will not fabricate. A range chart is a claim about
 * correct play, it varies by position, stack depth and opponent, and inventing
 * a plausible-looking one is the credibility failure the whole poker wing is
 * built to avoid.
 *
 * So it is shaded by combinations, which is not a claim at all - it is a
 * count, and it is exactly true. A pocket pair can be dealt six ways, a suited
 * hand four, an offsuit hand twelve. That is the first lesson in Combinatorics
 * and the grid is now a legend for it: the diagonal is the pairs, above it is
 * suited, below it is offsuit, and the shading is how many ways each one
 * exists before a single card hits the board.
 */

/** Combinations of each shape, before any board. */
const COMBOS = { pair: 6, suited: 4, offsuit: 12 } as const;

type Shape = keyof typeof COMBOS;

function shapeAt(row: number, col: number): Shape {
  if (row === col) return "pair";
  return col > row ? "suited" : "offsuit";
}

/**
 * RANKS is already ace-first, which is the order a hand grid wants: AA in the
 * top left, 22 in the bottom right, suited above the diagonal and offsuit
 * below it. Reversing it - which the first version did - builds the chart
 * upside down and mirrored, and every poker player who saw it would know
 * instantly that whoever made it had never used one.
 *
 * The lower index is the higher card, so the label always names the high card
 * first: AKs, never KAs.
 */
function label(row: number, col: number): string {
  const high = RANKS[Math.min(row, col)];
  const low = RANKS[Math.max(row, col)];
  const shape = shapeAt(row, col);
  if (shape === "pair") return `${high}${high}`;
  return `${high}${low}${shape === "suited" ? "s" : "o"}`;
}

const CELL: Record<Shape, string> = {
  // Offsuit is the most common shape and gets the most ink, which is the point
  // the grid is making. Pairs are the rarest and read as the quiet diagonal.
  offsuit: "bg-act-raise/28 text-primary",
  suited: "bg-act-call/22 text-primary",
  pair: "bg-act-fold/45 text-primary",
};

export function RangeGrid({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <div
        className="grid gap-px"
        style={{ gridTemplateColumns: "repeat(13, minmax(0, 1fr))" }}
      >
        {Array.from({ length: 13 }).flatMap((_, row) =>
          Array.from({ length: 13 }).map((_, col) => {
            const shape = shapeAt(row, col);
            return (
              <div
                key={`${row}-${col}`}
                title={`${label(row, col)} · ${COMBOS[shape]} combinations`}
                className={`tabular flex aspect-square items-center justify-center text-[7px] leading-none sm:text-[9px] ${CELL[shape]}`}
              >
                {label(row, col)}
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        <Key tone="bg-act-fold/45" name="Pairs" count={COMBOS.pair} />
        <Key tone="bg-act-call/22" name="Suited" count={COMBOS.suited} />
        <Key tone="bg-act-raise/28" name="Offsuit" count={COMBOS.offsuit} />
      </div>
    </div>
  );
}

function Key({ tone, name, count }: { tone: string; name: string; count: number }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`h-2.5 w-2.5 ${tone}`} />
      <span className="text-[10px] uppercase tracking-[0.18em] text-secondary">{name}</span>
      <span className="tabular text-[11px] text-primary">{count}</span>
    </span>
  );
}

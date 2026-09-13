import { difficultyForIndex as equalize } from "@/lib/games/equalize";
import { difficultyForIndex as outs } from "@/lib/games/outs";
import { difficultyForIndex as memoryTiles } from "@/lib/games/memorytiles";
import { difficultyForIndex as pokerMinute } from "@/lib/games/pokerminute";

/**
 * The analytics panel: flat, borderless, no drop shadows, per design.md.
 *
 * What it plots is the one curve this product actually has - how difficulty
 * climbs with the question index, for each generator. It is computed here by
 * calling the same `difficultyForIndex` the games call, so the plot cannot
 * disagree with the run you are about to play.
 *
 * It is also the visible form of the rule the whole project rests on:
 * difficulty follows the INDEX and never the player. Two people on one seed
 * walk the same curve. If any of these lines ever depended on performance,
 * shared challenge links would be a lie, and this panel would be the place you
 * noticed.
 */

/**
 * Four distinct ramps, not four games. Six of the nine generators share
 * `1 + floor(index / 3)` exactly, so plotting them all drew four identical
 * lines on top of each other and showed one - which looked like a broken chart
 * and was really a true fact about the codebase, badly presented.
 *
 * These are the four slopes that actually exist. The label says how many
 * generators sit on each.
 */
const SERIES = [
  { name: "idx/3", note: "6 drills", at: equalize, colour: "var(--color-data-pos)" },
  { name: "idx/2", note: "outs", at: outs, colour: "#4aa8ff" },
  { name: "idx/1.5", note: "tiles", at: memoryTiles, colour: "var(--color-scots-rose)" },
  { name: "idx/1.2", note: "minute", at: pokerMinute, colour: "var(--color-gold-leaf)" },
];

const POINTS = 46;
const W = 300;
const H = 96;

function path(at: (i: number) => number): string {
  return Array.from({ length: POINTS }, (_, i) => {
    const x = (i / (POINTS - 1)) * W;
    const y = H - ((at(i) - 1) / 9) * H;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
}

export function RampPlot() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-baseline justify-between border-b border-hairline px-3 py-1.5">
        <span className="text-[9px] uppercase tracking-[0.18em] text-secondary">
          Difficulty ramp
        </span>
        <span className="tabular text-[9px] text-muted">d1—d10 · idx 0—45</span>
      </div>

      <div className="flex-1 px-3 py-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden>
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <line
              key={f}
              x1="0"
              x2={W}
              y1={f * H}
              y2={f * H}
              stroke="var(--color-dark-iron)"
              strokeWidth="0.7"
            />
          ))}
          {SERIES.map((s) => (
            <path
              key={s.name}
              d={path(s.at)}
              fill="none"
              stroke={s.colour}
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          ))}
        </svg>

        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {SERIES.map((s) => (
            <span key={s.name} className="flex items-center gap-1.5">
              <span
                className="inline-block h-[2px] w-3.5"
                style={{ backgroundColor: s.colour }}
              />
              <span className="tabular text-[9px] text-secondary">{s.name}</span>
              <span className="text-[9px] text-muted">{s.note}</span>
            </span>
          ))}
        </div>

        <p className="mt-2.5 text-[9px] leading-relaxed text-muted">
          Difficulty is a function of the question index and never of the
          player. Two people holding one seed walk the same curve, which is the
          only reason a shared run is comparable at all.
        </p>
      </div>
    </div>
  );
}

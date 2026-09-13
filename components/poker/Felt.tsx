import type { ReactNode } from "react";
import { PlayingCard, type CardCode } from "@/components/cards/PlayingCard";
import { ChipPile } from "@/components/poker/Chips";

/**
 * The table every poker game is played on.
 *
 * One component, shared by Pot Odds, Outs and Combinatorics, so a spot looks
 * the same everywhere and a fix lands in three games at once. Before this the
 * three games each stacked a "Board" label over some cards over a ledger over
 * some buttons, which is a form, not a table.
 *
 * What makes it read as a real table, in order of how much each contributes:
 * the felt is a surface with a rail and a light on it rather than a flat
 * colour; the board sits in the middle where a dealer puts it; the pot is
 * chips, not a number; and the hero's cards overlap the near rail so they are
 * clearly yours rather than another row of the layout.
 *
 * The felt is nearly black. design.md sets this realm to absolute matte black
 * and a bright green table would fight it, so the green is only just present -
 * enough that the eye calls it felt, not enough to be a colour.
 */
export function Felt({
  board,
  hero,
  pot,
  bet,
  betLabel = "They bet",
  children,
}: {
  /** Community cards, dealt left to right. */
  board: CardCode[];
  /** The two cards in front of you. */
  hero?: CardCode[];
  /** Chips in the middle. Omitted when the game is not about money. */
  pot?: number;
  /** What is in front of the villain, if anything. */
  bet?: number;
  betLabel?: string;
  /** Anything that belongs on the felt itself, under the board. */
  children?: ReactNode;
}) {
  return (
    <div className="relative w-full max-w-2xl">
      {/* Rail. A real table has a padded edge and it is the thing that makes
          the felt read as inset rather than as a background colour. */}
      <div className="rounded-[46%/38%] border border-hairline-strong bg-[linear-gradient(180deg,#241414_0%,#150c0c_55%,#0b0606_100%)] p-2.5 shadow-[0_18px_44px_-20px_rgba(0,0,0,0.95)] sm:p-3.5">
        {/* Felt. Two radials: the overhead light, then the fall-off into the
            corners. The weave is a pair of hairline gradients at 4px, which is
            below the size anyone consciously sees and above the size that
            disappears. */}
        <div
          className="relative rounded-[46%/38%] px-4 py-5 sm:px-10 sm:py-6"
          style={{
            backgroundImage: [
              "radial-gradient(62% 74% at 50% 30%, rgba(31,92,60,0.42) 0%, rgba(9,26,17,0.9) 58%, rgba(4,10,7,1) 100%)",
              "repeating-linear-gradient(45deg, rgba(255,255,255,0.014) 0 1px, transparent 1px 4px)",
              "repeating-linear-gradient(-45deg, rgba(0,0,0,0.05) 0 1px, transparent 1px 4px)",
            ].join(","),
            boxShadow: "inset 0 2px 18px rgba(0,0,0,0.75), inset 0 0 60px rgba(0,0,0,0.55)",
          }}
        >
          {/* The dealer's arc, printed on the felt the way a real one is. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-[12%] top-[14%] h-[62%] rounded-[50%] border border-white/[0.045]"
          />

          <div className="relative flex flex-col items-center gap-3">
            {typeof pot === "number" && (
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-[9px] uppercase tracking-[0.3em] text-white/40">
                  Pot
                </span>
                <ChipPile amount={pot} size={24} />
                <span className="tabular text-base text-white/90">
                  {pot.toLocaleString()}
                </span>
              </div>
            )}

            <div className="flex items-end gap-1.5 sm:gap-2">
              {board.map((code, i) => (
                <PlayingCard key={`${code}-${i}`} code={code} size="sm" />
              ))}
            </div>

            {typeof bet === "number" && (
              <div className="flex flex-col items-center gap-1.5">
                <ChipPile amount={bet} size={21} />
                <span className="text-[9px] uppercase tracking-[0.3em] text-accent-ink">
                  {betLabel} <span className="tabular">{bet.toLocaleString()}</span>
                </span>
              </div>
            )}

            {children}
          </div>
        </div>
      </div>

      {/* Your cards, overlapping the near rail. Sitting them ON the edge is
          what says "these are in front of you" without a label. */}
      {hero && hero.length > 0 && (
        <div className="-mt-5 flex items-end justify-center gap-1.5">
          <div className="flex items-end gap-1">
            {hero.map((code, i) => (
              <PlayingCard
                key={`${code}-${i}`}
                code={code}
                size="sm"
                rotate={i === 0 ? -6 : 6}
                lift={i === 0 ? 3 : 0}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

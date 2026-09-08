// MEMORY TILES - a pattern lights up, then goes dark, and you tap it back.
//
// This is the game the spec nominates as the test of whether the extracted
// engine holds. It does not: ChoiceRun assumes one keypress settles one
// question, and a recall question needs a show phase, a recall phase, and
// several taps before it resolves. The generator below is still pure and
// seeded like every other, which is the part that actually had to generalise.

import { createRng, randInt, ramp, clampDifficulty } from "@/lib/rng";

export type MemoryTilesQuestion = {
  /** Grid is size x size. */
  size: number;
  /** Cell indices that light up, ascending. */
  tiles: number[];
  /** How long the pattern stays visible, in milliseconds. */
  showMs: number;
  difficulty: number;
};

/** Board and pattern both grow, but the board grows in steps and the pattern
 *  every level, so the density climbs and then resets. */
function shape(d: number): { size: number; count: number } {
  const size = d <= 3 ? 3 : d <= 6 ? 4 : d <= 9 ? 5 : 6;
  const count = [3, 4, 4, 5, 5, 6, 6, 7, 8, 9][d - 1];
  return { size, count };
}

export function generate(seed: string, difficulty: number): MemoryTilesQuestion {
  const d = clampDifficulty(difficulty);
  const rng = createRng(`memorytiles:${seed}:${d}`);
  const { size, count } = shape(d);
  const cells = size * size;

  // Sample without replacement. A pattern that repeats a cell would light
  // fewer squares than it claims and make the count a lie.
  const chosen = new Set<number>();
  while (chosen.size < Math.min(count, cells)) {
    chosen.add(randInt(rng, 0, cells - 1));
  }

  return {
    size,
    tiles: [...chosen].sort((a, b) => a - b),
    showMs: Math.round(ramp(d, 1100, 620)),
    difficulty: d,
  };
}

/**
 * A faster ramp than the other games. A recall question takes four or five
 * seconds, so a sixty-second round is only a dozen questions - at one level
 * every three questions nobody would ever see a six-by-six board.
 */
export function difficultyForIndex(index: number): number {
  return clampDifficulty(1 + Math.floor(index / 1.5));
}

export function questionAt(runSeed: string, index: number): MemoryTilesQuestion {
  return generate(`${runSeed}#${index}`, difficultyForIndex(index));
}

export const ROUND_MS = 60_000;
export const WRONG_PENALTY_MS = 3_000;

export function score(
  question: MemoryTilesQuestion,
  msElapsed: number,
  streak: number
): number {
  // Paid per tile, because a nine-tile pattern is not the same work as three.
  const base = 40 * question.tiles.length;
  const speed = Math.max(0, Math.min(1, (6000 - msElapsed) / 4500));
  const multiplier = Math.min(2, 1 + streak * 0.05);
  return Math.round(base * (1 + speed * 0.6) * multiplier);
}

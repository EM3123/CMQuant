// POT ODDS - given a pot and a bet you are facing, what share of the time do
// you have to win for calling to break even?
//
//   pot P, opponent bets B, you call B
//   final pot = P + B + B
//   break-even = B / (P + 2B)
//
// The generator's real work is the wrong answers. Every distractor is a mistake
// somebody actually makes at a table, so being wrong here tells you which error
// you are carrying rather than just that you missed.

import { createRng, randInt, ramp, clampDifficulty, type Rng } from "@/lib/rng";

/**
 * Which mistake an option represents. The generator already builds distractors
 * out of real errors; keeping the label means a wrong answer can say which
 * error it was instead of only that there was one.
 */
export type PotOddsMistake = "forgot-call" | "raw-ratio" | "double-counted" | null;

export const MISTAKE_LABEL: Record<Exclude<PotOddsMistake, null>, string> = {
  "forgot-call": "Left your own call out of the pot",
  "raw-ratio": "Used the raw bet-to-pot ratio",
  "double-counted": "Counted your call twice",
};

export const MISTAKE_FIX: Record<Exclude<PotOddsMistake, null>, string> = {
  "forgot-call":
    "The pot you are trying to win already contains the chips you are about to put in. Divide by pot + their bet + your call.",
  "raw-ratio":
    "Bet divided by pot is the price in pot-sized terms, not a probability. The denominator has to be the whole pot after the call.",
  "double-counted":
    "Your call goes in once. The denominator is pot + bet + call, not pot + bet + call + call.",
};

export type PotOddsQuestion = {
  pot: number;
  bet: number;
  /** Fractions in 0..1, ascending, so the row reads as a scale. */
  options: number[];
  /** Aligned with options. Null where an option is just a near miss. */
  diagnoses: PotOddsMistake[];
  answerIndex: number;
  difficulty: number;
};

/** The correct break-even share. Your call goes into the pot too. */
export function breakEven(pot: number, bet: number): number {
  return bet / (pot + 2 * bet);
}

/** Forgetting that your own call is part of the pot you are trying to win. */
function forgotOwnCall(pot: number, bet: number): number {
  return bet / (pot + bet);
}

/** Reading pot odds as a raw bet-to-pot ratio. */
function rawRatio(pot: number, bet: number): number {
  return bet / pot;
}

/** Counting the call twice on top of the bet. */
function doubleCounted(pot: number, bet: number): number {
  return bet / (pot + 3 * bet);
}

/** Chip values get uglier as difficulty climbs. Round numbers are a crutch. */
function chipStep(d: number): number {
  if (d <= 2) return 50;
  if (d <= 4) return 25;
  if (d <= 6) return 10;
  if (d <= 8) return 5;
  return 1;
}

/** How far apart the four options must sit, in percentage points. */
function minSeparation(d: number): number {
  return ramp(d, 4.5, 1.3) / 100;
}

const MAX_ATTEMPTS = 300;

/** Deterministic Fisher-Yates, so distractor preference order is seeded too. */
function shuffled<T>(rng: Rng, xs: readonly T[]): T[] {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * An option is only worth putting on screen if a real player might pick it.
 * Anything under 4% or over 70% break-even gets eliminated on sight, which
 * turns a four-way question into a three-way one.
 */
function plausible(value: number): boolean {
  return value > 0.04 && value < 0.7;
}

export function generate(seed: string, difficulty: number): PotOddsQuestion {
  const d = clampDifficulty(difficulty);
  const rng = createRng(`potodds:${seed}:${d}`);
  const step = chipStep(d);
  const gap = minSeparation(d);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const pot = step * randInt(rng, Math.max(2, Math.round(150 / step)), Math.round(1200 / step));

    // Bet as a share of the pot rather than an independent draw. Drawing them
    // separately made almost every bet land near pot-sized, which pinned the
    // answer around 32% every single time.
    const ratio = 0.25 + rng() * 1.25;
    const bet = Math.max(step, step * Math.round((pot * ratio) / step));

    const answer = breakEven(pot, bet);
    if (answer < 0.1 || answer > 0.42) continue;

    // Decide up front how many distractors sit below the answer. Without this
    // the correct option could never be the smallest or largest on screen,
    // and its slot leaked the answer.
    //
    // How many will actually fit depends on the answer: a 12% break-even has
    // no room for three separated, plausible options underneath it. Asking for
    // more than fits just burns attempts and quietly starves the top slot, so
    // the ceiling is computed rather than hoped for.
    const maxBelow = Math.min(3, Math.floor((answer - 0.05) / gap));
    if (maxBelow < 0) continue;
    const belowCount = randInt(rng, 0, maxBelow);

    const chosen: { value: number; mistake: PotOddsMistake }[] = [
      { value: answer, mistake: null },
    ];
    const accept = (value: number, mistake: PotOddsMistake): boolean => {
      if (!plausible(value)) return false;
      for (const existing of chosen) {
        if (Math.abs(existing.value - value) < gap) return false;
      }
      chosen.push({ value, mistake });
      return true;
    };

    const fill = (
      count: number,
      direction: -1 | 1,
      structural: { value: number; mistake: PotOddsMistake }[]
    ): boolean => {
      let need = count;
      for (const candidate of shuffled(rng, structural)) {
        if (need === 0) break;
        if (
          Math.sign(candidate.value - answer) === direction &&
          accept(candidate.value, candidate.mistake)
        ) {
          need--;
        }
      }
      for (let guard = 0; need > 0 && guard < 60; guard++) {
        const offset = gap * (1 + rng() * 2.2);
        if (accept(answer + direction * offset, null)) need--;
      }
      return need === 0;
    };

    const below = [
      { value: doubleCounted(pot, bet), mistake: "double-counted" as const },
    ];
    const above = [
      { value: forgotOwnCall(pot, bet), mistake: "forgot-call" as const },
      { value: rawRatio(pot, bet), mistake: "raw-ratio" as const },
    ];

    if (!fill(belowCount, -1, below)) continue;
    if (!fill(3 - belowCount, 1, above)) continue;

    const sorted = [...chosen].sort((a, b) => a.value - b.value);
    return {
      pot,
      bet,
      options: sorted.map((o) => o.value),
      diagnoses: sorted.map((o) => o.mistake),
      answerIndex: sorted.findIndex((o) => o.value === answer),
      difficulty: d,
    };
  }

  throw new Error(`potodds: no valid question for seed ${seed} at difficulty ${d}`);
}

export function difficultyForIndex(index: number): number {
  return clampDifficulty(1 + Math.floor(index / 3));
}

export function questionAt(runSeed: string, index: number): PotOddsQuestion {
  return generate(`${runSeed}#${index}`, difficultyForIndex(index));
}

export function validate(question: PotOddsQuestion, chosen: number): boolean {
  return chosen === question.answerIndex;
}

export function formatPercent(fraction: number): string {
  const pct = fraction * 100;
  const rounded = Math.round(pct * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
}

export const ROUND_MS = 60_000;
export const WRONG_PENALTY_MS = 2_000;

/** Reading a pot, a bet and four options takes longer than this. Below it,
 *  the player picked a box rather than solving anything. */
export const GUESS_FLOOR_MS = 500;

export function score(
  question: PotOddsQuestion,
  msElapsed: number,
  streak: number
): number {
  const base = 100;
  const speed =
    msElapsed < GUESS_FLOOR_MS
      ? 0
      : Math.max(0, Math.min(1, (7000 - msElapsed) / 5200));
  const multiplier = Math.min(2, 1 + streak * 0.05);
  const difficultyBonus = 1 + (question.difficulty - 1) * 0.05;
  return Math.round((base + speed * 100) * multiplier * difficultyBonus);
}

// Re-exported so a Rng-typed helper stays available to tests without reaching
// into lib/rng directly.
export type { Rng };

// SIGNAL - find the series that is actually going somewhere.
//
// Four series are drawn on one shared scale. Exactly one has a real drift
// planted in it; the other three are noise around a flat line. The question is
// which, and the skill is separating a trend from the three things that most
// often get mistaken for one.
//
// THE THREE DECOYS ARE THE GAME
//
// Each noise series is shaped to be tempting in a specific, nameable way:
//
//   - one finishes higher than everything else, which is LEVEL, not trend;
//   - one swings wider than everything else, which is VOLATILITY, not trend;
//   - one contains the single largest jump on screen, which is one MOVE, not
//     a direction.
//
// All three are flat by construction. A player who picks by "which ends
// highest" is not making a near miss, they are using a rule that will be
// wrong again tomorrow, and the results screen says so by name.
//
// WHICH MEANS THE HARD GUARANTEE IS NEGATIVE. It is not enough for the signal
// to trend. No wrong heuristic may accidentally land on it, so the generator
// rejects any deal where the signal also ends highest, or swings widest, or
// owns the biggest jump. Without that a player could pick by the wrong rule,
// be told they were right, and learn the wrong thing - which is worse than
// being told nothing.

import { createRng, randInt, ramp, clampDifficulty, type Rng } from "@/lib/rng";

export type MistakeKey = "ends-highest" | "widest-range" | "biggest-jump";

export type SignalQuestion = {
  /** Four series of equal length, drawn on one shared scale. */
  series: number[][];
  answerIndex: number;
  /** Aligned with `series`. Null on the answer. */
  diagnoses: (MistakeKey | null)[];
  /** The shared y range the four are drawn against. */
  low: number;
  high: number;
  /** Planted change per step on the signal. Negative when it drifts down. */
  drift: number;
  difficulty: number;
};

export const MISTAKE_LABEL: Record<MistakeKey, string> = {
  "ends-highest": "Picked the one that finished highest",
  "widest-range": "Picked the one that moved the most",
  "biggest-jump": "Picked the one with the biggest single jump",
};

export const MISTAKE_FIX: Record<MistakeKey, string> = {
  "ends-highest":
    "Where a series ends says where it started, not which way it is going. That one was flat the whole way and simply began above the others.",
  "widest-range":
    "A wide swing is volatility. Noise with a big amplitude covers a lot of ground and arrives back where it started.",
  "biggest-jump":
    "One large move is an event, not a direction. Look at whether the series keeps going after it, or comes straight back.",
};

/* -------------------------------------------------------------------------- */
/* Measurements. Every one of these is also what a decoy is named after.      */
/* -------------------------------------------------------------------------- */

/** Ordinary least squares slope against the index. The definition of trend. */
export function slopeOf(series: number[]): number {
  const n = series.length;
  const meanX = (n - 1) / 2;
  const meanY = series.reduce((a, b) => a + b, 0) / n;
  let top = 0;
  let bottom = 0;
  for (let i = 0; i < n; i++) {
    top += (i - meanX) * (series[i] - meanY);
    bottom += (i - meanX) * (i - meanX);
  }
  return bottom === 0 ? 0 : top / bottom;
}

export function rangeOf(series: number[]): number {
  return Math.max(...series) - Math.min(...series);
}

export function biggestJump(series: number[]): number {
  let worst = 0;
  for (let i = 1; i < series.length; i++) {
    worst = Math.max(worst, Math.abs(series[i] - series[i - 1]));
  }
  return worst;
}

export function endsAt(series: number[]): number {
  return series[series.length - 1];
}

/* -------------------------------------------------------------------------- */
/* Difficulty                                                                 */
/* -------------------------------------------------------------------------- */

/** How many points in each series. */
function lengthFor(d: number): number {
  return Math.round(ramp(d, 8, 14));
}

/** How far a noisy point strays from its line. */
function noiseFor(d: number): number {
  return Math.round(ramp(d, 3, 9));
}

/** The planted drift per step. Obvious at first, subtle by the end. */
function driftFor(d: number): number {
  return Math.max(1, Math.round(ramp(d, 7, 2)));
}

/**
 * How much steeper the signal must be than the steepest decoy.
 *
 * This is the honesty dial. Noise has a slope too - three flat series will
 * always produce some accidental drift - so "the signal trends" is not a
 * guarantee unless it out-trends every accident by a stated margin. At
 * difficulty ten the margin is 1.6x, which is still a fact rather than a
 * judgement call, but it is close enough to be hard.
 */
function marginFor(d: number): number {
  return ramp(d, 4, 1.6);
}

const MAX_ATTEMPTS = 200;

/* -------------------------------------------------------------------------- */
/* Generation                                                                 */
/* -------------------------------------------------------------------------- */

function noisy(rng: Rng, base: number, n: number, amp: number): number[] {
  return Array.from({ length: n }, () => base + randInt(rng, -amp, amp));
}

export function generate(seed: string, difficulty: number): SignalQuestion {
  const d = clampDifficulty(difficulty);
  const rng = createRng(`signal:${seed}:${d}`);

  const n = lengthFor(d);
  const amp = noiseFor(d);
  const step = driftFor(d);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const up = rng() < 0.5;
    const drift = up ? step : -step;
    const base = randInt(rng, 40, 60);
    const total = Math.abs(drift) * (n - 1);

    // The signal: a straight line with the same noise as everything else on
    // top of it. Same noise, or the trend would be findable by texture.
    const signal = Array.from(
      { length: n },
      (_, i) => base + drift * i + randInt(rng, -amp, amp)
    );

    // Decoy one: swings wider than anything else, and ends where it began.
    const wide = Math.ceil((total + 2 * amp) / 2) + randInt(rng, 3, 7);
    const swing = noisy(rng, base, n, wide);

    // Decoy two: flat, with one large step in the middle of it.
    const jump = Math.max(biggestJump(signal), biggestJump(swing)) + randInt(rng, 4, 10);
    const spike = noisy(rng, base, n, Math.max(1, Math.floor(amp / 2)));
    const at = randInt(rng, 1, n - 2);
    spike[at] -= Math.round(jump / 2);
    spike[at + 1] += jump - Math.round(jump / 2);

    // Decoy three: finishes above everything. Flat, just starting high.
    //
    // Built LAST, and anchored to the highest FINISH among the other three
    // rather than to the top of the signal. Anchoring it to the signal made
    // the game two-thirds upward trends and nothing on screen said so: on a
    // downward signal the peak is the first point, so this decoy sat barely
    // above the starting line, the wide swing routinely finished above it,
    // the deal failed its own guarantee and was thrown away. Upward deals
    // survived, downward ones did not, and the game could be played by
    // looking for a rise. Found by counting, not by playing.
    const topEnd = Math.max(endsAt(signal), endsAt(swing), endsAt(spike));
    const high = noisy(rng, topEnd + amp + randInt(rng, 2, 6), n, amp);

    const all = [signal, high, swing, spike];

    // THE GUARANTEES. Every one of these is measured, not assumed.
    const slopes = all.map((s) => Math.abs(slopeOf(s)));
    const decoySlope = Math.max(slopes[1], slopes[2], slopes[3]);
    if (slopes[0] < decoySlope * marginFor(d)) continue;

    // Each decoy must genuinely own the property it is named for, or the
    // diagnosis printed on the results screen would be false.
    const ends = all.map(endsAt);
    if (ends[1] !== Math.max(...ends) || ends.filter((e) => e === ends[1]).length > 1) continue;
    const ranges = all.map(rangeOf);
    if (ranges[2] !== Math.max(...ranges) || ranges.filter((r) => r === ranges[2]).length > 1) {
      continue;
    }
    const jumps = all.map(biggestJump);
    if (jumps[3] !== Math.max(...jumps) || jumps.filter((j) => j === jumps[3]).length > 1) {
      continue;
    }

    // And the signal must own none of them, so no wrong rule finds it.
    if (ends[0] === Math.max(...ends)) continue;
    if (ranges[0] === Math.max(...ranges)) continue;
    if (jumps[0] === Math.max(...jumps)) continue;

    // Shuffle the four together with their diagnoses.
    const order = [0, 1, 2, 3];
    for (let i = 3; i > 0; i--) {
      const j = randInt(rng, 0, i);
      [order[i], order[j]] = [order[j], order[i]];
    }
    const keys: (MistakeKey | null)[] = [null, "ends-highest", "widest-range", "biggest-jump"];
    const series = order.map((k) => all[k]);
    const diagnoses = order.map((k) => keys[k]);
    const answerIndex = order.indexOf(0);

    const flat = series.flat();
    return {
      series,
      answerIndex,
      diagnoses,
      low: Math.min(...flat),
      high: Math.max(...flat),
      drift,
      difficulty: d,
    };
  }

  throw new Error(`signal: no valid question for seed ${seed} at difficulty ${d}`);
}

/* -------------------------------------------------------------------------- */
/* The runtime's half                                                         */
/* -------------------------------------------------------------------------- */

export function difficultyForIndex(index: number): number {
  return clampDifficulty(1 + Math.floor(index / 2));
}

export function questionAt(runSeed: string, index: number): SignalQuestion {
  return generate(`${runSeed}#${index}`, difficultyForIndex(index));
}

export function validate(question: SignalQuestion, chosen: number): boolean {
  return chosen === question.answerIndex;
}

export const ROUND_MS = 60_000;
export const WRONG_PENALTY_MS = 2_000;
export const GUESS_FLOOR_MS = 500;

export function score(question: SignalQuestion, msElapsed: number, streak: number): number {
  const base = 100;
  const speed =
    msElapsed < GUESS_FLOOR_MS ? 0 : Math.max(0, Math.min(1, (9000 - msElapsed) / 7000));
  const multiplier = Math.min(2, 1 + streak * 0.05);
  const difficultyBonus = 1 + (question.difficulty - 1) * 0.05;
  return Math.round((base + speed * 100) * multiplier * difficultyBonus);
}

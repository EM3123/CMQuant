// ENDLESS - no round clock, three lives, and a window that keeps closing.
//
// The sixty-second run asks how much you can do in a fixed time. Endless asks
// how far you can get before you break, which is a different question and
// wants a different shape: the clock moves from the run to the question.
//
// WHY IT NEEDS ITS OWN SCORING, AND WHY THAT IS NOT OPTIONAL.
//
// Every number in `lib/scoring.ts` assumes a sixty-second round. The accuracy
// multiplier is applied once to a whole run; the streak milestones are tuned
// to how many questions fit in a minute; the wrong-answer penalty exists to
// stop mashing inside a fixed window. Reuse any of it here and an endless
// score is a number that looks like a timed score, sorts next to a timed score
// on the same board, and means something completely different. The existing
// personal bests would quietly stop being comparable to anything.
//
// So endless keeps its own storage key, its own score, and its own headline.
// And the headline is DEPTH, not points: how far you got is the thing a person
// actually remembers and repeats, and points only exist to break ties between
// two runs that died on the same question.

export const LIVES = 3;

/** Questions answered before the window stops shrinking. */
const RAMP_OVER = 40;

/** Generous enough to read the first question properly. */
const START_MS = 12_000;

/** The floor. Below this it stops being a test of anything but reflexes. */
const FLOOR_MS = 3_500;

/**
 * How long you get for the question at this index.
 *
 * Linear rather than exponential. An exponential squeeze feels unfair at the
 * exact moment a player has invested the most in a run, and it compresses the
 * interesting middle into a handful of questions.
 */
export function windowMs(index: number): number {
  const t = Math.min(1, index / RAMP_OVER);
  return Math.round(START_MS - (START_MS - FLOOR_MS) * t);
}

/**
 * Points for clearing one question.
 *
 * Depth is the headline, so this only has to separate two runs that reached
 * the same question. It rewards answering well inside the window, because at
 * equal depth the player who was never close to timing out played better.
 */
export function endlessScore(
  index: number,
  difficulty: number,
  msElapsed: number
): number {
  const window = windowMs(index);
  const spare = Math.max(0, Math.min(1, (window - msElapsed) / window));
  const base = 10 * difficulty;
  return Math.round(base * (1 + spare));
}

export type EndlessOutcome = "correct" | "wrong" | "timeout";

/** Anything that is not a correct answer costs a life. Running out ends it. */
export function livesAfter(lives: number, outcome: EndlessOutcome): number {
  return outcome === "correct" ? lives : Math.max(0, lives - 1);
}

/** Storage key for an endless best. Never the same key as the timed best. */
export function endlessKey(game: string): string {
  return `cmquant:${game}:endless:best`;
}

/**
 * What a finished endless run is worth, as one sortable number.
 *
 * Depth dominates by construction: reaching one question further is worth more
 * than any amount of speed on the questions before it. Packing them into a
 * single integer keeps the personal-best store simple, and the two halves are
 * pulled apart again for display.
 */
export function endlessRecord(cleared: number, points: number): number {
  return cleared * 100_000 + Math.min(99_999, points);
}

export function unpackRecord(record: number): { cleared: number; points: number } {
  return { cleared: Math.floor(record / 100_000), points: record % 100_000 };
}

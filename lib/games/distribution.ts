// DISTRIBUTION - read a shape, name its statistics.
//
// The data is drawn as a dot plot rather than listed as numbers, and that is
// the whole point. A list of eleven integers is an arithmetic exercise; a
// column chart of the same eleven integers is a distribution, and reading one
// is a different skill. Everything asked here - the middle, the commonest, the
// spread, the average - is a property of the shape you are looking at.
//
// WHY THE WRONG ANSWERS ARE THE DESIGN
//
// Every distractor is a specific, named error somebody actually makes on a dot
// plot, and the results screen says which one you made:
//
//   - reading the middle COLUMN instead of the middle OBSERVATION, which
//     ignores the counts and is the single commonest mistake on this chart;
//   - averaging the distinct values instead of the data, same failure;
//   - answering the tallest column's HEIGHT when asked which value is
//     commonest, which is reading the y axis for an x-axis question;
//   - reporting the maximum when asked for the range;
//   - counting the columns rather than subtracting the ends.
//
// A random number near the answer teaches nothing. These teach the thing the
// chart is for.

import { createRng, randInt, pick, ramp, clampDifficulty, type Rng } from "@/lib/rng";

export type Kind = "median" | "mode" | "range" | "mean";

/** The named errors this game can diagnose. */
export type MistakeKey =
  | "unweighted-median"
  | "mean-for-median"
  | "mode-for-median"
  | "midrange-for-median"
  | "unweighted-mean"
  | "median-for-mean"
  | "mode-for-mean"
  | "count-for-mode"
  | "max-for-mode"
  | "second-mode"
  | "max-for-range"
  | "fencepost-range"
  | "columns-for-range";

export type DistributionQuestion = {
  kind: Kind;
  /** Value labels, ascending and contiguous. The x axis of the dot plot. */
  axis: number[];
  /** How many observations sit on each axis value. Aligned with `axis`. */
  counts: number[];
  /** Total observations. */
  n: number;
  /** The true answer. Exact by construction, recomputed in the test. */
  exact: number;
  options: number[];
  answerIndex: number;
  /** Aligned with `options`. Null where the option is only a near miss. */
  diagnoses: (MistakeKey | null)[];
  difficulty: number;
};

export const QUESTION: Record<Kind, string> = {
  median: "Median",
  mode: "Most common value",
  range: "Range",
  mean: "Mean",
};

export const MISTAKE_LABEL: Record<MistakeKey, string> = {
  "unweighted-median": "Took the middle column, not the middle observation",
  "mean-for-median": "Gave the mean when the question asked for the median",
  "mode-for-median": "Gave the most common value, not the middle one",
  "midrange-for-median": "Took the midpoint of the ends, not the middle of the data",
  "unweighted-mean": "Averaged the values on the axis, not the observations",
  "median-for-mean": "Gave the median when the question asked for the mean",
  "mode-for-mean": "Gave the most common value, not the average",
  "count-for-mode": "Read the height of the tallest column, not the value under it",
  "max-for-mode": "Gave the largest value, not the commonest one",
  "second-mode": "Picked the second tallest column",
  "max-for-range": "Gave the largest value instead of the spread",
  "fencepost-range": "Counted the endpoints as well as the gaps",
  "columns-for-range": "Counted the columns instead of subtracting the ends",
};

export const MISTAKE_FIX: Record<MistakeKey, string> = {
  "unweighted-median":
    "Walk the dots, not the columns. A column of six counts six times towards finding the middle.",
  "mean-for-median": "The median is positional: sort, then step to the middle dot.",
  "mode-for-median": "The tallest column is the mode. The middle dot is the median.",
  "midrange-for-median":
    "The midpoint of the ends ignores where the data actually sits. Count to the middle dot instead.",
  "unweighted-mean":
    "Every dot is an observation. Multiply each value by its column height before dividing.",
  "median-for-mean": "The mean is the total divided by the count, not the middle dot.",
  "mode-for-mean": "The tallest column is the commonest value, not the average one.",
  "count-for-mode":
    "The question asks which value is commonest, so the answer is on the bottom axis, not the height.",
  "max-for-mode": "Tallest column, not furthest right.",
  "second-mode": "Compare the two tallest columns again - one of them is higher.",
  "max-for-range": "The range is the distance between the ends: largest minus smallest.",
  "fencepost-range": "Range is a subtraction, not a count of the values covered.",
  "columns-for-range": "Subtract the smallest value from the largest. The number of columns is a different number.",
};

/* -------------------------------------------------------------------------- */
/* The statistics, computed from the shape                                    */
/* -------------------------------------------------------------------------- */

/** Every observation, ascending. The dot plot expanded back into data. */
export function observations(axis: number[], counts: number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < axis.length; i++) {
    for (let c = 0; c < counts[i]; c++) out.push(axis[i]);
  }
  return out;
}

export function medianOf(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/* -------------------------------------------------------------------------- */
/* Difficulty                                                                 */
/* -------------------------------------------------------------------------- */

/** How many columns the chart has. A wider axis is more to read. */
function spanFor(d: number): number {
  return Math.round(ramp(d, 4, 9));
}

/** How many dots. Always odd, so the median is a real observation. */
function sizeFor(rng: Rng, d: number): number {
  const base = Math.round(ramp(d, 7, 19));
  const n = base + randInt(rng, 0, 2);
  return n % 2 === 0 ? n + 1 : n;
}

/** Which questions are available yet. The chart has to be readable before the
 *  arithmetic on it gets hard. */
function kindsFor(d: number): readonly Kind[] {
  if (d <= 2) return ["mode", "range"] as const;
  if (d <= 5) return ["mode", "range", "median"] as const;
  return ["mode", "range", "median", "mean"] as const;
}

const MAX_ATTEMPTS = 60;

/* -------------------------------------------------------------------------- */
/* Generation                                                                 */
/* -------------------------------------------------------------------------- */

type Shape = { axis: number[]; counts: number[]; n: number };

function dealShape(rng: Rng, d: number, wantOddN: boolean): Shape | null {
  const span = spanFor(d);
  const start = randInt(rng, 1, 12);
  const axis = Array.from({ length: span }, (_, i) => start + i);
  const n = wantOddN ? sizeFor(rng, d) : Math.round(ramp(d, 7, 19)) + randInt(rng, 0, 2);

  // One dot in each end column so the range is the axis, then scatter the
  // rest. Without the ends pinned the drawn axis and the actual spread
  // disagree, and the chart would be lying about its own width.
  const counts = new Array<number>(span).fill(0);
  counts[0] = 1;
  counts[span - 1] = 1;
  for (let i = 2; i < n; i++) counts[randInt(rng, 0, span - 1)]++;

  const total = counts.reduce((a, b) => a + b, 0);
  if (total !== n) return null;
  return { axis, counts, n };
}

/**
 * Nudge the data until the mean is a whole number.
 *
 * This was rejection sampling and the measurement killed it: the mean
 * question appeared in 0.9% of generated questions instead of its share,
 * because `sum % n === 0` is roughly a one-in-fifteen coincidence and the
 * retry threw away a perfectly good chart every time it missed. A question
 * kind that exists and almost never appears is the same bug as a game
 * missing from the daily rotation - real, invisible, and only findable by
 * counting.
 *
 * Constructing it instead is exact and cheap. The axis is contiguous, so
 * moving one dot one column to the right adds exactly one to the total;
 * the residual is therefore fixable in at most n-1 moves. Column zero
 * always keeps a dot so the drawn axis still matches the data.
 *
 * THE DONOR COLUMN IS CHOSEN AT RANDOM, and that is not a detail. Taking
 * from the rightmost eligible column every time - the obvious way to write
 * this loop - walks roughly half the data into the final column, so every
 * mean question came out as the same lopsided staircase with a tower on the
 * right. It made the shapes unnatural and, worse, it made the question kind
 * guessable before reading the prompt: a tower on the right meant a mean
 * question. Spreading the moves leaves the shape the deal produced.
 */
function makeMeanWhole(rng: Rng, shape: Shape): boolean {
  const { axis, counts, n } = shape;
  const sum = () => counts.reduce((acc, c, i) => acc + c * axis[i], 0);
  let need = (n - (sum() % n)) % n;

  while (need > 0) {
    // Any column that still has a dot to spare and somewhere to send it.
    const donors: number[] = [];
    for (let i = 0; i < counts.length - 1; i++) {
      const spare = i === 0 ? counts[i] - 1 : counts[i];
      if (spare > 0) donors.push(i);
    }
    // Everything movable has piled into the last column. Deal again.
    if (!donors.length) return false;

    const from = donors[randInt(rng, 0, donors.length - 1)];
    counts[from]--;
    counts[from + 1]++;
    need--;
  }
  return true;
}

/** The tallest column must be strictly tallest, or "most common" has no answer. */
function uniqueModeIndex(counts: number[]): number | null {
  let best = 0;
  for (let i = 1; i < counts.length; i++) if (counts[i] > counts[best]) best = i;
  const ties = counts.filter((c) => c === counts[best]).length;
  return ties === 1 ? best : null;
}

function secondTallestIndex(counts: number[], modeIndex: number): number | null {
  let best = -1;
  for (let i = 0; i < counts.length; i++) {
    if (i === modeIndex) continue;
    if (best < 0 || counts[i] > counts[best]) best = i;
  }
  return best < 0 ? null : best;
}

type Candidate = { value: number; key: MistakeKey };

/** The answer, and the named errors that produce a different number. */
function solve(shape: Shape, kind: Kind): { exact: number; wrong: Candidate[] } | null {
  const { axis, counts, n } = shape;
  const data = observations(axis, counts);
  const modeIndex = uniqueModeIndex(counts);
  if (modeIndex === null) return null;

  const present = axis.filter((_, i) => counts[i] > 0);
  const min = present[0];
  const max = present[present.length - 1];
  const median = medianOf(data);
  const mode = axis[modeIndex];
  const sum = data.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const unweightedMean = present.reduce((a, b) => a + b, 0) / present.length;
  const unweightedMedian = medianOf(present);

  switch (kind) {
    case "median":
      return {
        exact: median,
        wrong: [
          { value: unweightedMedian, key: "unweighted-median" },
          { value: mean, key: "mean-for-median" },
          { value: mode, key: "mode-for-median" },
          { value: (min + max) / 2, key: "midrange-for-median" },
        ],
      };

    case "mean":
      // Whole by construction - see makeMeanWhole. A one-decimal answer on a
      // sixty-second clock is a typing test, not an estimate. Still checked,
      // because the construction is the sort of thing a later edit breaks.
      if (!Number.isInteger(mean)) return null;
      return {
        exact: mean,
        wrong: [
          { value: unweightedMean, key: "unweighted-mean" },
          { value: median, key: "median-for-mean" },
          { value: mode, key: "mode-for-mean" },
        ],
      };

    case "mode": {
      const second = secondTallestIndex(counts, modeIndex);
      return {
        exact: mode,
        wrong: [
          { value: counts[modeIndex], key: "count-for-mode" },
          { value: max, key: "max-for-mode" },
          ...(second === null ? [] : [{ value: axis[second], key: "second-mode" as MistakeKey }]),
        ],
      };
    }

    case "range":
      return {
        exact: max - min,
        wrong: [
          { value: max, key: "max-for-range" },
          { value: max - min + 1, key: "fencepost-range" },
          { value: present.length, key: "columns-for-range" },
        ],
      };
  }
}

/**
 * Four options, the answer among them, placed by value.
 *
 * Two rules learned the hard way elsewhere in this repo. Distractors that are
 * all larger than the answer pin it into the low slots - Pot Odds shipped at
 * 0/65/35/0 - so the fill-in near misses go both ways. And the answer's index
 * is found by searching for its VALUE after the shuffle, never remembered
 * from before it.
 */
function buildOptions(
  rng: Rng,
  exact: number,
  wrong: Candidate[]
): { options: number[]; diagnoses: (MistakeKey | null)[]; answerIndex: number } | null {
  const options: number[] = [exact];
  const diagnoses: (MistakeKey | null)[] = [null];

  // Named errors first, in a shuffled order so the same kind of mistake does
  // not always survive the cut.
  const pool = [...wrong];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = randInt(rng, 0, i);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  for (const candidate of pool) {
    if (options.length === 4) break;
    if (!Number.isInteger(candidate.value)) continue;
    if (candidate.value < 0) continue;
    if (options.includes(candidate.value)) continue;
    options.push(candidate.value);
    diagnoses.push(candidate.key);
  }

  // Near misses, alternating above and below, to fill out four.
  for (let step = 1; options.length < 4 && step <= 6; step++) {
    for (const delta of [step, -step]) {
      if (options.length === 4) break;
      const value = exact + delta;
      if (value < 0 || options.includes(value)) continue;
      options.push(value);
      diagnoses.push(null);
    }
  }
  if (options.length !== 4) return null;

  // Shuffle the pair together so an option never loses its diagnosis.
  for (let i = 3; i > 0; i--) {
    const j = randInt(rng, 0, i);
    [options[i], options[j]] = [options[j], options[i]];
    [diagnoses[i], diagnoses[j]] = [diagnoses[j], diagnoses[i]];
  }

  const answerIndex = options.indexOf(exact);
  if (answerIndex < 0) return null;
  return { options, diagnoses, answerIndex };
}

export function generate(seed: string, difficulty: number): DistributionQuestion {
  const d = clampDifficulty(difficulty);
  const rng = createRng(`distribution:${seed}:${d}`);
  const kinds = kindsFor(d);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const kind = pick(rng, kinds);
    const shape = dealShape(rng, d, kind === "median");
    if (!shape) continue;
    if (kind === "mean" && !makeMeanWhole(rng, shape)) continue;

    const solved = solve(shape, kind);
    if (!solved) continue;
    if (!Number.isInteger(solved.exact)) continue;

    const built = buildOptions(rng, solved.exact, solved.wrong);
    if (!built) continue;

    return {
      kind,
      axis: shape.axis,
      counts: shape.counts,
      n: shape.n,
      exact: solved.exact,
      options: built.options,
      answerIndex: built.answerIndex,
      diagnoses: built.diagnoses,
      difficulty: d,
    };
  }

  throw new Error(`distribution: no valid question for seed ${seed} at difficulty ${d}`);
}

/* -------------------------------------------------------------------------- */
/* The runtime's half                                                         */
/* -------------------------------------------------------------------------- */

export function difficultyForIndex(index: number): number {
  return clampDifficulty(1 + Math.floor(index / 2));
}

export function questionAt(runSeed: string, index: number): DistributionQuestion {
  return generate(`${runSeed}#${index}`, difficultyForIndex(index));
}

export function validate(question: DistributionQuestion, chosen: number): boolean {
  return chosen === question.answerIndex;
}

export const ROUND_MS = 60_000;
export const WRONG_PENALTY_MS = 2_000;
export const GUESS_FLOOR_MS = 500;

export function score(
  question: DistributionQuestion,
  msElapsed: number,
  streak: number
): number {
  const base = 100;
  const speed =
    msElapsed < GUESS_FLOOR_MS ? 0 : Math.max(0, Math.min(1, (8000 - msElapsed) / 6000));
  const multiplier = Math.min(2, 1 + streak * 0.05);
  const difficultyBonus = 1 + (question.difficulty - 1) * 0.05;
  return Math.round((base + speed * 100) * multiplier * difficultyBonus);
}

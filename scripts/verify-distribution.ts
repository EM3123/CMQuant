/**
 * Property test for Distribution.
 *
 * The oracle here is easy and that is exactly why it has to be written: every
 * statistic this game asks for can be recomputed from the expanded dot plot
 * by a completely different route than the generator used, so there is no
 * excuse for trusting the generator's own arithmetic.
 *
 * The generator computes the median by expanding the counts and indexing the
 * middle; this file sorts a fresh array and indexes it. The generator tracks
 * the tallest column as it goes; this file counts occurrences with a map. If
 * the two ever disagree the game has been printing a wrong answer and marking
 * correct players wrong, which is the worst failure available to it.
 *
 * The second job is the distribution of the answer's position. Distractors
 * built from real errors are systematically related to the answer - the mean
 * of a right-skewed set is always above its median - so they skew which slot
 * the answer lands in unless the fill-ins push back both ways. Pot Odds
 * shipped at 0/65/35/0 and nobody noticed by playing.
 */

import {
  generate,
  questionAt,
  difficultyForIndex,
  validate,
  observations,
  QUESTION,
  MISTAKE_LABEL,
  MISTAKE_FIX,
  score,
  type DistributionQuestion,
  type Kind,
  type MistakeKey,
} from "../lib/games/distribution";

const failures: string[] = [];
const note = (why: string) => failures.push(why);

/* -------------------------------------------------------------------------- */
/* An independent oracle. Nothing below borrows the generator's arithmetic.   */
/* -------------------------------------------------------------------------- */

function expand(q: DistributionQuestion): number[] {
  const out: number[] = [];
  q.axis.forEach((value, i) => {
    for (let k = 0; k < q.counts[i]; k++) out.push(value);
  });
  return out.sort((a, b) => a - b);
}

function oracleMedian(data: number[]): number {
  const mid = Math.floor(data.length / 2);
  return data.length % 2 ? data[mid] : (data[mid - 1] + data[mid]) / 2;
}

function oracleMode(data: number[]): number | null {
  const tally = new Map<number, number>();
  for (const v of data) tally.set(v, (tally.get(v) ?? 0) + 1);
  let best: number | null = null;
  let bestCount = -1;
  let ties = 0;
  for (const [value, count] of tally) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
      ties = 1;
    } else if (count === bestCount) {
      ties++;
    }
  }
  return ties === 1 ? best : null;
}

function oracle(q: DistributionQuestion): number | null {
  const data = expand(q);
  switch (q.kind) {
    case "median":
      return oracleMedian(data);
    case "mean":
      return data.reduce((a, b) => a + b, 0) / data.length;
    case "mode":
      return oracleMode(data);
    case "range":
      return data[data.length - 1] - data[0];
  }
}

/* -------------------------------------------------------------------------- */
/* Every question, at every difficulty                                        */
/* -------------------------------------------------------------------------- */

const SEEDS = 400;
const slots = [0, 0, 0, 0];
const kindsSeen = new Map<Kind, number>();
const mistakesSeen = new Set<MistakeKey>();
let questions = 0;
let withNamedMistake = 0;
let namedOptions = 0;

// Share of the dots sitting in the last column, per kind. A question kind
// whose charts look different from the others is a question kind you can
// identify before reading the prompt.
const lastColumnShare = new Map<Kind, number[]>();

for (let d = 1; d <= 10; d++) {
  for (let s = 0; s < SEEDS; s++) {
    const seed = `verify-${d}-${s}`;
    let q: DistributionQuestion;
    try {
      q = generate(seed, d);
    } catch (err) {
      note(`d${d} ${seed}: threw ${(err as Error).message}`);
      continue;
    }
    questions++;
    kindsSeen.set(q.kind, (kindsSeen.get(q.kind) ?? 0) + 1);
    const tail = lastColumnShare.get(q.kind) ?? [];
    tail.push(q.counts[q.counts.length - 1] / q.n);
    lastColumnShare.set(q.kind, tail);

    // 1. Determinism. Same seed, same question, forever - this is the rule the
    //    challenge link and the daily both rest on.
    const again = generate(seed, d);
    if (JSON.stringify(again) !== JSON.stringify(q)) note(`d${d} ${seed}: not deterministic`);

    // 2. THE ANSWER IS RIGHT, by a second route.
    const truth = oracle(q);
    if (truth === null) {
      note(`d${d} ${seed}: ${q.kind} has no unique answer`);
    } else if (truth !== q.exact) {
      note(`d${d} ${seed}: ${q.kind} says ${q.exact}, oracle says ${truth}`);
    }

    // 3. The chart is internally consistent.
    if (q.axis.length !== q.counts.length) note(`d${d} ${seed}: axis and counts differ in length`);
    const total = q.counts.reduce((a, b) => a + b, 0);
    if (total !== q.n) note(`d${d} ${seed}: counts sum to ${total}, n is ${q.n}`);
    if (q.counts.some((c) => c < 0)) note(`d${d} ${seed}: negative column`);
    if (q.counts[0] === 0 || q.counts[q.counts.length - 1] === 0) {
      note(`d${d} ${seed}: an end column is empty, so the drawn axis is wider than the data`);
    }
    for (let i = 1; i < q.axis.length; i++) {
      if (q.axis[i] !== q.axis[i - 1] + 1) note(`d${d} ${seed}: axis is not contiguous`);
    }
    if (q.kind === "median" && q.n % 2 === 0) {
      note(`d${d} ${seed}: median asked of an even number of observations`);
    }

    // observations() is what the UI draws from, so it has to agree too.
    const drawn = observations(q.axis, q.counts);
    if (drawn.length !== q.n) note(`d${d} ${seed}: observations() returned ${drawn.length}`);

    // 4. Four distinct options, the answer among them, at the index claimed.
    if (q.options.length !== 4) note(`d${d} ${seed}: ${q.options.length} options`);
    if (new Set(q.options).size !== q.options.length) note(`d${d} ${seed}: duplicate options`);
    if (q.options.some((o) => !Number.isInteger(o) || o < 0)) {
      note(`d${d} ${seed}: option is not a whole number: ${q.options.join(", ")}`);
    }
    if (q.options[q.answerIndex] !== q.exact) {
      note(`d${d} ${seed}: answerIndex points at ${q.options[q.answerIndex]}, not ${q.exact}`);
    }
    if (!validate(q, q.answerIndex)) note(`d${d} ${seed}: validate rejects its own answer`);
    for (let i = 0; i < 4; i++) {
      if (i !== q.answerIndex && validate(q, i)) note(`d${d} ${seed}: validate accepts slot ${i}`);
    }
    slots[q.answerIndex]++;

    // 5. Diagnoses line up with options, and the answer is never diagnosed as
    //    a mistake - telling somebody their correct answer was an error is
    //    worse than saying nothing.
    if (q.diagnoses.length !== q.options.length) note(`d${d} ${seed}: diagnoses misaligned`);
    if (q.diagnoses[q.answerIndex] !== null) {
      note(`d${d} ${seed}: the correct option is labelled a mistake`);
    }
    let named = 0;
    q.diagnoses.forEach((key, i) => {
      if (key === null) return;
      named++;
      mistakesSeen.add(key);
      if (!MISTAKE_LABEL[key]) note(`d${d} ${seed}: ${key} has no label`);
      if (!MISTAKE_FIX[key]) note(`d${d} ${seed}: ${key} has no fix`);
      if (q.options[i] === q.exact) note(`d${d} ${seed}: a named mistake equals the answer`);
    });
    if (named > 0) withNamedMistake++;
    namedOptions += named;

    // 6. Scoring stays sane, including at the extremes of the clock.
    for (const ms of [0, 200, 3000, 20_000]) {
      for (const streak of [0, 5, 40]) {
        const points = score(q, ms, streak);
        if (!Number.isFinite(points) || points < 0) {
          note(`d${d} ${seed}: score ${points} at ${ms}ms streak ${streak}`);
        }
      }
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Every kind is reachable, and every named mistake happens                   */
/* -------------------------------------------------------------------------- */

const ALL_KINDS: Kind[] = ["median", "mode", "range", "mean"];
for (const kind of ALL_KINDS) {
  if (!kindsSeen.get(kind)) note(`the ${kind} question never appeared`);
  if (!QUESTION[kind]) note(`${kind} has no prompt`);
}

const ALL_MISTAKES = Object.keys(MISTAKE_LABEL) as MistakeKey[];
const unreachable = ALL_MISTAKES.filter((k) => !mistakesSeen.has(k));

/* -------------------------------------------------------------------------- */
/* The run itself: difficulty climbs with the index and never with the player */
/* -------------------------------------------------------------------------- */

let previous = 0;
for (let i = 0; i < 60; i++) {
  const d = difficultyForIndex(i);
  if (d < previous) note(`difficulty fell at index ${i}`);
  previous = d;
  const q = questionAt("run-seed", i);
  if (q.difficulty !== d) note(`index ${i}: question is d${q.difficulty}, expected d${d}`);
  if (JSON.stringify(questionAt("run-seed", i)) !== JSON.stringify(q)) {
    note(`index ${i}: questionAt is not deterministic`);
  }
}
if (difficultyForIndex(0) !== 1) note("a run does not start at difficulty 1");

/* -------------------------------------------------------------------------- */

const worstSlot = Math.max(...slots.map((c) => Math.abs(c / questions - 0.25)));

/**
 * THE SHAPE MUST NOT GIVE THE QUESTION AWAY.
 *
 * The mean is made whole by nudging dots one column to the right. The first
 * version always took from the rightmost column that had one to spare, which
 * walked half the data into the final column - every mean question was the
 * same staircase with a tower on the end, and you could tell a mean question
 * from across the room without reading the prompt. Found by playing two of
 * them and noticing they looked identical; this is the check that would have
 * found it first.
 */
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const tails = new Map<Kind, number>();
for (const [kind, shares] of lastColumnShare) tails.set(kind, mean(shares));
const tailValues = [...tails.values()];
const tailSpread = Math.max(...tailValues) - Math.min(...tailValues);

console.log(`questions        ${questions.toLocaleString()}`);
console.log(
  `kinds            ${ALL_KINDS.map((k) => `${k} ${kindsSeen.get(k) ?? 0}`).join(", ")}`
);
console.log(
  `answer position  ${slots.map((c) => `${((c / questions) * 100).toFixed(1)}%`).join("  ")}`
);
console.log(
  `named mistakes   ${(namedOptions / questions).toFixed(2)} per question, ` +
    `${((withNamedMistake / questions) * 100).toFixed(0)}% of questions have one`
);
console.log(`mistakes reached ${mistakesSeen.size}/${ALL_MISTAKES.length}`);
console.log(
  `last column      ` +
    ALL_KINDS.map((k) => `${k} ${(((tails.get(k) ?? 0) * 100) | 0)}%`).join(
)
);
console.log(`failures         ${failures.length}`);

if (unreachable.length) {
  console.log(`\nNAMED MISTAKES NO QUESTION CAN PRODUCE: ${unreachable.join(", ")}`);
  console.log("A diagnosis nobody can trigger is dead copy that reads as a feature.");
}
if (worstSlot > 0.08) {
  console.log(
    `\nANSWER POSITION IS SKEWED: worst slot is ${(worstSlot * 100).toFixed(1)} points off even.`
  );
  console.log("A player who notices can score without reading the chart.");
}
if (tailSpread > 0.1) {
  console.log(
    `\nONE KIND HAS A DIFFERENT SHAPE: last-column share varies by ` +
      `${(tailSpread * 100).toFixed(0)} points between question kinds.`
  );
  console.log("The chart is telling the player which question it is about to ask.");
}

if (failures.length || unreachable.length || worstSlot > 0.08 || tailSpread > 0.1) {
  console.log("\nfirst failures");
  for (const f of failures.slice(0, 12)) console.log(`  ${f}`);
  process.exit(1);
}

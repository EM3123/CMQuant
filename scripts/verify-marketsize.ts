/**
 * Property test for Market Size.
 *
 * Two things here are easy to get wrong and invisible from playing.
 *
 * ONE: the answer is a product of five numbers and the options are built by
 * removing terms from that product. Remove the wrong one, or remove one and
 * land exactly on another option, and the question has two right answers or
 * none. The oracle below recomputes the product from the factors as they are
 * PRINTED, which is the only version the player can check.
 *
 * TWO: everything is displayed rounded to roughly two significant figures, so
 * two options that differ as numbers can be the same thing on screen.
 * $1.24B and $1.238B are one option as far as a player is concerned, and a
 * question with a duplicate option is a question where the correct choice is
 * ambiguous. Uniqueness is therefore checked on the formatted label, never on
 * the number.
 */

import {
  generate,
  questionAt,
  difficultyForIndex,
  validate,
  formatValue,
  score,
  MISTAKE_LABEL,
  MISTAKE_FIX,
  type MarketSizeQuestion,
  type MistakeKey,
} from "../lib/games/marketsize";

const failures: string[] = [];
const note = (why: string) => failures.push(why);

/* -------------------------------------------------------------------------- */

const SEEDS = 400;
const slots = [0, 0, 0, 0];
const mistakesSeen = new Set<MistakeKey>();
const scenariosSeen = new Set<string>();
let questions = 0;
let namedOptions = 0;
let answerIsLargest = 0;
let answerIsSmallest = 0;

for (let d = 1; d <= 10; d++) {
  for (let s = 0; s < SEEDS; s++) {
    const seed = `verify-${d}-${s}`;
    let q: MarketSizeQuestion;
    try {
      q = generate(seed, d);
    } catch (err) {
      note(`d${d} ${seed}: threw ${(err as Error).message}`);
      continue;
    }
    questions++;
    scenariosSeen.add(q.asks);

    // 1. Determinism.
    if (JSON.stringify(generate(seed, d)) !== JSON.stringify(q)) {
      note(`d${d} ${seed}: not deterministic`);
    }

    // 2. THE ANSWER IS THE PRODUCT OF WHAT IS ON SCREEN. Recomputed from the
    //    printed factors, because that is the only chain a player can follow.
    const oracle = q.factors.reduce((a, f) => a * f.value, 1);
    if (Math.abs(oracle - q.exact) > Math.abs(q.exact) * 1e-9) {
      note(`d${d} ${seed}: exact is ${q.exact}, the printed factors give ${oracle}`);
    }

    // 3. The chain is readable and plausible.
    if (q.factors.length < 3) note(`d${d} ${seed}: only ${q.factors.length} factors`);
    if (!q.scenario.trim().endsWith(".")) note(`d${d} ${seed}: scenario is not a sentence`);
    if (!q.asks.trim()) note(`d${d} ${seed}: nothing asked`);
    for (const f of q.factors) {
      if (!f.label.trim()) note(`d${d} ${seed}: a factor has no label`);
      if (!Number.isFinite(f.value) || f.value <= 0) {
        note(`d${d} ${seed}: factor ${f.label} is ${f.value}`);
      }
      if (f.kind === "share" && f.value > 1) {
        note(`d${d} ${seed}: ${f.label} is a share above 1`);
      }
    }
    // Exactly one of each named role at most, or two options would carry the
    // same diagnosis and mean different things.
    const roles = q.factors.map((f) => f.role).filter(Boolean);
    if (new Set(roles).size !== roles.length) note(`d${d} ${seed}: a role appears twice`);

    // 4. Four options, four DIFFERENT LABELS, answer at the index claimed.
    if (q.options.length !== 4) note(`d${d} ${seed}: ${q.options.length} options`);
    const labels = q.options.map((o) => formatValue(o, q.unit));
    if (new Set(labels).size !== 4) {
      note(`d${d} ${seed}: two options read the same: ${labels.join(", ")}`);
    }
    if (q.options.some((o) => !Number.isFinite(o) || o <= 0)) {
      note(`d${d} ${seed}: a non-positive option`);
    }
    if (q.options[q.answerIndex] !== q.exact) {
      note(`d${d} ${seed}: answerIndex points at the wrong value`);
    }
    if (!validate(q, q.answerIndex)) note(`d${d} ${seed}: validate rejects its own answer`);
    for (let i = 0; i < 4; i++) {
      if (i !== q.answerIndex && validate(q, i)) note(`d${d} ${seed}: validate accepts ${i}`);
    }
    slots[q.answerIndex]++;

    // 5. The answer must not be findable by size alone. Most of the named
    //    errors drop a fraction out of the chain and so come out LARGER than
    //    the answer; if that went unchecked, "pick the smallest" would be a
    //    winning strategy that teaches nothing.
    const sorted = [...q.options].sort((a, b) => a - b);
    if (q.exact === sorted[3]) answerIsLargest++;
    if (q.exact === sorted[0]) answerIsSmallest++;

    // 6. Diagnoses.
    if (q.diagnoses.length !== 4) note(`d${d} ${seed}: diagnoses misaligned`);
    if (q.diagnoses[q.answerIndex] !== null) {
      note(`d${d} ${seed}: the correct option is labelled a mistake`);
    }
    q.diagnoses.forEach((key, i) => {
      if (key === null) return;
      namedOptions++;
      mistakesSeen.add(key);
      if (!MISTAKE_LABEL[key] || !MISTAKE_FIX[key]) note(`d${d} ${seed}: ${key} has no copy`);
      if (q.options[i] === q.exact) note(`d${d} ${seed}: a named mistake equals the answer`);
    });

    // 7. Formatting never produces something unreadable.
    for (const label of labels) {
      if (/NaN|Infinity|undefined|e\+/.test(label)) {
        note(`d${d} ${seed}: bad label ${label}`);
      }
    }

    // 8. Scoring.
    for (const ms of [0, 300, 5_000, 40_000]) {
      const points = score(q, ms, 12);
      if (!Number.isFinite(points) || points < 0) note(`d${d} ${seed}: score ${points}`);
    }
  }
}

/* -------------------------------------------------------------------------- */

let previous = 0;
for (let i = 0; i < 60; i++) {
  const d = difficultyForIndex(i);
  if (d < previous) note(`difficulty fell at index ${i}`);
  previous = d;
  const q = questionAt("run-seed", i);
  if (q.difficulty !== d) note(`index ${i}: got d${q.difficulty}, expected d${d}`);
}
if (difficultyForIndex(0) !== 1) note("a run does not start at difficulty 1");

/* -------------------------------------------------------------------------- */

const worstSlot = Math.max(...slots.map((c) => Math.abs(c / questions - 0.25)));
const largest = answerIsLargest / questions;
const smallest = answerIsSmallest / questions;
const ALL: MistakeKey[] = Object.keys(MISTAKE_LABEL) as MistakeKey[];
const unreachable = ALL.filter((k) => !mistakesSeen.has(k));

console.log(`questions        ${questions.toLocaleString()}`);
console.log(`scenarios        ${[...scenariosSeen].sort().join(", ")}`);
console.log(
  `answer position  ${slots.map((c) => `${((c / questions) * 100).toFixed(1)}%`).join("  ")}`
);
console.log(
  `answer by size   largest ${(largest * 100).toFixed(1)}%, smallest ${(smallest * 100).toFixed(1)}%`
);
console.log(`named mistakes   ${(namedOptions / questions).toFixed(2)} per question`);
console.log(`mistakes reached ${mistakesSeen.size}/${ALL.length}`);
console.log(`failures         ${failures.length}`);

// A quarter each would be chance. Anything near a half means the option list
// has a shape and the shape is the answer.
const sizeSkew = Math.max(Math.abs(largest - 0.25), Math.abs(smallest - 0.25));
if (sizeSkew > 0.15) {
  console.log(
    `\nTHE ANSWER CAN BE FOUND BY SIZE: it is the largest ${(largest * 100).toFixed(0)}% ` +
      `and the smallest ${(smallest * 100).toFixed(0)}% of the time.`
  );
  console.log("Sorting the four options should not be a strategy.");
}
if (worstSlot > 0.08) {
  console.log(`\nANSWER POSITION IS SKEWED: worst slot is ${(worstSlot * 100).toFixed(1)} points off even.`);
}
if (unreachable.length) {
  console.log(`\nNAMED MISTAKES NO QUESTION CAN PRODUCE: ${unreachable.join(", ")}`);
}

if (failures.length || unreachable.length || worstSlot > 0.08 || sizeSkew > 0.15) {
  console.log("\nfirst failures");
  for (const f of failures.slice(0, 12)) console.log(`  ${f}`);
  process.exit(1);
}

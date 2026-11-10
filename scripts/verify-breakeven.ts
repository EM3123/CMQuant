/**
 * Property test for Breakeven.
 *
 * The oracle is deliberately NOT the generator's arithmetic. It works from the
 * premises as they are printed on screen: it converts each line to whole
 * dollars with its own code, sums them, and then searches upward one unit at
 * a time for the first count whose profit is not negative. That search is a
 * different route to ceil(F / m) and cannot share a rounding bug with it.
 *
 * Each named error is also recomputed here, by hand, from the printed lines,
 * so a diagnosis that names the wrong mistake is caught.
 */

import {
  generate,
  unitsFor,
  questionAt,
  difficultyForIndex,
  validate,
  score,
  MISTAKE_LABEL,
  MISTAKE_FIX,
  type BreakevenQuestion,
  type MistakeKey,
} from "../lib/games/breakeven";
import { createRng } from "../lib/rng";

const failures: string[] = [];
const note = (why: string) => failures.push(why);

/** Profit per month in whole cents, from printed premises, by a separate route. */
function profitCents(q: BreakevenQuestion, units: number, fixedMonthly: number): number {
  const perUnit = q.priceCents - q.unitCosts.reduce((s, c) => s + c.cents, 0) - (q.priceCents * q.feePct) / 100;
  return units * perUnit - fixedMonthly * 100;
}

/** Monthly fixed cost in whole dollars, converting each basis the way a person would. */
function fixedDollars(q: BreakevenQuestion): number {
  let total = 0;
  for (const line of q.fixed) {
    if (line.basis === "month") total += line.amount;
    else if (line.basis === "year") total += line.amount / 12;
    else total += (line.amount * 52) / 12;
  }
  return total;
}

const SEEDS = 300;
const slots = [0, 0, 0, 0];
const ranks = [0, 0, 0, 0];
const mistakes = new Set<MistakeKey>();
let questions = 0;
let named = 0;
let nearMisses = 0;

for (let d = 1; d <= 10; d++) {
  for (let s = 0; s < SEEDS; s++) {
    const seed = `verify-${d}-${s}`;
    let q: BreakevenQuestion;
    try {
      q = generate(seed, d);
    } catch (err) {
      note(`d${d} ${seed}: threw ${(err as Error).message}`);
      continue;
    }
    questions++;

    if (JSON.stringify(generate(seed, d)) !== JSON.stringify(q)) note(`d${d} ${seed}: not deterministic`);

    // 1. THE ANSWER, by brute force from the printed premises.
    const fixedMonthly = fixedDollars(q) + q.target;
    let units = 0;
    while (profitCents(q, units, fixedMonthly) < 0 && units < 100_000) units++;
    if (units !== q.exact) note(`d${d} ${seed}: exact is ${q.exact}, brute force says ${units}`);
    if (profitCents(q, q.exact, fixedMonthly) < 0) note(`d${d} ${seed}: exact loses money`);
    if (q.exact > 0 && profitCents(q, q.exact - 1, fixedMonthly) >= 0) {
      note(`d${d} ${seed}: exact is not the smallest count`);
    }

    // 2. The answer is at its index, and only there.
    if (q.options[q.answerIndex] !== q.exact) note(`d${d} ${seed}: answerIndex is wrong`);
    if (!validate(q, q.answerIndex)) note(`d${d} ${seed}: validate rejects its own answer`);
    for (let i = 0; i < 4; i++) if (i !== q.answerIndex && validate(q, i)) note(`d${d} ${seed}: slot ${i} also accepted`);
    slots[q.answerIndex]++;

    // 3. Four distinct, positive, whole options.
    if (q.options.length !== 4) note(`d${d} ${seed}: ${q.options.length} options`);
    if (new Set(q.options.map((o) => o.toLocaleString("en-US"))).size !== 4) {
      note(`d${d} ${seed}: two options read the same`);
    }
    if (q.options.some((o) => !Number.isInteger(o) || o <= 0)) note(`d${d} ${seed}: a non-whole option`);

    // Rank of the answer among the four.
    const below = q.options.filter((o) => o < q.exact).length;
    ranks[below]++;

    // 4. Every named error recomputes to its option from the printed premises.
    q.diagnoses.forEach((key, i) => {
      if (key === null) {
        if (i !== q.answerIndex) nearMisses++;
        return;
      }
      named++;
      mistakes.add(key);
      if (!MISTAKE_LABEL[key] || !MISTAKE_FIX[key]) note(`d${d} ${seed}: ${key} has no copy`);
      if (i === q.answerIndex) note(`d${d} ${seed}: the correct option is labelled ${key}`);
    });

    // 5. Each named error's value must match its own recomputation.
    const expectedFor = (key: MistakeKey): number | null => {
      const fixed = fixedDollars(q);
      const target = q.target;
      const price = q.priceCents / 100;
      const unit = q.unitCosts.reduce((s, c) => s + c.cents / 100, 0);
      const fee = (q.priceCents / 100) * (q.feePct / 100);
      const margin = price - unit - fee;
      const pending = (x: number) => Math.ceil(x / margin - 1e-9);
      if (key === "price-not-margin") return Math.ceil((fixed + target) / price - 1e-9);
      if (key === "missed-unit-cost") {
        const largest = Math.max(...q.unitCosts.map((c) => c.cents / 100));
        return Math.ceil((fixed + target) / (margin + largest) - 1e-9);
      }
      if (key === "forgot-fee") {
        return Math.ceil((fixed + target) / (price - unit) - 1e-9);
      }
      if (key === "sunk-cost") return q.sunk ? pending(fixed + target + q.sunk.amount) : null;
      if (key === "forgot-target") return pending(fixed);
      if (key === "weekly-x4") {
        const w = q.fixed.find((l) => l.basis === "week");
        if (!w) return null;
        const others = fixed - (w.amount * 52) / 12;
        return pending(others + w.amount * 4 + target);
      }
      if (key === "annual-as-monthly") {
        const y = q.fixed.find((l) => l.basis === "year");
        if (!y) return null;
        const others = fixed - y.amount / 12;
        return pending(others + y.amount + target);
      }
      return null;
    };
    q.diagnoses.forEach((key, i) => {
      if (key === null) return;
      const want = expectedFor(key);
      if (want === null) note(`d${d} ${seed}: ${key} named but its premise is absent`);
      else if (want !== q.options[i]) note(`d${d} ${seed}: ${key} is ${q.options[i]}, recomputes to ${want}`);
    });

    // 6. Scoring stays sane.
    for (const ms of [0, 400, 5000, 40_000]) {
      const p = score(q, ms, 9);
      if (!Number.isFinite(p) || p < 0) note(`d${d} ${seed}: score ${p}`);
    }
  }
}

let previous = 0;
for (let i = 0; i < 60; i++) {
  const d = difficultyForIndex(i);
  if (d < previous) note(`difficulty fell at index ${i}`);
  previous = d;
  if (questionAt("run", i).difficulty !== d) note(`index ${i}: wrong difficulty`);
}
if (difficultyForIndex(0) !== 1) note("a run does not start at difficulty 1");

// The answer's slot and rank should both be even. Measured against chance.
const worstSlot = Math.max(...slots.map((c) => Math.abs(c / questions - 0.25)));
const worstRank = Math.max(...ranks.map((c) => Math.abs(c / questions - 0.25)));
const unreachable = (Object.keys(MISTAKE_LABEL) as MistakeKey[]).filter((k) => !mistakes.has(k));

console.log(`questions        ${questions.toLocaleString()}`);
console.log(`answer slot      ${slots.map((c) => `${((c / questions) * 100).toFixed(1)}%`).join("  ")}`);
console.log(`answer rank      ${ranks.map((c) => `${((c / questions) * 100).toFixed(1)}%`).join("  ")}`);
console.log(`named errors     ${(named / questions).toFixed(2)} per question, near misses ${nearMisses}`);
console.log(`errors reached   ${mistakes.size}/${Object.keys(MISTAKE_LABEL).length}`);
console.log(`failures         ${failures.length}`);

if (worstSlot > 0.08) console.log(`\nSLOT IS SKEWED: ${(worstSlot * 100).toFixed(1)} points off even.`);
if (worstRank > 0.08) console.log(`\nRANK IS SKEWED: ${(worstRank * 100).toFixed(1)} points off even. The answer can be found by size.`);
if (unreachable.length) console.log(`\nERRORS NO QUESTION CAN PRODUCE: ${unreachable.join(", ")}`);

// Two hand-worked cases with literal expected answers. A definition copied
// from the generator would pass a wrong definition, so these are checked by hand.
// $6,000 a month of fixed costs, margin $4.00 a cup: 1,500 cups.
// Fixed $6,000 plus a $2,000 target at the same margin: 2,000 cups.
if (unitsFor(6000 * 1000, 4000) !== 1500) note("hand case: $6,000 fixed at $4.00 margin should be 1,500 cups");
if (unitsFor((6000 + 2000) * 1000, 4000) !== 2000) note("hand case: with a $2,000 target should be 2,000 cups");
if (unitsFor(6000 * 1000 + 1, 4000) !== 1501) note("rounding: one mill over a whole count must round up");

// The screen says the answer is a whole number of units, so a fractional break-even
// would be a bug in the arithmetic, not a rounding detail.
{
  const rng = createRng("verify-breakeven-fraction");
  for (let i = 0; i < 200; i++) {
    const q = generate(`frac-${rng()}`, 1 + (i % 10));
    if (!Number.isInteger(q.exact)) note("a fractional break-even reached the screen");
  }
}

if (failures.length || unreachable.length || worstSlot > 0.08 || worstRank > 0.08) {
  console.log("\nfirst failures");
  for (const f of failures.slice(0, 12)) console.log(`  ${f}`);
  process.exit(1);
}

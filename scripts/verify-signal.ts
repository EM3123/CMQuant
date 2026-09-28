/**
 * Property test for Signal.
 *
 * This game makes a claim that cannot be checked by looking: "exactly one of
 * these four is trending, and the other three are noise." Four sparklines on a
 * screen look plausible whatever is behind them, so the only thing standing
 * between the game and quietly lying to players is this file.
 *
 * THE CHECK THAT MATTERS MOST IS THE NEGATIVE ONE. A trend game is broken not
 * when the answer fails to trend, but when a WRONG rule finds it anyway. If
 * the signal also happens to end highest, then "pick the highest" scores, the
 * player is told they were right, and they have been taught a heuristic that
 * will fail them on the next screen. So this asserts that each of the three
 * wrong rules - ends highest, swings widest, biggest single jump - lands on a
 * decoy every single time, and never on the answer.
 *
 * It also measures how often the generator has to retry, because all of that
 * is enforced by rejection and a rejection rate is a performance bug waiting
 * to happen on a phone.
 */

import {
  generate,
  questionAt,
  difficultyForIndex,
  validate,
  slopeOf,
  rangeOf,
  biggestJump,
  endsAt,
  score,
  MISTAKE_LABEL,
  MISTAKE_FIX,
  type SignalQuestion,
  type MistakeKey,
} from "../lib/games/signal";

const failures: string[] = [];
const note = (why: string) => failures.push(why);

/* -------------------------------------------------------------------------- */
/* An independent slope, computed a different way                             */
/* -------------------------------------------------------------------------- */

/**
 * The generator uses the covariance form of least squares. This uses the sums
 * form, which is algebraically the same and arithmetically a different route -
 * the point of an oracle is that it cannot fail in the same direction.
 */
function oracleSlope(series: number[]): number {
  const n = series.length;
  let sx = 0;
  let sy = 0;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sx += i;
    sy += series[i];
    sxy += i * series[i];
    sxx += i * i;
  }
  return (n * sxy - sx * sy) / (n * sxx - sx * sx);
}

/* -------------------------------------------------------------------------- */

const SEEDS = 300;
const slots = [0, 0, 0, 0];
const mistakesSeen = new Set<MistakeKey>();
let questions = 0;
let upward = 0;
let slowest = 0;
let totalMs = 0;

for (let d = 1; d <= 10; d++) {
  for (let s = 0; s < SEEDS; s++) {
    const seed = `verify-${d}-${s}`;
    const t0 = Date.now();
    let q: SignalQuestion;
    try {
      q = generate(seed, d);
    } catch (err) {
      note(`d${d} ${seed}: threw ${(err as Error).message}`);
      continue;
    }
    const took = Date.now() - t0;
    totalMs += took;
    slowest = Math.max(slowest, took);
    questions++;
    if (q.drift > 0) upward++;

    // 1. Determinism.
    if (JSON.stringify(generate(seed, d)) !== JSON.stringify(q)) {
      note(`d${d} ${seed}: not deterministic`);
    }

    // 2. Shape. Four series, all the same length, all integers.
    if (q.series.length !== 4) note(`d${d} ${seed}: ${q.series.length} series`);
    const n = q.series[0].length;
    for (const s2 of q.series) {
      if (s2.length !== n) note(`d${d} ${seed}: series lengths differ`);
      if (s2.some((v) => !Number.isFinite(v))) note(`d${d} ${seed}: non-finite point`);
    }
    if (n < 5) note(`d${d} ${seed}: ${n} points is too few to show a trend`);

    // 3. The shared scale covers every point, and is not degenerate.
    const flat = q.series.flat();
    if (q.low !== Math.min(...flat)) note(`d${d} ${seed}: low is not the minimum`);
    if (q.high !== Math.max(...flat)) note(`d${d} ${seed}: high is not the maximum`);
    if (q.high <= q.low) note(`d${d} ${seed}: flat scale, nothing would draw`);

    // 4. The answer is the steepest, by an independent slope.
    const slopes = q.series.map((s2) => Math.abs(oracleSlope(s2)));
    const mine = q.series.map((s2) => Math.abs(slopeOf(s2)));
    for (let i = 0; i < 4; i++) {
      if (Math.abs(slopes[i] - mine[i]) > 1e-9) {
        note(`d${d} ${seed}: slopeOf disagrees with the oracle on series ${i}`);
      }
    }
    const steepest = slopes.indexOf(Math.max(...slopes));
    if (steepest !== q.answerIndex) {
      note(`d${d} ${seed}: series ${steepest} is steeper than the answer`);
    }

    // 5. THE NEGATIVE GUARANTEE. No wrong rule may find the answer.
    const ends = q.series.map(endsAt);
    const ranges = q.series.map(rangeOf);
    const jumps = q.series.map(biggestJump);
    if (ends.indexOf(Math.max(...ends)) === q.answerIndex) {
      note(`d${d} ${seed}: "pick the highest finish" wins`);
    }
    if (ranges.indexOf(Math.max(...ranges)) === q.answerIndex) {
      note(`d${d} ${seed}: "pick the widest swing" wins`);
    }
    if (jumps.indexOf(Math.max(...jumps)) === q.answerIndex) {
      note(`d${d} ${seed}: "pick the biggest jump" wins`);
    }

    // 6. Each decoy owns the property its diagnosis names, or the results
    //    screen tells the player something untrue about what they did.
    q.diagnoses.forEach((key, i) => {
      if (i === q.answerIndex) {
        if (key !== null) note(`d${d} ${seed}: the answer carries a diagnosis`);
        return;
      }
      if (key === null) {
        note(`d${d} ${seed}: decoy ${i} has no diagnosis`);
        return;
      }
      mistakesSeen.add(key);
      if (!MISTAKE_LABEL[key] || !MISTAKE_FIX[key]) note(`d${d} ${seed}: ${key} has no copy`);
      const owns =
        key === "ends-highest"
          ? ends[i] === Math.max(...ends)
          : key === "widest-range"
            ? ranges[i] === Math.max(...ranges)
            : jumps[i] === Math.max(...jumps);
      if (!owns) note(`d${d} ${seed}: series ${i} is labelled ${key} and is not`);
    });
    if (new Set(q.diagnoses.filter(Boolean)).size !== 3) {
      note(`d${d} ${seed}: the three decoys are not three different mistakes`);
    }

    // 7. validate agrees with itself.
    if (!validate(q, q.answerIndex)) note(`d${d} ${seed}: validate rejects its own answer`);
    for (let i = 0; i < 4; i++) {
      if (i !== q.answerIndex && validate(q, i)) note(`d${d} ${seed}: validate accepts ${i}`);
    }
    slots[q.answerIndex]++;

    // 8. Scoring.
    for (const ms of [0, 200, 4000, 30_000]) {
      const points = score(q, ms, 10);
      if (!Number.isFinite(points) || points < 0) note(`d${d} ${seed}: score ${points}`);
    }
  }
}

/* -------------------------------------------------------------------------- */
/* The run                                                                    */
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
const upShare = upward / questions;
const unreachable = (Object.keys(MISTAKE_LABEL) as MistakeKey[]).filter(
  (k) => !mistakesSeen.has(k)
);

console.log(`questions        ${questions.toLocaleString()}`);
console.log(
  `answer position  ${slots.map((c) => `${((c / questions) * 100).toFixed(1)}%`).join("  ")}`
);
console.log(`trend direction  ${(upShare * 100).toFixed(1)}% up`);
console.log(`mistakes reached ${mistakesSeen.size}/3`);
console.log(`generation       ${(totalMs / questions).toFixed(1)}ms mean, ${slowest}ms worst`);
console.log(`failures         ${failures.length}`);

// A generator that sometimes takes a second is a game that sometimes stalls
// between questions, on a sixty-second clock.
if (slowest > 250) console.log(`\nSLOW DEAL: one question took ${slowest}ms to generate.`);
if (worstSlot > 0.08) {
  console.log(`\nANSWER POSITION IS SKEWED: worst slot is ${(worstSlot * 100).toFixed(1)} points off even.`);
}
if (Math.abs(upShare - 0.5) > 0.1) {
  console.log(`\nDIRECTION IS SKEWED: ${(upShare * 100).toFixed(1)}% of trends go up.`);
  console.log("Always-up means the game can be played by looking for a rise.");
}

if (
  failures.length ||
  unreachable.length ||
  worstSlot > 0.08 ||
  slowest > 250 ||
  Math.abs(upShare - 0.5) > 0.1
) {
  if (unreachable.length) console.log(`\nDIAGNOSES NEVER PRODUCED: ${unreachable.join(", ")}`);
  console.log("\nfirst failures");
  for (const f of failures.slice(0, 12)) console.log(`  ${f}`);
  process.exit(1);
}

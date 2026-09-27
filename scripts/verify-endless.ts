/**
 * Property test for endless mode.
 *
 * The thing that can go quietly wrong here is not a crash, it is a score that
 * sorts wrongly. Endless packs depth and points into one integer so the
 * personal-best store stays a single number, and if that packing ever lets a
 * shallower run outrank a deeper one then the leaderboard is lying about who
 * got further - which is the only claim endless mode makes.
 *
 * So the ordering property is checked exhaustively over the whole reachable
 * range rather than sampled.
 */

import {
  LIVES,
  windowMs,
  endlessScore,
  livesAfter,
  endlessKey,
  endlessRecord,
  unpackRecord,
  type EndlessOutcome,
} from "../lib/endless";
import { createRng, randInt } from "../lib/rng";

const failures: string[] = [];

/* -------------------------------------------------------------------------- */
/* The window closes, monotonically, and then stops                           */
/* -------------------------------------------------------------------------- */

let previous = Infinity;
for (let i = 0; i <= 120; i++) {
  const w = windowMs(i);
  if (w > previous) failures.push(`window grew at index ${i}: ${previous} -> ${w}`);
  if (w < 3_500) failures.push(`window fell below the floor at ${i}: ${w}`);
  if (!Number.isFinite(w)) failures.push(`window is not finite at ${i}`);
  previous = w;
}
if (windowMs(0) !== 12_000) failures.push(`first window is ${windowMs(0)}, expected 12000`);
if (windowMs(40) !== 3_500) failures.push(`window at 40 is ${windowMs(40)}, expected the floor`);
if (windowMs(400) !== 3_500) failures.push("window does not stay at the floor");

/* -------------------------------------------------------------------------- */
/* Lives                                                                      */
/* -------------------------------------------------------------------------- */

for (const outcome of ["wrong", "timeout"] as EndlessOutcome[]) {
  if (livesAfter(3, outcome) !== 2) failures.push(`${outcome} did not cost a life`);
  if (livesAfter(0, outcome) !== 0) failures.push(`${outcome} took a life below zero`);
}
if (livesAfter(2, "correct") !== 2) failures.push("a correct answer cost a life");

/* -------------------------------------------------------------------------- */
/* Scoring                                                                    */
/* -------------------------------------------------------------------------- */

const rng = createRng("endless");
for (let n = 0; n < 20_000; n++) {
  const index = randInt(rng, 0, 80);
  const difficulty = randInt(rng, 1, 10);
  const ms = randInt(rng, 0, 20_000);
  const s = endlessScore(index, difficulty, ms);

  if (!Number.isInteger(s) || s < 0) failures.push(`score ${s} at ${index}/${difficulty}/${ms}`);
  // Answering instantly is worth at most twice answering at the buzzer. Speed
  // is a tiebreak, never a substitute for getting further.
  const slow = endlessScore(index, difficulty, windowMs(index));
  const fast = endlessScore(index, difficulty, 0);
  if (fast > slow * 2) failures.push(`speed bonus exceeds 2x at index ${index}`);
  if (s > fast) failures.push(`score ${s} beats the instant-answer score ${fast}`);
  if (s < slow) failures.push(`score ${s} is below the at-the-buzzer score ${slow}`);
}

/* -------------------------------------------------------------------------- */
/* The packing must never reorder two runs                                    */
/* -------------------------------------------------------------------------- */

// Exhaustive over the reachable range: any deeper run must outrank any
// shallower one, whatever the points. Sampling this would miss exactly the
// boundary where the packing overflows.
const MAX_POINTS_PER_Q = endlessScore(0, 10, 0);
let checked = 0;
for (let deep = 1; deep <= 120; deep++) {
  const shallow = deep - 1;
  // The best a shallower run could possibly score, against the worst a deeper
  // one could.
  const shallowBest = endlessRecord(shallow, Math.min(99_999, shallow * MAX_POINTS_PER_Q));
  const deepWorst = endlessRecord(deep, 0);
  if (deepWorst <= shallowBest) {
    failures.push(
      `a run of ${shallow} can outrank a run of ${deep}: ${shallowBest} vs ${deepWorst}`
    );
  }
  checked++;
}

// And the packing has to survive a round trip.
for (let n = 0; n < 20_000; n++) {
  const cleared = randInt(rng, 0, 300);
  const points = randInt(rng, 0, 99_999);
  const back = unpackRecord(endlessRecord(cleared, points));
  if (back.cleared !== cleared || back.points !== points) {
    failures.push(`round trip lost ${cleared}/${points} -> ${back.cleared}/${back.points}`);
  }
}

// A realistic run can never saturate the points half. If it could, two deep
// runs would tie at the cap and the tiebreak would stop working.
const worstCase = 300 * MAX_POINTS_PER_Q;
if (worstCase >= 99_999) {
  failures.push(`300 perfect questions score ${worstCase}, which saturates the tiebreak`);
}

/* -------------------------------------------------------------------------- */
/* Endless must never share a key with the timed board                        */
/* -------------------------------------------------------------------------- */

for (const game of ["equalize", "flash", "approx", "doomsday", "memorytiles", "potodds", "outs", "combinatorics"]) {
  const key = endlessKey(game);
  if (key === `cmquant:${game}:best`) failures.push(`${game} endless shares the timed key`);
  if (!key.includes("endless")) failures.push(`${game} endless key is not marked: ${key}`);
}

console.log(`window indices    121`);
console.log(`scoring samples   20,000`);
console.log(`ordering pairs    ${checked} (exhaustive)`);
console.log(`round trips       20,000`);
console.log(`lives             ${LIVES}`);
console.log(`window            ${windowMs(0) / 1000}s at the start, ${windowMs(99) / 1000}s at the floor`);
console.log(`best per question ${MAX_POINTS_PER_Q} points`);
console.log(`failures          ${failures.length}`);

if (failures.length) {
  console.log("\nfirst failures");
  for (const f of failures.slice(0, 12)) console.log(`  ${f}`);
  process.exit(1);
}

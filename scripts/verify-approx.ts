/**
 * Property test for the Approx generator.
 *
 * The one that matters: the correct option must genuinely be the closest of the
 * four to the exact value. If rounding to two significant figures ever drifts
 * further from the truth than a distractor does, the game marks a right answer
 * wrong and nobody can tell why.
 */

import { questionAt, difficultyForIndex, type ApproxQuestion } from "../lib/games/approx";

const RUNS = 3000;
const QUESTIONS_PER_RUN = 40;

const failures: { seed: string; index: number; why: string }[] = [];
const answerSlot = [0, 0, 0, 0];
let generated = 0;
let slowest = 0;
let worstRoundingError = 0;
let tightestRatio = Infinity;

for (let run = 0; run < RUNS; run++) {
  const seed = `verify-${run}`;
  for (let i = 0; i < QUESTIONS_PER_RUN; i++) {
    const started = performance.now();
    let q: ApproxQuestion;
    try {
      q = questionAt(seed, i);
    } catch (err) {
      failures.push({ seed, index: i, why: `threw: ${(err as Error).message}` });
      continue;
    }
    slowest = Math.max(slowest, performance.now() - started);
    generated++;

    if (q.options.length !== 4) {
      failures.push({ seed, index: i, why: `${q.options.length} options` });
      continue;
    }

    for (let k = 1; k < 4; k++) {
      if (q.options[k] <= q.options[k - 1]) {
        failures.push({ seed, index: i, why: "options not strictly ascending" });
        break;
      }
      tightestRatio = Math.min(tightestRatio, q.options[k] / q.options[k - 1]);
    }

    // The flagged answer must be the closest option to the exact value.
    let closest = 0;
    for (let k = 1; k < 4; k++) {
      if (Math.abs(q.options[k] - q.exact) < Math.abs(q.options[closest] - q.exact)) {
        closest = k;
      }
    }
    if (closest !== q.answerIndex) {
      failures.push({
        seed,
        index: i,
        why: `answer ${q.options[q.answerIndex]} is not closest to ${q.exact.toFixed(1)} (option ${q.options[closest]} is)`,
      });
    }

    worstRoundingError = Math.max(
      worstRoundingError,
      Math.abs(q.options[q.answerIndex] - q.exact) / q.exact
    );

    if (q.difficulty !== difficultyForIndex(i)) {
      failures.push({ seed, index: i, why: "difficulty does not match index" });
    }
    if (!Number.isFinite(q.exact) || q.exact <= 0) {
      failures.push({ seed, index: i, why: `bad exact value ${q.exact}` });
    }

    answerSlot[q.answerIndex]++;
  }
}

let determinismBreaks = 0;
for (let run = 0; run < 200; run++) {
  for (let i = 0; i < 10; i++) {
    const a = questionAt(`determinism-${run}`, i);
    const b = questionAt(`determinism-${run}`, i);
    if (a.display !== b.display || a.answerIndex !== b.answerIndex) determinismBreaks++;
  }
}

const total = answerSlot.reduce((a, b) => a + b, 0);
const share = answerSlot.map((n) => (n / total) * 100);

console.log(`generated        ${generated.toLocaleString()} questions`);
console.log(`failures         ${failures.length}`);
console.log(`determinism      ${determinismBreaks === 0 ? "stable" : `${determinismBreaks} BREAKS`}`);
console.log(`slowest question ${slowest.toFixed(2)}ms`);
console.log(`worst rounding   ${(worstRoundingError * 100).toFixed(2)}%  (cap 2)`);
console.log(`tightest ratio   ${tightestRatio.toFixed(3)}x between adjacent options`);
console.log(`answer position  ${share.map((s) => s.toFixed(1) + "%").join("  ")}`);

console.log("\nsample run (seed sample-1)");
for (const i of [0, 6, 15, 30, 39]) {
  const q = questionAt("sample-1", i);
  const row = q.options
    .map((o, k) => (k === q.answerIndex ? `[${o.toLocaleString()}]` : ` ${o.toLocaleString()} `))
    .join(" ");
  console.log(`  #${String(i).padStart(2)} d${String(q.difficulty).padStart(2)}  ${q.display.padStart(22)}   ${row}`);
}

if (failures.length || determinismBreaks) {
  console.log("\nfirst failures");
  for (const f of failures.slice(0, 10)) console.log(`  ${f.seed}#${f.index}: ${f.why}`);
  process.exit(1);
}

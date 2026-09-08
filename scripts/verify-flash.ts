/**
 * Property test for the Flash generator.
 *
 * Flash is typed, not chosen, so the failure mode is different from the other
 * two: there is no answer position to leak. What matters is that every answer
 * is a whole number a person can actually type in a couple of seconds, that no
 * question is a freebie, and that the operator mix genuinely shifts as the
 * difficulty climbs rather than staying addition all the way up.
 */

import { questionAt, difficultyForIndex, type FlashQuestion } from "../lib/games/flash";

const RUNS = 4000;
const QUESTIONS_PER_RUN = 45;

const failures: { seed: string; index: number; why: string }[] = [];
const opsByTier = new Map<string, Map<string, number>>();
const answerDigits = new Map<number, number>();
let generated = 0;
let slowest = 0;

function tierOf(d: number): string {
  if (d <= 2) return "d1-2 ";
  if (d <= 4) return "d3-4 ";
  if (d <= 6) return "d5-6 ";
  return "d7-10";
}

for (let run = 0; run < RUNS; run++) {
  const seed = `verify-${run}`;

  for (let i = 0; i < QUESTIONS_PER_RUN; i++) {
    const started = performance.now();
    let q: FlashQuestion;
    try {
      q = questionAt(seed, i);
    } catch (err) {
      failures.push({ seed, index: i, why: `threw: ${(err as Error).message}` });
      continue;
    }
    slowest = Math.max(slowest, performance.now() - started);
    generated++;

    const d = difficultyForIndex(i);

    if (!Number.isInteger(q.answer)) {
      failures.push({ seed, index: i, why: `non-integer answer ${q.answer}` });
    }
    if (q.answer < 2) {
      failures.push({ seed, index: i, why: `trivial answer ${q.answer}` });
    }
    if (q.answer > 20_000) {
      failures.push({ seed, index: i, why: `answer too large to type: ${q.answer}` });
    }
    if (q.difficulty !== d) {
      failures.push({ seed, index: i, why: "difficulty does not match index" });
    }
    if (!q.display || !/\d/.test(q.display)) {
      failures.push({ seed, index: i, why: "empty or malformed display" });
    }

    // Division must be exact - the whole point of building it from the answer
    // outwards is that no question ever demands a decimal.
    if (q.op === "div") {
      const [left, right] = q.display.split(" ÷ ").map(Number);
      if (left % right !== 0 || left / right !== q.answer) {
        failures.push({ seed, index: i, why: `inexact division: ${q.display}` });
      }
    }

    const tier = tierOf(d);
    if (!opsByTier.has(tier)) opsByTier.set(tier, new Map());
    const bucket = opsByTier.get(tier)!;
    bucket.set(q.op, (bucket.get(q.op) ?? 0) + 1);

    const digits = String(q.answer).length;
    answerDigits.set(digits, (answerDigits.get(digits) ?? 0) + 1);
  }
}

let determinismBreaks = 0;
for (let run = 0; run < 200; run++) {
  for (let i = 0; i < 12; i++) {
    const a = questionAt(`determinism-${run}`, i);
    const b = questionAt(`determinism-${run}`, i);
    if (a.display !== b.display || a.answer !== b.answer) determinismBreaks++;
  }
}

console.log(`generated        ${generated.toLocaleString()} questions`);
console.log(`failures         ${failures.length}`);
console.log(`determinism      ${determinismBreaks === 0 ? "stable" : `${determinismBreaks} BREAKS`}`);
console.log(`slowest question ${slowest.toFixed(2)}ms`);

console.log("\noperator mix by tier");
for (const tier of [...opsByTier.keys()].sort()) {
  const bucket = opsByTier.get(tier)!;
  const total = [...bucket.values()].reduce((a, b) => a + b, 0);
  const parts = [...bucket.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([op, n]) => `${op} ${((n / total) * 100).toFixed(0)}%`);
  console.log(`  ${tier}  ${parts.join("  ")}`);
}

console.log("\nanswer length (digits typed)");
for (const digits of [...answerDigits.keys()].sort((a, b) => a - b)) {
  const share = (answerDigits.get(digits)! / generated) * 100;
  console.log(`  ${digits}  ${share.toFixed(1)}%`);
}

console.log("\nsample run (seed sample-1)");
for (const i of [0, 6, 15, 30, 44]) {
  const q = questionAt("sample-1", i);
  console.log(
    `  #${String(i).padStart(2)} d${String(q.difficulty).padStart(2)}  ` +
      `${q.display.padStart(14)}  =  ${q.answer}`
  );
}

if (failures.length || determinismBreaks) {
  console.log("\nfirst failures");
  for (const f of failures.slice(0, 12)) console.log(`  ${f.seed}#${f.index}: ${f.why}`);
  process.exit(1);
}

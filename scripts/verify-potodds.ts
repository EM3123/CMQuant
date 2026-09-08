/**
 * Property test for the Pot Odds generator.
 *
 * The property that matters most here is answer-position balance. Two of the
 * three distractors are mathematically always larger than the correct answer,
 * so a careless generator would put the right answer first every single time
 * and the game would be free to anyone who noticed.
 */

import {
  questionAt,
  breakEven,
  formatPercent,
  difficultyForIndex,
  type PotOddsQuestion,
} from "../lib/games/potodds";

const RUNS = 4000;
const QUESTIONS_PER_RUN = 40;

type Failure = { seed: string; index: number; why: string; q?: PotOddsQuestion };

const failures: Failure[] = [];
const answerSlot = [0, 0, 0, 0];
let generated = 0;
let slowest = { seed: "", index: 0, ms: 0 };
let minSeparationSeen = 1;

for (let run = 0; run < RUNS; run++) {
  const seed = `verify-${run}`;

  for (let i = 0; i < QUESTIONS_PER_RUN; i++) {
    const started = performance.now();
    let q: PotOddsQuestion;
    try {
      q = questionAt(seed, i);
    } catch (err) {
      failures.push({ seed, index: i, why: `threw: ${(err as Error).message}` });
      continue;
    }
    const ms = performance.now() - started;
    if (ms > slowest.ms) slowest = { seed, index: i, ms };
    generated++;

    // 1. Pot and bet must be whole chip amounts.
    if (!Number.isInteger(q.pot) || !Number.isInteger(q.bet)) {
      failures.push({ seed, index: i, why: "non-integer pot or bet", q });
    }

    // 2. Exactly four options.
    if (q.options.length !== 4) {
      failures.push({ seed, index: i, why: `${q.options.length} options`, q });
      continue;
    }

    // 3. Ascending, so the row reads as a scale.
    for (let k = 1; k < q.options.length; k++) {
      if (q.options[k] <= q.options[k - 1]) {
        failures.push({ seed, index: i, why: "options not strictly ascending", q });
        break;
      }
    }

    // 4. The flagged answer must be the true break-even share.
    const truth = breakEven(q.pot, q.bet);
    if (Math.abs(q.options[q.answerIndex] - truth) > 1e-9) {
      failures.push({ seed, index: i, why: "answerIndex is not the break-even", q });
    }

    // 5. No two options may render as the same label - a player cannot pick
    //    between two boxes reading "25%".
    const labels = new Set(q.options.map(formatPercent));
    if (labels.size !== 4) {
      failures.push({ seed, index: i, why: "two options share a label", q });
    }

    // 6. Difficulty tracks the index, never the player.
    if (q.difficulty !== difficultyForIndex(i)) {
      failures.push({ seed, index: i, why: "difficulty does not match index", q });
    }

    for (let a = 0; a < 4; a++) {
      for (let b = a + 1; b < 4; b++) {
        minSeparationSeen = Math.min(minSeparationSeen, Math.abs(q.options[a] - q.options[b]));
      }
    }

    answerSlot[q.answerIndex]++;
  }
}

// 7. Determinism.
let determinismBreaks = 0;
for (let run = 0; run < 200; run++) {
  for (let i = 0; i < 10; i++) {
    const a = questionAt(`determinism-${run}`, i);
    const b = questionAt(`determinism-${run}`, i);
    if (
      a.pot !== b.pot ||
      a.bet !== b.bet ||
      a.answerIndex !== b.answerIndex ||
      a.options.join() !== b.options.join()
    ) {
      determinismBreaks++;
    }
  }
}

const slotTotal = answerSlot.reduce((a, b) => a + b, 0);
const slotShare = answerSlot.map((n) => (n / slotTotal) * 100);

console.log(`generated        ${generated.toLocaleString()} questions`);
console.log(`failures         ${failures.length}`);
console.log(`determinism      ${determinismBreaks === 0 ? "stable" : `${determinismBreaks} BREAKS`}`);
console.log(`slowest question ${slowest.ms.toFixed(2)}ms`);
console.log(`min separation   ${(minSeparationSeen * 100).toFixed(2)} percentage points`);
console.log(
  `answer position  ${slotShare.map((s) => s.toFixed(1) + "%").join("  ")}  (want each 15-40)`
);

console.log("\nsample run (seed sample-1)");
for (const i of [0, 6, 15, 30, 39]) {
  const q = questionAt("sample-1", i);
  const row = q.options
    .map((o, k) => (k === q.answerIndex ? `[${formatPercent(o)}]` : ` ${formatPercent(o)} `))
    .join(" ");
  console.log(
    `  #${String(i).padStart(2)} d${String(q.difficulty).padStart(2)}  ` +
      `pot ${String(q.pot).padStart(4)}  bet ${String(q.bet).padStart(4)}   ${row}`
  );
}

const balanceBroken = slotShare.some((s) => s < 12 || s > 45);

if (failures.length || determinismBreaks || balanceBroken) {
  if (balanceBroken) console.log("\nANSWER POSITION IS UNBALANCED");
  console.log("\nfirst failures");
  for (const f of failures.slice(0, 12)) {
    console.log(`  ${f.seed}#${f.index}: ${f.why}`);
  }
  process.exit(1);
}

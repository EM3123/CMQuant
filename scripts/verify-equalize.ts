/**
 * Property test for the Equalize generator.
 *
 * Rendering the game is an afternoon. This is the part that decides whether the
 * game is any good, so it gets asserted across thousands of seeds rather than
 * eyeballed on three.
 */

import {
  questionAt,
  generate,
  gapBand,
  difficultyForIndex,
  type EqualizeQuestion,
} from "../lib/games/equalize";

const RUNS = 4000;
const QUESTIONS_PER_RUN = 45;

type Failure = { seed: string; index: number; why: string; q?: EqualizeQuestion };

const failures: Failure[] = [];
const gapsByDifficulty = new Map<number, number[]>();
const templateShape = new Map<string, number>();
let generated = 0;
let slowest = { seed: "", index: 0, ms: 0 };

function shapeOf(display: string): string {
  if (display.includes("% of")) return "pct";
  if (display.includes("²")) return "sq";
  if (display.includes("÷")) return "div";
  if (display.includes("×") && display.includes("+")) return "mulAdd";
  if (display.includes("×")) return "mul";
  if (display.includes("−")) return "sub";
  return "add3";
}

for (let run = 0; run < RUNS; run++) {
  const seed = `verify-${run}`;

  for (let i = 0; i < QUESTIONS_PER_RUN; i++) {
    const started = performance.now();
    let q: EqualizeQuestion;
    try {
      q = questionAt(seed, i);
    } catch (err) {
      failures.push({ seed, index: i, why: `threw: ${(err as Error).message}` });
      continue;
    }
    const ms = performance.now() - started;
    if (ms > slowest.ms) slowest = { seed, index: i, ms };
    generated++;

    const d = difficultyForIndex(i);
    const band = gapBand(d);

    // 1. Both sides must be whole numbers. A fractional value means a template
    //    produced something nobody can compute in their head.
    if (!Number.isInteger(q.left.value) || !Number.isInteger(q.right.value)) {
      failures.push({ seed, index: i, why: "non-integer value", q });
    }

    // 2. There must be a correct answer.
    if (q.left.value === q.right.value) {
      failures.push({ seed, index: i, why: "no correct answer (tie)", q });
    }

    // 3. The stated answer must match the values.
    const truth = q.left.value > q.right.value ? "left" : "right";
    if (q.answer !== truth) {
      failures.push({ seed, index: i, why: "answer disagrees with values", q });
    }

    // 4. The gap must sit inside the difficulty band: close enough that
    //    eyeballing fails, far enough that the answer is defensible.
    if (q.gap < band.min - 1e-9 || q.gap > band.max + 1e-9) {
      failures.push({
        seed,
        index: i,
        why: `gap ${q.gap.toFixed(4)} outside band [${band.min.toFixed(3)}, ${band.max.toFixed(3)}]`,
        q,
      });
    }

    // 5. Difficulty must match the index, not the player.
    if (q.difficulty !== d) {
      failures.push({ seed, index: i, why: "difficulty does not match index", q });
    }

    // 6. Values must stay in a range a person can hold in their head.
    if (q.left.value < 20 || q.right.value < 20) {
      failures.push({ seed, index: i, why: "value below floor", q });
    }
    if (q.left.value > 100_000 || q.right.value > 100_000) {
      failures.push({ seed, index: i, why: "value above sane ceiling", q });
    }

    // 7. The two sides must not read identically.
    if (q.left.display === q.right.display) {
      failures.push({ seed, index: i, why: "identical displays", q });
    }

    const gaps = gapsByDifficulty.get(d) ?? [];
    gaps.push(q.gap);
    gapsByDifficulty.set(d, gaps);

    for (const shape of [shapeOf(q.left.display), shapeOf(q.right.display)]) {
      templateShape.set(shape, (templateShape.get(shape) ?? 0) + 1);
    }
  }
}

// 8. Determinism. The same seed must produce the same question, always.
let determinismBreaks = 0;
for (let run = 0; run < 200; run++) {
  const seed = `determinism-${run}`;
  for (let i = 0; i < 12; i++) {
    const a = questionAt(seed, i);
    const b = questionAt(seed, i);
    if (
      a.left.display !== b.left.display ||
      a.right.display !== b.right.display ||
      a.answer !== b.answer
    ) {
      determinismBreaks++;
    }
  }
}

// 9. Answer balance. If one side is right more than about 55% of the time,
//    always picking that side beats thinking.
let leftWins = 0;
let total = 0;
for (let run = 0; run < 1500; run++) {
  for (let i = 0; i < QUESTIONS_PER_RUN; i++) {
    const q = questionAt(`balance-${run}`, i);
    if (q.answer === "left") leftWins++;
    total++;
  }
}

console.log(`generated        ${generated.toLocaleString()} questions`);
console.log(`failures         ${failures.length}`);
console.log(`determinism      ${determinismBreaks === 0 ? "stable" : `${determinismBreaks} BREAKS`}`);
console.log(
  `left-answer rate ${((leftWins / total) * 100).toFixed(2)}%  (want 45-55)`
);
console.log(`slowest question ${slowest.ms.toFixed(2)}ms  (seed ${slowest.seed} #${slowest.index})`);

console.log("\ngap distribution by difficulty");
for (const d of [...gapsByDifficulty.keys()].sort((a, b) => a - b)) {
  const gaps = gapsByDifficulty.get(d)!.sort((a, b) => a - b);
  const band = gapBand(d);
  const median = gaps[Math.floor(gaps.length / 2)];
  console.log(
    `  d${String(d).padStart(2)}  band [${band.min.toFixed(3)}, ${band.max.toFixed(3)}]` +
      `  median ${median.toFixed(3)}  n=${gaps.length}`
  );
}

console.log("\ntemplate mix (both sides pooled)");
const shapeTotal = [...templateShape.values()].reduce((a, b) => a + b, 0);
for (const [shape, n] of [...templateShape.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${shape.padEnd(8)} ${((n / shapeTotal) * 100).toFixed(1)}%`);
}

console.log("\nsample run (seed sample-1)");
for (const i of [0, 6, 15, 30, 44]) {
  const q = generate(`sample-1#${i}`, difficultyForIndex(i));
  console.log(
    `  #${String(i).padStart(2)} d${String(q.difficulty).padStart(2)}  ` +
      `${q.left.display.padStart(18)}  vs  ${q.right.display.padEnd(18)}` +
      `  -> ${q.answer.toUpperCase().padEnd(5)} gap ${(q.gap * 100).toFixed(1)}%`
  );
}

if (failures.length || determinismBreaks) {
  console.log("\nfirst failures");
  for (const f of failures.slice(0, 12)) {
    console.log(
      `  ${f.seed}#${f.index}: ${f.why}` +
        (f.q ? `  [${f.q.left.display} = ${f.q.left.value} | ${f.q.right.display} = ${f.q.right.value}]` : "")
    );
  }
  process.exit(1);
}

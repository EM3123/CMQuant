/**
 * Property test for the Outs generator.
 *
 * The stated out count is re-derived here by a second, deliberately dumb
 * route: walk all 46 unseen cards, build the seven-card hand, ask for its
 * category. If the generator's number and this number ever disagree, the game
 * is marking correct answers wrong.
 */

import { questionAt, difficultyForIndex, type OutsQuestion } from "../lib/games/outs";
import { encode, bestCategory } from "../lib/poker/hand";

const RUNS = 1200;
const QUESTIONS_PER_RUN = 24;

const failures: { where: string; why: string }[] = [];
const answerSlot = [0, 0, 0, 0];
const targetUse = new Map<string, number>();
const outsSeen = new Map<number, number>();
let generated = 0;
let slowest = 0;

for (let run = 0; run < RUNS; run++) {
  const seed = `verify-${run}`;
  for (let i = 0; i < QUESTIONS_PER_RUN; i++) {
    const started = performance.now();
    let q: OutsQuestion;
    try {
      q = questionAt(seed, i);
    } catch (err) {
      failures.push({ where: `${seed}#${i}`, why: `threw: ${(err as Error).message}` });
      continue;
    }
    slowest = Math.max(slowest, performance.now() - started);
    generated++;

    const known = [...q.hole, ...q.board].map(encode);

    // No card may appear twice across the hole and board.
    if (new Set(known).size !== 6) {
      failures.push({ where: `${seed}#${i}`, why: "duplicate card dealt" });
    }
    if (q.hole.length !== 2 || q.board.length !== 4) {
      failures.push({ where: `${seed}#${i}`, why: "wrong number of cards" });
    }

    // Independent recount.
    const seen = new Set(known);
    let recount = 0;
    for (let card = 0; card < 52; card++) {
      if (seen.has(card)) continue;
      if (bestCategory([...known, card]) >= q.target) recount++;
    }
    if (recount !== q.outs) {
      failures.push({
        where: `${seed}#${i}`,
        why: `generator says ${q.outs} outs, recount says ${recount}`,
      });
    }

    // The target must be an improvement, or the answer is "all of them".
    if (bestCategory(known) >= q.target) {
      failures.push({ where: `${seed}#${i}`, why: "target already made before the last card" });
    }

    if (q.options.length !== 4) {
      failures.push({ where: `${seed}#${i}`, why: `${q.options.length} options` });
      continue;
    }
    if (q.options[q.answerIndex] !== q.outs) {
      failures.push({ where: `${seed}#${i}`, why: "answerIndex does not point at the out count" });
    }
    if (new Set(q.options).size !== 4) {
      failures.push({ where: `${seed}#${i}`, why: "duplicate options" });
    }
    for (let k = 1; k < 4; k++) {
      if (q.options[k] <= q.options[k - 1]) {
        failures.push({ where: `${seed}#${i}`, why: "options not ascending" });
        break;
      }
    }
    if (q.options.some((o) => o < 1)) {
      failures.push({ where: `${seed}#${i}`, why: "option below one" });
    }
    if (q.difficulty !== difficultyForIndex(i)) {
      failures.push({ where: `${seed}#${i}`, why: "difficulty does not match index" });
    }

    answerSlot[q.answerIndex]++;
    targetUse.set(q.targetName, (targetUse.get(q.targetName) ?? 0) + 1);
    outsSeen.set(q.outs, (outsSeen.get(q.outs) ?? 0) + 1);
  }
}

let determinismBreaks = 0;
for (let run = 0; run < 120; run++) {
  for (let i = 0; i < 6; i++) {
    const a = questionAt(`determinism-${run}`, i);
    const b = questionAt(`determinism-${run}`, i);
    if (
      a.hole.join() !== b.hole.join() ||
      a.board.join() !== b.board.join() ||
      a.outs !== b.outs ||
      a.answerIndex !== b.answerIndex
    ) {
      determinismBreaks++;
    }
  }
}

const total = answerSlot.reduce((a, b) => a + b, 0);
const share = answerSlot.map((n) => (n / total) * 100);

console.log(`generated        ${generated.toLocaleString()} spots`);
console.log(`failures         ${failures.length}`);
console.log(`determinism      ${determinismBreaks === 0 ? "stable" : `${determinismBreaks} BREAKS`}`);
console.log(`slowest question ${slowest.toFixed(1)}ms`);
console.log(`answer position  ${share.map((s) => s.toFixed(1) + "%").join("  ")}`);

console.log("\ntarget mix");
for (const [name, n] of [...targetUse.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${name.padEnd(18)} ${((n / generated) * 100).toFixed(1)}%`);
}

console.log("\nout counts asked");
const outsRow = [...outsSeen.entries()].sort((a, b) => a[0] - b[0]);
console.log("  " + outsRow.map(([o, n]) => `${o}:${((n / generated) * 100).toFixed(0)}%`).join("  "));

console.log("\nsample run (seed sample-1)");
for (const i of [0, 4, 10, 18, 23]) {
  const q = questionAt("sample-1", i);
  const row = q.options
    .map((o, k) => (k === q.answerIndex ? `[${o}]` : ` ${o} `))
    .join(" ");
  console.log(
    `  #${String(i).padStart(2)} d${String(q.difficulty).padStart(2)}  ${q.hole.join(" ")} | ${q.board.join(" ")}  -> ${q.targetName.padEnd(17)} ${row}`
  );
}

if (failures.length || determinismBreaks) {
  console.log("\nfirst failures");
  for (const f of failures.slice(0, 10)) console.log(`  ${f.where}: ${f.why}`);
  process.exit(1);
}

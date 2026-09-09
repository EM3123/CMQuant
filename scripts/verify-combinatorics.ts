/**
 * Property test for the Combinatorics generator.
 *
 * The closed-form count in the generator is the thing under test. The oracle is
 * brute force: walk every pair of cards still in the deck, ask whether that
 * pair matches the holding, and tally. Two completely different routes to the
 * same number, checked on every question.
 */

import {
  questionAt,
  countCombos,
  difficultyForIndex,
  type CombinatoricsQuestion,
  type Holding,
} from "../lib/games/combinatorics";
import { fullDeck } from "../lib/cards";
import type { CardCode } from "../components/cards/PlayingCard";

/** Does this exact pair of cards match the holding? */
function matches(a: CardCode, b: CardCode, h: Holding): boolean {
  const ranks = [a[0], b[0]].sort();
  const want = [h.high, h.low].sort();
  if (ranks[0] !== want[0] || ranks[1] !== want[1]) return false;
  const suited = a[1] === b[1];
  if (h.kind === "pair") return true;
  if (h.kind === "suited") return suited;
  if (h.kind === "offsuit") return !suited;
  return true;
}

/** The oracle. Every remaining pair, counted one at a time. */
function bruteForce(board: CardCode[], h: Holding): number {
  const dead = new Set(board);
  const live = fullDeck().filter((c) => !dead.has(c));
  let n = 0;
  for (let i = 0; i < live.length; i++) {
    for (let j = i + 1; j < live.length; j++) {
      if (matches(live[i], live[j], h)) n++;
    }
  }
  return n;
}

const RUNS = 2500;
const QUESTIONS_PER_RUN = 30;

const failures: { where: string; why: string }[] = [];
const answerSlot = [0, 0, 0, 0];
const shapeUse = new Map<string, number>();
const combosSeen = new Map<number, number>();
let generated = 0;
let slowest = 0;

for (let run = 0; run < RUNS; run++) {
  const seed = `verify-${run}`;
  for (let i = 0; i < QUESTIONS_PER_RUN; i++) {
    const started = performance.now();
    let q: CombinatoricsQuestion;
    try {
      q = questionAt(seed, i);
    } catch (err) {
      failures.push({ where: `${seed}#${i}`, why: `threw: ${(err as Error).message}` });
      continue;
    }
    slowest = Math.max(slowest, performance.now() - started);
    generated++;

    // 1. The number itself, recomputed the slow way.
    const truth = bruteForce(q.board, q.holding);
    if (truth !== q.combos) {
      failures.push({
        where: `${seed}#${i}`,
        why: `${q.holdingLabel} on ${q.board.join(" ")}: generator says ${q.combos}, brute force says ${truth}`,
      });
    }

    // 2. And the exported helper agrees with itself.
    if (countCombos(q.board, q.holding) !== q.combos) {
      failures.push({ where: `${seed}#${i}`, why: "countCombos disagrees with the question" });
    }

    // 3. A board cannot contain the same card twice.
    if (new Set(q.board).size !== q.board.length) {
      failures.push({ where: `${seed}#${i}`, why: "duplicate card on the board" });
    }

    // 4. Options.
    if (q.options.length !== 4 || new Set(q.options).size !== 4) {
      failures.push({ where: `${seed}#${i}`, why: "options not four distinct values" });
      continue;
    }
    if (q.options[q.answerIndex] !== q.combos) {
      failures.push({ where: `${seed}#${i}`, why: "answerIndex does not point at the count" });
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

    // 5. A question whose answer is zero or one teaches nothing.
    if (q.combos < 2) {
      failures.push({ where: `${seed}#${i}`, why: `degenerate answer ${q.combos}` });
    }

    if (q.difficulty !== difficultyForIndex(i)) {
      failures.push({ where: `${seed}#${i}`, why: "difficulty does not match index" });
    }

    answerSlot[q.answerIndex]++;
    shapeUse.set(q.holding.kind, (shapeUse.get(q.holding.kind) ?? 0) + 1);
    combosSeen.set(q.combos, (combosSeen.get(q.combos) ?? 0) + 1);
  }
}

let determinismBreaks = 0;
for (let run = 0; run < 200; run++) {
  for (let i = 0; i < 8; i++) {
    const a = questionAt(`determinism-${run}`, i);
    const b = questionAt(`determinism-${run}`, i);
    if (a.board.join() !== b.board.join() || a.combos !== b.combos || a.answerIndex !== b.answerIndex) {
      determinismBreaks++;
    }
  }
}

const total = answerSlot.reduce((a, b) => a + b, 0);
const share = answerSlot.map((n) => (n / total) * 100);

console.log(`generated        ${generated.toLocaleString()} questions`);
console.log(`failures         ${failures.length}`);
console.log(`determinism      ${determinismBreaks === 0 ? "stable" : `${determinismBreaks} BREAKS`}`);
console.log(`slowest question ${slowest.toFixed(1)}ms`);
console.log(`answer position  ${share.map((s) => s.toFixed(1) + "%").join("  ")}`);

console.log("\nshape mix");
for (const [kind, n] of [...shapeUse.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${kind.padEnd(9)} ${((n / generated) * 100).toFixed(1)}%`);
}

console.log("\nanswers asked");
console.log(
  "  " +
    [...combosSeen.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([c, n]) => `${c}:${((n / generated) * 100).toFixed(0)}%`)
      .join("  ")
);

console.log("\nsample run (seed sample-1)");
for (const i of [0, 5, 12, 20, 29]) {
  const q = questionAt("sample-1", i);
  const row = q.options.map((o, k) => (k === q.answerIndex ? `[${o}]` : ` ${o} `)).join(" ");
  console.log(
    `  #${String(i).padStart(2)} d${String(q.difficulty).padStart(2)}  ${q.board.join(" ").padEnd(15)}  ${q.holdingLabel.padEnd(22)} ${row}`
  );
}

const skewed = share.some((s) => s < 12 || s > 45);
if (failures.length || determinismBreaks || skewed) {
  if (skewed) console.log("\nANSWER POSITION IS UNBALANCED");
  console.log("\nfirst failures");
  for (const f of failures.slice(0, 10)) console.log(`  ${f.where}: ${f.why}`);
  process.exit(1);
}

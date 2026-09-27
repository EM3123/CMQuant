/**
 * Property test for the Equity generator.
 *
 * The claim on screen is a percentage, and a percentage is the easiest thing on
 * this site to be quietly wrong about - nobody can check it by looking. So the
 * oracle recomputes it by a completely different route: instead of calling
 * `equityVsHand`, deal every runout here and compare the two seven-card hands
 * with a ranker built out of the categoriser, counting wins, ties and losses by
 * hand.
 *
 * If the two ever disagree, the game is showing a number about somebody's own
 * decision that is not true.
 */

import {
  questionAt,
  difficultyForIndex,
  validate,
  diagnose,
  MISTAKE_LABEL,
  type EquityQuestion,
} from "../lib/games/equity";
import { encode } from "../lib/poker/hand";
import { bestRank } from "../lib/poker/rank";

// Each spot costs two full enumerations - the generator's and this file's
// independent recount - so this is deliberately smaller than the arithmetic
// suites. Every spot it does look at is checked completely.
const RUNS = 90;
const QUESTIONS_PER_RUN = 14;

type Failure = { where: string; why: string };
const failures: Failure[] = [];

/** Every runout, dealt and counted here rather than by the library. */
function recountEquity(hero: number[], villain: number[], board: number[]) {
  const dead = new Set([...hero, ...villain, ...board]);
  const deck: number[] = [];
  for (let c = 0; c < 52; c++) if (!dead.has(c)) deck.push(c);

  let win = 0;
  let tie = 0;
  let lose = 0;

  const settle = (extra: number[]) => {
    const full = [...board, ...extra];
    const h = bestRank([...hero, ...full]);
    const v = bestRank([...villain, ...full]);
    if (h > v) win++;
    else if (h < v) lose++;
    else tie++;
  };

  const toCome = 5 - board.length;
  if (toCome === 1) {
    for (const a of deck) settle([a]);
  } else if (toCome === 2) {
    for (let i = 0; i < deck.length; i++)
      for (let j = i + 1; j < deck.length; j++) settle([deck[i], deck[j]]);
  } else {
    throw new Error(`unexpected board of ${board.length}`);
  }

  const total = win + tie + lose;
  return { equity: (win + tie / 2) / total, runouts: total };
}

const slotCounts = [0, 0, 0, 0];
const equities: number[] = [];
const outsGap: number[] = [];
const mistakesSeen = new Set<string>();
let generated = 0;
let slowest = 0;
const timings: number[] = [];
let turnSpots = 0;
let flopSpots = 0;

for (let run = 0; run < RUNS; run++) {
  const seed = `verify-${run}`;

  for (let i = 0; i < QUESTIONS_PER_RUN; i++) {
    const started = performance.now();
    let q: EquityQuestion;
    try {
      q = questionAt(seed, i);
    } catch (err) {
      failures.push({ where: `${seed}#${i}`, why: `threw: ${(err as Error).message}` });
      continue;
    }
    const took = performance.now() - started;
    slowest = Math.max(slowest, took);
    timings.push(took);
    generated++;

    const where = `${seed}#${i}`;
    const hero = q.hero.map(encode);
    const villain = q.villain.map(encode);
    const board = q.board.map(encode);

    // 1. No card twice, anywhere.
    const all = [...q.hero, ...q.villain, ...q.board];
    if (new Set(all).size !== all.length) {
      failures.push({ where, why: "a card appears twice" });
    }
    if (q.board.length !== 4) {
      failures.push({ where, why: `board of ${q.board.length}, expected the turn` });
    }

    // The hero must be the one drawing. If this ever fails, "outs times two"
    // has stopped meaning anything and so has the whole question.
    if (bestRank([...hero, ...board]) >= bestRank([...villain, ...board])) {
      failures.push({ where, why: "hero is not behind on the turn" });
    }
    if (q.equity >= 0.5) {
      failures.push({ where, why: `hero is behind but holds ${(q.equity * 100).toFixed(1)}% equity` });
    }

    // 2. The number on screen, recomputed the slow way.
    const mine = recountEquity(hero, villain, board);
    if (Math.abs(mine.equity - q.equity) > 1e-12) {
      failures.push({
        where,
        why: `equity says ${q.equity.toFixed(6)}, recount says ${mine.equity.toFixed(6)}`,
      });
    }
    if (mine.runouts !== q.runouts) {
      failures.push({ where, why: `runouts ${q.runouts} vs recount ${mine.runouts}` });
    }

    // 3. Four distinct options, the answer among them, sorted ascending.
    if (q.options.length !== 4) failures.push({ where, why: "not four options" });
    for (let k = 1; k < q.options.length; k++) {
      if (q.options[k] <= q.options[k - 1]) {
        failures.push({ where, why: "options not strictly ascending" });
        break;
      }
    }
    if (Math.round(q.equity * 100) !== q.options[q.answerIndex]) {
      failures.push({
        where,
        why: `answer slot holds ${q.options[q.answerIndex]}, equity rounds to ${Math.round(q.equity * 100)}`,
      });
    }
    if (!validate(q, q.answerIndex)) failures.push({ where, why: "validate rejects its own answer" });

    // 4. Options have to be far enough apart to be different answers. Two
    //    percentages a point apart is one question with two right answers.
    for (let k = 1; k < q.options.length; k++) {
      if (q.options[k] - q.options[k - 1] < 4) {
        failures.push({ where, why: `options ${q.options[k - 1]} and ${q.options[k]} too close` });
        break;
      }
    }

    // 5. Only wrong slots carry a diagnosis, and the named ones have to be the
    //    error they claim. wrong-player must be the villain's actual share.
    if (diagnose(q, q.answerIndex) !== null) {
      failures.push({ where, why: "the correct answer carries a mistake label" });
    }
    q.diagnoses.forEach((kind, slot) => {
      if (!kind) return;
      mistakesSeen.add(kind);
      if (!(kind in MISTAKE_LABEL)) failures.push({ where, why: `unknown mistake ${kind}` });
      if (kind === "dead-outs" && q.options[slot] !== q.optimisticOuts * 2) {
        failures.push({
          where,
          why: `dead-outs slot is ${q.options[slot]}, naive count x2 is ${q.optimisticOuts * 2}`,
        });
      }
      if (kind === "rule-of-four" && q.options[slot] !== q.outs * 4) {
        failures.push({
          where,
          why: `rule-of-four slot is ${q.options[slot]}, outs x4 is ${q.outs * 4}`,
        });
      }
    });

    // 6. Outs must actually be outs: recount them by walking every unseen card.
    let recountedOuts = 0;
    const dead = new Set([...hero, ...villain, ...board]);
    for (let c = 0; c < 52; c++) {
      if (dead.has(c)) continue;
      const next = [...board, c];
      if (bestRank([...hero, ...next]) > bestRank([...villain, ...next])) recountedOuts++;
    }
    if (recountedOuts !== q.outs) {
      failures.push({ where, why: `outs ${q.outs} vs recount ${recountedOuts}` });
    }

    if (q.difficulty !== difficultyForIndex(i)) {
      failures.push({ where, why: "difficulty does not match index" });
    }

    slotCounts[q.answerIndex]++;
    equities.push(q.equity);
    outsGap.push(q.optimisticOuts - q.outs);
    if (q.board.length === 4) turnSpots++;
    else flopSpots++;
  }
}

let determinismBreaks = 0;
for (let run = 0; run < 60; run++) {
  for (let i = 0; i < 4; i++) {
    const a = questionAt(`determinism-${run}`, i);
    const b = questionAt(`determinism-${run}`, i);
    if (JSON.stringify(a) !== JSON.stringify(b)) determinismBreaks++;
  }
}

const total = slotCounts.reduce((a, b) => a + b, 0);
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const worstSlot = Math.max(...slotCounts.map((n) => Math.abs(n / total - 0.25)));

console.log(`generated        ${generated.toLocaleString()} spots`);
console.log(`failures         ${failures.length}`);
console.log(`determinism      ${determinismBreaks === 0 ? "stable" : `${determinismBreaks} BREAKS`}`);
// This is the slowest generator in the project by an order of magnitude, so
// the shape of the distribution matters more than the worst case. A player
// feels the median between every question; they meet the maximum once.
{
  const sorted = [...timings].sort((a, b) => a - b);
  const at = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
  console.log(
    `generation time  median ${at(0.5).toFixed(0)}ms   p95 ${at(0.95).toFixed(0)}ms   max ${slowest.toFixed(0)}ms`
  );
}
console.log(`turn spots       ${turnSpots.toLocaleString()} (flop ${flopSpots})`);
console.log(`median equity    ${(median(equities) * 100).toFixed(1)}%`);
console.log(
  `answer slot      ${slotCounts.map((n) => `${((n / total) * 100).toFixed(1)}%`).join("  ")}`
);
console.log(`dead outs        ${median(outsGap).toFixed(1)} median, of ${median(equities.map(() => 0)).toFixed(0) === "0" ? "" : ""}apparent outs`);
console.log(`mistakes seen    ${[...mistakesSeen].sort().join(", ") || "NONE"}`);

const lopsided = worstSlot > 0.09;
const missingMistake = Object.keys(MISTAKE_LABEL).filter((k) => !mistakesSeen.has(k));

if (failures.length || determinismBreaks || lopsided || missingMistake.length) {
  if (lopsided) console.log("\nANSWER SLOT IS BIASED - picking one position beats thinking");
  if (missingMistake.length)
    console.log(`\nMISTAKES THAT NEVER APPEARED: ${missingMistake.join(", ")}`);
  console.log("\nfirst failures");
  for (const f of failures.slice(0, 10)) console.log(`  ${f.where}: ${f.why}`);
  process.exit(1);
}

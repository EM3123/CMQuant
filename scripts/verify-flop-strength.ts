/**
 * Property test for the precomputed flop-strength table.
 *
 * That table shades the range matrix on the Poker Lab, so it is a number the
 * site shows people. The rule here is the same as everywhere else: recompute it
 * by a second, independent route and check the two agree.
 *
 * The independent route is the point. `categorise5` finds a straight with a
 * rank bitmask and a flush by counting suits; the checker below sorts the
 * ranks and walks them, and counts multiplicities into a map. If both say the
 * same thing about three million flops, they are not both wrong in the same
 * way.
 */

import { RANKS } from "../lib/cards";
import { encode } from "../lib/poker/hand";
import {
  FLOP_STRENGTH,
  FLOP_STRENGTH_MIN,
  FLOP_STRENGTH_MAX,
} from "../lib/poker/flop-strength";
import type { CardCode, Suit } from "../components/cards/PlayingCard";

type Shape = "pair" | "suited" | "offsuit";

/**
 * Two pair or better, worked out from scratch: sort the ranks, walk them for
 * runs and repeats, count suits in a plain object. Deliberately shares no code
 * with lib/poker/hand.ts beyond the card encoding.
 */
function twoPairOrBetter(cards: number[]): boolean {
  const ranks = cards.map((c) => c >> 2).sort((a, b) => a - b);
  const suits = cards.map((c) => c & 3);

  // Flush: all five suits equal.
  if (suits.every((s) => s === suits[0])) return true;

  // Straight: five distinct ranks in a row, or the wheel.
  const distinct = [...new Set(ranks)];
  if (distinct.length === 5) {
    if (distinct[4] - distinct[0] === 4) return true;
    // A2345 - ace is rank 12, the other four are 0..3.
    if (distinct[0] === 0 && distinct[3] === 3 && distinct[4] === 12) return true;
  }

  // Repeats. Two pair or better means either two distinct ranks appear twice,
  // or some rank appears three or more times.
  const runs: number[] = [];
  let run = 1;
  for (let i = 1; i < 5; i++) {
    if (ranks[i] === ranks[i - 1]) run++;
    else {
      runs.push(run);
      run = 1;
    }
  }
  runs.push(run);

  if (runs.some((n) => n >= 3)) return true;
  return runs.filter((n) => n === 2).length >= 2;
}

function representative(
  high: number,
  low: number,
  shape: Shape,
  alt = false
): [CardCode, CardCode] {
  const h = RANKS[high];
  const l = RANKS[low];
  const [a, b]: [Suit, Suit] = alt ? ["d", "c"] : ["s", "h"];
  if (shape === "pair") return [`${h}${a}`, `${h}${b}`];
  if (shape === "suited") return [`${h}${a}`, `${l}${a}`];
  return [`${h}${a}`, `${l}${b}`];
}

function recompute(hole: [CardCode, CardCode]): number {
  const [h1, h2] = hole.map(encode);
  const dead = new Set([h1, h2]);
  const deck: number[] = [];
  for (let c = 0; c < 52; c++) if (!dead.has(c)) deck.push(c);

  const five = [h1, h2, 0, 0, 0];
  let made = 0;
  let flops = 0;

  for (let i = 0; i < deck.length - 2; i++) {
    five[2] = deck[i];
    for (let j = i + 1; j < deck.length - 1; j++) {
      five[3] = deck[j];
      for (let k = j + 1; k < deck.length; k++) {
        five[4] = deck[k];
        flops++;
        if (twoPairOrBetter(five)) made++;
      }
    }
  }
  if (flops !== 19_600) throw new Error(`expected 19,600 flops, walked ${flops}`);
  return made / flops;
}

const failures: string[] = [];
const started = Date.now();

// Shape of the table.
if (FLOP_STRENGTH.length !== 13) failures.push("table is not 13 rows");
for (const row of FLOP_STRENGTH) {
  if (row.length !== 13) failures.push("a row is not 13 wide");
}

// Every cell recomputed the slow way. 169 x 19,600 is a few seconds, and this
// is the whole point of the file, so none of it is sampled.
let checked = 0;
for (let row = 0; row < 13; row++) {
  for (let col = 0; col < 13; col++) {
    const shape: Shape = row === col ? "pair" : col > row ? "suited" : "offsuit";
    const mine = recompute(representative(Math.min(row, col), Math.max(row, col), shape));
    const table = FLOP_STRENGTH[row][col];
    // The table is stored to four decimal places.
    if (Math.abs(mine - table) > 5e-5) {
      failures.push(
        `[${row}][${col}] table ${table.toFixed(4)} vs recount ${mine.toFixed(4)}`
      );
    }
    checked++;
  }
}

// Suits cannot matter before a board exists.
let suitBreaks = 0;
for (const [row, col] of [
  [0, 0],
  [0, 1],
  [1, 0],
  [6, 9],
  [9, 6],
  [12, 12],
] as [number, number][]) {
  const shape: Shape = row === col ? "pair" : col > row ? "suited" : "offsuit";
  const a = recompute(representative(Math.min(row, col), Math.max(row, col), shape));
  const b = recompute(
    representative(Math.min(row, col), Math.max(row, col), shape, true)
  );
  if (Math.abs(a - b) > 1e-12) suitBreaks++;
}

// Suited must beat its offsuit twin, always - same ranks, one extra way to
// make a flush. If this ever fails, the grid is mirrored.
let mirrorBreaks = 0;
for (let row = 0; row < 13; row++) {
  for (let col = row + 1; col < 13; col++) {
    if (FLOP_STRENGTH[row][col] <= FLOP_STRENGTH[col][row]) mirrorBreaks++;
  }
}

const flat = FLOP_STRENGTH.flat();
const min = Math.min(...flat);
const max = Math.max(...flat);
if (Math.abs(min - FLOP_STRENGTH_MIN) > 1e-9) failures.push("MIN constant is wrong");
if (Math.abs(max - FLOP_STRENGTH_MAX) > 1e-9) failures.push("MAX constant is wrong");

// Every pocket pair is the same number: two pair or better from a pair does
// not care which rank the pair is.
const diagonal = new Set(FLOP_STRENGTH.map((r, i) => r[i].toFixed(4)));
if (diagonal.size !== 1) failures.push(`pocket pairs disagree: ${[...diagonal].join(", ")}`);

console.log(`cells recomputed ${checked}`);
console.log(`flops per cell   19,600 (enumerated)`);
console.log(`failures         ${failures.length}`);
console.log(`suit dependence  ${suitBreaks === 0 ? "none" : `${suitBreaks} BREAKS`}`);
console.log(`suited > offsuit ${mirrorBreaks === 0 ? "always" : `${mirrorBreaks} BREAKS`}`);
console.log(`weakest          ${(min * 100).toFixed(2)}%`);
console.log(`strongest        ${(max * 100).toFixed(2)}%`);
console.log(`pocket pairs     ${(FLOP_STRENGTH[0][0] * 100).toFixed(2)}% (all ranks)`);
console.log(`elapsed          ${((Date.now() - started) / 1000).toFixed(1)}s`);

if (failures.length || suitBreaks || mirrorBreaks) {
  console.log("\nfirst failures");
  for (const f of failures.slice(0, 10)) console.log(`  ${f}`);
  process.exit(1);
}

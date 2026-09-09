/**
 * Proof for the hand ranking.
 *
 * There are exactly 7,462 distinct five-card hand values in poker. Two hands
 * tie if and only if they share one, so a correct ranking applied to all
 * 2,598,960 hands must produce exactly that many distinct numbers. Too few and
 * it is calling different hands equal; too many and it is separating hands
 * that should chop.
 *
 * That single number is a far stronger check than any set of examples, because
 * it constrains every tiebreak rule at once.
 */

import { rank5, bestRank, equityVsHand } from "../lib/poker/rank";
import { categorise5, encode, CATEGORY_NAMES } from "../lib/poker/hand";
import type { CardCode } from "../components/cards/PlayingCard";

const values = new Set<number>();
const minByCategory = new Array(9).fill(Infinity);
const maxByCategory = new Array(9).fill(-Infinity);
let total = 0;
const hand = new Array(5);

const started = Date.now();
for (let a = 0; a < 48; a++) {
  hand[0] = a;
  for (let b = a + 1; b < 49; b++) {
    hand[1] = b;
    for (let c = b + 1; c < 50; c++) {
      hand[2] = c;
      for (let d = c + 1; d < 51; d++) {
        hand[3] = d;
        for (let e = d + 1; e < 52; e++) {
          hand[4] = e;
          const v = rank5(hand);
          const cat = categorise5(hand);
          values.add(v);
          if (v < minByCategory[cat]) minByCategory[cat] = v;
          if (v > maxByCategory[cat]) maxByCategory[cat] = v;
          total++;
        }
      }
    }
  }
}

const distinct = values.size;
const EXPECTED_DISTINCT = 7462;

console.log(`enumerated       ${total.toLocaleString()} hands in ${((Date.now() - started) / 1000).toFixed(1)}s`);
console.log(`distinct values  ${distinct.toLocaleString()}`);
console.log(`expected         ${EXPECTED_DISTINCT.toLocaleString()}`);

// Every hand in a higher category must outrank every hand in a lower one.
let orderingBroken = 0;
console.log("\ncategory ordering");
for (let cat = 0; cat < 9; cat++) {
  const ok = cat === 0 || minByCategory[cat] > maxByCategory[cat - 1];
  if (!ok) orderingBroken++;
  console.log(
    `  ${CATEGORY_NAMES[cat].padEnd(18)} ${String(minByCategory[cat]).padStart(9)} .. ${String(maxByCategory[cat]).padStart(9)}  ${ok ? "" : "OVERLAPS THE CATEGORY BELOW"}`
  );
}

// Hands whose relative order is not in dispute.
const C = (s: string) => s.match(/../g)!.map((x) => encode(x as CardCode));
const ORDER: [string, string, string][] = [
  ["AsKsQsJsTs", "KsQsJsTs9s", "royal beats king-high straight flush"],
  ["AsAhAdAc2s", "KsKhKdKc9s", "quad aces beat quad kings"],
  ["AsAhAdKsKh", "KsKhKdAsAh", "aces full beats kings full"],
  ["AsQsTs8s6s", "AsQsTs8s5s", "flush kicker decides"],
  ["6s5h4d3c2s", "As5h4d3c2s", "six-high straight beats the wheel"],
  ["AsAhKsQsJs", "AsAhKsQsTs", "pair kicker decides"],
  // Same two pair, and the higher kicker takes it. Written the wrong way round
  // the first time, which the ranking correctly refused to agree with.
  ["2s2h3d3c5h", "2s2h3d3c4s", "two pair kicker decides, higher wins"],
  ["AsAh2d2c3s", "KsKhQdQc3s", "higher top pair wins two pair"],
  ["9s9h9d2c3s", "8s8h8dAcKs", "trips rank beats kickers"],
];

console.log("\nordering spot checks");
let orderFails = 0;
for (const [betterStr, worseStr, why] of ORDER) {
  const better = rank5(C(betterStr));
  const worse = rank5(C(worseStr));
  const ok = better > worse;
  if (!ok) orderFails++;
  console.log(`  ${ok ? "ok  " : "FAIL"} ${why}`);
}

// A chop must be an exact tie, whatever the suits.
const chopA = rank5(C("AsKsQsJhTh"));
const chopB = rank5(C("AdKdQdJcTc"));
const chopOk = chopA === chopB;
console.log(`  ${chopOk ? "ok  " : "FAIL"} identical straights of different suits tie`);

// Equity: exact enumeration, checked for internal consistency.
console.log("\nequity");
const hero = C("AsAh");
const villain = C("KsKh");
const flop = C("2d7c9s");
const e = equityVsHand(hero, villain, flop);
const back = equityVsHand(villain, hero, flop);
const sums = e.win + e.tie + e.lose === e.runouts;
const mirrors = e.win === back.lose && e.lose === back.win && e.tie === back.tie;
const complements = Math.abs(e.equity + back.equity - 1) < 1e-12;
console.log(`  AA vs KK on 2d 7c 9s: ${(e.equity * 100).toFixed(2)}%  over ${e.runouts} runouts`);
console.log(`  ${sums ? "ok  " : "FAIL"} win + tie + lose equals runouts`);
console.log(`  ${mirrors ? "ok  " : "FAIL"} swapping the players mirrors the counts`);
console.log(`  ${complements ? "ok  " : "FAIL"} the two equities sum to one`);

// A hand that cannot be beaten must be exactly 100%.
const lock = equityVsHand(C("AsKs"), C("AhAd"), C("QsJsTs"));
const lockOk = lock.equity === 1;
console.log(`  ${lockOk ? "ok  " : "FAIL"} a made royal flush has 100% equity (${(lock.equity * 100).toFixed(2)}%)`);

// The board playing itself must be a dead chop.
const chop = equityVsHand(C("2s3h"), C("4d5c"), C("AsKsQsJsTs"));
const chopEq = chop.equity === 0.5 && chop.win === 0 && chop.lose === 0;
console.log(`  ${chopEq ? "ok  " : "FAIL"} a royal flush on the board splits exactly`);

// bestRank over seven cards must agree with the best five-card subset.
const seven = C("AsKsQsJsTs2h3d");
const sevenOk = bestRank(seven) === rank5(C("AsKsQsJsTs"));
console.log(`  ${sevenOk ? "ok  " : "FAIL"} bestRank finds the royal inside seven cards`);

const failed =
  distinct !== EXPECTED_DISTINCT ||
  orderingBroken > 0 ||
  orderFails > 0 ||
  !chopOk || !sums || !mirrors || !complements || !lockOk || !chopEq || !sevenOk;

if (failed) {
  console.log("\nRANKING IS NOT CORRECT");
  process.exit(1);
}
console.log("\nranking produces exactly 7,462 distinct values, as it must");

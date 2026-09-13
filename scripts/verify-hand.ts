/**
 * Exhaustive proof for the hand categoriser.
 *
 * The number of five-card poker hands in each category is a fixed, published
 * table. This enumerates all C(52,5) = 2,598,960 hands and checks the counts
 * against it exactly. If every category matches, the categoriser is correct -
 * not "passes some tests", correct, because there is nothing left to test.
 */

import {
  categorise5,
  bestCategory,
  encode,
  CATEGORY_NAMES,
  HIGH_CARD,
  ONE_PAIR,
  TWO_PAIR,
  THREE_OF_A_KIND,
  STRAIGHT,
  FLUSH,
  FULL_HOUSE,
  FOUR_OF_A_KIND,
  STRAIGHT_FLUSH,
} from "../lib/poker/hand";
import { CATEGORY_COUNTS } from "../lib/poker/frequency";
import type { CardCode } from "../components/cards/PlayingCard";

// One source of truth. lib/poker/frequency.ts carries this table because the
// site renders it, and the site must not render a number the test does not
// prove. Importing it here means the screen and the proof cannot drift.
const EXPECTED = CATEGORY_COUNTS;

const counts = new Array(9).fill(0);
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
          counts[categorise5(hand)]++;
          total++;
        }
      }
    }
  }
}

console.log(`enumerated       ${total.toLocaleString()} five-card hands in ${((Date.now() - started) / 1000).toFixed(1)}s`);
console.log(`expected total   ${(2_598_960).toLocaleString()}`);

let wrong = 0;
console.log("\ncategory                 found      expected");
for (let cat = STRAIGHT_FLUSH; cat >= HIGH_CARD; cat--) {
  const found = counts[cat];
  const expected = EXPECTED[cat];
  const ok = found === expected;
  if (!ok) wrong++;
  console.log(
    `  ${CATEGORY_NAMES[cat].padEnd(20)} ${String(found).padStart(9)} ${String(expected).padStart(13)}  ${ok ? "" : "MISMATCH"}`
  );
}

// Spot checks on seven-card hands, where the answer is obvious by eye and a
// bug in the subset loop would show up.
const SEVEN: [CardCode[], number][] = [
  [["As", "Ks", "Qs", "Js", "Ts", "2h", "3d"], STRAIGHT_FLUSH],
  [["As", "Ah", "Ad", "Ac", "Ks", "2h", "3d"], FOUR_OF_A_KIND],
  [["As", "Ah", "Ad", "Ks", "Kh", "2c", "3d"], FULL_HOUSE],
  [["2s", "5s", "9s", "Js", "Ks", "3h", "4d"], FLUSH],
  [["5s", "6h", "7d", "8c", "9s", "2h", "3d"], STRAIGHT],
  [["As", "2h", "3d", "4c", "5s", "9h", "Kd"], STRAIGHT],
  [["As", "Ah", "Ad", "5s", "9h", "Jc", "2d"], THREE_OF_A_KIND],
  [["As", "Ah", "5d", "5s", "9h", "Jc", "2d"], TWO_PAIR],
  [["As", "Ah", "7d", "5s", "9h", "Jc", "2d"], ONE_PAIR],
  [["As", "Kh", "7d", "5s", "9h", "Jc", "2d"], HIGH_CARD],
];

console.log("\nseven-card spot checks");
let spotFails = 0;
for (const [cards, expected] of SEVEN) {
  const got = bestCategory(cards.map(encode));
  const ok = got === expected;
  if (!ok) spotFails++;
  console.log(
    `  ${cards.join(" ").padEnd(30)} ${CATEGORY_NAMES[got].padEnd(18)} ${ok ? "ok" : "EXPECTED " + CATEGORY_NAMES[expected]}`
  );
}

if (wrong || spotFails || total !== 2_598_960) {
  console.log(`\n${wrong} category mismatches, ${spotFails} spot-check failures`);
  process.exit(1);
}
console.log("\nall categories match the published table exactly");

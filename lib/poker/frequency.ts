// How often each hand category appears among all five-card hands.
//
// These are not looked-up trivia. `scripts/verify-hand.ts` enumerates every one
// of the 2,598,960 five-card hands, categorises each with `categorise5`, and
// asserts the tally equals this table exactly. If the categoriser is ever wrong
// the test fails against these numbers, so the table on screen and the proof
// behind it are the same object.

import {
  HIGH_CARD,
  ONE_PAIR,
  TWO_PAIR,
  THREE_OF_A_KIND,
  STRAIGHT,
  FLUSH,
  FULL_HOUSE,
  FOUR_OF_A_KIND,
  STRAIGHT_FLUSH,
} from "@/lib/poker/hand";

/** Total five-card hands from a 52-card deck: C(52,5). */
export const FIVE_CARD_HANDS = 2_598_960;

/**
 * Two hands tie if and only if they share a value, so a correct ranking over
 * every hand must produce exactly this many distinct numbers. `verify-rank.ts`
 * checks that it does.
 */
export const DISTINCT_HAND_VALUES = 7_462;

export const CATEGORY_COUNTS: Record<number, number> = {
  [STRAIGHT_FLUSH]: 40,
  [FOUR_OF_A_KIND]: 624,
  [FULL_HOUSE]: 3_744,
  [FLUSH]: 5_108,
  [STRAIGHT]: 10_200,
  [THREE_OF_A_KIND]: 54_912,
  [TWO_PAIR]: 123_552,
  [ONE_PAIR]: 1_098_240,
  [HIGH_CARD]: 1_302_540,
};

/** Strongest first, which is the order a frequency table is read in. */
export const CATEGORY_ORDER = [
  STRAIGHT_FLUSH,
  FOUR_OF_A_KIND,
  FULL_HOUSE,
  FLUSH,
  STRAIGHT,
  THREE_OF_A_KIND,
  TWO_PAIR,
  ONE_PAIR,
  HIGH_CARD,
];

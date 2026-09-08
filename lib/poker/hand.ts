// Hand categorisation.
//
// The spec warns against hand-writing a poker evaluator, and it is right: a
// full evaluator has to rank two hands against each other, which is where the
// subtle errors live and where a wrong answer silently poisons an equity
// number nobody re-checks.
//
// This is deliberately smaller than that. It answers one question - what
// category is this hand - and nothing about who wins. That is all Outs needs,
// and unlike a comparison function it can be proved correct: the number of
// five-card hands in each category is a known table, and the test enumerates
// all 2,598,960 of them and checks the counts exactly.
//
// If a game ever needs to compare two hands (Equity, Blockers), stop and pull
// a library rather than extending this.

import type { CardCode, Rank, Suit } from "@/components/cards/PlayingCard";

export const HIGH_CARD = 0;
export const ONE_PAIR = 1;
export const TWO_PAIR = 2;
export const THREE_OF_A_KIND = 3;
export const STRAIGHT = 4;
export const FLUSH = 5;
export const FULL_HOUSE = 6;
export const FOUR_OF_A_KIND = 7;
export const STRAIGHT_FLUSH = 8;

export const CATEGORY_NAMES = [
  "high card",
  "a pair",
  "two pair",
  "three of a kind",
  "a straight",
  "a flush",
  "a full house",
  "four of a kind",
  "a straight flush",
] as const;

const RANK_ORDER: Rank[] = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
const SUIT_ORDER: Suit[] = ["s", "h", "d", "c"];

export function rankIndex(rank: Rank): number {
  return RANK_ORDER.indexOf(rank);
}

export function suitIndex(suit: Suit): number {
  return SUIT_ORDER.indexOf(suit);
}

/** Pack a card into 0..51 as rank * 4 + suit. */
export function encode(code: CardCode): number {
  return rankIndex(code[0] as Rank) * 4 + suitIndex(code[1] as Suit);
}

export function decode(card: number): CardCode {
  return `${RANK_ORDER[Math.floor(card / 4)]}${SUIT_ORDER[card % 4]}` as CardCode;
}

export function fullDeckEncoded(): number[] {
  return Array.from({ length: 52 }, (_, i) => i);
}

// Straights as rank bitmasks, highest first. The last entry is the wheel:
// A-2-3-4-5, where the ace plays low and no other straight rule applies.
const STRAIGHT_MASKS: number[] = (() => {
  const masks: number[] = [];
  for (let high = 12; high >= 4; high--) {
    let mask = 0;
    for (let i = 0; i < 5; i++) mask |= 1 << (high - i);
    masks.push(mask);
  }
  // A,5,4,3,2
  masks.push((1 << 12) | (1 << 3) | (1 << 2) | (1 << 1) | 1);
  return masks;
})();

function hasStraight(rankMask: number): boolean {
  for (const mask of STRAIGHT_MASKS) {
    if ((rankMask & mask) === mask) return true;
  }
  return false;
}

/**
 * Category of exactly five cards, as one of the constants above.
 * Cards are encoded integers.
 */
export function categorise5(cards: number[]): number {
  const rankCounts = new Array(13).fill(0);
  const suitCounts = new Array(4).fill(0);
  let rankMask = 0;

  for (const card of cards) {
    const r = card >> 2;
    const s = card & 3;
    rankCounts[r]++;
    suitCounts[s]++;
    rankMask |= 1 << r;
  }

  const flush = suitCounts.some((n) => n === 5);
  const straight = hasStraight(rankMask);

  if (flush && straight) return STRAIGHT_FLUSH;

  let pairs = 0;
  let trips = 0;
  let quads = 0;
  for (const n of rankCounts) {
    if (n === 2) pairs++;
    else if (n === 3) trips++;
    else if (n === 4) quads++;
  }

  if (quads) return FOUR_OF_A_KIND;
  if (trips && pairs) return FULL_HOUSE;
  if (flush) return FLUSH;
  if (straight) return STRAIGHT;
  if (trips) return THREE_OF_A_KIND;
  if (pairs === 2) return TWO_PAIR;
  if (pairs === 1) return ONE_PAIR;
  return HIGH_CARD;
}

/**
 * Best category available from five or more cards, by checking every
 * five-card subset. Correct by construction given categorise5 is correct,
 * which the property test establishes exhaustively.
 */
export function bestCategory(cards: number[]): number {
  if (cards.length < 5) throw new Error("bestCategory needs at least five cards");
  if (cards.length === 5) return categorise5(cards);

  let best = HIGH_CARD;
  const n = cards.length;
  const pick = new Array(5);

  // Five nested indices rather than a general combination routine - this runs
  // 46 times per generated question and once per subset, so it is worth the
  // ugliness.
  for (let a = 0; a < n - 4; a++) {
    pick[0] = cards[a];
    for (let b = a + 1; b < n - 3; b++) {
      pick[1] = cards[b];
      for (let c = b + 1; c < n - 2; c++) {
        pick[2] = cards[c];
        for (let d = c + 1; d < n - 1; d++) {
          pick[3] = cards[d];
          for (let e = d + 1; e < n; e++) {
            pick[4] = cards[e];
            const category = categorise5(pick);
            if (category > best) best = category;
          }
        }
      }
    }
  }
  return best;
}

/**
 * How many of the unseen cards lift the hand to at least `target`.
 * This is the definition of an out that the game teaches: a specific
 * improvement, counted exactly, rather than a guess about what beats an
 * unknown opponent.
 */
export function countOuts(known: number[], target: number): number[] {
  const seen = new Set(known);
  const outs: number[] = [];
  for (let card = 0; card < 52; card++) {
    if (seen.has(card)) continue;
    if (bestCategory([...known, card]) >= target) outs.push(card);
  }
  return outs;
}

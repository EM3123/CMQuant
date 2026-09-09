// Hand ranking - the comparison the categoriser deliberately refused to do.
//
// lib/poker/hand.ts answers "what category is this" and stops there, because a
// category can be proved correct against a published frequency table and a
// comparison cannot be proved by counting categories.
//
// It can be proved another way. There are exactly 7,462 distinct five-card
// hand values in poker: two hands tie if and only if they share one. So a
// correct ranking, applied to all 2,598,960 five-card hands, must produce
// exactly 7,462 distinct numbers. Too few means it is calling different hands
// equal; too many means it is separating hands that should chop. The property
// test checks that number exactly, along with the category ordering.
//
// That is a real proof, not a spot check, and it is what makes the EV numbers
// downstream of this file worth showing to somebody who knows poker.

import {
  categorise5,
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

/** Straight patterns as rank bitmasks, ace-high first, the wheel last. */
const STRAIGHTS: { mask: number; high: number }[] = (() => {
  const out: { mask: number; high: number }[] = [];
  for (let high = 12; high >= 4; high--) {
    let mask = 0;
    for (let i = 0; i < 5; i++) mask |= 1 << (high - i);
    out.push({ mask, high });
  }
  // A-2-3-4-5. The ace plays low, so the hand is five-high: rank index 3.
  out.push({ mask: (1 << 12) | 0b1111, high: 3 });
  return out;
})();

function straightHigh(rankMask: number): number {
  for (const { mask, high } of STRAIGHTS) {
    if ((rankMask & mask) === mask) return high;
  }
  return -1;
}

/**
 * A comparable value for exactly five cards. Higher wins; equal ties.
 *
 * The number is the category in the high digits and up to five tiebreak ranks
 * below it, base sixteen, so comparing two hands is comparing two integers.
 */
export function rank5(cards: number[]): number {
  const counts = new Array(13).fill(0);
  const suits = new Array(4).fill(0);
  let rankMask = 0;

  for (const card of cards) {
    const r = card >> 2;
    counts[r]++;
    suits[card & 3]++;
    rankMask |= 1 << r;
  }

  const category = categorise5(cards);

  let tiebreak: number[];

  switch (category) {
    case STRAIGHT_FLUSH:
    case STRAIGHT:
      tiebreak = [straightHigh(rankMask)];
      break;

    case FOUR_OF_A_KIND:
    case FULL_HOUSE:
    case THREE_OF_A_KIND:
    case TWO_PAIR:
    case ONE_PAIR: {
      // Group ranks by how many of them there are, most first, then by rank.
      // That ordering is exactly the tiebreak order for every paired category:
      // quads before the kicker, trips before the pair, high pair before low
      // pair before the kicker.
      const byGroup: number[] = [];
      for (let size = 4; size >= 1; size--) {
        for (let r = 12; r >= 0; r--) {
          if (counts[r] === size) byGroup.push(r);
        }
      }
      tiebreak = byGroup;
      break;
    }

    case FLUSH:
    case HIGH_CARD:
    default: {
      const desc: number[] = [];
      for (let r = 12; r >= 0; r--) if (counts[r]) desc.push(r);
      tiebreak = desc;
      break;
    }
  }

  let value = category;
  for (let i = 0; i < 5; i++) {
    value = value * 16 + (tiebreak[i] ?? 0);
  }
  return value;
}

/** Best five-card value available from five or more cards. */
export function bestRank(cards: number[]): number {
  if (cards.length < 5) throw new Error("bestRank needs at least five cards");
  if (cards.length === 5) return rank5(cards);

  let best = -1;
  const n = cards.length;
  const pick = new Array(5);

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
            const value = rank5(pick);
            if (value > best) best = value;
          }
        }
      }
    }
  }
  return best;
}

export type Equity = {
  win: number;
  tie: number;
  lose: number;
  /** Share of the pot won on average. Ties split, so a chop is half each. */
  equity: number;
  /** How many runouts were enumerated. Nothing here is sampled. */
  runouts: number;
};

/**
 * Exact equity by enumerating every remaining runout.
 *
 * Not a Monte Carlo estimate and not a solver output - every possible board is
 * played out and counted, so the number is the number. That matters because
 * everything the flagship game says about EV is derived from it, and an
 * approximation would make every explanation slightly untrue.
 */
export function equityVsHand(
  hero: number[],
  villain: number[],
  board: number[]
): Equity {
  const dead = new Set([...hero, ...villain, ...board]);
  const deck: number[] = [];
  for (let card = 0; card < 52; card++) if (!dead.has(card)) deck.push(card);

  const toCome = 5 - board.length;
  if (toCome < 0) throw new Error("board longer than five cards");

  let win = 0;
  let tie = 0;
  let lose = 0;

  const settle = (runout: number[]) => {
    const full = [...board, ...runout];
    const h = bestRank([...hero, ...full]);
    const v = bestRank([...villain, ...full]);
    if (h > v) win++;
    else if (h < v) lose++;
    else tie++;
  };

  // Written out per remaining-street count rather than as a general
  // combination routine, because this is the hot loop of the whole product.
  if (toCome === 0) settle([]);
  else if (toCome === 1) {
    for (const a of deck) settle([a]);
  } else if (toCome === 2) {
    for (let i = 0; i < deck.length; i++)
      for (let j = i + 1; j < deck.length; j++) settle([deck[i], deck[j]]);
  } else {
    throw new Error(
      "enumerating more than two streets is too slow for a request; " +
        "supply at least a flop"
    );
  }

  const total = win + tie + lose;
  return {
    win,
    tie,
    lose,
    equity: (win + tie / 2) / total,
    runouts: total,
  };
}

/** Equity against several possible villain hands, weighted equally. */
export function equityVsRange(
  hero: number[],
  range: number[][],
  board: number[]
): Equity {
  let win = 0;
  let tie = 0;
  let lose = 0;

  for (const villain of range) {
    // A combination the hero or the board already holds cannot be dealt.
    if (villain.some((c) => hero.includes(c) || board.includes(c))) continue;
    const e = equityVsHand(hero, villain, board);
    win += e.win;
    tie += e.tie;
    lose += e.lose;
  }

  const total = win + tie + lose;
  if (total === 0) throw new Error("range contains no possible hands");

  return { win, tie, lose, equity: (win + tie / 2) / total, runouts: total };
}

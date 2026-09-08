// A seeded deck. Every card a player sees has to come from the run seed, or a
// shared challenge would deal two people different tables.

import { createRng, type Rng } from "@/lib/rng";
import type { CardCode, Rank, Suit } from "@/components/cards/PlayingCard";

export const RANKS: Rank[] = [
  "A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2",
];

export const SUITS: Suit[] = ["s", "h", "d", "c"];

export function fullDeck(): CardCode[] {
  const deck: CardCode[] = [];
  for (const rank of RANKS) {
    for (const suit of SUITS) {
      deck.push(`${rank}${suit}` as CardCode);
    }
  }
  return deck;
}

/** Fisher-Yates against a seeded generator. */
export function shuffleDeck(rng: Rng): CardCode[] {
  const deck = fullDeck();
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/** Deal without replacement. Never returns the same card twice. */
export function deal(seed: string, count: number): CardCode[] {
  return shuffleDeck(createRng(`deal:${seed}`)).slice(0, count);
}

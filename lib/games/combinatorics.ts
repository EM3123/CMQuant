// COMBINATORICS - how many ways can a hand still exist?
//
// Pocket aces is six combinations. Put one ace on the board and it is three,
// because the two you could have been dealt just became one. That is card
// removal, and it is the idea that turns "they might have aces" into a number.
//
// Nothing here needs a hand evaluator. Every answer is a count over a known
// deck, which means it can be checked by walking every pair of remaining cards
// and tallying - which is exactly what the property test does.

import { createRng, randInt, pick, clampDifficulty, type Rng } from "@/lib/rng";
import { shuffleDeck } from "@/lib/cards";
import { RANKS } from "@/lib/cards";
import type { CardCode, Rank } from "@/components/cards/PlayingCard";

export type Holding =
  | { kind: "pair"; high: Rank; low: Rank }
  | { kind: "suited"; high: Rank; low: Rank }
  | { kind: "offsuit"; high: Rank; low: Rank }
  | { kind: "any"; high: Rank; low: Rank };

/** Nameable ways to get a combination count wrong. */
export type CombosMistake = "ignored-blockers" | "wrong-shape" | null;

export const MISTAKE_LABEL: Record<Exclude<CombosMistake, null>, string> = {
  "ignored-blockers": "Counted the full deck and forgot the board",
  "wrong-shape": "Used the count for a different shape of hand",
};

export const MISTAKE_FIX: Record<Exclude<CombosMistake, null>, string> = {
  "ignored-blockers":
    "Every card on the board is a card nobody can be holding. Subtract it before you count, not after.",
  "wrong-shape":
    "A pair is six combinations, two ranks suited is four, and offsuit is twelve. Check which one you were asked for.",
};

export type CombinatoricsQuestion = {
  board: CardCode[];
  holding: Holding;
  /** How the holding reads in a sentence, e.g. "pocket aces". */
  holdingLabel: string;
  combos: number;
  options: number[];
  diagnoses: CombosMistake[];
  answerIndex: number;
  difficulty: number;
};

const RANK_WORD: Record<Rank, string> = {
  A: "ace", K: "king", Q: "queen", J: "jack", T: "ten",
  "9": "nine", "8": "eight", "7": "seven", "6": "six",
  "5": "five", "4": "four", "3": "three", "2": "two",
};

const RANK_PLURAL: Record<Rank, string> = {
  A: "aces", K: "kings", Q: "queens", J: "jacks", T: "tens",
  "9": "nines", "8": "eights", "7": "sevens", "6": "sixes",
  "5": "fives", "4": "fours", "3": "threes", "2": "twos",
};

export function holdingLabel(h: Holding): string {
  if (h.kind === "pair") return `pocket ${RANK_PLURAL[h.high]}`;
  const pair = `${RANK_WORD[h.high]}-${RANK_WORD[h.low]}`;
  if (h.kind === "suited") return `${pair} suited`;
  if (h.kind === "offsuit") return `${pair} offsuit`;
  return `${pair}, any suits`;
}

/** How many cards of a rank are still unaccounted for. */
function availableOfRank(board: CardCode[], rank: Rank): number {
  return 4 - board.filter((c) => c[0] === rank).length;
}

/** Suits in which a given rank is still available. */
function suitsFree(board: CardCode[], rank: Rank): Set<string> {
  const taken = new Set(board.filter((c) => c[0] === rank).map((c) => c[1]));
  return new Set(["s", "h", "d", "c"].filter((s) => !taken.has(s)));
}

/**
 * The count, in closed form. The property test recomputes the same number by
 * brute force over every remaining pair, so this can be wrong exactly once.
 */
export function countCombos(board: CardCode[], h: Holding): number {
  if (h.kind === "pair") {
    const n = availableOfRank(board, h.high);
    return (n * (n - 1)) / 2;
  }

  const highSuits = suitsFree(board, h.high);
  const lowSuits = suitsFree(board, h.low);
  const suited = [...highSuits].filter((s) => lowSuits.has(s)).length;

  if (h.kind === "suited") return suited;
  if (h.kind === "offsuit") return highSuits.size * lowSuits.size - suited;
  return highSuits.size * lowSuits.size;
}

/** The count somebody gets by ignoring the board entirely. */
function comboIgnoringBoard(h: Holding): number {
  if (h.kind === "pair") return 6;
  if (h.kind === "suited") return 4;
  if (h.kind === "offsuit") return 12;
  return 16;
}

/** The count for a different shape of the same ranks - the other classic slip. */
function comboWrongShape(h: Holding): number {
  if (h.kind === "pair") return 16;
  if (h.kind === "suited") return 12;
  if (h.kind === "offsuit") return 4;
  return 6;
}

function shapesFor(d: number): Holding["kind"][] {
  // Suited belongs at the bottom too, or an answer of four never comes up:
  // above difficulty three the board always carries a blocker, which knocks
  // every suited count down to two or three.
  //
  // Weighted, not uniform. A flat mix leaned on suited, and suited with a
  // blocker is almost always three - which put 45% of all answers on the
  // number 3. Always picking the box showing a 3 would have beaten thinking,
  // and no slot-position check would ever have noticed.
  // "any" and "offsuit" carry the larger counts - 6, 8, 9, 12, 16 - while
  // pairs and suited hands collapse onto 3 as soon as a blocker appears.
  if (d <= 3) return ["pair", "any", "any", "any", "suited"];
  if (d <= 6) return ["pair", "any", "any", "offsuit", "offsuit", "suited"];
  return ["pair", "suited", "offsuit", "offsuit", "any", "any", "any"];
}

/**
 * Every number a combination count can actually be.
 *
 * Counts are products of how many cards of each rank survive, so they come
 * from a short list. Filling the spare options with arbitrary integers put
 * 14, 15 and 17 on screen next to an answer of 16 - and anyone who knows the
 * domain eliminates all three on sight, turning a four-way question into a
 * one-way one. Distractors have to be numbers that could have been the answer.
 */
const PLAUSIBLE_COUNTS = [1, 2, 3, 4, 6, 8, 9, 12, 16];

/** Boards get longer, so more cards are removed and the arithmetic bites. */
function boardSize(rng: Rng, d: number): number {
  if (d <= 3) return 3;
  if (d <= 7) return randInt(rng, 3, 4);
  return randInt(rng, 4, 5);
}

const MAX_ATTEMPTS = 300;

export function generate(seed: string, difficulty: number): CombinatoricsQuestion {
  const d = clampDifficulty(difficulty);
  const rng = createRng(`combinatorics:${seed}:${d}`);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const deck = shuffleDeck(rng);
    const board = deck.slice(0, boardSize(rng, d));
    const kind = pick(rng, shapesFor(d));

    const high = pick(rng, RANKS);
    const low = pick(rng, RANKS.filter((r) => r !== high));
    const holding: Holding =
      kind === "pair"
        ? { kind, high, low: high }
        : { kind, high, low };

    const combos = countCombos(board, holding);

    // Zero is a legitimate poker answer but a miserable question - "how many
    // ways can they have it" answered with "none" teaches nothing about
    // counting. One is similar.
    if (combos < 2) continue;

    // At least one card of the holding's ranks should be on the board at the
    // higher difficulties, or card removal never comes up and the answer is
    // just a memorised constant.
    const blockers =
      board.filter((c) => c[0] === holding.high || c[0] === holding.low).length;
    if (d >= 4 && blockers === 0) continue;
    if (d <= 3 && blockers > 1) continue;

    const options = buildOptions(rng, combos, holding);
    if (!options) continue;

    return {
      board,
      holding,
      holdingLabel: holdingLabel(holding),
      combos,
      options: options.values,
      diagnoses: options.diagnoses,
      answerIndex: options.answerIndex,
      difficulty: d,
    };
  }

  throw new Error(`combinatorics: no valid question for seed ${seed} at difficulty ${d}`);
}

function buildOptions(
  rng: Rng,
  answer: number,
  holding: Holding
): { values: number[]; diagnoses: CombosMistake[]; answerIndex: number } | null {
  const chosen: { value: number; mistake: CombosMistake }[] = [
    { value: answer, mistake: null },
  ];
  const accept = (value: number, mistake: CombosMistake): boolean => {
    if (!Number.isInteger(value) || value < 1 || value > 24) return false;
    if (chosen.some((c) => c.value === value)) return false;
    chosen.push({ value, mistake });
    return true;
  };

  // Both named mistakes are structurally LARGER than the truth, because
  // blockers only ever remove combinations. Taking them first put the answer
  // in the second slot 57% of the time - picking low beat thinking. So the
  // split is decided before anything is placed.
  const maxBelow = Math.min(3, answer - 1);
  const belowCount = randInt(rng, 0, Math.max(0, maxBelow));

  const fill = (count: number, direction: -1 | 1): boolean => {
    let need = count;

    // A named mistake goes in whenever it lands on the side being filled, so
    // being wrong still usually means something.
    if (direction === 1) {
      for (const candidate of [
        { value: comboIgnoringBoard(holding), mistake: "ignored-blockers" as const },
        { value: comboWrongShape(holding), mistake: "wrong-shape" as const },
      ]) {
        if (need === 0) break;
        if (candidate.value > answer && accept(candidate.value, candidate.mistake)) need--;
      }
    }

    // Nearest plausible counts on the correct side, closest first.
    const nearby = PLAUSIBLE_COUNTS.filter(
      (n) => Math.sign(n - answer) === direction
    ).sort((a, b) => Math.abs(a - answer) - Math.abs(b - answer));

    for (const value of nearby) {
      if (need === 0) break;
      if (accept(value, null)) need--;
    }
    return need === 0;
  };

  if (!fill(belowCount, -1)) return null;
  if (!fill(3 - belowCount, 1)) return null;

  if (chosen.length !== 4) return null;

  const sorted = [...chosen].sort((a, b) => a.value - b.value);
  return {
    values: sorted.map((c) => c.value),
    diagnoses: sorted.map((c) => c.mistake),
    answerIndex: sorted.findIndex((c) => c.value === answer),
  };
}

export function difficultyForIndex(index: number): number {
  return clampDifficulty(1 + Math.floor(index / 3));
}

export function questionAt(runSeed: string, index: number): CombinatoricsQuestion {
  return generate(`${runSeed}#${index}`, difficultyForIndex(index));
}

export function validate(question: CombinatoricsQuestion, chosen: number): boolean {
  return chosen === question.answerIndex;
}

export const ROUND_MS = 60_000;
export const WRONG_PENALTY_MS = 2_000;

/** Reading a board and a holding takes longer than half a second. */
export const GUESS_FLOOR_MS = 600;

export function score(
  question: CombinatoricsQuestion,
  msElapsed: number,
  streak: number
): number {
  const base = 100;
  const speed =
    msElapsed < GUESS_FLOOR_MS
      ? 0
      : Math.max(0, Math.min(1, (8000 - msElapsed) / 6000));
  const multiplier = Math.min(2, 1 + streak * 0.05);
  const difficultyBonus = 1 + (question.difficulty - 1) * 0.05;
  return Math.round((base + speed * 100) * multiplier * difficultyBonus);
}

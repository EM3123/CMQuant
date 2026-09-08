// OUTS - how many cards still save the hand.
//
// "Outs" usually means cards that make you a winner, which is undefined
// without knowing what you are up against. This asks the version that has an
// exact answer: how many of the unseen cards lift you to at least a named
// hand. The count is computed by checking every one of them, not estimated,
// so there is a right answer and it can be verified.

import { createRng, randInt, pick, ramp, clampDifficulty, type Rng } from "@/lib/rng";
import { shuffleDeck } from "@/lib/cards";
import {
  encode,
  decode,
  bestCategory,
  CATEGORY_NAMES,
  ONE_PAIR,
  TWO_PAIR,
  THREE_OF_A_KIND,
  STRAIGHT,
  FLUSH,
  FULL_HOUSE,
  STRAIGHT_FLUSH,
} from "@/lib/poker/hand";
import type { CardCode } from "@/components/cards/PlayingCard";

export type OutsQuestion = {
  hole: CardCode[];
  board: CardCode[];
  /** Category the player is counting towards. */
  target: number;
  targetName: string;
  /** The true number of outs. */
  outs: number;
  options: number[];
  answerIndex: number;
  difficulty: number;
};

/** Out counts every poker player already carries around. They make the best
 *  distractors because picking one tells you which draw you misread. */
const FAMILIAR_COUNTS = [2, 3, 4, 5, 6, 8, 9, 12, 15];

/**
 * Targets in preference order, best tier first.
 *
 * A preference rather than a restriction, because six random cards usually do
 * not contain a live straight or flush draw. Insisting on one meant re-dealing
 * a couple of hundred times and a worst case of 378ms, which is a visible
 * freeze between questions. Now the preferred tier is used when the deal
 * offers it and the next tier is accepted when it does not.
 */
function targetTiers(d: number): number[][] {
  if (d <= 3) {
    return [
      [STRAIGHT, FLUSH],
      [TWO_PAIR, THREE_OF_A_KIND],
    ];
  }
  if (d <= 6) {
    return [
      [TWO_PAIR, THREE_OF_A_KIND, STRAIGHT, FLUSH],
      [ONE_PAIR, FULL_HOUSE],
    ];
  }
  return [
    [ONE_PAIR, TWO_PAIR, THREE_OF_A_KIND, STRAIGHT, FLUSH, FULL_HOUSE, STRAIGHT_FLUSH],
  ];
}

/** How far apart the options sit. Two apart is generous; one apart means you
 *  actually counted. */
function minGap(d: number): number {
  return Math.max(1, Math.round(ramp(d, 2, 1)));
}

const MAX_ATTEMPTS = 260;

export function generate(seed: string, difficulty: number): OutsQuestion {
  const d = clampDifficulty(difficulty);
  const rng = createRng(`outs:${seed}:${d}`);
  const gap = minGap(d);
  const tiers = targetTiers(d);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const deck = shuffleDeck(rng).map(encode);
    const known = deck.slice(0, 6);
    const unseen = deck.slice(6);
    const current = bestCategory(known);

    // One pass over the unseen cards gives the out count for every target at
    // once, rather than re-walking the deck per candidate target.
    const improved = unseen.map((card) => bestCategory([...known, card]));

    const score_ = (t: number) => ({
      target: t,
      outs: improved.filter((c) => c >= t).length,
      // How many cards land on exactly this category rather than sailing
      // past it.
      exact: improved.filter((c) => c === t).length,
    });
    const usable = ({ outs, exact }: { outs: number; exact: number }) =>
      // The named hand has to actually be reachable. Without this the
      // generator would offer "a flush" on a board where no suit has more
      // than two cards, and count the full-house outs towards it - true to
      // the words "or better", and nothing a player would ever count.
      exact >= 2 && outs >= 3 && outs <= 16;

    let viable: ReturnType<typeof score_>[] = [];
    for (const tier of tiers) {
      viable = tier.filter((t) => t > current).map(score_).filter(usable);
      if (viable.length) break;
    }
    if (!viable.length) continue;

    const choice = pick(rng, viable);
    const options = buildOptions(rng, choice.outs, gap);
    if (!options) continue;

    return {
      hole: known.slice(0, 2).map(decode),
      board: known.slice(2).map(decode),
      target: choice.target,
      targetName: CATEGORY_NAMES[choice.target],
      outs: choice.outs,
      options: options.sorted,
      answerIndex: options.answerIndex,
      difficulty: d,
    };
  }

  throw new Error(`outs: no valid question for seed ${seed} at difficulty ${d}`);
}

/**
 * Four whole numbers, one of them right. Same trick as Pot Odds: decide up
 * front how many sit below the answer, or the correct option drifts to a
 * predictable slot.
 */
function buildOptions(
  rng: Rng,
  answer: number,
  gap: number
): { sorted: number[]; answerIndex: number } | null {
  const maxBelow = Math.min(3, Math.floor((answer - 1) / gap));
  if (maxBelow < 0) return null;
  const belowCount = randInt(rng, 0, maxBelow);

  const chosen = [answer];
  const accept = (value: number): boolean => {
    if (value < 1 || value > 24) return false;
    if (chosen.some((existing) => Math.abs(existing - value) < gap)) return false;
    chosen.push(value);
    return true;
  };

  const fill = (count: number, direction: -1 | 1): boolean => {
    let need = count;
    // Familiar counts first, so a wrong answer is usually a real misreading
    // rather than an arbitrary number.
    const familiar = FAMILIAR_COUNTS.filter(
      (n) => Math.sign(n - answer) === direction
    ).sort(() => rng() - 0.5);

    for (const value of familiar) {
      if (need === 0) break;
      if (accept(value)) need--;
    }
    for (let step = gap; need > 0 && step < gap * 6; step++) {
      if (accept(answer + direction * step)) need--;
    }
    return need === 0;
  };

  if (!fill(belowCount, -1)) return null;
  if (!fill(3 - belowCount, 1)) return null;

  const sorted = [...chosen].sort((a, b) => a - b);
  return { sorted, answerIndex: sorted.indexOf(answer) };
}

export function difficultyForIndex(index: number): number {
  return clampDifficulty(1 + Math.floor(index / 2));
}

export function questionAt(runSeed: string, index: number): OutsQuestion {
  return generate(`${runSeed}#${index}`, difficultyForIndex(index));
}

export function validate(question: OutsQuestion, chosen: number): boolean {
  return chosen === question.answerIndex;
}

export const ROUND_MS = 60_000;
export const WRONG_PENALTY_MS = 2_000;

/** Counting outs means reading six cards first. Nobody does that in half a
 *  second, so anything faster is a guess and earns no speed bonus. */
export const GUESS_FLOOR_MS = 700;

export function score(question: OutsQuestion, msElapsed: number, streak: number): number {
  const base = 100;
  const speed =
    msElapsed < GUESS_FLOOR_MS
      ? 0
      : Math.max(0, Math.min(1, (9000 - msElapsed) / 6500));
  const multiplier = Math.min(2, 1 + streak * 0.05);
  const difficultyBonus = 1 + (question.difficulty - 1) * 0.05;
  return Math.round((base + speed * 100) * multiplier * difficultyBonus);
}

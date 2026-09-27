// EQUITY - you are behind with one card to come. How often do you get there?
//
// The last of the four poker games and the one the other three build towards.
// Outs asks you to count the cards. Pot Odds asks what price you are getting.
// This asks what the count is actually worth, which is not what the count says.
//
// NOTHING HERE IS SAMPLED. `equityVsHand` deals every one of the 44 remaining
// cards and counts the results. No Monte Carlo, no approximation, no lookup
// table. The percentage on screen is the percentage, and
// `scripts/verify-equity.ts` recomputes it by an independent route.
//
// THREE DECISIONS THAT WERE MEASURED RATHER THAN GUESSED:
//
// 1. TURN SPOTS ONLY. Two cards to come is 990 runouts with two seven-card
//    evaluations each. Measured at 117ms per question, which a sixty-second
//    game cannot spend between questions. One card to come is 4.7ms.
//
// 2. THE HERO IS ALWAYS BEHIND. "Outs times two" is a rule for the player who
//    is drawing; applied to a hand that is already ahead it is not a shortcut
//    that fails, it is a sentence with no meaning. The first version let the
//    hero sit on either side and used "how wrong is the shortcut" as its
//    difficulty dial, which silently selected for the hero being ahead -
//    because the rule is always wildly wrong there. Median equity came out at
//    68%. Being behind is also the only seat anybody actually asks this
//    question from.
//
// 3. DIFFICULTY IS NOT CLOSENESS TO A COIN FLIP. On the turn, equity is
//    strongly bimodal: 37% of random spots land under 20% and 34% land over
//    80%, while the whole 40-60% band holds 1.9% of them. A dial asking for
//    spots near fifty cannot be satisfied, and the first version threw "no
//    valid spot" at difficulties five through seven. What ramps instead is how
//    badly the naive count overstates the real one.

import { createRng, randInt, ramp, clampDifficulty, type Rng } from "@/lib/rng";
import { shuffleDeck } from "@/lib/cards";
import { encode, decode, bestCategory, countOuts } from "@/lib/poker/hand";
import { bestRank, equityVsHand } from "@/lib/poker/rank";
import type { CardCode } from "@/components/cards/PlayingCard";

/** Nameable ways to get an equity wrong. */
export type EquityMistake = "rule-of-four" | "dead-outs" | null;

export const MISTAKE_LABEL: Record<Exclude<EquityMistake, null>, string> = {
  "rule-of-four": "Counted as if two cards were still to come",
  "dead-outs": "Counted outs that improve your hand but still lose",
};

export const MISTAKE_FIX: Record<Exclude<EquityMistake, null>, string> = {
  "rule-of-four":
    "Times four is the flop shortcut, for when two cards are still to come. On the turn there is one card left, so it is times two, and reaching for the wrong one doubles your answer.",
  "dead-outs":
    "An out is a card that wins, not a card that improves you. A flush card that pairs the board can hand them a full house, and the card that makes your straight can make them a better one. Count what beats them, not what helps you.",
};

export type EquityQuestion = {
  hero: CardCode[];
  villain: CardCode[];
  /** Four cards. One still to come. */
  board: CardCode[];
  /** Exact, by enumeration. 0 to 1. */
  equity: number;
  /** Cards that would actually put the hero in front. */
  outs: number;
  /** Cards that improve the hero's hand at all, winning or not. */
  optimisticOuts: number;
  /** How many runouts were dealt. Shown in the review as proof of method. */
  runouts: number;
  /** Percentages, ascending. */
  options: number[];
  diagnoses: EquityMistake[];
  answerIndex: number;
  difficulty: number;
};

/**
 * Cards that, arriving next, put the hero in front.
 *
 * Not the same thing as "cards that improve the hero", and the gap between the
 * two is the whole game.
 */
function realOuts(hero: number[], villain: number[], board: number[]): number {
  const dead = new Set([...hero, ...villain, ...board]);
  let outs = 0;
  for (let card = 0; card < 52; card++) {
    if (dead.has(card)) continue;
    const next = [...board, card];
    if (bestRank([...hero, ...next]) > bestRank([...villain, ...next])) outs++;
  }
  return outs;
}

/**
 * Cards that get the hero up to the category the villain is already showing.
 *
 * This is what a player counting outs is actually aiming at: "I need a flush",
 * "I need to pair my ace to beat their pair". Some of those cards get there and
 * still lose, because they improve the villain too or make them the better
 * version of the same hand - and that difference is the dead-outs error.
 *
 * The first version counted every card that raised the hero's own category by
 * one, which on a six-card board is nearly anything that pairs anything. Median
 * dead outs came out at twelve, which is not a tempting wrong answer, it is an
 * obviously wrong one.
 */
function apparentOuts(hero: number[], villain: number[], board: number[]): number {
  const heroNow = bestCategory([...hero, ...board]);
  const villainNow = bestCategory([...villain, ...board]);
  // Has to clear BOTH bars: better than what the hero already holds, and at
  // least what the villain is showing. Aiming only at the villain's category
  // counts every card when the hero is already at that level and merely
  // out-kicked - which is how the median dead-out count reached thirty-two.
  const target = Math.max(villainNow, heroNow + 1);
  return countOuts([...hero, ...board], target).length;
}

/**
 * How many of the hero's apparent outs must be dead before a spot is worth
 * asking about. Zero at difficulty one, where counting carefully is enough.
 */
function deadOutsNeeded(d: number): number {
  return Math.round(ramp(d, 0, 4));
}

/** How high the answer may sit. Lower at the top, so precision matters. */
function equityCeiling(d: number): number {
  return ramp(d, 0.45, 0.33);
}

const MAX_DEALS = 50;

/**
 * Equity is at least outs over forty-four - ties can only add to it - so seven
 * real outs guarantees the 14.5% floor without enumerating anything. Checking
 * it here means the expensive runout count only ever runs on a spot that has
 * already earned it, which is what makes fifty deals affordable.
 */
const MIN_OUTS = 7;

export function generate(seed: string, difficulty: number): EquityQuestion {
  const d = clampDifficulty(difficulty);
  const rng = createRng(`equity:${seed}:${d}`);
  const wantDead = deadOutsNeeded(d);
  const ceiling = equityCeiling(d);

  for (let deal = 0; deal < MAX_DEALS; deal++) {
    const deck = shuffleDeck(rng).map(encode);
    const hero = deck.slice(0, 2);
    const villain = deck.slice(2, 4);
    const board = deck.slice(4, 8);

    // Cheap rejections first. The hero has to be the one drawing - the only
    // seat this question makes sense from - and neither enumeration below is
    // worth running on a spot that already fails.
    const heroNow = bestRank([...hero, ...board]);
    const villainNow = bestRank([...villain, ...board]);
    if (heroNow >= villainNow) continue;

    const outs = realOuts(hero, villain, board);
    if (outs < MIN_OUTS) continue;

    // The last stretch of attempts drops the dead-outs requirement. At the
    // higher difficulties it asks for three or four dead outs inside a narrow
    // equity band, and roughly one seed in two hundred could not satisfy both
    // in thirty deals - which is a thrown error mid-run rather than a slightly
    // easier question. Difficulty degrades; the round does not break.
    const relaxed = deal > MAX_DEALS * 0.6;

    const naive = apparentOuts(hero, villain, board);
    if (!relaxed && naive - outs < wantDead) continue;

    const e = equityVsHand(hero, villain, board);
    // The floor is a layout constraint as much as a poker one. Options sit at
    // least four points apart and never below two, so an answer of 9 has room
    // for exactly one option beneath it and can only ever appear in the first
    // or second slot. Fourteen-and-a-half per cent is the point where three
    // will fit, and it also happens to be where a draw gets interesting - six
    // outs rather than two.
    if (e.equity < 0.145 || e.equity > (relaxed ? 0.48 : ceiling)) continue;

    const options = buildOptions(rng, e.equity, outs, naive);
    if (!options) continue;

    return {
      hero: hero.map(decode),
      villain: villain.map(decode),
      board: board.map(decode),
      equity: e.equity,
      outs,
      optimisticOuts: naive,
      runouts: e.runouts,
      options: options.values,
      diagnoses: options.diagnoses,
      answerIndex: options.answerIndex,
      difficulty: d,
    };
  }

  throw new Error(`equity: no valid spot for seed ${seed} at difficulty ${d}`);
}

/** Two options a point apart are one question with two right answers. */
const MIN_SEPARATION = 4;

function buildOptions(
  rng: Rng,
  equity: number,
  outs: number,
  naive: number
): { values: number[]; diagnoses: EquityMistake[]; answerIndex: number } | null {
  const answer = Math.round(equity * 100);
  if (answer < 14 || answer > 48) return null;

  const chosen: { value: number; mistake: EquityMistake }[] = [
    { value: answer, mistake: null },
  ];

  const accept = (value: number, mistake: EquityMistake): boolean => {
    const v = Math.round(value);
    if (v < 2 || v > 92) return false;
    if (chosen.some((c) => Math.abs(c.value - v) < MIN_SEPARATION)) return false;
    chosen.push({ value: v, mistake });
    return true;
  };

  // BOTH NAMED MISTAKES ARE STRUCTURALLY LARGER THAN THE TRUTH. Counting as if
  // two cards were coming doubles the answer; counting outs that do not win
  // inflates it. Placing them first pinned the answer into the bottom two slots
  // at 46.7 / 51.1 / 2.0 / 0.2 - picking the lowest number beat thinking, which
  // is the identical bug Pot Odds shipped once.
  //
  // So the split is drawn before anything is placed. The cap is computed from
  // the offsets that will ACTUALLY fit rather than from a formula: an earlier
  // version drew a random starting offset, which sometimes could not pack three
  // options below the answer, fell back to placing them above, and reintroduced
  // the same bias at 35 / 35 / 21 / 8.
  const belowOffsets = [1, 2, 3]
    .map((k) => k * MIN_SEPARATION)
    .filter((off) => answer - off >= 2);
  const aboveOffsets = [1, 2, 3]
    .map((k) => k * MIN_SEPARATION)
    .filter((off) => answer + off <= 92);

  const belowWanted = randInt(rng, Math.max(0, 3 - aboveOffsets.length), Math.min(3, belowOffsets.length));
  const aboveWanted = 3 - belowWanted;

  let below = 0;
  let above = 0;

  // A named mistake goes in only if the side it lands on still has room, and
  // only if it is close enough to be tempting. Counting every card that
  // improves you can put the naive answer thirty points off the truth, and a
  // distractor nobody would ever pick is a wasted option.
  const tryNamed = (value: number, mistake: Exclude<EquityMistake, null>) => {
    const v = Math.round(value);
    if (Math.abs(v - answer) > 24) return;
    if (v > answer && above >= aboveWanted) return;
    if (v < answer && below >= belowWanted) return;
    if (!accept(v, mistake)) return;
    if (v > answer) above++;
    else below++;
  };

  tryNamed(naive * 2, "dead-outs");
  tryNamed(outs * 4, "rule-of-four");

  // Near misses fill whatever is still short, packed at exactly the minimum
  // spacing so the count that was drawn is always reachable.
  for (const off of belowOffsets) {
    if (below >= belowWanted) break;
    if (accept(answer - off, null)) below++;
  }
  for (const off of aboveOffsets) {
    if (above >= aboveWanted) break;
    if (accept(answer + off, null)) above++;
  }

  // Last resort, from either side. Reaching here means a named mistake landed
  // on a value a near miss wanted.
  for (let k = 1; k <= 6 && chosen.length < 4; k++) {
    if (!accept(answer + k * MIN_SEPARATION + 2, null)) {
      accept(answer - k * MIN_SEPARATION - 2, null);
    }
  }
  if (chosen.length !== 4) return null;

  const sorted = [...chosen].sort((a, b) => a.value - b.value);
  // Found by VALUE, never by looking for the entry without a mistake label -
  // the near misses have no label either, so that search returns whichever of
  // them sorted first. It shipped once, pointing the answer slot at 14 when the
  // equity was 25.
  return {
    values: sorted.map((c) => c.value),
    diagnoses: sorted.map((c) => c.mistake),
    answerIndex: sorted.findIndex((c) => c.value === answer),
  };
}

export function difficultyForIndex(index: number): number {
  return clampDifficulty(1 + Math.floor(index / 2));
}

export function questionAt(runSeed: string, index: number): EquityQuestion {
  return generate(`${runSeed}#${index}`, difficultyForIndex(index));
}

export function validate(question: EquityQuestion, chosen: number): boolean {
  return chosen === question.answerIndex;
}

export function diagnose(question: EquityQuestion, chosen: number): EquityMistake {
  return question.diagnoses[chosen] ?? null;
}

export const ROUND_MS = 60_000;
export const WRONG_PENALTY_MS = 2_000;

/** Reading two hands and a board takes longer than half a second. */
export const GUESS_FLOOR_MS = 700;

export function score(
  question: EquityQuestion,
  msElapsed: number,
  streak: number
): number {
  const base = 100;
  const speed =
    msElapsed < GUESS_FLOOR_MS
      ? 0
      : Math.max(0, Math.min(1, (9000 - msElapsed) / 7000));
  const multiplier = Math.min(2, 1 + streak * 0.05);
  const difficultyBonus = 1 + (question.difficulty - 1) * 0.05;
  return Math.round((base + speed * 100) * multiplier * difficultyBonus);
}

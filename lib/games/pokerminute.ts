// POKER MINUTE - sixty seconds, one decision at a time, graded on EV.
//
// WHAT IS REAL HERE, AND WHAT IS NOT
//
// The spec asks for decisions graded against solver baselines. Real GTO
// solutions come out of a solver running for minutes per node, or out of a
// licensed solution set. This does not have either, and inventing plausible
// EV numbers would be the exact credibility failure the spec warns about -
// undetectable until a strong player checked one.
//
// So nothing here is called a solver output. Every spot states its assumption
// on screen, and the EV is computed exactly against that assumption by
// enumerating the villain's range combination by combination. "Against this
// range, calling loses 0.48bb" is a claim that can be checked. "The solver
// says fold" would not be.
//
// v1 is river spots only. On the river the board is complete, so equity is
// just the share of the villain's range you beat - no runouts, no sampling,
// nothing approximate. Turn spots need one more street enumerated, and raise
// decisions need a model of how the villain responds to a raise, which is an
// assumption this cannot yet ground. Fold and call are the whole of bluff
// catching and they can be graded exactly today.

import { createRng, randInt, ramp, clampDifficulty, type Rng } from "@/lib/rng";
import { shuffleDeck } from "@/lib/cards";
import { encode, decode } from "@/lib/poker/hand";
import { bestRank } from "@/lib/poker/rank";
import type { CardCode } from "@/components/cards/PlayingCard";

export type Action = "fold" | "call";

/** How a decision is graded. Bands are in big blinds of EV given up. */
export type Grade = "best" | "close" | "error";

export type PokerMinuteSpot = {
  hero: CardCode[];
  board: CardCode[];
  /** Chips already in the middle before the villain bet. */
  pot: number;
  /** What the villain bet, and therefore what a call costs. */
  bet: number;
  /** The villain's assumed range, stated on screen and in the review. */
  range: { value: CardCode[][]; bluff: CardCode[][] };
  /** Share of the range the hero beats, ties counted as half. Exact. */
  equity: number;
  /** Share needed for calling to break even. */
  breakEven: number;
  /** EV of calling, in big blinds, relative to folding. */
  evCall: number;
  /** The action that maximises EV. */
  best: Action;
  /** Seconds this spot is expected to take. Used for the pacing hint only. */
  budgetSeconds: number;
  difficulty: number;
};

/** Bet sizes a person would actually make, as a fraction of the pot. */
export const MIN_BET_RATIO = 0.33;
export const MAX_BET_RATIO = 1.5;

/**
 * Grading bands, as a share of the pot being contested rather than a flat
 * number of big blinds.
 *
 * A fixed 0.35bb threshold is the right scale for a preflop decision and the
 * wrong one for a river: in a sixty-blind pot, a call that is barely wrong
 * still gives up several blinds, so every marginal river spot would grade as a
 * leak. The spec anticipates this - "the actual thresholds should vary by spot
 * type" - and a share of the pot is the version that travels.
 */
export const BEST_BAND_SHARE = 0.005;
export const CLOSE_BAND_SHARE = 0.06;

/** EV given up, measured against the pot the decision was played for. */
export function evLossShare(evLossBb: number, pot: number, bet: number): number {
  return evLossBb / (pot + 2 * bet);
}

export function gradeFor(evLossBb: number, pot: number, bet: number): Grade {
  const share = evLossShare(evLossBb, pot, bet);
  if (share <= BEST_BAND_SHARE) return "best";
  if (share <= CLOSE_BAND_SHARE) return "close";
  return "error";
}

export const GRADE_LABEL: Record<Grade, string> = {
  best: "Best line",
  close: "Defensible",
  error: "Leak",
};

/** EV of calling, in big blinds, measured against folding. */
export function evOfCall(pot: number, bet: number, equity: number): number {
  return equity * (pot + bet) - (1 - equity) * bet;
}

/** Equity a call needs to break even. */
export function breakEvenEquity(pot: number, bet: number): number {
  return bet / (pot + 2 * bet);
}

/**
 * How far the hero's equity sits from the break-even point. Large is an easy
 * spot, small is an agonising one, and this is the difficulty dial.
 */
function edgeFor(d: number): number {
  return ramp(d, 0.2, 0.025);
}

/** Bets are rounded to whole big blinds. */
function chipStep(): number {
  return 1;
}

/** Seconds the spot is expected to want. Harder spots are given longer. */
function budgetFor(d: number): number {
  return Math.round(ramp(d, 5, 13));
}

const MAX_DEALS = 16;
const PRICE_ATTEMPTS = 40;

/**
 * How many candidate holdings to classify per deal.
 *
 * Classifying all 990 possible villain hands costs about twenty thousand hand
 * evaluations, and having that inside the retry loop meant a rejected PRICE
 * threw away a perfectly good board. The deal is now classified once and the
 * pricing retried against it, and only a sample is classified - a range of
 * twenty combinations does not need nine hundred candidates to come from.
 */
const CANDIDATE_COMBOS = 170;

export function generate(seed: string, difficulty: number): PokerMinuteSpot {
  const d = clampDifficulty(difficulty);
  const rng = createRng(`pokerminute:${seed}:${d}`);
  const step = chipStep();

  for (let deal = 0; deal < MAX_DEALS; deal++) {
    const deck = shuffleDeck(rng).map(encode);
    const hero = deck.slice(0, 2);
    const board = deck.slice(2, 7);
    const rest = deck.slice(7);

    const heroRank = bestRank([...hero, ...board]);

    // Split candidate holdings into the ones that beat the hero and the ones
    // that do not. On a complete board that is the whole of equity, because
    // there is nothing left to run out.
    const beats: number[][] = [];
    const loses: number[][] = [];
    for (let n = 0; n < CANDIDATE_COMBOS; n++) {
      const i = randInt(rng, 0, rest.length - 2);
      const j = randInt(rng, i + 1, rest.length - 1);
      const villain = [rest[i], rest[j]];
      const v = bestRank([...villain, ...board]);
      if (v > heroRank) beats.push(villain);
      else if (v < heroRank) loses.push(villain);
    }

    // Sampling with replacement can draw the same holding twice, and a range
    // that lists a combination twice weights it twice.
    const uniqueBeats = dedupe(beats);
    const uniqueLoses = dedupe(loses);
    if (uniqueBeats.length < 8 || uniqueLoses.length < 6) continue;

    for (let attempt = 0; attempt < PRICE_ATTEMPTS; attempt++) {
      const edge = edgeFor(d) * (0.6 + rng() * 0.8);

      // Choose which answer this spot is going to have, then build a range
      // that supports it - rather than building a range and discovering which
      // answers it happens to allow.
      //
      // Break-even cannot exceed 37.5%, because that is what a pot-and-a-half
      // bet prices. So a fold spot needs the hero's equity BELOW roughly a
      // third, and a call spot needs it above a fifth. Left to a free mix the
      // equity landed around 44% and fold spots were mostly impossible to
      // construct, which made calling correct 86% of the time.
      const wantCall = rng() < 0.5;
      const targetEquity = wantCall
        ? 0.24 + edge + rng() * 0.3
        : 0.12 + rng() * (0.32 - edge - 0.12);
      if (targetEquity <= 0.1 || targetEquity >= 0.62) continue;

      const total = randInt(rng, 12, 22);
      const bluffCount = Math.max(2, Math.round(total * targetEquity));
      const valueCount = total - bluffCount;
      if (valueCount < 5) continue;
      if (valueCount > uniqueBeats.length || bluffCount > uniqueLoses.length) continue;

      const value = pickCombos(rng, uniqueBeats, valueCount);
      const bluff = pickCombos(rng, uniqueLoses, bluffCount);
      if (value.length !== valueCount || bluff.length !== bluffCount) continue;

      const equity = bluff.length / (value.length + bluff.length);

      // Work out which answers this equity can even support before choosing
      // one. Deciding call-or-fold first and rejecting when it did not fit
      // made "call" the best action 77% of the time, because a fold spot needs
      // break-even ABOVE the equity and there was far less room above.
      //
      // Bet sizing is held to something a person would actually make, between
      // a third of the pot and one and a half times it, which pins break-even
      // between 18.8% and 37.5%.
      const ratioFor = (target: number) => target / (1 - 2 * target);

      const callTarget = equity - edge;
      const callCeiling = callTarget > 0.02 ? ratioFor(callTarget) : -1;
      const callFeasible = callCeiling >= MIN_BET_RATIO;

      const foldTarget = equity + edge;
      const foldFloor = foldTarget < 0.45 ? ratioFor(foldTarget) : Infinity;
      const foldFeasible = foldFloor <= MAX_BET_RATIO;

      if (!callFeasible && !foldFeasible) continue;
      const callIsBest =
        callFeasible && foldFeasible ? rng() < 0.5 : callFeasible;

      const [lo, hi] = callIsBest
        ? [MIN_BET_RATIO, Math.min(MAX_BET_RATIO, callCeiling)]
        : [Math.max(MIN_BET_RATIO, foldFloor), MAX_BET_RATIO];
      if (hi <= lo) continue;

      // Pot and bet are in big blinds, which is the unit every EV number on
      // screen is quoted in. They were chip counts before, which made a pot of
      // 400 read as 400bb and turned every EV into three figures.
      const pot = randInt(rng, 14, 90);
      const ratio = lo + rng() * (hi - lo);
      const bet = Math.max(step, step * Math.round((pot * ratio) / step));

      const breakEven = breakEvenEquity(pot, bet);
      const evCall = evOfCall(pot, bet, equity);

      // It has to be the spot that was aimed for, and not so close that the
      // grading bands cannot separate the two actions.
      if (Math.sign(equity - breakEven) !== (callIsBest ? 1 : -1)) continue;
      if (evLossShare(Math.abs(evCall), pot, bet) < BEST_BAND_SHARE * 2) continue;

      return {
        hero: hero.map(decode),
        board: board.map(decode),
        pot,
        bet,
        range: {
          value: value.map((c) => c.map(decode)),
          bluff: bluff.map((c) => c.map(decode)),
        },
        equity,
        breakEven,
        evCall,
        best: evCall > 0 ? "call" : "fold",
        budgetSeconds: budgetFor(d),
        difficulty: d,
      };
    }
  }

  throw new Error(`pokerminute: no valid spot for seed ${seed} at difficulty ${d}`);
}

/** Drop repeated holdings from a sampled pool. */
function dedupe(combos: number[][]): number[][] {
  const seen = new Set<string>();
  const out: number[][] = [];
  for (const c of combos) {
    const key = c[0] < c[1] ? `${c[0]}-${c[1]}` : `${c[1]}-${c[0]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

/** Deterministic sample without replacement. */
function pickCombos(rng: Rng, pool: number[][], count: number): number[][] {
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}

/** EV given up by taking an action instead of the best one, in big blinds. */
export function evLoss(spot: PokerMinuteSpot, action: Action): number {
  const taken = action === "call" ? spot.evCall : 0;
  const best = Math.max(spot.evCall, 0);
  return Math.max(0, best - taken);
}

export function grade(spot: PokerMinuteSpot, action: Action): Grade {
  return gradeFor(evLoss(spot, action), spot.pot, spot.bet);
}

/**
 * The arc. Early spots are quick and clear so a player settles in; the last
 * stretch is where the ambiguity lives. Difficulty follows the spot index and
 * never the player, so everybody on a seed gets the same run.
 */
export function difficultyForIndex(index: number): number {
  return clampDifficulty(1 + Math.floor(index / 1.6));
}

export function spotAt(runSeed: string, index: number): PokerMinuteSpot {
  return generate(`${runSeed}#${index}`, difficultyForIndex(index));
}

export const ROUND_MS = 60_000;

/**
 * Speed is a tiebreaker, not the game. Capped at fifteen per cent so a sound
 * decision always beats a fast guess.
 */
export function timeMultiplier(msElapsed: number, budgetSeconds: number): number {
  const budget = budgetSeconds * 1000;
  const spare = Math.max(0, budget - msElapsed) / budget;
  return 1 + 0.15 * spare;
}

const GRADE_MULTIPLIER: Record<Grade, number> = {
  best: 1,
  close: 0.45,
  error: 0,
};

export function scoreSpot(
  spot: PokerMinuteSpot,
  action: Action,
  msElapsed: number,
  streak: number
): number {
  const base = 100;
  const difficultyBonus = 1 + (spot.difficulty - 1) * 0.08;
  const streakBonus = Math.min(2, 1 + streak * 0.06);
  return Math.round(
    base *
      GRADE_MULTIPLIER[grade(spot, action)] *
      difficultyBonus *
      streakBonus *
      timeMultiplier(msElapsed, spot.budgetSeconds)
  );
}

// Shared scoring economy.
//
// The design constraint: a player who is guessing must not out-earn a player
// who is thinking. On a two-way question guessing is right half the time, so
// if a correct answer pays and a wrong one merely pays nothing, mashing is
// worth exactly half of playing well - which is far too much. It was measured:
// holding one arrow key posted a personal best.
//
// So a wrong answer costs points, not just time. The break-even accuracy falls
// straight out of the numbers below.

/** A wrong answer costs what a correct one pays at the base rate. */
export const WRONG_POINTS = -100;

/**
 * Break-even accuracy. With a wrong answer costing exactly what a base-rate
 * correct answer earns, random guessing on a two-way question nets zero before
 * the accuracy multiplier, and negative after it.
 */
export const BREAK_EVEN_ACCURACY = 0.5;

/**
 * Streaks pay a milestone bonus on top of the running multiplier, so a long
 * clean run feels like an event rather than a slowly rising number.
 */
export function streakMilestoneBonus(streak: number): number {
  if (streak > 0 && streak % 25 === 0) return 1000;
  if (streak > 0 && streak % 10 === 0) return 300;
  if (streak > 0 && streak % 5 === 0) return 100;
  return 0;
}

/**
 * Applied once, to the whole run. This is the part that makes spraying answers
 * pointless: a 50% run keeps barely a third of what it earned, while a clean
 * run is paid half as much again.
 */
export function accuracyMultiplier(correct: number, attempted: number): number {
  if (attempted === 0) return 1;
  const accuracy = correct / attempted;
  if (accuracy >= 0.95) return 1.5;
  if (accuracy >= 0.9) return 1.3;
  if (accuracy >= 0.8) return 1.15;
  if (accuracy >= 0.7) return 1;
  if (accuracy >= 0.6) return 0.8;
  return 0.35;
}

/** Human-readable label for the results card. */
export function accuracyLabel(multiplier: number): string {
  return `${multiplier.toFixed(2).replace(/\.?0+$/, "")}×`;
}

/** Runs never end negative; a bad round is worth nothing, not a debt. */
export function finalScore(rawPoints: number, correct: number, attempted: number): number {
  return Math.max(0, Math.round(rawPoints * accuracyMultiplier(correct, attempted)));
}

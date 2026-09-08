// FLASH - sequential mental arithmetic against a shrinking clock.
//
// Where Equalize asks you to compare without computing, Flash asks you to
// actually compute, and to type the answer. The typing is the point: there is
// nothing to pick between, so there is nothing to guess at.

import { createRng, randInt, pick, ramp, clampDifficulty } from "@/lib/rng";

export type FlashOp = "add" | "sub" | "mul" | "div";

export type FlashQuestion = {
  display: string;
  answer: number;
  op: FlashOp;
  difficulty: number;
};

const TIMES = "×";
const DIVIDE = "÷";
const MINUS = "−";

/** Which operations are in play at a given difficulty. */
function operators(d: number): FlashOp[] {
  if (d <= 2) return ["add", "sub"];
  if (d <= 4) return ["add", "sub", "mul"];
  if (d <= 6) return ["add", "sub", "mul", "div"];
  // Late in a run, the cheap operations thin out and the heavy ones dominate.
  return ["sub", "mul", "mul", "div", "div"];
}

const MAX_ATTEMPTS = 200;

export function generate(seed: string, difficulty: number): FlashQuestion {
  const d = clampDifficulty(difficulty);
  const rng = createRng(`flash:${seed}:${d}`);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const op = pick(rng, operators(d));
    const q = build(op, rng, d);
    if (!q) continue;

    // Anything with a 0 or 1 operand is a free point, not a question.
    if (/(^|[^\d])[01]([^\d]|$)/.test(q.display)) continue;
    if (q.answer < 2 || q.answer > 20_000) continue;

    return { ...q, op, difficulty: d };
  }

  throw new Error(`flash: no valid question for seed ${seed} at difficulty ${d}`);
}

function build(
  op: FlashOp,
  rng: () => number,
  d: number
): { display: string; answer: number } | null {
  switch (op) {
    case "add": {
      const hi = Math.round(ramp(d, 60, 900));
      const a = randInt(rng, 12, hi);
      const b = randInt(rng, 12, hi);
      return { display: `${a} + ${b}`, answer: a + b };
    }

    case "sub": {
      const hi = Math.round(ramp(d, 90, 1200));
      const b = randInt(rng, 12, Math.round(hi / 2));
      const a = b + randInt(rng, 12, hi);
      return { display: `${a} ${MINUS} ${b}`, answer: a - b };
    }

    case "mul": {
      const a = randInt(rng, 3, Math.round(ramp(d, 12, 39)));
      const b = randInt(rng, 3, Math.round(ramp(d, 9, 29)));
      return { display: `${a} ${TIMES} ${b}`, answer: a * b };
    }

    case "div": {
      // Built from the answer outwards so the division is always exact.
      const b = randInt(rng, 3, Math.round(ramp(d, 9, 24)));
      const answer = randInt(rng, 3, Math.round(ramp(d, 20, 90)));
      return { display: `${b * answer} ${DIVIDE} ${b}`, answer };
    }
  }
}

export function difficultyForIndex(index: number): number {
  return clampDifficulty(1 + Math.floor(index / 3));
}

export function questionAt(runSeed: string, index: number): FlashQuestion {
  return generate(`${runSeed}#${index}`, difficultyForIndex(index));
}

export function validate(question: FlashQuestion, typed: string): boolean {
  return typed !== "" && Number(typed) === question.answer;
}

/**
 * Typing means a wrong answer is rarely a guess - it is a slip or a genuine
 * miss. The player gives up the time they already spent on it, so there is no
 * separate penalty; skipping is its own punishment.
 */
export const ROUND_MS = 60_000;
export const SKIP_PENALTY_MS = 2_000;

export function score(question: FlashQuestion, msElapsed: number, streak: number): number {
  const base = 100;
  // Typing takes longer than pressing an arrow, so the curve is more generous.
  const speed = Math.max(0, Math.min(1, (6000 - msElapsed) / 4600));
  const multiplier = Math.min(2, 1 + streak * 0.05);
  const difficultyBonus = 1 + (question.difficulty - 1) * 0.05;
  return Math.round((base + speed * 100) * multiplier * difficultyBonus);
}

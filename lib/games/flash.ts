// FLASH - sequential mental arithmetic against a shrinking clock.
//
// Where Equalize asks you to compare without computing, Flash asks you to
// actually compute, and to type the answer. The typing is the point: there is
// nothing to pick between, so there is nothing to guess at.

import { createRng, randInt, pick, ramp, clampDifficulty } from "@/lib/rng";

export type FlashOp =
  | "add"
  | "sub"
  | "mul"
  | "div"
  | "frac"
  | "pow"
  | "root"
  | "log"
  | "integral";

export type FlashQuestion = {
  display: string;
  answer: number;
  op: FlashOp;
  difficulty: number;
};

const TIMES = "×";
const DIVIDE = "÷";
const MINUS = "−";

/* Superscripts and subscripts as characters, not markup - the whole product is
   one monospace face and a <sup> breaks the baseline the digits sit on. */
const SUPER = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];
const SUB = ["₀", "₁", "₂", "₃", "₄", "₅", "₆", "₇", "₈", "₉"];

const sup = (n: number) =>
  String(n).split("").map((c) => SUPER[Number(c)]).join("");
const sub = (n: number) =>
  String(n).split("").map((c) => SUB[Number(c)]).join("");

/** Denominators a person can divide by in their head. */
const DENOMS = [3, 4, 5, 6, 8, 10, 12] as const;

/**
 * Which operations are in play at a given difficulty.
 *
 * The run walks up through arithmetic and out the other side. Addition and
 * subtraction give way to multiplication and division, then to fractions,
 * powers and roots, and the last stretch brings in logarithms and a definite
 * integral. Everything stays exact: a log is only ever asked when the argument
 * is a whole power of the base, and an integral is built so the antiderivative
 * lands on an integer. Nothing here is rounded, because the answer is typed.
 */
function operators(d: number): FlashOp[] {
  if (d <= 2) return ["add", "sub"];
  if (d <= 4) return ["add", "sub", "mul"];
  if (d <= 5) return ["add", "sub", "mul", "div"];
  if (d === 6) return ["sub", "mul", "div", "frac", "pow"];
  if (d === 7) return ["mul", "div", "frac", "frac", "pow", "root"];
  if (d === 8) return ["mul", "div", "frac", "pow", "root", "log"];
  // Late in a run the cheap operations are gone entirely.
  return ["div", "frac", "pow", "root", "log", "log", "integral", "integral"];
}


/**
 * Fractions are shown in lowest terms.
 *
 * Picking a numerator freely under a denominator produced "2/4 of 56", which
 * is a correct question and a sloppy one - nobody writes 2/4, and reading it
 * costs a beat that has nothing to do with the arithmetic. Reducing can leave a
 * denominator of two, which is not a question either, so those are rejected.
 */
function reducedFraction(rng: () => number, denoms: readonly number[]): { a: number; b: number } | null {
  const b0 = pick(rng, denoms);
  const a0 = randInt(rng, 1, b0 - 1);
  const g = gcd(a0, b0);
  const a = a0 / g;
  const b = b0 / g;
  return b < 3 ? null : { a, b };
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
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

    case "frac": {
      // a/b of n, with b dividing n, so the answer is whole.
      const f = reducedFraction(rng, DENOMS);
      if (!f) return null;
      const k = randInt(rng, 3, Math.round(ramp(d, 20, 70)));
      return { display: `${f.a}/${f.b} of ${f.b * k}`, answer: f.a * k };
    }

    case "pow": {
      const base = randInt(rng, 2, Math.round(ramp(d, 7, 13)));
      const exp = base <= 3 ? randInt(rng, 3, 6) : randInt(rng, 2, 4);
      const answer = Math.pow(base, exp);
      if (answer > 20_000) return null;
      return { display: `${base}${sup(exp)}`, answer };
    }

    case "root": {
      const answer = randInt(rng, 4, Math.round(ramp(d, 25, 60)));
      return { display: `√${answer * answer}`, answer };
    }

    case "log": {
      // Only ever an exact power of the base, so the answer is an integer and
      // there is nothing to round. This is the one operation on the site whose
      // answer is deliberately small - a log is a question about how many
      // times, not about how much.
      const base = pick(rng, [2, 3, 4, 5, 10] as const);
      const answer = randInt(rng, 2, base === 2 ? 12 : base === 3 ? 7 : 5);
      const argument = Math.pow(base, answer);
      if (argument > 5_000_000) return null;
      return { display: `log${sub(base)} ${argument}`, answer };
    }

    case "integral": {
      // ∫₀ᵃ k·xⁿ dx = k·aⁿ⁺¹/(n+1). Taking k = (n+1)·m cancels the
      // denominator exactly and leaves m·aⁿ⁺¹, an integer every time.
      const n = randInt(rng, 1, 3);
      const a = randInt(rng, 2, n === 1 ? 9 : n === 2 ? 6 : 4);
      const m = randInt(rng, 1, Math.round(ramp(d, 3, 8)));
      const k = (n + 1) * m;
      const term = n === 1 ? `${k}x` : `${k}x${sup(n)}`;
      return {
        display: `∫${sub(0)}${sup(a)} ${term} dx`,
        answer: m * Math.pow(a, n + 1),
      };
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

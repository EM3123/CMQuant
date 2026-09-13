// EQUALIZE - pick the larger of two generated expressions, faster than you could
// compute both. The whole game lives or dies on this generator: the two sides
// must be close enough that eyeballing fails, far enough apart that an answer
// exists, and clean enough to settle in a few seconds.

import { createRng, randInt, pick, ramp, clampDifficulty, type Rng } from "@/lib/rng";

export type Side = "left" | "right";

export type Expr = {
  display: string;
  value: number;
};

export type EqualizeQuestion = {
  left: Expr;
  right: Expr;
  answer: Side;
  difficulty: number;
  /** |a - b| / max(a, b) - how hard the comparison is. */
  gap: number;
};

type Template = {
  id: string;
  minDifficulty: number;
  /** Free sample, used for the left-hand side. */
  sample(rng: Rng, d: number): Expr;
  /** Sample constrained to land near a target value. Null when it cannot reach. */
  sampleNear(rng: Rng, d: number, target: number): Expr | null;
};

const TIMES = "×";
const DIVIDE = "÷";
const MINUS = "−";

const PERCENTS = [5, 10, 15, 20, 25, 30, 40, 60, 75] as const;


/* --------------------------------------------------------------------------
   Notation
   Superscripts and subscripts as characters rather than markup, because the
   whole product is one monospace face and a <sup> in the middle of a tabular
   line breaks the baseline everything else sits on.
   -------------------------------------------------------------------------- */
const SUPER = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];
const SUB = ["₀", "₁", "₂", "₃", "₄", "₅", "₆", "₇", "₈", "₉"];

function sup(n: number): string {
  return String(n)
    .split("")
    .map((c) => SUPER[Number(c)])
    .join("");
}

function sub(n: number): string {
  return String(n)
    .split("")
    .map((c) => SUB[Number(c)])
    .join("");
}

/** Denominators a person can actually divide by in their head. */
const DENOMS = [3, 4, 5, 6, 8, 10, 12] as const;

/**
 * Every exact power worth showing, precomputed once.
 *
 * Built rather than sampled so the value is an exact integer and the nearest
 * one to a target can be found by scanning. Squares of small numbers are
 * excluded because `sq` already owns those and 4² is not a question.
 */
const POWERS: { display: string; value: number; exp: number }[] = (() => {
  const out: { display: string; value: number; exp: number }[] = [];
  for (let base = 2; base <= 9; base++) {
    for (let exp = 3; exp <= 12; exp++) {
      const value = Math.pow(base, exp);
      if (value < 25 || value > 6000) continue;
      out.push({ display: `${base}${sup(exp)}`, value, exp });
    }
  }
  return out.sort((a, b) => a.value - b.value);
})();


/**
 * Fractions are shown in lowest terms.
 *
 * Picking a numerator freely under a denominator produced "2/4 of 56", which
 * is a correct question and a sloppy one - nobody writes 2/4, and reading it
 * costs a beat that has nothing to do with the arithmetic. Reducing can leave a
 * denominator of two, which is not a question either, so those are rejected.
 */
function reducedFraction(rng: Rng, denoms: readonly number[]): { a: number; b: number } | null {
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

const TEMPLATES: Template[] = [
  {
    // a x b
    id: "mul",
    minDifficulty: 1,
    sample(rng, d) {
      const a = randInt(rng, 11, Math.round(ramp(d, 25, 79)));
      const b = randInt(rng, 3, Math.round(ramp(d, 5, 14)));
      return { display: `${a} ${TIMES} ${b}`, value: a * b };
    },
    sampleNear(rng, d, target) {
      const b = randInt(rng, 3, Math.round(ramp(d, 5, 14)));
      const a = Math.round(target / b);
      if (a < 11 || a > Math.round(ramp(d, 25, 79))) return null;
      return { display: `${a} ${TIMES} ${b}`, value: a * b };
    },
  },
  {
    // a + b + c
    id: "add3",
    minDifficulty: 1,
    sample(rng, d) {
      const hi = Math.round(ramp(d, 60, 240));
      const a = randInt(rng, 12, hi);
      const b = randInt(rng, 12, hi);
      const c = randInt(rng, 12, hi);
      return { display: `${a} + ${b} + ${c}`, value: a + b + c };
    },
    sampleNear(rng, d, target) {
      const hi = Math.round(ramp(d, 60, 240));
      const a = randInt(rng, 12, hi);
      const b = randInt(rng, 12, hi);
      const c = Math.round(target) - a - b;
      if (c < 12 || c > hi) return null;
      return { display: `${a} + ${b} + ${c}`, value: a + b + c };
    },
  },
  {
    // a - b
    id: "sub",
    minDifficulty: 1,
    sample(rng, d) {
      const b = randInt(rng, 20, Math.round(ramp(d, 90, 380)));
      const a = b + randInt(rng, 20, Math.round(ramp(d, 200, 900)));
      return { display: `${a} ${MINUS} ${b}`, value: a - b };
    },
    sampleNear(rng, d, target) {
      const b = randInt(rng, 20, Math.round(ramp(d, 90, 380)));
      const diff = Math.round(target);
      if (diff < 20 || diff > Math.round(ramp(d, 200, 900))) return null;
      return { display: `${b + diff} ${MINUS} ${b}`, value: diff };
    },
  },
  {
    // a x b + c
    id: "mulAdd",
    minDifficulty: 3,
    sample(rng, d) {
      const a = randInt(rng, 7, Math.round(ramp(d, 14, 42)));
      const b = randInt(rng, 4, Math.round(ramp(d, 7, 13)));
      const c = randInt(rng, 10, Math.round(ramp(d, 60, 220)));
      return { display: `${a} ${TIMES} ${b} + ${c}`, value: a * b + c };
    },
    sampleNear(rng, d, target) {
      const a = randInt(rng, 7, Math.round(ramp(d, 14, 42)));
      const b = randInt(rng, 4, Math.round(ramp(d, 7, 13)));
      const c = Math.round(target) - a * b;
      if (c < 10 || c > Math.round(ramp(d, 60, 220))) return null;
      return { display: `${a} ${TIMES} ${b} + ${c}`, value: a * b + c };
    },
  },
  {
    // p% of n. n is a multiple of 20 and p a multiple of 5, so the value is
    // always a whole number.
    id: "pct",
    minDifficulty: 3,
    sample(rng, d) {
      const p = pick(rng, PERCENTS);
      const n = 20 * randInt(rng, 3, Math.round(ramp(d, 20, 90)));
      return { display: `${p}% of ${n}`, value: (p * n) / 100 };
    },
    sampleNear(rng, d, target) {
      const p = pick(rng, PERCENTS);
      const n = 20 * Math.round((target * 100) / p / 20);
      if (n < 60 || n > 20 * Math.round(ramp(d, 20, 90))) return null;
      return { display: `${p}% of ${n}`, value: (p * n) / 100 };
    },
  },
  {
    // a / b, always exact
    id: "div",
    minDifficulty: 4,
    sample(rng, d) {
      const b = randInt(rng, 3, Math.round(ramp(d, 7, 16)));
      const q = randInt(rng, 12, Math.round(ramp(d, 60, 220)));
      return { display: `${b * q} ${DIVIDE} ${b}`, value: q };
    },
    sampleNear(rng, d, target) {
      const b = randInt(rng, 3, Math.round(ramp(d, 7, 16)));
      const q = Math.round(target);
      if (q < 12 || q > Math.round(ramp(d, 60, 220))) return null;
      return { display: `${b * q} ${DIVIDE} ${b}`, value: q };
    },
  },
  {
    // n squared
    id: "sq",
    minDifficulty: 5,
    sample(rng, d) {
      const n = randInt(rng, 11, Math.round(ramp(d, 19, 34)));
      return { display: `${n}²`, value: n * n };
    },
    sampleNear(rng, d, target) {
      const n = Math.round(Math.sqrt(target));
      if (n < 11 || n > Math.round(ramp(d, 19, 34))) return null;
      return { display: `${n}²`, value: n * n };
    },
  },
  {
    // a/b of n, where b divides n so the value is a whole number.
    //
    // The same shape as `pct` and a completely different piece of arithmetic:
    // a percentage is a division by a hundred you have memorised, a fraction is
    // one you have to do.
    id: "frac",
    minDifficulty: 6,
    sample(rng, d) {
      const f = reducedFraction(rng, DENOMS);
      if (!f) return { display: "3/4 of 80", value: 60 };
      const k = randInt(rng, 4, Math.round(ramp(d, 30, 110)));
      return { display: `${f.a}/${f.b} of ${f.b * k}`, value: f.a * k };
    },
    sampleNear(rng, d, target) {
      const f = reducedFraction(rng, DENOMS);
      if (!f) return null;
      const k = Math.round(target / f.a);
      if (k < 4 || k > Math.round(ramp(d, 30, 110))) return null;
      return { display: `${f.a}/${f.b} of ${f.b * k}`, value: f.a * k };
    },
  },
  {
    // base to a power, from the precomputed exact table.
    id: "pow",
    minDifficulty: 7,
    sample(rng, d) {
      const ceiling = ramp(d, 400, 6000);
      const pool = POWERS.filter((p) => p.value <= ceiling);
      const chosen = pick(rng, pool.length ? pool : POWERS);
      return { display: chosen.display, value: chosen.value };
    },
    sampleNear(rng, d, target) {
      const ceiling = ramp(d, 400, 6000);
      const pool = POWERS.filter((p) => p.value <= ceiling);
      if (!pool.length) return null;
      // Nearest exact power to the target. There is no interpolating here -
      // a power either exists at that value or it does not.
      let best = pool[0];
      for (const p of pool) {
        if (Math.abs(p.value - target) < Math.abs(best.value - target)) best = p;
      }
      return { display: best.display, value: best.value };
    },
  },
  {
    // square root of a perfect square. Exact by construction.
    id: "root",
    minDifficulty: 7,
    sample(rng, d) {
      const n = randInt(rng, 21, Math.round(ramp(d, 40, 90)));
      return { display: `√${n * n}`, value: n };
    },
    sampleNear(rng, d, target) {
      const n = Math.round(target);
      if (n < 21 || n > Math.round(ramp(d, 40, 90))) return null;
      return { display: `√${n * n}`, value: n };
    },
  },
  {
    // A definite integral of a single power term.
    //
    //   ∫₀ᵃ k·xⁿ dx  =  k·aⁿ⁺¹ / (n+1)
    //
    // The coefficient is built as k = (n+1)·m, which cancels the denominator
    // exactly and leaves m·aⁿ⁺¹ - an integer, always. Nothing here is
    // rounded, so the comparison is as exact as the arithmetic ones.
    id: "integral",
    minDifficulty: 9,
    sample(rng, d) {
      const n = randInt(rng, 1, 3);
      const a = randInt(rng, 2, n === 1 ? 9 : n === 2 ? 6 : 4);
      const m = randInt(rng, 1, Math.round(ramp(d, 3, 9)));
      return integralExpr(n, a, m);
    },
    sampleNear(rng, d, target) {
      const n = randInt(rng, 1, 3);
      const a = randInt(rng, 2, n === 1 ? 9 : n === 2 ? 6 : 4);
      const scale = Math.pow(a, n + 1);
      const m = Math.round(target / scale);
      if (m < 1 || m > Math.round(ramp(d, 3, 9))) return null;
      return integralExpr(n, a, m);
    },
  },
];

/** One integral term, laid out so the value is an exact integer. */
function integralExpr(n: number, a: number, m: number): Expr {
  const k = (n + 1) * m;
  const term = n === 1 ? `${k}x` : `${k}x${sup(n)}`;
  return {
    display: `∫${sub(0)}${sup(a)} ${term} dx`,
    value: m * Math.pow(a, n + 1),
  };
}


/** Closeness band. Wide and forgiving at difficulty 1, brutal at 10. */
export function gapBand(difficulty: number): { min: number; max: number } {
  return {
    min: ramp(difficulty, 0.1, 0.015),
    max: ramp(difficulty, 0.4, 0.1),
  };
}

function relativeGap(a: number, b: number): number {
  return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b));
}

const MAX_ATTEMPTS = 400;

/**
 * Pure and seeded. Same seed and difficulty produce the same question for
 * everyone, forever - that is what makes a run challengeable.
 */
export function generate(seed: string, difficulty: number): EqualizeQuestion {
  const d = clampDifficulty(difficulty);
  const rng = createRng(`equalize:${seed}:${d}`);
  const band = gapBand(d);
  const eligible = TEMPLATES.filter((t) => t.minDifficulty <= d);

  // Rejection loop: sample the left side freely, aim the right side at a value
  // a chosen distance away, then keep only pairs that landed inside the band.
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    // The last stretch of attempts falls back to multiplication on both sides,
    // which can hit almost any target and so always terminates.
    const exhausted = attempt > MAX_ATTEMPTS - 20;
    const pool = exhausted ? [TEMPLATES[0]] : eligible;

    const left = pick(rng, pool).sample(rng, d);
    if (left.value < 20) continue;

    const wanted = band.min + rng() * (band.max - band.min);
    const rightIsLarger = rng() < 0.5;
    const target = rightIsLarger
      ? left.value * (1 + wanted)
      : left.value / (1 + wanted);

    const right = pick(rng, pool).sampleNear(rng, d, target);
    if (!right) continue;
    if (right.value < 20) continue;
    if (right.display === left.display) continue;
    if (right.value === left.value) continue;

    const gap = relativeGap(left.value, right.value);
    if (gap < band.min || gap > band.max) continue;

    return {
      left,
      right,
      answer: left.value > right.value ? "left" : "right",
      difficulty: d,
      gap,
    };
  }

  throw new Error(`equalize: no valid question for seed ${seed} at difficulty ${d}`);
}

/**
 * Difficulty ramps on question index, never on performance. If it ramped on how
 * well you were doing, two players sharing a seed would see different questions
 * and the challenge link would be a lie.
 */
export function difficultyForIndex(index: number): number {
  return clampDifficulty(1 + Math.floor(index / 3));
}

export function questionAt(runSeed: string, index: number): EqualizeQuestion {
  return generate(`${runSeed}#${index}`, difficultyForIndex(index));
}

export function validate(question: EqualizeQuestion, answer: Side): boolean {
  return question.answer === answer;
}

export const ROUND_MS = 60_000;

/** A wrong answer costs time. Without this, mashing a two-way choice beats thinking. */
export const WRONG_PENALTY_MS = 2_000;

/**
 * Below this, nobody read two expressions and compared them - they guessed and
 * happened to be right. A lucky guess still banks the base points, but it earns
 * no speed bonus. Without this floor, mashing one arrow key posts a competitive
 * score, which was measured, not theorised.
 */
export const GUESS_FLOOR_MS = 350;

export function score(
  question: EqualizeQuestion,
  msElapsed: number,
  streak: number
): number {
  const base = 100;
  // Full speed bonus from the floor to about a second, gone by five.
  const speed =
    msElapsed < GUESS_FLOOR_MS
      ? 0
      : Math.max(0, Math.min(1, (5000 - msElapsed) / 3800));
  const multiplier = Math.min(2, 1 + streak * 0.05);
  const difficultyBonus = 1 + (question.difficulty - 1) * 0.05;
  return Math.round((base + speed * 100) * multiplier * difficultyBonus);
}

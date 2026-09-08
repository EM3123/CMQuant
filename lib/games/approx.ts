// APPROX - estimation. The expression is deliberately tedious to compute
// exactly, and the four options are far enough apart that you never need to.
// The skill being trained is knowing when precision is wasted effort.

import { createRng, randInt, pick, ramp, clampDifficulty, type Rng } from "@/lib/rng";

export type ApproxQuestion = {
  display: string;
  /** The exact value. Never shown; used only to judge which option is closest. */
  exact: number;
  options: number[];
  answerIndex: number;
  difficulty: number;
};

const TIMES = "×";
const DIVIDE = "÷";

/** Round to two significant figures - what a person actually estimates to. */
function twoSigFigs(value: number): number {
  if (value === 0) return 0;
  const magnitude = Math.floor(Math.log10(Math.abs(value)));
  const factor = Math.pow(10, magnitude - 1);
  return Math.round(value / factor) * factor;
}

/** How far apart adjacent options sit, as a ratio. Wide early, tight late. */
function minRatio(d: number): number {
  return ramp(d, 1.6, 1.15);
}

type Form = { display: string; exact: number };

function buildExpression(rng: Rng, d: number): Form {
  const kind = pick(
    rng,
    d <= 3
      ? (["mul2", "pct"] as const)
      : d <= 6
        ? (["mul2", "pct", "div"] as const)
        : (["mul3", "pct", "div", "chain"] as const)
  );

  switch (kind) {
    case "mul2": {
      // The floors are high on purpose. A product small enough to work out
      // exactly is not an estimation question, whatever the options say.
      const a = randInt(rng, Math.round(ramp(d, 140, 320)), Math.round(ramp(d, 620, 2400)));
      const b = randInt(rng, Math.round(ramp(d, 14, 24)), Math.round(ramp(d, 68, 420)));
      return { display: `${fmt(a)} ${TIMES} ${fmt(b)}`, exact: a * b };
    }
    case "mul3": {
      const a = randInt(rng, 18, 96);
      const b = randInt(rng, 14, 88);
      const c = randInt(rng, 4, 19);
      return {
        display: `${fmt(a)} ${TIMES} ${fmt(b)} ${TIMES} ${fmt(c)}`,
        exact: a * b * c,
      };
    }
    case "pct": {
      const p = randInt(rng, 3, 96);
      const n = randInt(rng, 240, Math.round(ramp(d, 9_000, 480_000)));
      return { display: `${p}% of ${fmt(n)}`, exact: (p * n) / 100 };
    }
    case "div": {
      const a = randInt(rng, 900, Math.round(ramp(d, 20_000, 900_000)));
      const b = randInt(rng, 7, Math.round(ramp(d, 60, 480)));
      return { display: `${fmt(a)} ${DIVIDE} ${fmt(b)}`, exact: a / b };
    }
    case "chain": {
      const a = randInt(rng, 120, 980);
      const b = randInt(rng, 12, 84);
      const c = randInt(rng, 3, 24);
      return {
        display: `${fmt(a)} ${TIMES} ${fmt(b)} ${DIVIDE} ${fmt(c)}`,
        exact: (a * b) / c,
      };
    }
  }
}

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

const MAX_ATTEMPTS = 300;

export function generate(seed: string, difficulty: number): ApproxQuestion {
  const d = clampDifficulty(difficulty);
  const rng = createRng(`approx:${seed}:${d}`);
  const ratio = minRatio(d);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const form = buildExpression(rng, d);
    const answer = twoSigFigs(form.exact);
    if (answer <= 0) continue;

    // The rounded option has to be close enough to the exact value that it is
    // unambiguously the nearest of the four. Without this a 5% rounding error
    // could sit further from the truth than the nearest distractor.
    if (Math.abs(answer - form.exact) / form.exact > 0.02) continue;

    // Same structure as Pot Odds: decide up front how many options sit below
    // the answer, so the correct one is not stuck in the same slot every time.
    const belowCount = randInt(rng, 0, 3);

    const chosen: number[] = [answer];
    const accept = (value: number): boolean => {
      const rounded = twoSigFigs(value);
      if (rounded <= 0) return false;
      for (const existing of chosen) {
        const bigger = Math.max(existing, rounded);
        const smaller = Math.min(existing, rounded);
        if (bigger / smaller < ratio) return false;
      }
      chosen.push(rounded);
      return true;
    };

    // Each successive option steps by roughly one ratio, so four options span
    // about ratio-cubed. The first version compounded the step with the retry
    // counter, which stretched a difficulty-1 question across more than ten
    // times its own answer - no estimation required, just read the magnitude.
    const fill = (count: number, direction: -1 | 1): boolean => {
      let need = count;
      let step = 1;
      for (let guard = 0; need > 0 && guard < 40; guard++) {
        step *= ratio * (1 + rng() * 0.22);
        if (accept(direction === 1 ? answer * step : answer / step)) need--;
      }
      return need === 0;
    };

    if (!fill(belowCount, -1)) continue;
    if (!fill(3 - belowCount, 1)) continue;

    const sorted = [...chosen].sort((a, b) => a - b);
    return {
      display: form.display,
      exact: form.exact,
      options: sorted,
      answerIndex: sorted.indexOf(answer),
      difficulty: d,
    };
  }

  throw new Error(`approx: no valid question for seed ${seed} at difficulty ${d}`);
}

export function difficultyForIndex(index: number): number {
  return clampDifficulty(1 + Math.floor(index / 3));
}

export function questionAt(runSeed: string, index: number): ApproxQuestion {
  return generate(`${runSeed}#${index}`, difficultyForIndex(index));
}

export function validate(question: ApproxQuestion, chosen: number): boolean {
  return chosen === question.answerIndex;
}

export function formatOption(value: number): string {
  return value.toLocaleString("en-US");
}

export const ROUND_MS = 60_000;
export const WRONG_PENALTY_MS = 2_000;
export const GUESS_FLOOR_MS = 500;

export function score(question: ApproxQuestion, msElapsed: number, streak: number): number {
  const base = 100;
  const speed =
    msElapsed < GUESS_FLOOR_MS
      ? 0
      : Math.max(0, Math.min(1, (7000 - msElapsed) / 5200));
  const multiplier = Math.min(2, 1 + streak * 0.05);
  const difficultyBonus = 1 + (question.difficulty - 1) * 0.05;
  return Math.round((base + speed * 100) * multiplier * difficultyBonus);
}

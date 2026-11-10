// CAP RATE - what a building is worth, from what it earns.
//
// THE CHAIN, and it is the whole game:
//   gross potential rent (GPR) = units × monthly rent × 12
//   effective gross income (EGI) = GPR − vacancy loss
//   net operating income (NOI) = EGI − operating costs
//   value = NOI ÷ cap rate
//
// WHAT IS NOT IN NOI. Debt service, depreciation and a one-off roof replacement
// are shown on screen as decoys and never counted. NOI is the income
// before financing and before the building's capital history.
//
// WHAT IS NOT GRADED. A capital-expenditure reserve. Practitioners disagree on
// whether it sits above or below NOI, and a question whose answer depends on
// that disagreement is one the product cannot defend.
//
// ARITHMETIC. Every dollar amount on screen is a whole number: the generator
// rounds each derived line once, and the verifier applies the same rule. Values
// are labelled to the nearest $10,000, so two options can only collide on
// screen if they are within that band; the generator rejects that case.

import { createRng, randInt, clampDifficulty } from "@/lib/rng";
import { buildOptions, type Candidate } from "@/lib/games/choice";

export type CapKind = "value" | "implied" | "cap-move";

export type CostLine =
  | { basis: "annual"; label: string; amount: number }
  | { basis: "monthly"; label: string; amount: number }
  | { basis: "percent"; label: string; percent: number };

export type Decoy = { label: string; amount: number };

export type MistakeKey =
  | "vacancy-missed"
  | "financing-in-noi"
  | "depreciation-in-noi"
  | "one-off-in-noi"
  | "gross-capitalised"
  | "monthly-unannualised"
  | "ignored-cap-change"
  | "moved-wrong-way"
  | "halved-move"
  | "overshot-move";

export type CapQuestion = {
  kind: CapKind;
  units: number;
  monthlyRent: number;
  vacancyPct: number;
  costs: CostLine[];
  decoys: Decoy[];
  gpr: number;
  egi: number;
  opex: number;
  noi: number;
  /** The cap rate in force, in percent. For cap-move, the starting rate. */
  capPct: number;
  /** cap-move only: the rate the question moves to. */
  nextCapPct: number | null;
  /** implied only: the asking price. */
  price: number | null;
  /** value and cap-move: dollars. implied: percent. */
  exact: number;
  options: number[];
  answerIndex: number;
  diagnoses: (MistakeKey | null)[];
  difficulty: number;
};

export const MISTAKE_LABEL: Record<MistakeKey, string> = {
  "vacancy-missed": "Skipped vacancy",
  "financing-in-noi": "Took the mortgage payment out of NOI",
  "depreciation-in-noi": "Took depreciation out of NOI",
  "one-off-in-noi": "Took a one-off capital cost out of NOI",
  "gross-capitalised": "Capitalised gross rent, not the income after costs",
  "monthly-unannualised": "Left a monthly cost as if it were a year's cost",
  "ignored-cap-change": "Kept the old value after the rate moved",
  "moved-wrong-way": "Moved the rate the wrong way before dividing",
  "halved-move": "Priced at the midpoint rate, not the new one",
  "overshot-move": "Added the rate change a second time",
};

export const MISTAKE_FIX: Record<MistakeKey, string> = {
  "vacancy-missed": "Rent you do not collect is not income. Take vacancy off gross rent, and charge management on what you collect.",
  "financing-in-noi":
    "NOI is before the mortgage. Debt service decides what the owner keeps, not what the building earns.",
  "depreciation-in-noi":
    "Depreciation is a tax accounting entry. It is not cash leaving the building, so it is not an operating cost.",
  "one-off-in-noi":
    "A one-off capital item is not a recurring cost of running the building. Keep it out of the year you are valuing.",
  "gross-capitalised":
    "Gross rent is what the building could earn. The cap rate prices what it does earn after the costs of earning it.",
  "monthly-unannualised": "Monthly costs are twelve months a year. Multiply by twelve before subtracting.",
  "ignored-cap-change": "The income is the same, but the rate changed, so the value changes with it.",
  "moved-wrong-way": "A higher cap rate means a lower value. Check the direction the value must move before you divide.",
  "halved-move": "The question gives the new rate. Divide by that rate, not by a rate halfway between the old and new.",
  "overshot-move": "The rate moves once, to the new rate. Adding the change a second time pushes the value too low.",
};

/* -------------------------------------------------------------------------- */
/* The arithmetic every screen and every verifier shares                       */
/* -------------------------------------------------------------------------- */

/** Round a derived dollar amount once, to the nearest whole dollar. */
export const dollars = (x: number) => Math.round(x);

export function percentLine(egi: number, percent: number): number {
  return dollars((egi * percent) / 100);
}

export function opexOf(costs: CostLine[], egi: number): number {
  return costs.reduce((sum, c) => {
    if (c.basis === "annual") return sum + c.amount;
    if (c.basis === "monthly") return sum + c.amount * 12;
    return sum + percentLine(egi, c.percent);
  }, 0);
}

/* -------------------------------------------------------------------------- */
/* Difficulty                                                                 */
/* -------------------------------------------------------------------------- */

function kindsFor(d: number, rng: () => number): CapKind {
  if (d <= 5) return "value";
  if (d <= 8) return rng() < 0.5 ? "value" : "implied";
  const r = rng();
  return r < 0.4 ? "value" : r < 0.7 ? "implied" : "cap-move";
}

function capStepFor(d: number): number {
  if (d <= 2) return 1;
  if (d <= 5) return 0.5;
  return 0.25;
}

const MAX_ATTEMPTS = 300;

export function generate(seed: string, difficulty: number): CapQuestion {
  const d = clampDifficulty(difficulty);
  const rng = createRng(`caprate:${seed}:${d}`);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const q = dealQuestion(rng, d);
    if (!q) continue;

    const wrong = wrongWays(q);
    // Near-miss spacing is drawn per question. A fixed step put the answer inside
    // an equal-ratio pair far more often than chance.
    const spread = 0.02 + rng() * 0.05;
    const built = buildOptions<MistakeKey>(
      rng,
      q.exact,
      wrong,
      (v) => labelFor(q.kind, v),
      (k, dir) => q.exact * (1 + dir * spread * k)
    );
    if (!built) continue;

    return { ...q, options: built.options, answerIndex: built.answerIndex, diagnoses: built.diagnoses, difficulty: d };
  }

  throw new Error(`caprate: no valid question for seed ${seed} at difficulty ${d}`);
}

export function labelFor(kind: CapKind, value: number): string {
  if (kind === "implied") return `${value.toFixed(2)}%`;
  return `$${(value / 1_000_000).toFixed(2)}M`;
}

type Deal = Omit<CapQuestion, "options" | "answerIndex" | "diagnoses" | "difficulty">;

function dealQuestion(rng: () => number, d: number): Deal | null {
  const kind = kindsFor(d, rng);
  const units = randInt(rng, 8, 60);
  const monthlyRent = randInt(rng, 36, 96) * 25;
  const vacancyPct = d === 1 ? 0 : ([0, 3, 5, 8, 10] as const)[randInt(rng, 0, 4)];

  const gpr = units * monthlyRent * 12;
  const egi = dollars((gpr * (100 - vacancyPct)) / 100);

  const costs: CostLine[] = [];
  const annualCount = d <= 1 ? 1 : d <= 5 ? 2 : 3;
  // Draw the total operating-cost share first, then split it across the annual
  // lines. Drawing each line on its own pushed NOI past the sanity bounds for
  // single-line deals, which made difficulty 1 unplayable.
  const names = ["Property tax", "Insurance", "Maintenance and repairs", "Landscaping"];
  const total = 0.25 + rng() * 0.2;
  const weights = Array.from({ length: annualCount }, () => 0.5 + rng());
  const weightSum = weights.reduce((x, y) => x + y, 0);
  for (let i = 0; i < annualCount; i++) {
    const share = (total * weights[i]) / weightSum;
    costs.push({ basis: "annual", label: names[i], amount: Math.round((egi * share) / 500) * 500 });
  }
  if (d >= 6) {
    const monthly = Math.round((egi * (0.02 + rng() * 0.03)) / 12 / 25) * 25;
    costs.push({ basis: "monthly", label: "Utilities, common areas", amount: monthly });
    const pct = ([4, 5, 6, 8] as const)[randInt(rng, 0, 3)];
    costs.push({ basis: "percent", label: "Management", percent: pct });
  }

  const opex = opexOf(costs, egi);
  const noi = egi - opex;
  if (noi <= 0 || noi / egi < 0.4 || noi / egi > 0.8) return null;

  const step = capStepFor(d);
  // Whole points from 5% up at the start, half and quarter points later.
  const capPct = 5 + Math.floor(rng() * (4 / step)) * step;

  const decoys: Decoy[] = [];
  if (d >= 2) {
    decoys.push({ label: "Debt service on the mortgage", amount: Math.round((noi * (0.4 + rng() * 0.3)) / 500) * 500 });
    decoys.push({ label: "Depreciation (tax schedule)", amount: Math.round((gpr * (0.08 + rng() * 0.08)) / 500) * 500 });
    decoys.push({ label: "Roof replacement, one-off", amount: Math.round((gpr * (0.05 + rng() * 0.06)) / 500) * 500 });
  }

  const base = { units, monthlyRent, vacancyPct, costs, decoys, gpr, egi, opex, noi, capPct };

  if (kind === "value") {
    const exact = noi / (capPct / 100);
    return { ...base, kind, nextCapPct: null, price: null, exact };
  }

  if (kind === "implied") {
    // The asking price is a round value near what the building is worth at a
    // different rate, so the implied rate is not a number the player was handed.
    // The price is taken at an off-grid rate, so the implied answer is not a
    // quarter-point the player can pick by shape.
    const jitter = 0.03 + rng() * 0.19;
    const price = Math.round((noi / ((capPct + step + jitter) / 100)) / 10_000) * 10_000;
    const exact = (noi / price) * 100;
    if (!Number.isFinite(exact) || exact <= 0) return null;
    return { ...base, kind, nextCapPct: null, price, exact };
  }

  const nextCapPct = capPct + step * ([1, 2] as const)[randInt(rng, 0, 1)];
  if (nextCapPct > 9.5) return null;
  const exact = noi / (nextCapPct / 100);
  return { ...base, kind, nextCapPct, price: null, exact };
}

/* -------------------------------------------------------------------------- */
/* The named errors, each recomputed from the same premises                    */
/* -------------------------------------------------------------------------- */

/** NOI candidates for the value and implied kinds, each with the error it makes. */
function noiCandidates(q: Deal): { key: MistakeKey; noi: number }[] {
  const out: { key: MistakeKey; noi: number }[] = [];
  // Someone who skips vacancy also charges management on gross rent. Their
  // income line is therefore not just the vacancy added back.
  if (q.vacancyPct > 0) {
    const fixedOpex = q.opex - q.costs.reduce((s, c) => (c.basis === "percent" ? s + percentLine(q.egi, c.percent) : s), 0);
    const pctOnGpr = q.costs.reduce((s, c) => (c.basis === "percent" ? s + percentLine(q.gpr, c.percent) : s), 0);
    out.push({ key: "vacancy-missed", noi: q.gpr - fixedOpex - pctOnGpr });
  }

  const debt = q.decoys.find((x) => x.label.startsWith("Debt"));
  if (debt) out.push({ key: "financing-in-noi", noi: q.noi - debt.amount });

  const dep = q.decoys.find((x) => x.label.startsWith("Depreciation"));
  if (dep) out.push({ key: "depreciation-in-noi", noi: q.noi - dep.amount });

  const roof = q.decoys.find((x) => x.label.startsWith("Roof"));
  if (roof) out.push({ key: "one-off-in-noi", noi: q.noi - roof.amount });

  const monthly = q.costs.find((c) => c.basis === "monthly");
  if (monthly && monthly.basis === "monthly") {
    out.push({ key: "monthly-unannualised", noi: q.noi + monthly.amount * 11 });
  }

  out.push({ key: "gross-capitalised", noi: q.gpr });
  return out;
}

export function wrongWays(q: Deal): Candidate<MistakeKey>[] {
  if (q.kind === "value") {
    const out: Candidate<MistakeKey>[] = noiCandidates(q).map((c) => ({
      key: c.key,
      value: c.noi / (q.capPct / 100),
    }));
    return out;
  }

  if (q.kind === "implied") {
    return noiCandidates(q).map((c) => ({
      key: c.key,
      value: (c.noi / (q.price as number)) * 100,
    }));
  }

  // cap-move: the answer is the value at the new rate.
  const v1 = q.noi / (q.capPct / 100);
  return [
    { key: "ignored-cap-change", value: v1 },
    // Wrong direction: the rate is mirrored below the old one, so the value rises.
    { key: "moved-wrong-way", value: q.noi / ((2 * q.capPct - (q.nextCapPct as number)) / 100) },
    // Midpoint: the value is priced at a rate halfway between the old and new.
    { key: "halved-move", value: q.noi / (((q.capPct + (q.nextCapPct as number)) / 2) / 100) },
    // Overshoot: the change is added a second time, so the rate is too high and
    // the value falls below the answer. This is the one cap-move error that does.
    { key: "overshot-move", value: q.noi / ((2 * (q.nextCapPct as number) - q.capPct) / 100) },
  ];
}

/* -------------------------------------------------------------------------- */
/* The runtime's half                                                         */
/* -------------------------------------------------------------------------- */

export function difficultyForIndex(index: number): number {
  return clampDifficulty(1 + Math.floor(index / 2));
}

export function questionAt(runSeed: string, index: number): CapQuestion {
  return generate(`${runSeed}#${index}`, difficultyForIndex(index));
}

export function validate(question: CapQuestion, chosen: number): boolean {
  return chosen === question.answerIndex;
}

export const ROUND_MS = 60_000;
export const WRONG_PENALTY_MS = 2_000;
export const GUESS_FLOOR_MS = 700;

export function score(question: CapQuestion, msElapsed: number, streak: number): number {
  const base = 100;
  const speed =
    msElapsed < GUESS_FLOOR_MS ? 0 : Math.max(0, Math.min(1, (16_000 - msElapsed) / 11_000));
  const multiplier = Math.min(2, 1 + streak * 0.05);
  const difficultyBonus = 1 + (question.difficulty - 1) * 0.05;
  return Math.round((base + speed * 100) * multiplier * difficultyBonus);
}

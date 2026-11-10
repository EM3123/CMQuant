// BREAKEVEN - how many units a month before the business stops losing money.
//
// THE ARITHMETIC IS INTEGER, ON PURPOSE. Everything is kept in mills (thousandths
// of a dollar, i.e. tenths of a cent). A 3% card fee on a $5.50 cup is then 165
// mills, exactly, and never a float that rounds differently on two machines.
// Prices are multiples of 50 cents and fee rates are whole percents, which is
// what makes the fee come out whole in mills.
//
// THE QUESTION. Smallest whole number of units at which monthly profit reaches
// the owner's target (zero when there is none): Q = ceil((F + target) / m), where
// F is monthly fixed cost and m is the contribution per unit (price − variable
// cost − card fee). Rounding up is
// stated on screen, because "about 1,500" is not an answer to a break-even
// question.
//
// THE DISTRACTORS are named errors a person actually makes: dividing by price
// instead of margin, forgetting a per-unit cost, counting money already spent,
// annualising wrongly, forgetting the card fee, forgetting a profit target.

import { createRng, randInt, clampDifficulty, type Rng } from "@/lib/rng";
import { buildOptions, type Candidate } from "@/lib/games/choice";

export type MistakeKey =
  | "price-not-margin"
  | "missed-unit-cost"
  | "forgot-fee"
  | "sunk-cost"
  | "weekly-x4"
  | "annual-as-monthly"
  | "forgot-target";

export type FixedLine =
  | { label: string; amount: number; basis: "month" | "week" | "year" };

export type BreakevenQuestion = {
  /** Fixed lines exactly as the business states them, before conversion. */
  fixed: FixedLine[];
  /** Per-unit cost lines, in cents. */
  unitCosts: { label: string; cents: number }[];
  /** Price in cents. */
  priceCents: number;
  /** Card fee as a whole percent of the price, or 0. */
  feePct: number;
  /** Money already spent that does not recur. Shown as a decoy, never counted. */
  sunk: { label: string; amount: number } | null;
  /** Monthly profit the owner wants, or 0. */
  target: number;
  /** The answer: smallest whole number of units with monthly profit ≥ target. */
  exact: number;
  options: number[];
  answerIndex: number;
  diagnoses: (MistakeKey | null)[];
  difficulty: number;
};

export const MISTAKE_LABEL: Record<MistakeKey, string> = {
  "price-not-margin": "Divided by the price, not the margin left after unit costs",
  "missed-unit-cost": "Forgot one of the per-unit costs",
  "forgot-fee": "Left out the card fee on each sale",
  "sunk-cost": "Counted money already spent as if it recurred",
  "weekly-x4": "Turned a weekly cost into a month with four weeks, not 52/12",
  "annual-as-monthly": "Used an annual cost as if it were monthly",
  "forgot-target": "Covered costs but ignored the profit the owner wants",
};

export const MISTAKE_FIX: Record<MistakeKey, string> = {
  "price-not-margin":
    "Only the margin left after each unit's own costs pays towards fixed costs. Dividing by the price counts money you hand straight to a supplier.",
  "missed-unit-cost":
    "List every per-unit cost before you divide. The one you forget is usually the small one, and small ones multiply by thousands of units.",
  "forgot-fee":
    "The card company takes a cut of every sale. It is a per-unit cost like any other, and it belongs in the margin.",
  "sunk-cost":
    "Money already spent does not change what this month has to cover. Only recurring costs count towards break-even.",
  "weekly-x4":
    "A year has 52 weeks, not 48. Monthly equivalent of a weekly cost is weekly × 52 ÷ 12.",
  "annual-as-monthly":
    "An annual cost is spread over twelve months. Divide it by twelve before adding it to the monthly fixed costs.",
  "forgot-target":
    "The question asks for the profit the owner wants. Costs alone give break-even, and the target is added on top of them.",
};

/* -------------------------------------------------------------------------- */
/* Mills                                                                      */
/* -------------------------------------------------------------------------- */

const MILLS_PER_DOLLAR = 1000;

/** Monthly cost in mills, for a line stated on any basis. */
export function monthlyMills(line: FixedLine): number {
  if (line.basis === "month") return line.amount * MILLS_PER_DOLLAR;
  if (line.basis === "year") return (line.amount * MILLS_PER_DOLLAR) / 12;
  // Weekly to monthly is × 52 / 12. Generated weekly amounts are multiples of
  // 12 dollars, so this is whole in mills.
  return (line.amount * MILLS_PER_DOLLAR * 52) / 12;
}

export function fixedMills(fixed: FixedLine[]): number {
  return fixed.reduce((sum, line) => sum + monthlyMills(line), 0);
}

export function marginMills(q: Pick<BreakevenQuestion, "priceCents" | "unitCosts" | "feePct">): number {
  const price = q.priceCents * 10;
  const unit = q.unitCosts.reduce((sum, c) => sum + c.cents * 10, 0);
  const fee = (price * q.feePct) / 100;
  return price - unit - fee;
}

/** The smallest whole q with q × margin ≥ target, by integer division. */
export function unitsFor(requiredMills: number, marginM: number): number {
  return Math.ceil(requiredMills / marginM);
}

/* -------------------------------------------------------------------------- */
/* Difficulty and kinds                                                       */
/* -------------------------------------------------------------------------- */

function flagsFor(d: number) {
  return {
    twoFixed: d >= 2,
    sunk: d >= 3,
    fee: d >= 4,
    weekly: d >= 5,
    annual: d >= 6,
    target: d >= 8,
  };
}

const MAX_ATTEMPTS = 300;

export function generate(seed: string, difficulty: number): BreakevenQuestion {
  const d = clampDifficulty(difficulty);
  const rng = createRng(`breakeven:${seed}:${d}`);
  const flags = flagsFor(d);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const q = dealQuestion(rng, d, flags);
    if (!q) continue;

    // Near-miss spacing is drawn per question, for the same reason as Cap Rate.
    const spread = 0.02 + rng() * 0.05;
    const built = buildOptions<MistakeKey>(
      rng,
      q.exact,
      wrongWays(q),
      (v) => v.toLocaleString("en-US"),
      (k, dir) => q.exact + dir * Math.max(1, Math.round(q.exact * spread * k))
    );
    if (!built) continue;

    return { ...q, options: built.options, answerIndex: built.answerIndex, diagnoses: built.diagnoses, difficulty: d };
  }

  throw new Error(`breakeven: no valid question for seed ${seed} at difficulty ${d}`);
}

type Deal = Omit<BreakevenQuestion, "options" | "answerIndex" | "diagnoses" | "difficulty">;

function dealQuestion(rng: Rng, d: number, flags: ReturnType<typeof flagsFor>): Deal | null {
  const fixed: FixedLine[] = [
    { label: "Rent", amount: randInt(rng, 8, 40) * 100, basis: "month" },
  ];
  if (flags.twoFixed) {
    fixed.push({ label: "Staff", amount: randInt(rng, 8, 40) * 100, basis: "month" });
  }
  if (flags.weekly) {
    fixed.push({ label: "Delivery van", amount: randInt(rng, 5, 20) * 12, basis: "week" });
  }
  if (flags.annual) {
    fixed.push({ label: "Software licence", amount: randInt(rng, 10, 60) * 12, basis: "year" });
  }

  const priceCents = randInt(rng, 6, 24) * 50; // $3.00 to $12.00 in 50-cent steps
  // Always two per-unit lines. With one, "forgot a unit cost" is the same number as
  // "divided by the price", and difficulty 1 would have no named errors at all.
  const unitCount = 2;
  const unitCosts: { label: string; cents: number }[] = [];
  const unitNames = ["Beans and milk", "Cup and lid", "Packaging"];
  let variable = 0;
  for (let i = 0; i < unitCount; i++) {
    const cents = randInt(rng, 2, 60) * 5;
    unitCosts.push({ label: unitNames[i], cents });
    variable += cents;
  }

  const feePct = flags.fee ? ([2, 3, 5] as const)[randInt(rng, 0, 2)] : 0;
  const q: Deal = {
    fixed,
    unitCosts,
    priceCents,
    feePct,
    sunk: flags.sunk ? { label: "Launch marketing", amount: randInt(rng, 20, 80) * 100 } : null,
    target: flags.target && rng() < 0.5 ? randInt(rng, 10, 40) * 100 : 0,
    exact: 0,
  };

  const m = marginMills({ priceCents, unitCosts, feePct });
  if (m <= 0) return null;
  const required = fixedMills(fixed) + q.target * MILLS_PER_DOLLAR;
  const exact = unitsFor(required, m);
  // Keep answers in a range a person can estimate and a screen can show.
  if (exact < 40 || exact > 5000) return null;
  // The variable costs must not swallow the price, or the margin is a sliver
  // and the answer is a number nobody could reason to.
  if (variable > priceCents * 0.6) return null;

  return { ...q, exact };
}

/** The named errors, each recomputed from the same premises. */
export function wrongWays(q: Deal): Candidate<MistakeKey>[] {
  const out: Candidate<MistakeKey>[] = [];
  const m = marginMills(q);
  const price = q.priceCents * 10;
  const fixed = fixedMills(q.fixed);
  const target = q.target * MILLS_PER_DOLLAR;

  out.push({ value: unitsFor(fixed + target, price), key: "price-not-margin" });

  const largest = q.unitCosts.reduce((a, b) => (b.cents > a.cents ? b : a), q.unitCosts[0]);
  out.push({ value: unitsFor(fixed + target, m + largest.cents * 10), key: "missed-unit-cost" });

  if (q.feePct > 0) {
    const noFee = price - q.unitCosts.reduce((s, c) => s + c.cents * 10, 0);
    out.push({ value: unitsFor(fixed + target, noFee), key: "forgot-fee" });
  }

  if (q.sunk) {
    out.push({ value: unitsFor(fixed + target + q.sunk.amount * MILLS_PER_DOLLAR, m), key: "sunk-cost" });
  }

  const week = q.fixed.find((l) => l.basis === "week");
  if (week) {
    const wrongWeek = week.amount * 4 * MILLS_PER_DOLLAR;
    const others = fixed - monthlyMills(week);
    out.push({ value: unitsFor(others + wrongWeek + target, m), key: "weekly-x4" });
  }

  const year = q.fixed.find((l) => l.basis === "year");
  if (year) {
    const wrongYear = year.amount * MILLS_PER_DOLLAR;
    const others = fixed - monthlyMills(year);
    out.push({ value: unitsFor(others + wrongYear + target, m), key: "annual-as-monthly" });
  }

  if (q.target > 0) {
    out.push({ value: unitsFor(fixed, m), key: "forgot-target" });
  }

  return out;
}

/* -------------------------------------------------------------------------- */
/* The runtime's half                                                         */
/* -------------------------------------------------------------------------- */

export function difficultyForIndex(index: number): number {
  return clampDifficulty(1 + Math.floor(index / 2));
}

export function questionAt(runSeed: string, index: number): BreakevenQuestion {
  return generate(`${runSeed}#${index}`, difficultyForIndex(index));
}

export function validate(question: BreakevenQuestion, chosen: number): boolean {
  return chosen === question.answerIndex;
}

export const ROUND_MS = 60_000;
export const WRONG_PENALTY_MS = 2_000;
export const GUESS_FLOOR_MS = 700;

export function score(question: BreakevenQuestion, msElapsed: number, streak: number): number {
  const base = 100;
  const speed =
    msElapsed < GUESS_FLOOR_MS ? 0 : Math.max(0, Math.min(1, (14_000 - msElapsed) / 9_000));
  const multiplier = Math.min(2, 1 + streak * 0.05);
  const difficultyBonus = 1 + (question.difficulty - 1) * 0.05;
  return Math.round((base + speed * 100) * multiplier * difficultyBonus);
}


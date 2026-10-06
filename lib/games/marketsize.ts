// MARKET SIZE - the chain, not the trivia.
//
// WHAT THIS DELIBERATELY DOES NOT DO
//
// The obvious version of this game asks "estimate the annual US market for
// municipal waste management" and grades you against $60-120B. That number
// cannot be computed here and it cannot be checked by the person reading it,
// so shipping it would mean the site telling a player they are wrong on the
// authority of a figure nobody in this repo can defend. It is the same
// failure Poker Minute refuses when it declines to print solver outputs.
//
// So every premise is stated on screen and the answer is the product of those
// premises, exactly. "A city of 300,000. Four in ten commute. Six per cent of
// them would use a bike share. Each rides 180 times a year." That is a claim
// a player can check on the screen in front of them, and chaining it under a
// clock is the skill a case interview is actually testing - nobody is asked
// to recall the waste market, they are asked to decompose it and not lose a
// factor of ten on the way.
//
// THE DISTRACTORS ARE THE FIVE WAYS THE CHAIN BREAKS
//
//   - a factor dropped out of the middle of it;
//   - a monthly or weekly figure never annualised;
//   - gross marketplace value handed over as if it were revenue, because the
//     take rate was forgotten;
//   - the whole population used where only a share of it qualifies;
//   - the right digits at the wrong order of magnitude.
//
// Every one of those is a real answer a real candidate gives, and the results
// screen names which one you did.

import { createRng, randInt, pick, ramp, clampDifficulty, type Rng } from "@/lib/rng";

export type MistakeKey =
  | "dropped-factor"
  | "not-annualised"
  | "gross-not-net"
  | "whole-population"
  | "off-by-ten";

/** One line of the decomposition, as it reads on screen. */
export type Factor = {
  label: string;
  value: number;
  /** How the value is written: a count, a share, a price, a frequency. */
  kind: "count" | "share" | "money" | "rate";
  /**
   * What forgetting this line produces. The annualiser, the take rate and the
   * qualifying share each have a name; a plain count does not.
   */
  role?: Extract<MistakeKey, "not-annualised" | "gross-not-net" | "whole-population">;
};

export type MarketSizeQuestion = {
  /** One sentence of setup. Everything needed is in the factors below it. */
  scenario: string;
  /** What the product of the factors is a quantity OF. */
  unit: "money" | "rides" | "meals" | "jobs";
  /** What the question asks for, e.g. "Annual platform revenue". */
  asks: string;
  factors: Factor[];
  /** The product. Exact. */
  exact: number;
  options: number[];
  answerIndex: number;
  /** Aligned with options. Null where the option is only a near miss. */
  diagnoses: (MistakeKey | null)[];
  difficulty: number;
};

export const MISTAKE_LABEL: Record<MistakeKey, string> = {
  "dropped-factor": "Lost a line out of the middle of the chain",
  "not-annualised": "Left it per month or per week instead of per year",
  "gross-not-net": "Gave the gross value, not what the business keeps",
  "whole-population": "Sized it on everybody, not the qualifying share",
  "off-by-ten": "Right digits, wrong order of magnitude",
};

export const MISTAKE_FIX: Record<MistakeKey, string> = {
  "dropped-factor":
    "Say the chain out loud with its units before you multiply: people, times share, times trips per person per year, equals trips per year. A dropped line shows up as units that do not cancel.",
  "not-annualised":
    "The question asked for a year. A weekly or monthly figure has to be multiplied up, and that factor is the easiest one in the chain to leave out because it feels like bookkeeping.",
  "gross-not-net":
    "Gross marketplace value is what changes hands. Revenue is what the business keeps, which is gross times the take rate or the fee. Interviewers ask which one you just gave them.",
  "whole-population":
    "Only part of the population qualifies, and that share is a line in the chain like any other. Sizing on everybody is how an answer ends up ten times too big.",
  "off-by-ten":
    "The digits were right, so the decomposition was right - this is arithmetic. Count the zeros in groups of three and carry the magnitude separately from the mantissa.",
};

/* -------------------------------------------------------------------------- */
/* Formatting. Two options must never round to the same label.                */
/* -------------------------------------------------------------------------- */

export function formatValue(value: number, unit: MarketSizeQuestion["unit"]): string {
  const money = unit === "money";
  const abs = Math.abs(value);
  const [scaled, suffix] =
    abs >= 1e9 ? [value / 1e9, "B"] : abs >= 1e6 ? [value / 1e6, "M"] : abs >= 1e3 ? [value / 1e3, "K"] : [value, ""];
  // Two significant-ish figures is how anybody says these out loud, and it is
  // also the resolution the options have to stay apart at.
  const digits = Math.abs(scaled) >= 100 ? 0 : Math.abs(scaled) >= 10 ? 1 : 2;
  const body = scaled.toFixed(digits).replace(/\.?0+$/, "");
  return money ? `$${body}${suffix}` : `${body}${suffix}`;
}

export const UNIT_NOUN: Record<MarketSizeQuestion["unit"], string> = {
  money: "per year",
  rides: "rides per year",
  meals: "meals per year",
  jobs: "jobs per year",
};

/* -------------------------------------------------------------------------- */
/* Scenarios                                                                  */
/* -------------------------------------------------------------------------- */

type Template = {
  key: string;
  /** Lowest difficulty this template may appear at. */
  from: number;
  unit: MarketSizeQuestion["unit"];
  build(rng: Rng): { scenario: string; asks: string; factors: Factor[] };
};

const thousands = (n: number) => n.toLocaleString("en-US");
const pct = (share: number) => `${Math.round(share * 1000) / 10}%`;

const TEMPLATES: Template[] = [
  {
    key: "bike-share",
    from: 1,
    unit: "rides",
    build: (rng) => {
      const people = randInt(rng, 120, 900) * 1_000;
      const commuters = randInt(rng, 25, 55) / 100;
      const adopt = randInt(rng, 2, 9) / 100;
      const trips = randInt(rng, 60, 240);
      return {
        scenario: `A city of ${thousands(people)} people is costing a bike-share scheme.`,
        asks: "Rides a year",
        factors: [
          { label: "People in the city", value: people, kind: "count" },
          {
            label: `Commute daily (${pct(commuters)})`,
            value: commuters,
            kind: "share",
            role: "whole-population",
          },
          { label: `Of those, would use it (${pct(adopt)})`, value: adopt, kind: "share" },
          { label: "Rides per user per year", value: trips, kind: "rate" },
        ],
      };
    },
  },
  {
    key: "campus-dining",
    from: 1,
    unit: "money",
    build: (rng) => {
      const students = randInt(rng, 4, 40) * 1_000;
      const onPlan = randInt(rng, 30, 70) / 100;
      const meals = randInt(rng, 7, 18);
      const weeks = pick(rng, [30, 32, 34] as const);
      const price = randInt(rng, 8, 16);
      return {
        scenario: `A university with ${thousands(students)} students is pricing its dining contract.`,
        asks: "Annual dining revenue",
        factors: [
          { label: "Students", value: students, kind: "count" },
          {
            label: `On a meal plan (${pct(onPlan)})`,
            value: onPlan,
            kind: "share",
            role: "whole-population",
          },
          { label: "Meals per week", value: meals, kind: "rate" },
          {
            label: "Academic weeks per year",
            value: weeks,
            kind: "rate",
            role: "not-annualised",
          },
          { label: "Price per meal", value: price, kind: "money" },
        ],
      };
    },
  },
  {
    key: "waste-contract",
    from: 3,
    unit: "money",
    build: (rng) => {
      const households = randInt(rng, 40, 400) * 1_000;
      const served = randInt(rng, 55, 95) / 100;
      const monthly = randInt(rng, 18, 46);
      return {
        scenario: `A waste hauler is bidding for a county of ${thousands(households)} households.`,
        asks: "Annual contract value",
        factors: [
          { label: "Households", value: households, kind: "count" },
          {
            label: `Served by the contract (${pct(served)})`,
            value: served,
            kind: "share",
            role: "whole-population",
          },
          { label: "Monthly fee", value: monthly, kind: "money" },
          { label: "Months per year", value: 12, kind: "rate", role: "not-annualised" },
        ],
      };
    },
  },
  {
    key: "student-jobs",
    from: 4,
    unit: "money",
    build: (rng) => {
      const students = randInt(rng, 50, 600) * 1_000;
      const working = randInt(rng, 15, 45) / 100;
      const jobs = randInt(rng, 2, 6);
      const earn = randInt(rng, 200, 1_400);
      const take = randInt(rng, 5, 20) / 100;
      return {
        scenario: `A marketplace connects ${thousands(students)} students with local shift work.`,
        asks: "Annual platform revenue",
        factors: [
          { label: "Students in the market", value: students, kind: "count" },
          {
            label: `Work during term (${pct(working)})`,
            value: working,
            kind: "share",
            role: "whole-population",
          },
          { label: "Jobs per working student per year", value: jobs, kind: "rate" },
          { label: "Earnings per job", value: earn, kind: "money" },
          {
            label: `Platform take rate (${pct(take)})`,
            value: take,
            kind: "share",
            role: "gross-not-net",
          },
        ],
      };
    },
  },
  {
    key: "student-housing",
    from: 4,
    unit: "money",
    build: (rng) => {
      const beds = randInt(rng, 20, 300) * 1_000;
      const managed = randInt(rng, 20, 60) / 100;
      const rent = randInt(rng, 600, 1_600);
      const fee = randInt(rng, 3, 9) / 100;
      return {
        scenario: `A property manager is sizing the student-housing beds it could run.`,
        asks: "Annual management revenue",
        factors: [
          { label: "Student beds in the market", value: beds, kind: "count" },
          {
            label: `Professionally managed (${pct(managed)})`,
            value: managed,
            kind: "share",
            role: "whole-population",
          },
          { label: "Monthly rent", value: rent, kind: "money" },
          { label: "Months per year", value: 12, kind: "rate", role: "not-annualised" },
          {
            label: `Management fee (${pct(fee)})`,
            value: fee,
            kind: "share",
            role: "gross-not-net",
          },
        ],
      };
    },
  },
];

/* -------------------------------------------------------------------------- */
/* Difficulty                                                                 */
/* -------------------------------------------------------------------------- */

/** Chains get longer, and the templates with a take rate unlock later. */
function templatesFor(d: number): Template[] {
  return TEMPLATES.filter((t) => t.from <= Math.max(1, Math.round(ramp(d, 1, 6))));
}

/** How far a near-miss sits from the answer when one is needed to fill out
 *  four options. Wide early, tight late. */
function missRatio(d: number): number {
  return ramp(d, 2.2, 1.35);
}

const MAX_ATTEMPTS = 60;

/* -------------------------------------------------------------------------- */
/* Generation                                                                 */
/* -------------------------------------------------------------------------- */

const product = (xs: number[]) => xs.reduce((a, b) => a * b, 1);

type Candidate = { value: number; key: MistakeKey };

/** The answer, and the chain broken in each of the ways it gets broken. */
function wrongWays(rng: Rng, factors: Factor[], exact: number): Candidate[] {
  const values = factors.map((f) => f.value);
  const out: Candidate[] = [];

  // Drop one middle line. Not the first - that is the whole-population error
  // and has its own name - and not the last, which is usually a rate and is
  // covered by the named roles.
  const middle = factors.map((_, i) => i).filter((i) => i > 0 && i < factors.length - 1);
  if (middle.length) {
    const drop = pick(rng, middle);
    out.push({
      value: product(values.filter((_, i) => i !== drop)),
      key: factors[drop].role ?? "dropped-factor",
    });
  }

  // The named roles: forget the annualiser, forget the take rate, size it on
  // everybody. Each is simply the product without that line.
  factors.forEach((f, i) => {
    if (!f.role) return;
    out.push({ value: product(values.filter((_, j) => j !== i)), key: f.role });
  });

  // And the magnitude slip, both directions so the answer is not always the
  // smallest or the largest thing on screen.
  out.push({ value: exact * 10, key: "off-by-ten" });
  out.push({ value: exact / 10, key: "off-by-ten" });

  return out;
}

/**
 * Four options whose labels all differ, with the answer at a CHOSEN RANK.
 *
 * Two separate traps here, and the second one is the interesting one.
 *
 * Distinct values are not enough. Everything is rounded to roughly two
 * significant figures for display, so 1,240,000,000 and 1,238,000,000 are
 * different numbers and the same option. Uniqueness is checked on the
 * formatted string.
 *
 * And the option set must not have a shape. Almost every named error here
 * drops a fraction out of the chain - a share, a take rate, a fee - which
 * makes it LARGER than the answer, so filling the list from that pool put
 * the answer second from the bottom nearly every time: measured at largest
 * 1.9% of the time and smallest 7.3%, which makes "pick one of the middle
 * two" a coin flip instead of a one-in-four guess. The slot distribution
 * looked perfectly even while this was true, because shuffling positions
 * says nothing about ordering. So the rank is chosen first, uniformly, and
 * the list is filled to match it.
 */
function buildOptions(
  rng: Rng,
  exact: number,
  wrong: Candidate[],
  unit: MarketSizeQuestion["unit"],
  d: number
): { options: number[]; diagnoses: (MistakeKey | null)[]; answerIndex: number } | null {
  const labels = new Set([formatValue(exact, unit)]);
  const options: number[] = [exact];
  const diagnoses: (MistakeKey | null)[] = [null];

  const add = (value: number, key: MistakeKey | null): boolean => {
    if (!Number.isFinite(value) || value <= 0) return false;
    const label = formatValue(value, unit);
    if (labels.has(label)) return false;
    labels.add(label);
    options.push(value);
    diagnoses.push(key);
    return true;
  };

  const shuffled = [...wrong];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = randInt(rng, 0, i);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const below = shuffled.filter((c) => c.value < exact);
  const above = shuffled.filter((c) => c.value > exact);

  // How many of the three distractors sit under the answer. This IS the
  // answer's rank once everything is sorted.
  const rank = randInt(rng, 0, 3);
  const ratio = missRatio(d);

  const fill = (want: number, pool: Candidate[], direction: -1 | 1): boolean => {
    let placed = 0;
    for (const candidate of pool) {
      if (placed === want) break;
      if (add(candidate.value, candidate.key)) placed++;
    }
    // Near misses in the required direction when the named errors run out
    // on that side, which they usually do below the answer.
    for (let step = 1; placed < want && step <= 6; step++) {
      const value = direction < 0 ? exact / Math.pow(ratio, step) : exact * Math.pow(ratio, step);
      if (add(value, null)) placed++;
    }
    return placed === want;
  };

  if (!fill(rank, below, -1)) return null;
  if (!fill(3 - rank, above, 1)) return null;
  if (options.length !== 4) return null;

  // Position is shuffled separately from rank: where the answer sits in the
  // row and where it sits in the ordering are two different tells.
  for (let i = 3; i > 0; i--) {
    const j = randInt(rng, 0, i);
    [options[i], options[j]] = [options[j], options[i]];
    [diagnoses[i], diagnoses[j]] = [diagnoses[j], diagnoses[i]];
  }

  const answerIndex = options.indexOf(exact);
  if (answerIndex < 0) return null;
  return { options, diagnoses, answerIndex };
}
export function generate(seed: string, difficulty: number): MarketSizeQuestion {
  const d = clampDifficulty(difficulty);
  const rng = createRng(`marketsize:${seed}:${d}`);
  const available = templatesFor(d);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const template = pick(rng, available);
    const { scenario, asks, factors } = template.build(rng);
    const exact = product(factors.map((f) => f.value));
    if (!Number.isFinite(exact) || exact <= 0) continue;

    const built = buildOptions(rng, exact, wrongWays(rng, factors, exact), template.unit, d);
    if (!built) continue;

    return {
      scenario,
      unit: template.unit,
      asks,
      factors,
      exact,
      options: built.options,
      answerIndex: built.answerIndex,
      diagnoses: built.diagnoses,
      difficulty: d,
    };
  }

  throw new Error(`marketsize: no valid question for seed ${seed} at difficulty ${d}`);
}

/* -------------------------------------------------------------------------- */
/* The runtime's half                                                         */
/* -------------------------------------------------------------------------- */

export function difficultyForIndex(index: number): number {
  return clampDifficulty(1 + Math.floor(index / 2));
}

export function questionAt(runSeed: string, index: number): MarketSizeQuestion {
  return generate(`${runSeed}#${index}`, difficultyForIndex(index));
}

export function validate(question: MarketSizeQuestion, chosen: number): boolean {
  return chosen === question.answerIndex;
}

export const ROUND_MS = 60_000;
export const WRONG_PENALTY_MS = 2_000;
export const GUESS_FLOOR_MS = 700;

export function score(
  question: MarketSizeQuestion,
  msElapsed: number,
  streak: number
): number {
  const base = 100;
  // A longer chain is worth more, and these take longer to read than a dot
  // plot does, so the speed window is wider than the other games'.
  const speed =
    msElapsed < GUESS_FLOOR_MS ? 0 : Math.max(0, Math.min(1, (11_000 - msElapsed) / 8_000));
  const multiplier = Math.min(2, 1 + streak * 0.05);
  const difficultyBonus = 1 + (question.difficulty - 1) * 0.05;
  return Math.round((base + speed * 100) * multiplier * difficultyBonus);
}

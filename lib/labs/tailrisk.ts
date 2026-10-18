// TAIL RISK - the engine behind "Why does my risk limit miss disasters?" and
// "How heavy is the tail, and how sure am I?".
//
// WHAT THE LAB IS FOR. A risk limit is a forecast of a loss quantile, and a
// forecast is only worth what its backtest says. This file makes the whole
// loop checkable: fit a limit on a calibration window, freeze it, generate
// fresh evaluation days, count the breaches, and judge the count against the
// range a CORRECT limit would have produced. The learner never sees the hidden
// generator while deciding; the reveal happens after they commit.
//
// THE CONVENTIONS, STATED ONCE AND SHOWN ON EVERY CHART.
//   - Losses are positive numbers, in percent of the portfolio, per day.
//   - The forecast horizon is one day. A limit is a 99% one-day VaR.
//   - VaR is a quantile: the loss exceeded on 1% of days. It is not the
//     maximum loss, and a breach says nothing about how large it was.
//   - Expected shortfall is the average loss on the days that do breach.
//
// WHAT IS SYNTHETIC. Every scenario here is an iid process chosen by the lab.
// Nothing is historical. A lab cannot tell you what a real market will do; it
// can tell you whether a method would have been honest about a process you
// specified.

import { createRng, type Rng } from "@/lib/rng";
import {
  normalCdf,
  normalPdf,
  normalQuantile,
  standardNormal,
  studentCdf,
  studentQuantile,
  studentTailMean,
  studentT,
  lgamma,
  pareto,
  lognormal,
} from "@/lib/labs/distributions";

export const CONFIDENCE = 0.99;
export const NOMINAL = 1 - CONFIDENCE;

/** Mean and standard deviation of the calm regime, in % of portfolio per day. */
export const MU = 0.1;
export const SIGMA = 1.0;

export const CAL_DAYS = 250;
export const SMALL_CAL_DAYS = 40;
export const EVAL_DAYS = 1000;

/** Degrees of freedom for the fat-tailed scenario. ν = 3 has finite variance
 *  and no finite fourth moment, which is the point: variance looks normal. */
export const HEAVY_NU = 3;

/** Volatility multiplier after the calibration window in the regime scenario. */
export const REGIME_MULT = 1.8;

export type Kind = "calibrated" | "heavy" | "regime" | "small";
export const KINDS: readonly Kind[] = ["calibrated", "heavy", "regime", "small"];

export const KIND_LABEL: Record<Kind, string> = {
  calibrated: "Stable market",
  heavy: "Fat tails, same variance",
  regime: "Volatility jumps after calibration",
  small: "Only 40 calibration days",
};

export type Cause = "noise" | "heavy" | "regime" | "estimation" | "unclear";
export const CAUSE_LABEL: Record<Cause, string> = {
  unclear: "Cannot tell from this backtest: the evidence points more than one way",
  noise: "Noise: a correct limit can produce this count in 1,000 days",
  heavy: "Misspecification: the true losses have fatter tails than a normal",
  regime: "Changing volatility: the market moved after the limit was fitted",
  estimation: "Estimation: the limit was fitted on too few days to be trusted",
};

export type Verdict = "consistent" | "too-many" | "too-few";

/* -------------------------------------------------------------------------- */
/* Scenarios                                                                  */
/* -------------------------------------------------------------------------- */

export type Scenario = {
  kind: Kind;
  /** Days the limit is fitted on. The learner may look at these. */
  calibration: number[];
  /** Fresh days the frozen limit is judged on. Never used to fit anything. */
  evaluation: number[];
};

/** The scale that gives a t(ν) variable the same variance as the calm normal. */
function heavyScale(): number {
  return SIGMA * Math.sqrt((HEAVY_NU - 2) / HEAVY_NU);
}

function gaussianDraws(rng: Rng, n: number, mu: number, sd: number): number[] {
  return Array.from({ length: n }, () => mu + sd * standardNormal(rng));
}

function heavyDraws(rng: Rng, n: number): number[] {
  const s = heavyScale();
  return Array.from({ length: n }, () => MU + s * studentT(rng, HEAVY_NU));
}

/**
 * Pure and seeded. Calibration and evaluation come from separate streams, so
 * the days the limit was fitted on are never the days it is judged on. The
 * same seed with two kinds shares its underlying draws: the regime scenario's
 * evaluation is the calm scenario's evaluation, scaled. That is deliberate. A
 * comparison between scenarios should change the thing being compared and
 * nothing else.
 */
export function generateScenario(seed: string, kind: Kind): Scenario {
  const cal = createRng(`tailrisk:${seed}:calibration`);
  const evl = createRng(`tailrisk:${seed}:evaluation`);

  if (kind === "calibrated") {
    return {
      kind,
      calibration: gaussianDraws(cal, CAL_DAYS, MU, SIGMA),
      evaluation: gaussianDraws(evl, EVAL_DAYS, MU, SIGMA),
    };
  }
  if (kind === "small") {
    return {
      kind,
      calibration: gaussianDraws(cal, SMALL_CAL_DAYS, MU, SIGMA),
      evaluation: gaussianDraws(evl, EVAL_DAYS, MU, SIGMA),
    };
  }
  if (kind === "heavy") {
    return {
      kind,
      calibration: heavyDraws(cal, CAL_DAYS),
      evaluation: heavyDraws(evl, EVAL_DAYS),
    };
  }
  return {
    kind,
    calibration: gaussianDraws(cal, CAL_DAYS, MU, SIGMA),
    evaluation: gaussianDraws(evl, EVAL_DAYS, MU, SIGMA * REGIME_MULT),
  };
}

/** Which scenario a transfer task uses. Hidden from the learner, but chosen by
 *  the seed, so the same transfer task is the same task for everybody. */
export function transferKind(seed: string): Kind {
  const rng = createRng(`tailrisk-transfer:${seed}`);
  return KINDS[Math.floor(rng() * KINDS.length)];
}

/* -------------------------------------------------------------------------- */
/* The frozen forecast                                                        */
/* -------------------------------------------------------------------------- */

export type Forecast = {
  mean: number;
  sd: number;
  /** The 99% Gaussian VaR: the limit a risk team would actually use. */
  var: number;
  /** The Gaussian expected shortfall beyond that limit. */
  es: number;
};

/** A normal fitted to the calibration window, then frozen. */
export function fitGaussian(calibration: number[], confidence = CONFIDENCE): Forecast {
  const n = calibration.length;
  if (n < 2) throw new RangeError("a fit needs at least two calibration days");
  const mean = calibration.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(calibration.reduce((a, x) => a + (x - mean) ** 2, 0) / (n - 1));
  const z = normalQuantile(confidence);
  return {
    mean,
    sd,
    var: mean + sd * z,
    es: mean + (sd * normalPdf(z)) / (1 - confidence),
  };
}

/* -------------------------------------------------------------------------- */
/* Judging the count                                                          */
/* -------------------------------------------------------------------------- */

export function binomialLogPmf(k: number, n: number, p: number): number {
  return (
    lgamma(n + 1) -
    lgamma(k + 1) -
    lgamma(n - k + 1) +
    k * Math.log(p) +
    (n - k) * Math.log(1 - p)
  );
}

/**
 * The central 95% range of breach counts a CORRECT limit produces over n days.
 * Exact, not a normal approximation: with 1,000 days and a 1% rate the normal
 * approximation is already visibly off in the lower tail.
 */
export function binomialCentralInterval(n: number, p: number, level = 0.95): [number, number] {
  const alpha = (1 - level) / 2;
  let cum = 0;
  let lo = -1;
  let hi = -1;
  for (let k = 0; k <= n; k++) {
    cum += Math.exp(binomialLogPmf(k, n, p));
    if (lo < 0 && cum >= alpha) lo = k;
    if (hi < 0 && cum >= 1 - alpha) {
      hi = k;
      break;
    }
  }
  return [lo, hi];
}

export type Backtest = {
  days: number;
  breaches: number;
  /** Breaches a correct limit makes on average over this many days. */
  expected: number;
  /** The central 95% range a correct limit produces. */
  range: [number, number];
  verdict: Verdict;
  /** Mean loss on the breaching days, or null if there were none. */
  realizedShortfall: number | null;
};

/**
 * Judge a frozen limit on fresh days. "Consistent" means the breach count sits
 * inside the range a correct limit would produce. That is a statement about
 * the COUNT. It says nothing about how large the breaches were, which is why
 * the lab reports realized shortfall next to it.
 */
export function backtest(evaluation: number[], forecast: Forecast, confidence = CONFIDENCE): Backtest {
  const n = evaluation.length;
  const over = evaluation.filter((x) => x > forecast.var);
  const breaches = over.length;
  const range = binomialCentralInterval(n, 1 - confidence);
  const verdict: Verdict =
    breaches < range[0] ? "too-few" : breaches > range[1] ? "too-many" : "consistent";
  return {
    days: n,
    breaches,
    expected: n * (1 - confidence),
    range,
    verdict,
    realizedShortfall: breaches ? over.reduce((a, b) => a + b, 0) / breaches : null,
  };
}

/**
 * What the learner can see, and nothing else.
 *
 * The lab grades an explanation against EVIDENCE, not against the scenario's
 * hidden label. The label is only revealed afterwards. A learner marked wrong
 * for calling a break the visible numbers do not show would be graded on
 * something they were never shown, which the lab forbids itself.
 */
export type Evidence = {
  /** Days the limit was fitted on. */
  calDays: number;
  /** Evaluation sd over calibration sd. A volatility shift shows here. */
  sdRatio: number;
  /** Sample excess kurtosis of the evaluation days. Fat tails show here. */
  excessKurtosis: number;
};

export function evidenceOf(scenario: Scenario, forecast: Forecast): Evidence {
  const evalMean = scenario.evaluation.reduce((a, b) => a + b, 0) / scenario.evaluation.length;
  let m2 = 0;
  let m4 = 0;
  for (const x of scenario.evaluation) {
    const d = x - evalMean;
    m2 += d * d;
    m4 += d * d * d * d;
  }
  const n = scenario.evaluation.length;
  m2 /= n;
  m4 /= n;
  const evalSd = Math.sqrt(m2);
  return {
    calDays: scenario.calibration.length,
    sdRatio: evalSd / forecast.sd,
    excessKurtosis: m4 / (m2 * m2) - 3,
  };
}

/**
 * The explanation the visible evidence supports.
 *
 * Order matters and is deliberate. A short calibration window is checked
 * first, because it makes every other reading unreliable. A passed test is
 * never explained as a break. When the count fails and no visible signature
 * is present, the honest answer is "cannot tell", and the lab says so.
 */
export function explainBacktest(b: Backtest, e: Evidence): Cause {
  if (b.verdict === "consistent") return "noise";
  if (e.calDays < 100) return "estimation";
  if (e.sdRatio >= 1.4) return "regime";
  if (e.excessKurtosis >= 1.5) return "heavy";
  return "unclear";
}

/* -------------------------------------------------------------------------- */
/* What is actually true, for the reveal                                      */
/* -------------------------------------------------------------------------- */

export type Population = {
  /** The true 99% loss quantile of the process the evaluation days came from. */
  quantile: number;
  /** The true expected loss beyond that quantile. */
  shortfall: number;
  /** How often the calibration-window Gaussian limit is breached, in the limit. */
  limitBreachRate: number;
};

/**
 * The properties of each scenario in the limit, not in a sample. These are
 * what the reveal shows next to the backtest, and what the verifier checks
 * against Monte Carlo draws from the same generators.
 */
export function population(kind: Kind, confidence = CONFIDENCE): Population {
  const z = normalQuantile(confidence);
  const p = 1 - confidence;
  const gaussianLimit = MU + SIGMA * z;

  if (kind === "calibrated" || kind === "small") {
    return {
      quantile: gaussianLimit,
      shortfall: MU + (SIGMA * normalPdf(z)) / p,
      limitBreachRate: p,
    };
  }

  if (kind === "regime") {
    const sd = SIGMA * REGIME_MULT;
    return {
      quantile: MU + sd * z,
      shortfall: MU + (sd * normalPdf(z)) / p,
      limitBreachRate: 1 - normalCdf((gaussianLimit - MU) / sd),
    };
  }

  const s = heavyScale();
  const tq = studentQuantile(confidence, HEAVY_NU);
  return {
    quantile: MU + s * tq,
    shortfall: MU + s * studentTailMean(tq, HEAVY_NU),
    limitBreachRate: 1 - studentCdf((gaussianLimit - MU) / s, HEAVY_NU),
  };
}

/* -------------------------------------------------------------------------- */
/* Hill estimator. Positive tail magnitudes in, a tail index out.             */
/* -------------------------------------------------------------------------- */

export type HillFit = {
  k: number;
  n: number;
  /** X_(n−k): the observation the excesses are measured from. */
  threshold: number;
  /** The extreme-value index ξ = 1/α. */
  xi: number;
  /** The Pareto exponent α, for the survival tail P(X > x) ∝ x^(−α). */
  alpha: number;
};

export type HillError = { error: string };

/**
 * Hill's estimator on ascending order statistics X_(1) ≤ … ≤ X_(n):
 *
 *   ξ̂_k = (1/k) Σ_{j=1..k} log( X_(n−j+1) / X_(n−k) )
 *
 * with the explicit distinction between the Pareto exponent α and the extreme-
 * value index ξ = 1/α, which is what this returns as `xi`. Inputs must be
 * positive magnitudes: a signed return inside a logarithm is a silent error,
 * so it is refused here rather than producing NaN.
 */
export function hill(sample: number[], k: number): HillFit | HillError {
  if (sample.length < 3) return { error: "needs at least three observations" };
  if (sample.some((x) => !Number.isFinite(x) || x <= 0)) {
    return { error: "every observation must be a positive, finite tail magnitude" };
  }
  const n = sample.length;
  if (!Number.isInteger(k) || k < 1 || k > n - 1) {
    return { error: `k must be a whole number from 1 to ${n - 1}` };
  }
  return hillFromAscending([...sample].sort((a, b) => a - b), k);
}

function hillFromAscending(ascending: number[], k: number): HillFit {
  const n = ascending.length;
  const threshold = ascending[n - k - 1];
  let sum = 0;
  for (let j = 1; j <= k; j++) sum += Math.log(ascending[n - j] / threshold);
  const xi = sum / k;
  return { k, n, threshold, xi, alpha: 1 / xi };
}

/** The Hill estimate across a range of k: the plot a learner reads, not one number. */
export function hillPlot(sample: number[], kMin: number, kMax: number, step = 10): { k: number; xi: number }[] {
  const ascending = [...sample].sort((a, b) => a - b);
  const out: { k: number; xi: number }[] = [];
  for (let k = kMin; k <= Math.min(kMax, ascending.length - 1); k += step) {
    out.push({ k, xi: hillFromAscending(ascending, k).xi });
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Tail samples for the Hill lab. All synthetic, all positive.                */
/* -------------------------------------------------------------------------- */

export type TailSource = "pareto" | "student" | "lognormal";
export const TAIL_SOURCES: readonly TailSource[] = ["pareto", "student", "lognormal"];
export const TAIL_LABEL: Record<TailSource, string> = {
  pareto: "Exact Pareto, α = 2",
  student: "|Student t|, ν = 3 (power tail, α = 3)",
  lognormal: "Lognormal, σ = 1 (no power tail)",
};

/**
 * The true extreme-value index where one exists. The lognormal has none: its
 * tail is lighter than any power law, so an honest estimate should drift with
 * k rather than settle, and the lab says so instead of pretending otherwise.
 */
export const TRUE_XI: Record<TailSource, number | null> = {
  pareto: 1 / 2,
  student: 1 / 3,
  lognormal: null,
};

export const TAIL_N = 2000;

export function tailSample(seed: string, source: TailSource, n = TAIL_N): number[] {
  const rng = createRng(`tailsample:${seed}:${source}`);
  if (source === "pareto") return Array.from({ length: n }, () => pareto(rng, 2));
  if (source === "student") return Array.from({ length: n }, () => Math.abs(studentT(rng, 3)));
  return Array.from({ length: n }, () => lognormal(rng, 1));
}

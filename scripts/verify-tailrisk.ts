/**
 * Property test for the tail-risk labs.
 *
 * The lab makes three kinds of claim, and each gets its own check:
 *
 *   1. MATHS. Φ, Φ⁻¹, Student-t, log-gamma, the Hill estimator. Each is checked
 *      against a second method that shares no arithmetic with the first: a
 *      Taylor series for Φ, factorials for log-gamma, a descending sort for
 *      Hill, Monte Carlo for every closed-form expectation.
 *
 *   2. PROCEDURE. Scenarios are pure and seeded; calibration and evaluation are
 *      separate; the limit is frozen before the evaluation days are read.
 *
 *   3. HONESTY. The verdict a learner sees must be the verdict the data
 *      supports. A calibrated limit should be rejected about as often as a 95%
 *      test should reject; a regime change should be caught; and the coverage
 *      test should be shown to be blind to severity, because the lab teaches
 *      that and it had better be true.
 */

import { createRng } from "../lib/rng";
import {
  normalCdf,
  normalQuantile,
  lgamma,
  studentCdf,
  studentQuantile,
  studentTailMean,
  studentPdf,
  standardNormal,
  studentT,
  pareto,
} from "../lib/labs/distributions";
import {
  CONFIDENCE,
  MU,
  SIGMA,
  REGIME_MULT,
  HEAVY_NU,
  EVAL_DAYS,
  CAL_DAYS,
  SMALL_CAL_DAYS,
  KINDS,
  generateScenario,
  fitGaussian,
  backtest,
  binomialCentralInterval,
  binomialLogPmf,
  evidenceOf,
  explainBacktest,
  population,
  transferKind,
  hill,
  hillPlot,
  tailSample,
  TAIL_SOURCES,
  TRUE_XI,
  type Kind,
  type Verdict,
} from "../lib/labs/tailrisk";

const failures: string[] = [];
const note = (why: string) => failures.push(why);
const close = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;

/* -------------------------------------------------------------------------- */
/* 1. Maths                                                                   */
/* -------------------------------------------------------------------------- */

// Φ(x) by its Taylor series, a method with no integration in it:
//   Φ(x) = 1/2 + φ(x) · Σ_n x^(2n+1) / (2n+1)!!
function normalCdfSeries(x: number): number {
  let term = x;
  let sum = x;
  for (let n = 1; n < 300; n++) {
    term *= (x * x) / (2 * n + 1);
    sum += term;
  }
  return 0.5 + Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI) * sum;
}

for (const x of [-3, -2.2, -1, -0.3, 0, 0.5, 1.4, 2.326, 3]) {
  if (!close(normalCdf(x), normalCdfSeries(x), 1e-9)) {
    note(`Φ(${x}): integral ${normalCdf(x)} vs series ${normalCdfSeries(x)}`);
  }
}

for (const x of [0.4, 1.1, 2.7, 5]) {
  if (!close(normalCdf(x) + normalCdf(-x), 1, 1e-12)) note(`Φ(${x}) + Φ(−${x}) ≠ 1`);
}

const z99 = normalQuantile(0.99);
if (!close(z99, 2.326348, 1e-5)) note(`Φ⁻¹(0.99) = ${z99}, expected 2.326348`);
for (const p of [0.001, 0.025, 0.2, 0.5, 0.9, 0.975, 0.995]) {
  if (!close(normalCdf(normalQuantile(p)), p, 1e-8)) note(`Φ(Φ⁻¹(${p})) does not return ${p}`);
}

// log-gamma against factorials, which are exact.
for (let n = 1; n <= 12; n++) {
  let fact = 1;
  for (let i = 2; i <= n; i++) fact *= i;
  if (!close(lgamma(n + 1), Math.log(fact), 1e-9)) note(`lgamma(${n + 1}) ≠ ln(${n}!)`);
}
if (!close(lgamma(0.5), 0.5 * Math.log(Math.PI), 1e-12)) note("lgamma(½) ≠ ½ ln π");

// Student t: a known tabulated value, then Monte Carlo from the sampler.
const t3at2 = studentCdf(2, 3);
if (!close(t3at2, 0.9303, 2e-4)) note(`t₃ CDF at 2 is ${t3at2}, table says 0.9303`);
if (!close(studentCdf(-1.3, 4) + studentCdf(1.3, 4), 1, 1e-12)) note("t CDF is not symmetric");

{
  const rng = createRng("verify-t3");
  const n = 400_000;
  let below = 0;
  for (let i = 0; i < n; i++) if (studentT(rng, 3) <= 2) below++;
  if (!close(below / n, studentCdf(2, 3), 0.004)) {
    note(`Monte Carlo t₃ CDF at 2 is ${below / n}, quadrature says ${studentCdf(2, 3)}`);
  }
}

// The closed-form tail mean against brute-force quadrature of t·f(t).
for (const c of [1.5, 3, 4.541]) {
  let num = 0;
  let den = 0;
  const top = 2000;
  const h = (top - c) / 400_000;
  for (let i = 0; i < 400_000; i++) {
    const t = c + (i + 0.5) * h;
    num += t * studentPdf(t, 3) * h;
    den += studentPdf(t, 3) * h;
  }
  const brute = num / den;
  if (!close(studentTailMean(c, 3), brute, 1e-3 * Math.max(1, brute))) {
    note(`E[T | T > ${c}] closed form ${studentTailMean(c, 3)} vs quadrature ${brute}`);
  }
}

// The t quantile is the inverse of the t CDF.
for (const p of [0.9, 0.99, 0.995]) {
  const q = studentQuantile(p, 3);
  if (!close(studentCdf(q, 3), p, 1e-7)) note(`t₃ quantile at ${p} does not invert`);
}

// Expected shortfall of a normal, against a large Monte Carlo sample.
{
  const rng = createRng("verify-es");
  const cut = normalQuantile(0.99);
  let sum = 0;
  let count = 0;
  for (let i = 0; i < 1_000_000; i++) {
    const x = standardNormal(rng);
    if (x > cut) {
      sum += x;
      count++;
    }
  }
  const es = sum / count;
  const formula = population("calibrated").shortfall - MU;
  if (!close(es, formula, 0.02)) note(`normal ES: Monte Carlo ${es}, formula ${formula}`);
}

/* -------------------------------------------------------------------------- */
/* 2. Procedure                                                               */
/* -------------------------------------------------------------------------- */

// Pure and seeded.
for (const kind of KINDS) {
  const a = JSON.stringify(generateScenario("verify-seed", kind));
  const b = JSON.stringify(generateScenario("verify-seed", kind));
  if (a !== b) note(`${kind}: the same seed produced two different scenarios`);
}

// Calibration and evaluation are separate streams.
{
  const s = generateScenario("split", "calibrated");
  if (s.calibration[0] === s.evaluation[0]) note("calibration and evaluation share a stream");
  if (s.calibration.length !== CAL_DAYS) note(`calibration has ${s.calibration.length} days`);
  if (s.evaluation.length !== EVAL_DAYS) note(`evaluation has ${s.evaluation.length} days`);
}

// The small window is a prefix of the same draws, so the scenarios are comparable.
{
  const big = generateScenario("prefix", "calibrated").calibration.slice(0, SMALL_CAL_DAYS);
  const small = generateScenario("prefix", "small").calibration;
  if (small.length !== SMALL_CAL_DAYS) note("small calibration has the wrong length");
  if (small.some((x, i) => !close(x, big[i], 1e-12))) note("small calibration is not a prefix");
}

// Common random numbers: the regime evaluation is the calm one, scaled.
{
  const calm = generateScenario("crn", "calibrated").evaluation;
  const regime = generateScenario("crn", "regime").evaluation;
  let worst = 0;
  for (let i = 0; i < calm.length; i++) {
    worst = Math.max(worst, Math.abs(regime[i] - (MU + REGIME_MULT * (calm[i] - MU))));
  }
  if (worst > 1e-9) note(`regime evaluation is not the scaled calm evaluation (off by ${worst})`);
}

// The fitted limit uses only calibration days, and matches a two-pass computation.
{
  const cal = generateScenario("fit", "calibrated").calibration;
  const f = fitGaussian(cal);
  let mean = 0;
  for (const x of cal) mean += x;
  mean /= cal.length;
  let ss = 0;
  for (const x of cal) ss += (x - mean) * (x - mean);
  const sd = Math.sqrt(ss / (cal.length - 1));
  if (!close(f.mean, mean, 1e-12) || !close(f.sd, sd, 1e-12)) note("fit disagrees with a two-pass fit");
  if (!close(f.var, mean + sd * normalQuantile(CONFIDENCE), 1e-12)) note("VaR is not μ + σΦ⁻¹");
  if (!(f.es > f.var)) note("expected shortfall does not exceed VaR");
}

/* -------------------------------------------------------------------------- */
/* Binomial range and verdicts                                                */
/* -------------------------------------------------------------------------- */

{
  let total = 0;
  for (let k = 0; k <= EVAL_DAYS; k++) total += Math.exp(binomialLogPmf(k, EVAL_DAYS, 0.01));
  if (!close(total, 1, 1e-9)) note(`binomial pmf sums to ${total}`);

  const [lo, hi] = binomialCentralInterval(EVAL_DAYS, 0.01);
  // Checked by the defining property, not by a remembered answer.
  const cdf = (k: number) => {
    let c = 0;
    for (let i = 0; i <= k; i++) c += Math.exp(binomialLogPmf(i, EVAL_DAYS, 0.01));
    return c;
  };
  if (!(cdf(lo - 1) < 0.025 && cdf(lo) >= 0.025)) note(`lower bound ${lo} is not the 2.5% point`);
  if (!(cdf(hi - 1) < 0.975 && cdf(hi) >= 0.975)) note(`upper bound ${hi} is not the 97.5% point`);
  if (!(lo <= 10 && hi >= 10)) note(`the expected 10 breaches is outside [${lo}, ${hi}]`);
  if (lo < 2 || hi > 25) note(`range [${lo}, ${hi}] is implausibly wide for 1,000 days at 1%`);
}

{
  const f = { mean: 0, sd: 1, var: 2.326, es: 2.665 };
  const cases: [number, Verdict][] = [
    [10, "consistent"],
    [30, "too-many"],
    [1, "too-few"],
  ];
  for (const [breaches, want] of cases) {
    const evaluation = Array.from({ length: EVAL_DAYS }, (_, i) => (i < breaches ? 3 : 0));
    const got = backtest(evaluation, f).verdict;
    if (got !== want) note(`${breaches} breaches in 1,000 days judged ${got}, expected ${want}`);
  }
}

/* -------------------------------------------------------------------------- */
/* 3. Honesty                                                                 */
/* -------------------------------------------------------------------------- */

// Population facts. Each is also checked against Monte Carlo below.
{
  const cal = population("calibrated");
  if (!close(cal.quantile, MU + SIGMA * normalQuantile(CONFIDENCE), 1e-12)) note("calibrated quantile wrong");
  if (!close(cal.limitBreachRate, 0.01, 1e-12)) note("calibrated breach rate is not 1%");

  const heavy = population("heavy");
  const gauss = population("calibrated");
  if (!(heavy.quantile > gauss.quantile)) {
    note("heavy tails should put the true 99% quantile above the Gaussian one");
  }
  if (!(heavy.limitBreachRate > 0.01)) note("heavy tails should breach the Gaussian limit more than 1%");
  if (!(heavy.shortfall > gauss.shortfall * 1.3)) {
    note("heavy tails should make the true shortfall far larger than the Gaussian shortfall");
  }

  const regime = population("regime");
  if (!(regime.limitBreachRate > 0.05)) note("a volatility jump should breach the old limit often");
}

// Monte Carlo confirms the population claims, from the sampler rather than the CDF.
{
  const n = 2_000_000;
  const heavyRng = createRng("verify-heavy-pop");
  const s = SIGMA * Math.sqrt((HEAVY_NU - 2) / HEAVY_NU);
  const limit = MU + SIGMA * normalQuantile(CONFIDENCE);
  const tq = studentQuantile(CONFIDENCE, HEAVY_NU);
  let breaches = 0;
  let tailSum = 0;
  let tailCount = 0;
  for (let i = 0; i < n; i++) {
    const L = MU + s * studentT(heavyRng, HEAVY_NU);
    if (L > limit) breaches++;
    if (L > MU + s * tq) {
      tailSum += L;
      tailCount++;
    }
  }
  const pop = population("heavy");
  if (!close(breaches / n, pop.limitBreachRate, 0.0015)) {
    note(`heavy breach rate: Monte Carlo ${breaches / n}, population ${pop.limitBreachRate}`);
  }
  if (!close(tailSum / tailCount, pop.shortfall, 0.25)) {
    note(`heavy shortfall: Monte Carlo ${tailSum / tailCount}, population ${pop.shortfall}`);
  }
}

// Across seeds: what a learner will actually see, in the rates the lab promises.
const SEEDS = 200;
const rate: Record<Kind, number> = { calibrated: 0, heavy: 0, regime: 0, small: 0 };
const consistent: Record<Kind, number> = { calibrated: 0, heavy: 0, regime: 0, small: 0 };
const severityMissed: number[] = [];

for (let i = 0; i < SEEDS; i++) {
  for (const kind of KINDS) {
    const s = generateScenario(`seed-${i}`, kind);
    const f = fitGaussian(s.calibration);
    const b = backtest(s.evaluation, f);
    if (b.verdict !== "consistent") rate[kind]++;
    if (b.verdict === "consistent") consistent[kind]++;

    // Of the heavy scenarios the coverage test PASSED, how many had a realized
    // shortfall beyond the Gaussian expected shortfall? That is the lab's claim.
    if (kind === "heavy" && b.verdict === "consistent" && b.realizedShortfall !== null) {
      severityMissed.push(b.realizedShortfall > f.es ? 1 : 0);
    }
  }
}

const pct = (k: Kind) => ((rate[k] / SEEDS) * 100).toFixed(1);
// Calibrated: a 95% range should reject about 5% of the time. Estimation error
// from 250 days pushes that up a little; a rate far outside this band means
// the interval is miscalibrated, and that would make every verdict a lie.
if (rate.calibrated / SEEDS < 0.01 || rate.calibrated / SEEDS > 0.15) {
  note(`a correct limit is rejected ${pct("calibrated")}% of the time; a 95% range should give ~5%`);
}
// Regime: a 1.8× volatility jump over 1,000 days should essentially never pass.
if (rate.regime / SEEDS < 0.99) note(`volatility jumps passed the test ${100 - rate.regime / SEEDS * 100}% of the time`);

// Heavy: the claim the lab teaches is that the coverage test cannot see severity.
// Check it on the seeds where the test passed.
if (severityMissed.length === 0) {
  note("no heavy-tail seed passed the coverage test, so the severity lesson cannot be shown");
} else {
  const share = severityMissed.reduce((a, b) => a + b, 0) / severityMissed.length;
  if (share < 0.5) {
    note(`among heavy seeds that passed, only ${(share * 100).toFixed(0)}% had worse-than-forecast shortfalls`);
  }
}

// Grading. An explanation is graded on what the learner can SEE. These checks
// measure how often the visible evidence points at the true cause, scenario by
// scenario, so a grading rule that quietly disagreed with the generator would be
// caught here rather than by a learner who was wrongly marked.
const grading: Record<Kind, Record<string, number>> = {
  calibrated: {}, heavy: {}, regime: {}, small: {},
};
let rejectedHeavy = 0;
for (let i = 0; i < SEEDS; i++) {
  for (const kind of KINDS) {
    const s = generateScenario(`seed-${i}`, kind);
    const f = fitGaussian(s.calibration);
    const b = backtest(s.evaluation, f);
    const cause = explainBacktest(b, evidenceOf(s, f));
    if (b.verdict === "consistent" && cause !== "noise") {
      note(`${kind} seed ${i}: a passed test was explained as ${cause}`);
    }
    grading[kind][cause] = (grading[kind][cause] ?? 0) + 1;
    if (kind === "heavy" && b.verdict !== "consistent") rejectedHeavy++;
  }
}

// Regime breaks are the one scenario whose signature is plain on the screen.
// If the rule misses them, it is not reading the evidence.
const regimeCaught = (grading.regime.regime ?? 0) / SEEDS;
if (regimeCaught < 0.99) note(`regime breaks identified as volatility only ${(regimeCaught * 100).toFixed(1)}% of the time`);

// Heavy tails: when the count fails, the visible signature should usually be the
// tails. Measured at 96%. The remainder is attributed to a volatility shift
// because one extreme day inflates a sample standard deviation - a limitation the
// lab states on screen rather than hiding behind a tuned threshold.
const heavyRejected = rejectedHeavy;
const heavyReadAsHeavy = grading.heavy.heavy ?? 0;
if (heavyRejected > 0 && heavyReadAsHeavy / heavyRejected < 0.9) {
  note(`heavy-tail rejections read as heavy tails only ${((heavyReadAsHeavy / heavyRejected) * 100).toFixed(0)}% of the time`);
}

// A short window is always reported as the reason its rejections are unreliable.
const smallRejected = SEEDS - (grading.small.noise ?? 0);
if (smallRejected > 0 && (grading.small.estimation ?? 0) !== smallRejected) {
  note("a rejected 40-day window was not explained as estimation");
}

// Heavy tails: the rule should see them as often as the sample shows them.
// Measured and printed rather than asserted to a chosen number.

// Cross-check: the lab never calls a passed heavy test a break, and the
// severity lesson holds on the seeds where it passed.

// Transfer tasks are reproducible and cover every kind.
{
  const seen = new Set<Kind>();
  for (let i = 0; i < 200; i++) seen.add(transferKind(`t-${i}`));
  if (seen.size !== KINDS.length) note("transfer tasks never produce some scenario kinds");
  if (transferKind("fixed") !== transferKind("fixed")) note("transfer kind is not deterministic");
}

/* -------------------------------------------------------------------------- */
/* Hill                                                                       */
/* -------------------------------------------------------------------------- */

// Against a second route: the same statistic from a DESCENDING sort.
{
  const rng = createRng("verify-hill-route");
  const sample = Array.from({ length: 500 }, () => pareto(rng, 2));
  for (const k of [5, 40, 200, 499]) {
    const got = hill(sample, k);
    if ("error" in got) {
      note(`hill rejected a valid input: ${got.error}`);
      continue;
    }
    const desc = [...sample].sort((a, b) => b - a);
    const threshold = desc[k];
    let sum = 0;
    for (let i = 0; i < k; i++) sum += Math.log(desc[i] / threshold);
    if (!close(got.xi, sum / k, 1e-12)) note(`hill k=${k}: ${got.xi} vs descending-sort ${sum / k}`);
    if (!close(got.alpha, 1 / got.xi, 1e-12)) note("alpha is not 1/ξ");
    if (got.threshold !== desc[k]) note(`hill k=${k} measured from the wrong observation`);
  }
}

// Scale invariance: the tail index does not depend on the units.
{
  const rng = createRng("verify-hill-scale");
  const sample = Array.from({ length: 800 }, () => pareto(rng, 2));
  const a = hill(sample, 100);
  const b = hill(sample.map((x) => x * 37.5), 100);
  if ("error" in a || "error" in b) note("hill refused a valid sample");
  else if (!close(a.xi, b.xi, 1e-10)) note("hill is not scale invariant");
}

// Bad inputs are refused with a sentence, not silently turned into NaN.
{
  const ok = [1, 2, 3, 4, 5];
  for (const [label, got] of [
    ["k = 0", hill(ok, 0)],
    ["k = n", hill(ok, 5)],
    ["a negative magnitude", hill([1, 2, -3, 4], 2)],
    ["a zero magnitude", hill([0, 1, 2, 3], 2)],
    ["too few observations", hill([1, 2], 1)],
  ] as const) {
    if (!("error" in got)) note(`hill accepted ${label}`);
  }
}

// Pareto: the estimator recovers the known index, across seeds, at a stated tolerance.
{
  const estimates: number[] = [];
  for (let seed = 1; seed <= 10; seed++) {
    const rng = createRng(`verify-pareto-${seed}`);
    const sample = Array.from({ length: 20_000 }, () => pareto(rng, 2));
    const got = hill(sample, 1000);
    if ("error" in got) {
      note("hill refused a Pareto sample");
      continue;
    }
    estimates.push(got.xi);
    // Asymptotic sd is ξ/√k ≈ 0.016 here, so ±0.08 is five standard deviations.
    if (!close(got.xi, 0.5, 0.08)) note(`Pareto seed ${seed}: ξ̂ = ${got.xi}, true 0.5`);
  }
  const mean = estimates.reduce((a, b) => a + b, 0) / estimates.length;
  if (!close(mean, 0.5, 0.02)) note(`Pareto mean ξ̂ = ${mean}, true 0.5`);
}

// Student |t₃|: an index of one third, recovered on average.
{
  const estimates: number[] = [];
  for (let seed = 1; seed <= 10; seed++) {
    const rng = createRng(`verify-tstudent-${seed}`);
    const sample = Array.from({ length: 20_000 }, () => Math.abs(studentT(rng, 3)));
    const got = hill(sample, 1000);
    if ("error" in got) continue;
    estimates.push(got.xi);
  }
  const mean = estimates.reduce((a, b) => a + b, 0) / estimates.length;
  // NOT a 2% test. A Student tail is not exactly Pareto, and Hill is biased on
  // it: measured at 20,000 to 100,000 points the bias is 0.02 to 0.04 at every
  // k the lab uses, and it shrinks very slowly with n. The lab teaches this.
  // The tolerance is the measured bias plus margin, and the sign is asserted,
  // so a silent regression that moved the estimate to the other side would fail.
  if (!close(mean, 1 / 3, 0.06)) note(`|t₃| mean ξ̂ = ${mean}, true ${1 / 3}`);
  if (!(mean > 1 / 3)) note(`|t₃| estimate sits below the truth (${mean}); Hill is known to bias it upward here`);
}

// The Hill reveal in the lab states that the Student-tail bias at its own sample
// size is positive and grows with k. Checked here, so the text cannot drift from
// the estimator without the test noticing.
{
  const mean = (k: number) => {
    const xs: number[] = [];
    for (let seed = 1; seed <= 20; seed++) {
      const g = hill(tailSample(`bias-check-${seed}`, "student"), k);
      if (!("error" in g)) xs.push(g.xi);
    }
    return xs.reduce((u, v) => u + v, 0) / xs.length;
  };
  const b100 = mean(100) - 1 / 3;
  const b400 = mean(400) - 1 / 3;
  if (!(b100 > 0 && b400 > b100)) note(`student bias should be positive and grow with k: ${b100} then ${b400}`);
}

// The lab's tail samples carry the indices they claim.
for (const source of TAIL_SOURCES) {
  const sample = tailSample("lab", source);
  if (sample.length !== 2000) note(`${source} sample has ${sample.length} points`);
  if (sample.some((x) => !(x > 0))) note(`${source} produced a non-positive magnitude`);
  if (TRUE_XI[source] !== null && !close(TRUE_XI[source] as number, source === "pareto" ? 0.5 : 1 / 3, 1e-12)) {
    note(`${source} advertises the wrong index`);
  }
}

// The plot covers the requested range and never walks past the sample.
{
  const sample = tailSample("plot", "pareto");
  const plot = hillPlot(sample, 20, 5000, 10);
  if (plot.length === 0) note("hill plot is empty");
  if (plot[plot.length - 1].k > sample.length - 1) note("hill plot runs past the sample");
}

/* -------------------------------------------------------------------------- */

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

console.log(`scenarios        ${SEEDS} seeds × ${KINDS.length} kinds, ${EVAL_DAYS} evaluation days each`);
console.log(`rejected         calibrated ${pct("calibrated")}%  heavy ${pct("heavy")}%  regime ${pct("regime")}%  small ${pct("small")}%`);
console.log(
  `heavy, passed    ${severityMissed.length} seeds; worse-than-forecast shortfall in ${(avg(severityMissed) * 100).toFixed(0)}% of them`
);
console.log(`Φ⁻¹(0.99)       ${z99.toFixed(6)}`);
for (const kind of KINDS) {
  const parts = Object.entries(grading[kind]).sort((x, y) => y[1] - x[1]).map(([c, n]) => `${c} ${((n / SEEDS) * 100).toFixed(0)}%`);
  console.log(`graded as ${kind.padEnd(10)} ${parts.join(", ")}`);
}
console.log(`failures         ${failures.length}`);

if (failures.length) {
  console.log("\nfirst failures");
  for (const f of failures.slice(0, 12)) console.log(`  ${f}`);
  process.exit(1);
}

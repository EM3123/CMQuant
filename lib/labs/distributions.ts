// The probability functions the labs need, written so each can be checked by a
// second route. Nothing here is a black box:
//
//   - the normal CDF integrates the density (scripts/verify-tailrisk checks it
//     against a Taylor series, which is a different method);
//   - the quantiles are bisected on those CDFs, not taken from a lookup table;
//   - the Student-t tail mean is the closed form, checked by quadrature;
//   - the samplers are the textbook transforms, checked by moments.
//
// PRECISION. Math.log, Math.exp, Math.cos and Math.pow can differ in the last
// bit between JavaScript engines. Nothing graded in a lab is compared at that
// precision: grades are whole counts or values rounded for display, and the
// verifier's tolerances say so. A lab that depended on the last bit would give
// a different answer on a different browser, which breaks the seed promise.

import type { Rng } from "@/lib/rng";

const SQRT_2PI = Math.sqrt(2 * Math.PI);
const EPS = 1e-12;

export function normalPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / SQRT_2PI;
}

/** Composite Simpson's rule on [a, b] with an even number of intervals. */
function simpson(f: (x: number) => number, a: number, b: number, n: number): number {
  if (b <= a) return 0;
  const h = (b - a) / n;
  let sum = f(a) + f(b);
  for (let i = 1; i < n; i++) sum += (i % 2 ? 4 : 2) * f(a + i * h);
  return (sum * h) / 3;
}

/** Φ(x), by integrating the density out from zero. */
export function normalCdf(x: number): number {
  if (x >= 0) return 0.5 + simpson(normalPdf, 0, Math.min(x, 12), 2000);
  return 0.5 - simpson(normalPdf, 0, Math.min(-x, 12), 2000);
}

/** Bisection on normalCdf. Cached, because a lab asks for the same few. */
const quantileMemo = new Map<number, number>();
export function normalQuantile(p: number): number {
  if (!(p > 0 && p < 1)) throw new RangeError(`quantile needs 0 < p < 1, got ${p}`);
  const hit = quantileMemo.get(p);
  if (hit !== undefined) return hit;
  let lo = -12;
  let hi = 12;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (normalCdf(mid) < p) lo = mid;
    else hi = mid;
  }
  const z = (lo + hi) / 2;
  quantileMemo.set(p, z);
  return z;
}

/**
 * log Γ(z) for z > 0.
 *
 * Shift the argument up to at least 15, then use the Stirling series:
 *
 *   ln Γ(w) = (w − ½) ln w − w + ½ ln 2π + 1/(12w) − 1/(360w³) + 1/(1260w⁵) − 1/(1680w⁷)
 *
 * The remainder past the last term is below 1e-13 at w = 15. The shift uses
 * ln Γ(z) = ln Γ(z + m) − Σ ln(z + i), which is exact.
 *
 * (A Lanczos table was tried first. Its published coefficients, as recalled,
 * were out by about 1e-8 - far too coarse for the binomial range, and the
 * verifier caught it against ln(n!). Stirling has no table to get wrong.)
 */
export function lgamma(z: number): number {
  if (!(z > 0)) throw new RangeError(`lgamma needs z > 0, got ${z}`);
  let shift = 0;
  let x = z;
  while (x < 15) {
    shift -= Math.log(x);
    x += 1;
  }
  const w = x;
  const w2 = w * w;
  const series =
    1 / (12 * w) - 1 / (360 * w * w2) + 1 / (1260 * w * w2 * w2) - 1 / (1680 * w * w2 * w2 * w2);
  return (w - 0.5) * Math.log(w) - w + 0.5 * Math.log(2 * Math.PI) + series + shift;
}

/* -------------------------------------------------------------------------- */
/* Student t, for integer degrees of freedom ν > 2                            */
/* -------------------------------------------------------------------------- */

function studentLogNormaliser(nu: number): number {
  return lgamma((nu + 1) / 2) - lgamma(nu / 2) - 0.5 * Math.log(nu * Math.PI);
}

export function studentPdf(t: number, nu: number): number {
  return Math.exp(studentLogNormaliser(nu) - ((nu + 1) / 2) * Math.log(1 + (t * t) / nu));
}

export function studentCdf(t: number, nu: number): number {
  const body = simpson((x) => studentPdf(x, nu), 0, Math.min(Math.abs(t), 1e3), 4000);
  return t >= 0 ? 0.5 + body : 0.5 - body;
}

/** The quantile of the t distribution, by bisection on studentCdf. */
export function studentQuantile(p: number, nu: number): number {
  if (!(p > 0 && p < 1)) throw new RangeError(`quantile needs 0 < p < 1, got ${p}`);
  let lo = -60;
  let hi = 60;
  for (let i = 0; i < 120; i++) {
    const mid = (lo + hi) / 2;
    if (studentCdf(mid, nu) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * E[T | T > c] for Student t, in closed form:
 *
 *   ∫_c^∞ t f(t) dt = C_ν · ν/(ν−1) · (1 + c²/ν)^(−(ν−1)/2)
 *
 * This is the expected shortfall beyond a threshold, which is the number a
 * Gaussian model understates when the tails are fat.
 */
export function studentTailMean(c: number, nu: number): number {
  const tail = 1 - studentCdf(c, nu);
  if (tail <= 0) return Number.NaN;
  const numerator =
    Math.exp(studentLogNormaliser(nu)) * (nu / (nu - 1)) * Math.pow(1 + (c * c) / nu, -(nu - 1) / 2);
  return numerator / tail;
}

/* -------------------------------------------------------------------------- */
/* Samplers. Each consumes the rng in a fixed order, which is what makes the  */
/* common-random-numbers property in the lab hold.                            */
/* -------------------------------------------------------------------------- */

/** Box–Muller. Two uniforms in, one standard normal out. */
export function standardNormal(rng: Rng): number {
  const u1 = Math.max(rng(), EPS);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/** Student t with integer ν: a normal over the root of a scaled chi-square. */
export function studentT(rng: Rng, nu: number): number {
  const z = standardNormal(rng);
  let chi = 0;
  for (let i = 0; i < nu; i++) {
    const g = standardNormal(rng);
    chi += g * g;
  }
  return z / Math.sqrt(chi / nu);
}

/** Pareto with scale 1: P(X > x) = x^(−α) for x ≥ 1. */
export function pareto(rng: Rng, alpha: number): number {
  const u = Math.max(rng(), EPS);
  return Math.pow(u, -1 / alpha);
}

export function lognormal(rng: Rng, sigma: number): number {
  return Math.exp(sigma * standardNormal(rng));
}

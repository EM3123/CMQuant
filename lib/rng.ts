// Deterministic PRNG. Everything the player sees in a run must come from here,
// because a run that touches Math.random() cannot be challenged or replayed.

export type Rng = () => number;

// xmur3: string -> 32-bit seed stream.
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

// mulberry32: 32-bit state, uniform in [0, 1).
export function createRng(seed: string): Rng {
  const next = xmur3(seed);
  let a = next();
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randInt(rng: Rng, lo: number, hi: number): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

export function pick<T>(rng: Rng, xs: readonly T[]): T {
  return xs[Math.floor(rng() * xs.length)];
}

// Linear interpolation across the difficulty scale, 1..10.
export function ramp(difficulty: number, at1: number, at10: number): number {
  const t = (clampDifficulty(difficulty) - 1) / 9;
  return at1 + (at10 - at1) * t;
}

export function clampDifficulty(d: number): number {
  return Math.max(1, Math.min(10, Math.round(d)));
}

const ADJECTIVES = [
  "iron", "steel", "amber", "cobalt", "quiet", "sharp", "hollow", "brisk",
  "north", "copper", "slate", "vivid", "narrow", "prime", "dense", "rapid",
] as const;

const NOUNS = [
  "carbide", "lattice", "vector", "ember", "quartz", "signal", "cipher", "harbor",
  "kernel", "matrix", "beacon", "cascade", "tundra", "atrium", "delta", "pivot",
] as const;

// Human-typeable seed: someone should be able to read it off a screenshot.
export function makeSeed(rng: Rng = createRng(String(Date.now() + Math.random()))): string {
  return `${pick(rng, ADJECTIVES)}-${pick(rng, NOUNS)}-${randInt(rng, 1000, 9999)}`;
}

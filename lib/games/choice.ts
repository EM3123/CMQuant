// Building four options for a numeric question, correctly.
//
// Two traps that every generator here has hit, and this file exists so that
// each new game does not hit them again.
//
// RANK, NOT SLOT. Named errors are usually LARGER than the answer, because most
// of them drop a fraction out of the calculation. Filling the list from them
// puts the answer near the bottom every time, and "pick one of the middle two"
// becomes a strategy. So the answer's rank among the four is drawn uniformly
// FIRST, and the list is filled to match it. Position is then shuffled
// separately, because where the answer sits in the row is a different tell.
//
// LABELS, NOT NUMBERS. A player sees the label. Two values that differ as
// numbers but print the same are one option, so uniqueness is checked on the
// formatted string.

import { randInt, type Rng } from "@/lib/rng";

export type Candidate<K extends string> = { value: number; key: K };

export type BuiltOptions<K extends string> = {
  options: number[];
  diagnoses: (K | null)[];
  answerIndex: number;
};

/**
 * Four options with the answer at a uniformly random rank.
 *
 * `near(k, dir)` supplies a fallback near miss, `k` steps away in direction
 * `dir` (-1 below, +1 above). Near misses carry no diagnosis: they are only
 * there when the named errors cannot fill the list, and the verifier measures
 * how often that happens.
 */
export function buildOptions<K extends string>(
  rng: Rng,
  exact: number,
  wrong: Candidate<K>[],
  label: (value: number) => string,
  near: (k: number, dir: -1 | 1) => number
): BuiltOptions<K> | null {
  const seen = new Set<string>([label(exact)]);
  const below: Candidate<K>[] = [];
  const above: Candidate<K>[] = [];

  const shuffled = [...wrong];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = randInt(rng, 0, i);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  for (const c of shuffled) {
    if (!Number.isFinite(c.value) || c.value <= 0) continue;
    const text = label(c.value);
    if (seen.has(text)) continue;
    seen.add(text);
    if (c.value < exact) below.push(c);
    else above.push(c);
  }

  const rank = randInt(rng, 0, 3); // how many of the three wrong options sit below
  const chosen: { value: number; key: K | null }[] = [];
  const takeFrom = (pool: Candidate<K>[], want: number) => {
    for (const c of pool) {
      if (chosen.length >= 3) break;
      if (want <= 0) break;
      chosen.push({ value: c.value, key: c.key });
      want--;
    }
    return want;
  };

  let needBelow = takeFrom(below, rank);
  let needAbove = takeFrom(above, 3 - rank);

  // Fill with near misses in the required direction, label-checked.
  const fill = (dir: -1 | 1, want: number) => {
    for (let k = 1; want > 0 && k <= 12; k++) {
      const value = near(k, dir);
      if (!Number.isFinite(value) || value <= 0) continue;
      const text = label(value);
      if (seen.has(text)) continue;
      seen.add(text);
      chosen.push({ value, key: null });
      want--;
    }
    return want;
  };
  needBelow = fill(-1, needBelow);
  needAbove = fill(1, needAbove);
  // If one side is short, the other side can cover it: the rank is then not
  // the drawn one, which is acceptable only if we report it. Reject instead,
  // so the rank histogram in the verifier stays honest.
  if (needBelow > 0 || needAbove > 0 || chosen.length !== 3) return null;

  const all = [{ value: exact, key: null as K | null }, ...chosen].sort((a, b) => a.value - b.value);
  const options = all.map((o) => o.value);
  const diagnoses = all.map((o) => o.key);

  for (let i = options.length - 1; i > 0; i--) {
    const j = randInt(rng, 0, i);
    [options[i], options[j]] = [options[j], options[i]];
    [diagnoses[i], diagnoses[j]] = [diagnoses[j], diagnoses[i]];
  }

  const answerIndex = options.indexOf(exact);
  if (answerIndex < 0) return null;
  return { options, diagnoses, answerIndex };
}

/**
 * Property test for the post-game analysis.
 *
 * Insights are the one thing on this site that makes a claim ABOUT THE PLAYER
 * rather than about a deck of cards, which makes them the easiest place to say
 * something untrue and the hardest place to notice. "Your wrong answers were
 * 40% faster" is unfalsifiable to the person reading it - they have no way to
 * check, so it has to be right.
 *
 * So this file builds runs whose answer is known by construction - a run that
 * is definitely rushing, a run that is definitely stuck, a run that definitely
 * faded - and requires the right finding to appear and the wrong ones to stay
 * away. Then it throws ten thousand random runs at it and checks the invariants
 * that must hold for any input at all.
 */

import { runInsights, medianSeconds, type Answer, type Insight } from "../lib/insights";
import { createRng, randInt } from "../lib/rng";

type Failure = { where: string; why: string };
const failures: Failure[] = [];

const keysOf = (out: Insight[]) => out.map((i) => i.key);

function run(
  spec: { ok: boolean; ms: number; timedOut?: boolean }[],
  mistakes: Record<string, { label: string; fix: string; count: number }> = {}
): Insight[] {
  const answers: Answer[] = spec.map((s, id) => ({ id, ...s }));
  return runInsights(answers, mistakes);
}

/** A closed window in endless: the whole window elapsed, nothing was chosen. */
const timeout = (ms: number) => ({ ok: false, ms, timedOut: true });

let checks = 0;

function expectKey(label: string, out: Insight[], key: string) {
  checks++;
  if (!keysOf(out).includes(key)) {
    failures.push({ where: label, why: `expected "${key}", got [${keysOf(out).join(", ")}]` });
  }
}

function expectNoKey(label: string, out: Insight[], key: string) {
  checks++;
  if (keysOf(out).includes(key)) {
    failures.push({ where: label, why: `did not expect "${key}"` });
  }
}

/* -------------------------------------------------------------------------- */
/* Runs whose finding is known by construction                                */
/* -------------------------------------------------------------------------- */

// Wrong answers at a third of the time of right ones. Unambiguously rushing.
expectKey(
  "rushing",
  run([
    ...Array.from({ length: 8 }, () => ({ ok: true, ms: 6000 })),
    ...Array.from({ length: 5 }, () => ({ ok: false, ms: 1500 })),
  ]),
  "rushing"
);

// The same run must not also be reported as stuck. These two findings are
// opposites and the advice contradicts.
expectNoKey(
  "rushing is not also stuck",
  run([
    ...Array.from({ length: 8 }, () => ({ ok: true, ms: 6000 })),
    ...Array.from({ length: 5 }, () => ({ ok: false, ms: 1500 })),
  ]),
  "stuck"
);

// Wrong answers taking three times as long. Grinding, not guessing.
expectKey(
  "stuck",
  run([
    ...Array.from({ length: 8 }, () => ({ ok: true, ms: 2000 })),
    ...Array.from({ length: 5 }, () => ({ ok: false, ms: 6000 })),
  ]),
  "stuck"
);

// Even times both ways. Neither finding applies, and inventing one would be
// the exact failure this file exists to prevent.
expectNoKey(
  "even pace is not rushing",
  run([
    ...Array.from({ length: 8 }, () => ({ ok: true, ms: 3000 })),
    ...Array.from({ length: 5 }, () => ({ ok: false, ms: 3000 })),
  ]),
  "rushing"
);
expectNoKey(
  "even pace is not stuck",
  run([
    ...Array.from({ length: 8 }, () => ({ ok: true, ms: 3000 })),
    ...Array.from({ length: 5 }, () => ({ ok: false, ms: 3000 })),
  ]),
  "stuck"
);

// Perfect first half, collapse in the second.
expectKey(
  "faded",
  run([
    ...Array.from({ length: 8 }, () => ({ ok: true, ms: 3000 })),
    ...Array.from({ length: 8 }, (_, i) => ({ ok: i < 2, ms: 3000 })),
  ]),
  "faded"
);

// The reverse: a slow start that comes good.
expectKey(
  "warmed-up",
  run([
    ...Array.from({ length: 8 }, (_, i) => ({ ok: i >= 4, ms: 3000 })),
    ...Array.from({ length: 8 }, () => ({ ok: true, ms: 3000 })),
  ]),
  "warmed-up"
);

// One question eating half the run.
expectKey(
  "one-slow",
  run([
    ...Array.from({ length: 9 }, () => ({ ok: true, ms: 2000 })),
    { ok: false, ms: 20000 },
  ]),
  "one-slow"
);

// A metronome.
expectKey(
  "metronome",
  run(Array.from({ length: 12 }, () => ({ ok: true, ms: 3000 }))),
  "metronome"
);

// Wildly uneven times are not a metronome.
expectNoKey(
  "uneven is not a metronome",
  run(Array.from({ length: 12 }, (_, i) => ({ ok: true, ms: i % 2 ? 900 : 7000 }))),
  "metronome"
);

// REGRESSION. Two thirds of the answers identical and the rest far away. The
// first version measured the median absolute deviation, which is zero here
// because most deviations are zero, and cheerfully called this a metronome.
// Found by playing a run, not by the fuzzer: uniformly random times never
// produce a majority cluster, so nothing random could have caught it.
expectNoKey(
  "a majority cluster with outliers is not a metronome",
  run(Array.from({ length: 15 }, (_, i) => ({ ok: true, ms: i % 3 === 0 ? 250 : 2600 }))),
  "metronome"
);

// And the genuine article still passes: everything inside the band.
expectKey(
  "near-identical times are a metronome",
  run(Array.from({ length: 12 }, (_, i) => ({ ok: true, ms: 3000 + (i % 4) * 150 }))),
  "metronome"
);

// A repeated named mistake outranks everything and leads.
{
  const out = run(
    Array.from({ length: 12 }, (_, i) => ({ ok: i % 3 !== 0, ms: 3000 })),
    { "forgot-call": { label: "Left your own call out of the pot", fix: "Divide by the pot after the call.", count: 4 } }
  );
  expectKey("repeated mistake", out, "mistake:forgot-call");
  if (out[0]?.key !== "mistake:forgot-call") {
    failures.push({ where: "repeated mistake", why: "not shown first" });
  }
}

// Twice is not a pattern.
expectNoKey(
  "twice is not a pattern",
  run(Array.from({ length: 12 }, () => ({ ok: true, ms: 3000 })), {
    "forgot-call": { label: "x", fix: "y", count: 2 },
  }),
  "mistake:forgot-call"
);

// A short run says nothing at all. Five answers cannot support a claim about
// how somebody plays, and a confident sentence built on five is worse than
// silence.
for (let n = 0; n <= 5; n++) {
  const out = run(Array.from({ length: n }, (_, i) => ({ ok: i % 2 === 0, ms: 1000 })));
  if (out.length) {
    failures.push({ where: `run of ${n}`, why: `said something: [${keysOf(out).join(", ")}]` });
  }
}

/* -------------------------------------------------------------------------- */
/* Closed windows are not answers                                             */
/* -------------------------------------------------------------------------- */

/**
 * Endless puts a window on every question and a closed window in the tape. It
 * carries `ms` equal to the entire window, which is the largest value the tape
 * can hold, so anything that reads times without filtering these gets dragged
 * around by them - and the further into a run you are, the more of them there
 * tend to be.
 *
 * The specific lie this prevents: eight steady right answers and five closed
 * windows is a player who stopped playing, and the old code called it grinding
 * through questions it had no method for.
 */
expectNoKey(
  "closed windows are not grinding",
  run([
    ...Array.from({ length: 8 }, () => ({ ok: true, ms: 3000 })),
    ...Array.from({ length: 5 }, () => timeout(12_000)),
  ]),
  "stuck"
);

// And they must not create the opposite reading either.
expectNoKey(
  "closed windows are not rushing",
  run([
    ...Array.from({ length: 8 }, () => ({ ok: true, ms: 3000 })),
    ...Array.from({ length: 5 }, () => timeout(12_000)),
  ]),
  "rushing"
);

// A real pace finding still survives alongside them: the wrong ANSWERS are
// genuinely fast, and the closed windows neither create nor cancel that.
expectKey(
  "real rushing survives closed windows",
  run([
    ...Array.from({ length: 8 }, () => ({ ok: true, ms: 6000 })),
    ...Array.from({ length: 5 }, () => ({ ok: false, ms: 1500 })),
    ...Array.from({ length: 3 }, () => timeout(12_000)),
  ]),
  "rushing"
);

// A steady run is still steady when the windows that closed are set aside.
expectKey(
  "closed windows do not break a metronome",
  run([
    ...Array.from({ length: 12 }, () => ({ ok: true, ms: 3000 })),
    ...Array.from({ length: 3 }, () => timeout(12_000)),
  ]),
  "metronome"
);

// Accuracy findings DO count them - a window you let close is a question you
// did not get right, and pretending otherwise would flatter the run.
expectKey(
  "closed windows count against accuracy",
  run([
    ...Array.from({ length: 8 }, () => ({ ok: true, ms: 3000 })),
    ...Array.from({ length: 8 }, (_, i) => (i < 2 ? { ok: true, ms: 3000 } : timeout(9000))),
  ]),
  "faded"
);

// The sentence, not just the arithmetic. If the biggest slice of the run was a
// window nobody answered, the card must not say the player got it wrong.
{
  checks++;
  const out = run([
    ...Array.from({ length: 9 }, () => ({ ok: true, ms: 2000 })),
    timeout(20_000),
  ]);
  const slow = out.find((i) => i.key === "one-slow");
  if (!slow) {
    failures.push({ where: "timeout is the slowest", why: "one-slow did not appear" });
  } else if (!slow.detail.includes("the window closed on it")) {
    failures.push({ where: "timeout is the slowest", why: `says: ${slow.detail}` });
  } else if (/you got it (right|wrong)/.test(slow.detail)) {
    failures.push({ where: "timeout is the slowest", why: "claims an answer was given" });
  }
}

// The summary figure is per answer, so closed windows cannot move it.
{
  checks++;
  const steady: Answer[] = Array.from({ length: 10 }, (_, id) => ({ id, ok: true, ms: 2000 }));
  const withWindows: Answer[] = [
    ...steady,
    ...Array.from({ length: 6 }, (_, i) => ({ id: 10 + i, ok: false, ms: 12_000, timedOut: true })),
  ];
  if (medianSeconds(steady) !== medianSeconds(withWindows)) {
    failures.push({
      where: "median seconds",
      why: `moved from ${medianSeconds(steady)} to ${medianSeconds(withWindows)}`,
    });
  }
}

// A run that is nothing but closed windows has nothing to say about answering,
// and must not divide by the zero answers it has.
{
  checks++;
  const allWindows = Array.from({ length: 20 }, () => timeout(8000));
  try {
    const out = run(allWindows);
    for (const i of out) {
      if (/NaN|Infinity|undefined/.test(i.headline + i.detail)) {
        failures.push({ where: "all windows", why: `bad number in ${i.key}` });
      }
    }
  } catch (err) {
    failures.push({ where: "all windows", why: `threw: ${(err as Error).message}` });
  }
}

/* -------------------------------------------------------------------------- */
/* Invariants, over random runs                                               */
/* -------------------------------------------------------------------------- */

const rng = createRng("insights-fuzz");
let fuzzed = 0;
const seen = new Set<string>();

for (let n = 0; n < 10_000; n++) {
  const count = randInt(rng, 0, 40);
  const answers: Answer[] = Array.from({ length: count }, (_, id) => {
    // A fifth of entries are closed windows, which is roughly what a bad
    // endless run looks like near the end.
    const out = rng() < 0.2;
    return {
      id,
      ok: out ? false : rng() < 0.6,
      ms: randInt(rng, 120, 25_000),
      ...(out ? { timedOut: true } : {}),
    };
  });

  const mistakes: Record<string, { label: string; fix: string; count: number }> = {};
  if (rng() < 0.4) {
    mistakes["m"] = { label: "A mistake", fix: "A fix.", count: randInt(rng, 1, 8) };
  }

  let out: Insight[];
  try {
    out = runInsights(answers, mistakes);
  } catch (err) {
    failures.push({ where: `fuzz ${n}`, why: `threw: ${(err as Error).message}` });
    continue;
  }
  fuzzed++;
  for (const i of out) seen.add(i.key.startsWith("mistake:") ? "mistake:*" : i.key);

  // Never more than three, or the results screen becomes a report.
  if (out.length > 3) failures.push({ where: `fuzz ${n}`, why: `${out.length} findings` });

  // Keys are unique, or React renders two rows with one key.
  if (new Set(out.map((i) => i.key)).size !== out.length) {
    failures.push({ where: `fuzz ${n}`, why: "duplicate keys" });
  }

  // Contradictory findings must never appear together.
  const ks = keysOf(out);
  if (ks.includes("rushing") && ks.includes("stuck")) {
    failures.push({ where: `fuzz ${n}`, why: "rushing and stuck together" });
  }
  if (ks.includes("faded") && ks.includes("warmed-up")) {
    failures.push({ where: `fuzz ${n}`, why: "faded and warmed-up together" });
  }

  // No finding may be empty, and none may contain a NaN that leaked out of a
  // division. "Your wrong answers were NaN% faster" is the failure mode here.
  for (const i of out) {
    if (!i.headline.trim() || !i.detail.trim()) {
      failures.push({ where: `fuzz ${n}`, why: `empty text in ${i.key}` });
    }
    if (/NaN|Infinity|undefined/.test(i.headline + i.detail)) {
      failures.push({ where: `fuzz ${n}`, why: `bad number in ${i.key}: ${i.headline}` });
    }
  }

  const med = medianSeconds(answers);
  if (!Number.isFinite(med) || med < 0) {
    failures.push({ where: `fuzz ${n}`, why: `median seconds is ${med}` });
  }
}

const EXPECTED = [
  "rushing",
  "stuck",
  "faded",
  "warmed-up",
  "one-slow",
  "metronome",
  "mistake:*",
];
const never = EXPECTED.filter((k) => !seen.has(k));

console.log(`constructed cases ${checks}`);
console.log(`random runs       ${fuzzed.toLocaleString()}`);
console.log(`failures          ${failures.length}`);
console.log(`findings reached  ${[...seen].sort().join(", ")}`);

if (failures.length || never.length) {
  if (never.length) {
    console.log(`\nFINDINGS NEVER PRODUCED BY A RANDOM RUN: ${never.join(", ")}`);
    console.log("A finding no run can reach is dead code that reads as a feature.");
  }
  console.log("\nfirst failures");
  for (const f of failures.slice(0, 12)) console.log(`  ${f.where}: ${f.why}`);
  process.exit(1);
}

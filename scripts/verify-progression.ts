/**
 * Property test for XP, levels, ranks and feeding.
 *
 * Every number here ends up on screen as a claim a player can check - "+87
 * XP", "40/250 to level 5", "fed today" - so each rule is pinned, and the
 * level curve is walked exhaustively rather than sampled.
 */

import {
  XP_RULES,
  FEED_TARGET,
  RANKS,
  applyRun,
  fedDays,
  levelFor,
  moodFor,
  rankFor,
  nextRank,
  totalXp,
  xpForLevel,
  xpForRun,
  xpToNext,
  type Ledger,
} from "../lib/progression";

const failures: string[] = [];
const check = (ok: boolean, message: string) => {
  if (!ok) failures.push(message);
};

/* -------------------------------------------------------------------------- */
/* XP for a run                                                               */
/* -------------------------------------------------------------------------- */

// 1. The first run of a day: finish + correct + first-of-day bonus.
check(xpForRun({ day: "d", correct: 20, daily: false }, undefined).xp === 10 + 20 + 50,
  "first run of the day with 20 correct is not 80");

// 2. A later run pays no first-of-day bonus.
const oneRun = { xp: 80, runs: 1, daily: false };
check(xpForRun({ day: "d", correct: 20, daily: false }, oneRun).xp === 30,
  "second run of the day with 20 correct is not 30");

// 3. The daily bonus is paid once per day, however many daily runs there are.
check(xpForRun({ day: "d", correct: 0, daily: true }, oneRun).xp === 10 + 50,
  "first daily run does not pay the daily bonus");
check(xpForRun({ day: "d", correct: 0, daily: true }, { ...oneRun, daily: true }).xp === 10,
  "a second daily run pays the daily bonus again");

// 4. Correct answers are capped per run.
check(
  xpForRun({ day: "d", correct: 5000, daily: false }, oneRun).xp ===
    XP_RULES.finish + XP_RULES.maxCorrectPaid,
  "correct answers are not capped"
);
check(xpForRun({ day: "d", correct: -4, daily: false }, oneRun).xp === XP_RULES.finish,
  "negative correct counts earn or cost XP");

// 5. The soft cap: runs past the tenth in a day pay half, never zero.
{
  let ledger: Ledger = {};
  const paid: number[] = [];
  for (let i = 0; i < 25; i++) {
    const r = applyRun(ledger, { day: "d", correct: 30, daily: false });
    ledger = r.ledger;
    paid.push(r.gain.xp);
  }
  check(paid[0] === 90, `run 1 paid ${paid[0]}, expected 90`);
  for (let i = 1; i < 10; i++) check(paid[i] === 40, `run ${i + 1} paid ${paid[i]}, expected 40`);
  for (let i = 10; i < 25; i++) check(paid[i] === 20, `run ${i + 1} paid ${paid[i]}, expected 20`);
  check(ledger.d.runs === 25, "the ledger lost runs");
  check(ledger.d.xp === paid.reduce((a, b) => a + b, 0), "the ledger total is not the sum paid");
  // The itemised parts on the results screen always add up to the total.
  const g = xpForRun({ day: "d", correct: 7, daily: true }, undefined);
  check(g.parts.reduce((a, p) => a + p.xp, 0) === g.xp, "itemised XP does not add up");
}

// 6. applyRun never mutates what it was given.
{
  const before: Ledger = { d: { xp: 10, runs: 1, daily: false } };
  const frozen = JSON.stringify(before);
  applyRun(before, { day: "d", correct: 5, daily: true });
  applyRun(before, { day: "e", correct: 5, daily: false });
  check(JSON.stringify(before) === frozen, "applyRun mutated its input");
}

/* -------------------------------------------------------------------------- */
/* Levels                                                                     */
/* -------------------------------------------------------------------------- */

check(xpForLevel(1) === 0, "level 1 does not start at 0 XP");
check(xpForLevel(2) === 100, "level 2 is not at 100 XP");
check(xpForLevel(10) === 2700, "level 10 is not at 2,700 XP");
check(xpForLevel(20) === 10450, "level 20 is not at 10,450 XP");
check(xpForLevel(50) === 63700, "level 50 is not at 63,700 XP");

for (let level = 1; level < 200; level++) {
  // The closed form and the step agree, so the bar and the level never argue.
  if (xpForLevel(level + 1) - xpForLevel(level) !== xpToNext(level)) {
    failures.push(`level ${level}: step and closed form disagree`);
  }
  if (xpToNext(level + 1) <= xpToNext(level)) failures.push(`level ${level + 1} is not harder`);
}

// Every XP total up to level 60, exhaustively.
const TOP_XP = xpForLevel(60);
let previousLevel = 1;
for (let xp = 0; xp <= TOP_XP; xp++) {
  const p = levelFor(xp);
  if (p.level < previousLevel) failures.push(`level went backwards at ${xp} XP`);
  previousLevel = p.level;
  if (xp < xpForLevel(p.level) || xp >= xpForLevel(p.level + 1)) {
    failures.push(`${xp} XP is outside level ${p.level}`);
  }
  if (p.into !== xp - xpForLevel(p.level)) failures.push(`${xp} XP: wrong progress into level`);
  if (p.fraction < 0 || p.fraction >= 1) failures.push(`${xp} XP: bar at ${p.fraction}`);
  // Empty on the exact XP a level is reached.
  if (xp === xpForLevel(p.level) && p.into !== 0) failures.push(`level ${p.level} starts non-empty`);
}

/* -------------------------------------------------------------------------- */
/* Ranks                                                                      */
/* -------------------------------------------------------------------------- */

check(RANKS[0].from === 1, "the first rank does not start at level 1");
for (let i = 0; i < RANKS.length; i++) {
  const r = RANKS[i];
  if (!r.tone.startsWith("var(--")) failures.push(`${r.name} names a colour: ${r.tone}`);
  if (i > 0 && r.from <= RANKS[i - 1].from) failures.push(`${r.name} is not above ${RANKS[i - 1].name}`);
  if (rankFor(r.from).name !== r.name) failures.push(`level ${r.from} is not ${r.name}`);
  if (r.from > 1 && rankFor(r.from - 1).name !== RANKS[i - 1].name) {
    failures.push(`${r.name} arrives a level early`);
  }
}
check(nextRank(RANKS[RANKS.length - 1].from) === null, "the top rank has a next rank");
check(nextRank(1)?.name === RANKS[1].name, "the next rank after level 1 is wrong");

/* -------------------------------------------------------------------------- */
/* Feeding                                                                    */
/* -------------------------------------------------------------------------- */

{
  // One run alone, even the first of the day, does not quite feed it.
  const one = applyRun({}, { day: "2026-09-27", correct: 0, daily: false }).ledger;
  check(fedDays(one).length === 0, "one empty run fed the dragon");
  // The daily on its own does.
  const daily = applyRun({}, { day: "2026-09-27", correct: 0, daily: true }).ledger;
  check(fedDays(daily).length === 1, "the daily challenge alone did not feed it");
  check(totalXp(daily) === 110, "first run as the daily is not 110 XP");

  const fedOn = (days: string[]): Ledger =>
    Object.fromEntries(days.map((d) => [d, { xp: FEED_TARGET, runs: 2, daily: false }]));

  check(moodFor(fedOn(["2026-09-27"]), "2026-09-27") === "fed", "fed today is not fed");
  check(moodFor(fedOn(["2026-09-26"]), "2026-09-27") === "peckish", "fed yesterday is not peckish");
  check(moodFor(fedOn(["2026-09-25"]), "2026-09-27") === "hungry", "two days unfed is not hungry");
  check(moodFor({}, "2026-09-27") === "hungry", "a brand new dragon is not hungry");
  check(
    moodFor({ "2026-09-27": { xp: 40, runs: 1, daily: false } }, "2026-09-27") === "peckish",
    "a first run today does not make a new dragon peckish"
  );
  // Across a month boundary, not just within one.
  check(moodFor(fedOn(["2026-09-30"]), "2026-10-01") === "peckish", "month boundary miscounted");
}

console.log(`xp rules          finish ${XP_RULES.finish}, +${XP_RULES.perCorrect}/correct, first ${XP_RULES.firstOfDay}, daily ${XP_RULES.daily}, half after ${XP_RULES.fullRateRuns}`);
console.log(`levels            2 @ ${xpForLevel(2)}, 10 @ ${xpForLevel(10)}, 20 @ ${xpForLevel(20)}, 50 @ ${xpForLevel(50)}`);
console.log(`ranks             ${RANKS.map((r) => `${r.name} ${r.from}`).join(", ")}`);
console.log(`xp totals tested  0 to ${TOP_XP} (exhaustive)`);
console.log(`failures          ${failures.length}`);

if (failures.length) {
  console.log("\nfirst failures");
  for (const f of failures.slice(0, 12)) console.log(`  ${f}`);
  process.exit(1);
}

/**
 * Property test for the Doomsday generator.
 *
 * Zeller's congruence is the thing under test and the platform Date object is
 * the oracle. Every generated date is checked against it, which is the only
 * honest way to assert a calendar algorithm - including across the century
 * boundaries and leap-year rules where hand-rolled versions usually break.
 */

import {
  questionAt,
  weekdayIndex,
  isLeapYear,
  daysInMonth,
  WEEKDAYS,
  type DoomsdayQuestion,
} from "../lib/games/doomsday";

const RUNS = 4000;
const QUESTIONS_PER_RUN = 40;

const failures: { where: string; why: string }[] = [];
const answerSlot = new Array(7).fill(0);
let generated = 0;

for (let run = 0; run < RUNS; run++) {
  const seed = `verify-${run}`;
  for (let i = 0; i < QUESTIONS_PER_RUN; i++) {
    let q: DoomsdayQuestion;
    try {
      q = questionAt(seed, i);
    } catch (err) {
      failures.push({ where: `${seed}#${i}`, why: `threw: ${(err as Error).message}` });
      continue;
    }
    generated++;

    // The oracle. UTC avoids any local-timezone shift moving the day.
    const truth = new Date(Date.UTC(q.year, q.month - 1, q.day)).getUTCDay();
    if (q.answerIndex !== truth) {
      failures.push({
        where: `${seed}#${i}`,
        why: `${q.display}: said ${WEEKDAYS[q.answerIndex]}, Date says ${WEEKDAYS[truth]}`,
      });
    }

    if (q.day < 1 || q.day > daysInMonth(q.year, q.month)) {
      failures.push({ where: `${seed}#${i}`, why: `impossible date ${q.display}` });
    }

    answerSlot[q.answerIndex]++;
  }
}

// Leap-year rule, including the century cases that trip naive implementations.
for (const [year, expected] of [
  [1900, false], [2000, true], [2020, true], [2021, false], [2100, false], [2400, true],
] as [number, boolean][]) {
  if (isLeapYear(year) !== expected) {
    failures.push({ where: `leap ${year}`, why: `expected ${expected}` });
  }
}

// Every 29 February in range must land on the weekday Date agrees with.
let leapDaysChecked = 0;
for (let year = 1800; year <= 2199; year++) {
  if (!isLeapYear(year)) continue;
  leapDaysChecked++;
  const truth = new Date(Date.UTC(year, 1, 29)).getUTCDay();
  if (weekdayIndex(year, 2, 29) !== truth) {
    failures.push({ where: `29 Feb ${year}`, why: "weekday disagrees with Date" });
  }
}

let determinismBreaks = 0;
for (let run = 0; run < 200; run++) {
  for (let i = 0; i < 10; i++) {
    const a = questionAt(`determinism-${run}`, i);
    const b = questionAt(`determinism-${run}`, i);
    if (a.display !== b.display || a.answerIndex !== b.answerIndex) determinismBreaks++;
  }
}

const total = answerSlot.reduce((a, b) => a + b, 0);

console.log(`generated        ${generated.toLocaleString()} dates`);
console.log(`failures         ${failures.length}`);
console.log(`determinism      ${determinismBreaks === 0 ? "stable" : `${determinismBreaks} BREAKS`}`);
console.log(`leap days        ${leapDaysChecked} checked, 1800-2199`);
console.log("\nweekday distribution");
WEEKDAYS.forEach((name, i) => {
  console.log(`  ${name.padEnd(10)} ${((answerSlot[i] / total) * 100).toFixed(1)}%`);
});

console.log("\nsample run (seed sample-1)");
for (const i of [0, 6, 15, 30, 39]) {
  const q = questionAt("sample-1", i);
  console.log(`  #${String(i).padStart(2)} d${String(q.difficulty).padStart(2)}  ${q.display.padStart(20)}  ->  ${WEEKDAYS[q.answerIndex]}`);
}

if (failures.length || determinismBreaks) {
  console.log("\nfirst failures");
  for (const f of failures.slice(0, 10)) console.log(`  ${f.where}: ${f.why}`);
  process.exit(1);
}

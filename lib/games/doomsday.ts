// DOOMSDAY - name the weekday for a given date.
//
// The weekday is computed with Zeller's congruence rather than the Date object,
// so the arithmetic being taught is the arithmetic the game actually runs. The
// property test checks it against Date, which makes Date the oracle and this
// the thing under test.

import { createRng, randInt, clampDifficulty } from "@/lib/rng";

export const WEEKDAYS = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export type DoomsdayQuestion = {
  year: number;
  month: number;
  day: number;
  display: string;
  /** 0 = Sunday, matching the WEEKDAYS order. */
  answerIndex: number;
  difficulty: number;
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/**
 * Zeller's congruence, Gregorian. January and February are counted as the
 * thirteenth and fourteenth months of the previous year, which is the trick
 * that makes the leap day fall at the end where it cannot disturb anything.
 */
export function weekdayIndex(year: number, month: number, day: number): number {
  let m = month;
  let y = year;
  if (m < 3) {
    m += 12;
    y -= 1;
  }
  const K = y % 100;
  const J = Math.floor(y / 100);
  const h =
    (day +
      Math.floor((13 * (m + 1)) / 5) +
      K +
      Math.floor(K / 4) +
      Math.floor(J / 4) +
      5 * J) %
    7;
  // Zeller counts 0 as Saturday; shift so 0 is Sunday.
  return (h + 6) % 7;
}

/** The span of years widens as the run goes on. */
function yearRange(d: number): [number, number] {
  if (d <= 2) return [2020, 2032];
  if (d <= 5) return [1950, 2050];
  if (d <= 8) return [1900, 2099];
  return [1800, 2199];
}

export function generate(seed: string, difficulty: number): DoomsdayQuestion {
  const d = clampDifficulty(difficulty);
  const rng = createRng(`doomsday:${seed}:${d}`);
  const [lo, hi] = yearRange(d);

  const year = randInt(rng, lo, hi);
  const month = randInt(rng, 1, 12);
  const day = randInt(rng, 1, daysInMonth(year, month));

  return {
    year,
    month,
    day,
    display: `${day} ${MONTH_NAMES[month - 1]} ${year}`,
    answerIndex: weekdayIndex(year, month, day),
    difficulty: d,
  };
}

export function difficultyForIndex(index: number): number {
  return clampDifficulty(1 + Math.floor(index / 3));
}

export function questionAt(runSeed: string, index: number): DoomsdayQuestion {
  return generate(`${runSeed}#${index}`, difficultyForIndex(index));
}

export function validate(question: DoomsdayQuestion, chosen: number): boolean {
  return chosen === question.answerIndex;
}

export const ROUND_MS = 60_000;
export const WRONG_PENALTY_MS = 2_000;

/** Seven options means guessing pays about one time in seven, so the floor is
 *  lower here than on a four-way question. */
export const GUESS_FLOOR_MS = 400;

export function score(question: DoomsdayQuestion, msElapsed: number, streak: number): number {
  const base = 100;
  const speed =
    msElapsed < GUESS_FLOOR_MS
      ? 0
      : Math.max(0, Math.min(1, (8000 - msElapsed) / 6000));
  const multiplier = Math.min(2, 1 + streak * 0.05);
  const difficultyBonus = 1 + (question.difficulty - 1) * 0.05;
  return Math.round((base + speed * 100) * multiplier * difficultyBonus);
}

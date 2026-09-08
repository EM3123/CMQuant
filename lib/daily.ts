// The daily challenge.
//
// One seed a day, one game a day, one attempt. Everyone in the world gets the
// same puzzle at the same instant, which is the property that makes a score
// worth comparing at all.
//
// The rotation and the seed are both derived from the date, so nothing has to
// be stored server-side for this to work. The archive the subscription
// eventually sells is just this function run over past dates.

import { createRng } from "@/lib/rng";

export type DailyGame = {
  name: string;
  /** Route that plays it. */
  path: string;
  blurb: string;
};

/**
 * The rotation. Only games that are actually live belong here - a daily that
 * lands on an unbuilt game is a broken day, not a coming-soon notice.
 */
export const DAILY_ROTATION: DailyGame[] = [
  { name: "Equalize", path: "/g/equalize", blurb: "Pick the larger expression." },
  { name: "Flash", path: "/g/flash", blurb: "Type the answer." },
  { name: "Approx", path: "/g/approx", blurb: "Closest without computing." },
  { name: "Doomsday", path: "/g/doomsday", blurb: "Name the weekday." },
  { name: "Memory Tiles", path: "/g/memory-tiles", blurb: "Tap the pattern back." },
  { name: "Pot Odds", path: "/g/pot-odds", blurb: "Price the call." },
];

/**
 * UTC, deliberately. Local midnight would mean a player in Pittsburgh and a
 * player in Tokyo are on different puzzles while sharing one leaderboard.
 */
export function todayKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function dailySeed(dayKey: string): string {
  return `daily-${dayKey}`;
}

/** Which game today lands on. Deterministic, so it can be computed for any
 *  past or future date without a lookup table. */
export function dailyGame(dayKey: string): DailyGame {
  const rng = createRng(`rotation:${dayKey}`);
  return DAILY_ROTATION[Math.floor(rng() * DAILY_ROTATION.length)];
}

export type DailyResult = {
  dayKey: string;
  game: string;
  points: number;
  correct: number;
  attempted: number;
  bestStreak: number;
};

function storageKey(dayKey: string): string {
  return `cmquant:daily:${dayKey}`;
}

export function readDailyResult(dayKey: string): DailyResult | null {
  try {
    const raw = window.localStorage.getItem(storageKey(dayKey));
    return raw ? (JSON.parse(raw) as DailyResult) : null;
  } catch {
    return null;
  }
}

/**
 * First result of the day wins. Replaying is not blocked at the engine level -
 * anyone can clear their own storage - which is why the board this feeds is
 * labelled as unranked until server-side validation lands.
 */
export function writeDailyResult(result: DailyResult): void {
  try {
    if (window.localStorage.getItem(storageKey(result.dayKey))) return;
    window.localStorage.setItem(storageKey(result.dayKey), JSON.stringify(result));
  } catch {
    // Storage disabled. The run still played; it just is not remembered.
  }
}

/** Milliseconds until the next daily opens. */
export function msUntilNextDaily(now: Date = new Date()): number {
  const next = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1
  );
  return next - now.getTime();
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// XP, levels, ranks, and feeding the dragon.
//
// WHAT EARNS XP. Finishing runs, not peak scores. A run pays a flat amount for
// being finished plus a point per correct answer, and the first run of the day
// and the daily challenge each pay a bonus. So the fastest way up is coming
// back, which is the same rule the dragon already lives by (lib/pet.ts).
//
// WHY THERE IS A SOFT CAP. Past the tenth run in a day a run pays half. Playing
// more still counts; playing every day counts more. A cap that stopped XP
// dead would punish exactly the player who is enjoying it most.
//
// WHY IT IS A LEDGER OF DAYS. Everything here is a pure function of what was
// played on which day, so the same numbers can be rebuilt on the server from
// the saved `runs` table when accounts are switched on. Nothing a player has
// earned is stored anywhere it cannot be recomputed from.

/* -------------------------------------------------------------------------- */
/* XP                                                                         */
/* -------------------------------------------------------------------------- */

export const XP_RULES = {
  /** For finishing a run at all. */
  finish: 10,
  /** Per correct answer. */
  perCorrect: 1,
  /** Correct answers beyond this in one run pay nothing more. An endless run
   *  that goes very deep should feel great, not break the curve. */
  maxCorrectPaid: 100,
  /** The first run of each day. */
  firstOfDay: 50,
  /** Finishing that day's daily challenge, once. */
  daily: 50,
  /** Runs in a day that pay full rate; later ones pay half. */
  fullRateRuns: 10,
} as const;

/** What one finished run tells the ledger. Assisted runs never get this far. */
export type RunResult = {
  /** UTC day key, e.g. "2026-09-27". */
  day: string;
  correct: number;
  /** A timed run of today's daily game on today's daily seed. */
  daily: boolean;
};

/** One day's totals. The whole persistent state is a map of these. */
export type DayEntry = {
  xp: number;
  runs: number;
  /** The daily bonus has been paid for this day. */
  daily: boolean;
};

export type Ledger = Record<string, DayEntry>;

export type Gain = {
  /** Total XP this run paid. */
  xp: number;
  /** The same total, itemised for the results screen. */
  parts: { label: string; xp: number }[];
};

/** XP one run pays, given what that day already holds. Pure. */
export function xpForRun(run: RunResult, day: DayEntry | undefined): Gain {
  const runsBefore = day?.runs ?? 0;
  const correct = Math.max(0, Math.min(XP_RULES.maxCorrectPaid, Math.floor(run.correct)));

  let base = XP_RULES.finish + correct * XP_RULES.perCorrect;
  const halved = runsBefore >= XP_RULES.fullRateRuns;
  if (halved) base = Math.floor(base / 2);

  const parts: Gain["parts"] = [
    { label: halved ? "Run (half rate after ten today)" : "Run", xp: base },
  ];
  if (runsBefore === 0) parts.push({ label: "First run today", xp: XP_RULES.firstOfDay });
  if (run.daily && !day?.daily) parts.push({ label: "Daily challenge", xp: XP_RULES.daily });

  return { xp: parts.reduce((sum, p) => sum + p.xp, 0), parts };
}

/** The ledger after one more run, and what that run paid. Never mutates. */
export function applyRun(ledger: Ledger, run: RunResult): { ledger: Ledger; gain: Gain } {
  const day = ledger[run.day];
  const gain = xpForRun(run, day);
  return {
    gain,
    ledger: {
      ...ledger,
      [run.day]: {
        xp: (day?.xp ?? 0) + gain.xp,
        runs: (day?.runs ?? 0) + 1,
        daily: Boolean(day?.daily || run.daily),
      },
    },
  };
}

export function totalXp(ledger: Ledger): number {
  let total = 0;
  for (const day of Object.values(ledger)) total += day.xp;
  return total;
}

export function totalRuns(ledger: Ledger): number {
  let total = 0;
  for (const day of Object.values(ledger)) total += day.runs;
  return total;
}

/** Days with at least one finished run, oldest first. */
export function playedDays(ledger: Ledger): string[] {
  return Object.keys(ledger)
    .filter((day) => ledger[day].runs > 0)
    .sort();
}

/**
 * Consecutive days played, counting back from today. A streak is still alive
 * until today is over, so if today has no run yet it counts back from
 * yesterday instead - nobody should open the page at breakfast and be told
 * their streak is zero.
 */
export function currentStreak(ledger: Ledger, today: string): number {
  const played = new Set(playedDays(ledger));
  let day = played.has(today) ? today : shiftDay(today, -1);
  let streak = 0;
  while (played.has(day)) {
    streak++;
    day = shiftDay(day, -1);
  }
  return streak;
}

export function longestStreak(ledger: Ledger): number {
  const days = playedDays(ledger);
  let best = 0;
  let run = 0;
  for (let i = 0; i < days.length; i++) {
    run = i > 0 && daysBetween(days[i - 1], days[i]) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}

/** The day `n` days after `day` (negative for before), as a UTC day key. */
export function shiftDay(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
}

/* -------------------------------------------------------------------------- */
/* Levels                                                                     */
/* -------------------------------------------------------------------------- */

/** XP to go from `level` to `level + 1`. Each level costs a little more. */
export function xpToNext(level: number): number {
  return 100 + 50 * (level - 1);
}

/** Total XP at which `level` is reached. Level 1 is where everyone starts. */
export function xpForLevel(level: number): number {
  const n = level - 1;
  return 100 * n + 25 * n * (n - 1);
}

export type LevelProgress = {
  level: number;
  /** XP earned since this level was reached. */
  into: number;
  /** XP this level takes in total. */
  needed: number;
  /** 0 to 1 through this level. */
  fraction: number;
};

export function levelFor(xp: number): LevelProgress {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  const into = xp - xpForLevel(level);
  const needed = xpToNext(level);
  return { level, into, needed, fraction: Math.min(1, into / needed) };
}

/* -------------------------------------------------------------------------- */
/* Ranks                                                                      */
/* -------------------------------------------------------------------------- */

export type Rank = {
  name: string;
  /** Level this rank starts at. */
  from: number;
  /** A role token, never a hex - same rule as the pet. */
  tone: string;
};

/**
 * A title that changes every few levels. It measures how much someone has
 * played, not how good they are; a skill rating belongs on the leaderboards,
 * once scores are checked by the server.
 */
export const RANKS: Rank[] = [
  { name: "Intern", from: 1, tone: "var(--text-secondary)" },
  { name: "Analyst", from: 5, tone: "var(--text-primary)" },
  { name: "Associate", from: 10, tone: "var(--accent-ink)" },
  { name: "Trader", from: 15, tone: "var(--color-data-pos)" },
  { name: "Quant", from: 20, tone: "var(--color-ice)" },
  { name: "Senior Quant", from: 30, tone: "var(--color-rare)" },
  { name: "Portfolio Manager", from: 40, tone: "var(--color-scots-rose)" },
  { name: "Partner", from: 50, tone: "var(--color-gold-leaf)" },
];

export function rankFor(level: number): Rank {
  let found = RANKS[0];
  for (const rank of RANKS) if (level >= rank.from) found = rank;
  return found;
}

export function nextRank(level: number): Rank | null {
  return RANKS.find((r) => r.from > level) ?? null;
}

/* -------------------------------------------------------------------------- */
/* Feeding the dragon                                                         */
/* -------------------------------------------------------------------------- */

/**
 * XP in a day that counts as feeding it. One run is not quite enough on its
 * own - the first run of the day pays 60 before correct answers - so the
 * usual fed day is the daily challenge, or a couple of runs.
 */
export const FEED_TARGET = 100;

/** Days where the dragon was fed. These are what it grows on. */
export function fedDays(ledger: Ledger): string[] {
  return Object.keys(ledger).filter((day) => ledger[day].xp >= FEED_TARGET);
}

export type Mood = "fed" | "peckish" | "hungry";

/**
 * How it looks today. Fed once today's target is met; peckish if it was fed
 * yesterday or today has started; hungry after two days without a meal.
 * Hunger is only ever a look. It never costs a stage - losing progress for
 * taking a weekend off is how a pet makes people quit.
 */
export function moodFor(ledger: Ledger, today: string): Mood {
  if ((ledger[today]?.xp ?? 0) >= FEED_TARGET) return "fed";
  const last = fedDays(ledger).sort().at(-1);
  if (!last) return (ledger[today]?.xp ?? 0) > 0 ? "peckish" : "hungry";
  return daysBetween(last, today) <= 1 ? "peckish" : "hungry";
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

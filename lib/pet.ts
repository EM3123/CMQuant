"use client";

import { useProgression } from "@/lib/progressionStore";

/**
 * The dragon that grows because you came back.
 *
 * WHAT IT COUNTS, AND WHY IT IS NOT SCORE.
 *
 * The first version summed the personal best of every game and levelled off
 * that. It is a reasonable-looking number and it measures the wrong thing:
 * the highest you ever scored, once, forever. One lucky run inflates it
 * permanently, and a player who comes back every day for a month moves it not
 * at all once their bests stop improving. A pet fed on peak score gets fat and
 * then starves while you are still feeding it.
 *
 * So it counts DISTINCT DAYS. That is the sentence "it grows the more times
 * you come to play", written as arithmetic. Distinct days rather than runs,
 * because runs can be farmed in one sitting and the whole point is returning.
 *
 * Since XP landed, a day counts once the dragon is FED that day: 100 XP, which
 * is the daily challenge or a couple of runs (lib/progression.ts). XP feeds
 * it; days grow it. Grinding one afternoon fills one day's bowl, not the
 * ladder.
 *
 * Scores are still shown next to it. They are just not what feeds it.
 *
 * WHERE IT LIVES. In this browser, like every other record here, until
 * accounts land - as the XP ledger, one entry per day, which the server can
 * rebuild from its saved runs.
 */

export type Stage = {
  level: number;
  name: string;
  /** Fed days needed to reach this stage. */
  at: number;
  /** A role token, never a hex. The pet has to read correctly in both wings. */
  tone: string;
  /** What the stage means, said plainly. */
  note: string;
};

/**
 * Five stages on a returning ladder rather than a scoring one: today, a few
 * days, a week, three weeks, two months. The gaps widen because the habit
 * gets easier to keep and the reward should get harder to earn.
 */
export const STAGES: Stage[] = [
  {
    level: 1,
    name: "The Seed",
    at: 1,
    tone: "var(--text-secondary)",
    note: "Fed once. That is the whole requirement.",
  },
  {
    level: 2,
    name: "The Script",
    at: 3,
    tone: "var(--accent-ink)",
    note: "Fed on three separate days.",
  },
  {
    level: 3,
    name: "The Algorithm",
    at: 7,
    tone: "var(--text-primary)",
    note: "A week of fed days, not a week of runs.",
  },
  {
    level: 4,
    name: "The Engine",
    at: 21,
    tone: "var(--color-data-pos)",
    note: "Twenty-one fed days. This is where it stops being a streak and starts being a habit.",
  },
  {
    level: 5,
    name: "The Runtime",
    at: 60,
    tone: "var(--color-gold-leaf)",
    note: "Sixty fed days. The dragon is finished; you are not.",
  },
];

export const MAX_LEVEL = STAGES.length;

/** The stage a given number of days has earned. Never below one. */
export function stageFor(days: number): Stage {
  let found = STAGES[0];
  for (const stage of STAGES) if (days >= stage.at) found = stage;
  return found;
}

export type Progress = {
  days: number;
  stage: Stage;
  /** The next stage, or null at the top. */
  next: Stage | null;
  /** Days still needed. Zero at the top. */
  remaining: number;
  /** 0 to 1 through the current band. One at the top. */
  fraction: number;
};

/**
 * Progress through the current band.
 *
 * Measured from the floor of the band, which the first version got wrong: it
 * took the total modulo the band WIDTH, so a player 1,000 into a band that
 * started at 5,000 was shown 60% instead of 10%. A progress bar that lies
 * about progress is worse than no progress bar.
 */
export function progressFor(days: number): Progress {
  const stage = stageFor(days);
  const next = STAGES.find((s) => s.at > stage.at) ?? null;

  if (!next) {
    return { days, stage, next: null, remaining: 0, fraction: 1 };
  }

  const band = next.at - stage.at;
  const into = Math.max(0, days - stage.at);
  return {
    days,
    stage,
    next,
    remaining: Math.max(0, next.at - days),
    fraction: Math.max(0, Math.min(1, into / band)),
  };
}

/* -------------------------------------------------------------------------- */
/* Days it has grown on                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Fed days, from the XP ledger, plus every day recorded before feeding
 * existed. The old list of played days is kept and still counted, so nobody's
 * dragon shrank the day this changed. lib/progressionStore.ts holds both.
 */
export function useDaysPlayed(): number {
  return useProgression().growthDays;
}

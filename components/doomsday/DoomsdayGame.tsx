"use client";

import { ChoiceRun, type ChoiceGame } from "@/components/game/ChoiceRun";
import {
  questionAt,
  validate,
  score,
  WEEKDAYS,
  ROUND_MS,
  WRONG_PENALTY_MS,
  type DoomsdayQuestion,
} from "@/lib/games/doomsday";

const DOOMSDAY: ChoiceGame<DoomsdayQuestion> = {
  name: "Doomsday",
  storageKey: "cmquant:doomsday:best",
  challengePath: "/g/doomsday",
  roundMs: ROUND_MS,
  wrongPenaltyMs: WRONG_PENALTY_MS,
  questionAt,
  optionCount: () => WEEKDAYS.length,
  validate,
  score,
  difficultyOf: (q) => q.difficulty,
  renderPrompt: (q) => (
    <div className="whitespace-nowrap text-[clamp(1.6rem,5vw,3.25rem)] leading-none text-primary">
      {q.display}
    </div>
  ),
  renderOption: (_q, i) => (
    <span className="text-sm text-primary">{WEEKDAYS[i].slice(0, 3)}</span>
  ),
  optionsClassName: "grid w-full max-w-3xl grid-cols-4 gap-2 sm:grid-cols-7",
  intro: {
    eyebrow: "Comp / Computational Thinking",
    title: "Doomsday",
    blurb:
      "Name the weekday for any date. The calendar repeats on a pattern you can hold in your head, and once you have it you never need to look a date up again.",
    startLabel: "Start",
    hint: "Keys 1 – 7, Sunday through Saturday. A wrong answer costs two seconds.",
  },
};

export function DoomsdayGame() {
  return <ChoiceRun game={DOOMSDAY} />;
}

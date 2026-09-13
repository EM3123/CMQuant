"use client";

import { ChoiceRun, type ChoiceGame } from "@/components/game/ChoiceRun";
import {
  questionAt,
  validate,
  score,
  formatOption,
  ROUND_MS,
  WRONG_PENALTY_MS,
  type ApproxQuestion,
} from "@/lib/games/approx";

const APPROX: ChoiceGame<ApproxQuestion> = {
  name: "Approx",
  code: "APX",
  storageKey: "cmquant:approx:best",
  challengePath: "/g/approx",
  roundMs: ROUND_MS,
  wrongPenaltyMs: WRONG_PENALTY_MS,
  questionAt,
  optionCount: (q) => q.options.length,
  validate,
  score,
  difficultyOf: (q) => q.difficulty,
  renderPrompt: (q) => (
    <div className="tabular whitespace-nowrap text-[clamp(1.6rem,5.5vw,3.5rem)] leading-none text-primary">
      {q.display}
    </div>
  ),
  renderOption: (q, i) => (
    <span className="tabular text-xl text-primary sm:text-2xl">
      {formatOption(q.options[i])}
    </span>
  ),
  optionsClassName: "grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4",
  intro: {
    eyebrow: "Comp / Computational Thinking",
    title: "Approx",
    blurb:
      "Pick the closest answer without working it out. The numbers are chosen to punish anyone who tries to compute them exactly, because the skill here is knowing how much precision a question deserves.",
    startLabel: "Start",
    hint: "Keys 1 – 4. A wrong answer costs two seconds.",
  },
};

export function ApproxGame() {
  return <ChoiceRun game={APPROX} />;
}


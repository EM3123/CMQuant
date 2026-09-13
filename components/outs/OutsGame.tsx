"use client";

import { ChoiceRun, type ChoiceGame } from "@/components/game/ChoiceRun";
import { CardFan } from "@/components/cards/PlayingCard";
import { Felt } from "@/components/poker/Felt";
import {
  questionAt,
  validate,
  score,
  ROUND_MS,
  WRONG_PENALTY_MS,
  MISTAKE_LABEL,
  MISTAKE_FIX,
  type OutsQuestion,
} from "@/lib/games/outs";

const OUTS: ChoiceGame<OutsQuestion> = {
  name: "Outs",
  code: "OUT",
  storageKey: "cmquant:outs:best",
  challengePath: "/g/outs",
  roundMs: ROUND_MS,
  wrongPenaltyMs: WRONG_PENALTY_MS,
  questionAt,
  optionCount: (q) => q.options.length,
  validate,
  score,
  difficultyOf: (q) => q.difficulty,
  renderPrompt: (q) => (
    <div className="flex flex-col items-center gap-5">
      {/* No pot on this table. Outs is a counting question, not a pricing one,
          and chips in the middle would imply money is part of the answer. */}
      <Felt board={q.board} hero={q.hole} />

      <p className="max-w-sm text-center text-sm leading-relaxed text-secondary">
        One card to come. How many of the 46 you cannot see give you{" "}
        <span className="text-rare">{q.targetName}</span> or better?
      </p>
    </div>
  ),
  renderOption: (q, i) => (
    <span className="tabular text-2xl text-primary">{q.options[i]}</span>
  ),
  optionsClassName: "grid w-full max-w-lg grid-cols-4 gap-3",
  diagnose: (q, chosen) => {
    const mistake = q.diagnoses[chosen];
    if (!mistake) return null;
    return { key: mistake, label: MISTAKE_LABEL[mistake], fix: MISTAKE_FIX[mistake] };
  },
  intro: {
    eyebrow: "Poker Lab / Probability in Practice",
    title: "Outs",
    blurb:
      "Six cards are face up and one is still to come. Count the cards that get you to the hand named, and count them exactly — every answer here is checked against all 46, not estimated.",
    startLabel: "Deal",
    hint: "Keys 1 – 4. A wrong answer costs two seconds.",
    learnHref: "/learn/outs",
    titleClassName: "mt-4 font-display text-3xl font-medium uppercase tracking-wing text-primary sm:text-4xl",
    ornament: (
      <div className="mb-10">
        <CardFan cards={["9h", "Th", null, null]} size="md" className="justify-center" />
      </div>
    ),
  },
};

export function OutsGame() {
  return <ChoiceRun game={OUTS} />;
}

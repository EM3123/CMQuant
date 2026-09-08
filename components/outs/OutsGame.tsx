"use client";

import { ChoiceRun, type ChoiceGame } from "@/components/game/ChoiceRun";
import { PlayingCard, CardFan } from "@/components/cards/PlayingCard";
import {
  questionAt,
  validate,
  score,
  ROUND_MS,
  WRONG_PENALTY_MS,
  type OutsQuestion,
} from "@/lib/games/outs";

const OUTS: ChoiceGame<OutsQuestion> = {
  name: "Outs",
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
      <div className="flex flex-col items-center gap-2">
        <span className="text-[10px] uppercase tracking-[0.3em] text-secondary">Board</span>
        <div className="flex gap-1.5">
          {q.board.map((code) => (
            <PlayingCard key={code} code={code} size="sm" />
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="flex gap-1.5">
          {q.hole.map((code) => (
            <PlayingCard key={code} code={code} size="sm" />
          ))}
        </div>
        <span className="text-[10px] uppercase tracking-[0.3em] text-secondary">You</span>
      </div>

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
  intro: {
    eyebrow: "Poker Lab / Probability in Practice",
    title: "Outs",
    blurb:
      "Six cards are face up and one is still to come. Count the cards that get you to the hand named, and count them exactly — every answer here is checked against all 46, not estimated.",
    startLabel: "Deal",
    hint: "Keys 1 – 4. A wrong answer costs two seconds.",
    titleClassName: "mt-4 font-display text-6xl font-light tracking-wing text-rare",
    ornament: (
      <div className="spotlight mb-10">
        <div className="spotlight-glow" />
        <CardFan cards={["9h", "Th", null, null]} size="lg" className="justify-center" />
      </div>
    ),
  },
};

export function OutsGame() {
  return <ChoiceRun game={OUTS} />;
}

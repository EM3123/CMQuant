"use client";

import { ChoiceRun, type ChoiceGame } from "@/components/game/ChoiceRun";
import { PlayingCard, CardFan } from "@/components/cards/PlayingCard";
import {
  questionAt,
  validate,
  score,
  MISTAKE_LABEL,
  MISTAKE_FIX,
  ROUND_MS,
  WRONG_PENALTY_MS,
  type CombinatoricsQuestion,
} from "@/lib/games/combinatorics";

const COMBINATORICS: ChoiceGame<CombinatoricsQuestion> = {
  name: "Combinatorics",
  storageKey: "cmquant:combinatorics:best",
  challengePath: "/g/combinatorics",
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

      <p className="max-w-sm text-center text-sm leading-relaxed text-secondary">
        How many combinations of{" "}
        <span className="text-rare">{q.holdingLabel}</span> can still be dealt?
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
    title: "Combinatorics",
    blurb:
      "Pocket aces is six combinations. Put one ace on the board and it is three, because two of the hands they could have been dealt no longer exist. Count what is left.",
    startLabel: "Deal",
    hint: "Keys 1 – 4. A wrong answer costs two seconds.",
    learnHref: "/learn/combinatorics",
    titleClassName: "mt-4 font-display text-5xl font-light tracking-wing text-rare sm:text-6xl",
    ornament: (
      <div className="spotlight mb-10">
        <div className="spotlight-glow" />
        <CardFan cards={["Ah", "As", null, null]} size="lg" className="justify-center" />
      </div>
    ),
  },
};

export function CombinatoricsGame() {
  return <ChoiceRun game={COMBINATORICS} />;
}

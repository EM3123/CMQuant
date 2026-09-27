"use client";

import { ChoiceRun, type ChoiceGame } from "@/components/game/ChoiceRun";
import { CardFan } from "@/components/cards/PlayingCard";
import { Felt } from "@/components/poker/Felt";
import {
  questionAt,
  validate,
  score,
  diagnose,
  ROUND_MS,
  WRONG_PENALTY_MS,
  MISTAKE_LABEL,
  MISTAKE_FIX,
  type EquityQuestion,
} from "@/lib/games/equity";

/**
 * Equity is the only game that turns the opponent's hand face up.
 *
 * The other three are questions about what somebody COULD have - a range, a
 * count, a price - and showing their cards would answer a different question
 * than the one being asked. Here the whole point is that there is nothing
 * hidden and nothing to read: both hands are on the table, one card is coming,
 * and the only thing left is the arithmetic.
 */
const EQUITY: ChoiceGame<EquityQuestion> = {
  name: "Equity",
  code: "EQY",
  storageKey: "cmquant:equity:best",
  challengePath: "/g/equity",
  roundMs: ROUND_MS,
  wrongPenaltyMs: WRONG_PENALTY_MS,
  questionAt,
  optionCount: (q) => q.options.length,
  validate,
  score,
  difficultyOf: (q) => q.difficulty,

  diagnose: (q, chosen) => {
    const kind = diagnose(q, chosen);
    if (!kind) return null;
    return { key: kind, label: MISTAKE_LABEL[kind], fix: MISTAKE_FIX[kind] };
  },

  renderPrompt: (q) => (
    <div className="flex flex-col items-center gap-4">
      <Felt board={q.board} hero={q.hero} villain={q.villain} />
      <p className="max-w-sm text-center text-[13px] leading-relaxed text-secondary">
        One card to come. How often do you win?
      </p>
    </div>
  ),

  renderOption: (q, i) => (
    <span className="tabular text-2xl text-primary">{q.options[i]}%</span>
  ),

  optionsClassName: "grid w-full max-w-2xl grid-cols-2 gap-px bg-hairline sm:grid-cols-4",

  intro: {
    eyebrow: "Poker Lab / Probability in Practice",
    title: "Equity",
    blurb:
      "Both hands are face up and you are behind with one card to come. How often do you win? Every answer is worked out by dealing all forty-four remaining cards and counting, so there is nothing approximate about it — which is exactly why the shortcut you were taught will not get you there.",
    startLabel: "Deal",
    hint: "Keys 1 – 4. A wrong answer costs two seconds.",
    learnHref: "/learn/equity",
    titleClassName:
      "mt-4 font-display text-3xl font-medium uppercase tracking-wing text-primary sm:text-4xl",
    ornament: (
      <div className="mb-10">
        <CardFan cards={["Ah", "Kh", "Qs", "Js"]} size="md" className="justify-center" />
      </div>
    ),
  },
};

export function EquityGame() {
  return <ChoiceRun game={EQUITY} />;
}

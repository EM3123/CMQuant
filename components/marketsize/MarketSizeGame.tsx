"use client";

import { ChoiceRun, type ChoiceGame } from "@/components/game/ChoiceRun";
import {
  questionAt,
  validate,
  score,
  formatValue,
  UNIT_NOUN,
  MISTAKE_LABEL,
  MISTAKE_FIX,
  ROUND_MS,
  WRONG_PENALTY_MS,
  type MarketSizeQuestion,
} from "@/lib/games/marketsize";

/**
 * The chain, written out as a chain.
 *
 * Every premise is on screen, in order, one per line, with a multiplication
 * sign between them - because the thing being trained is holding a four or
 * five term product in your head without losing one, and a paragraph hides
 * the shape of that. A candidate who can see the chain stacked is a candidate
 * who notices the line they have not used yet.
 */
function Chain({ question }: { question: MarketSizeQuestion }) {
  return (
    <div className="w-full max-w-md">
      <p className="text-center text-[13px] leading-relaxed text-secondary">
        {question.scenario}
      </p>

      <ul className="mt-4 divide-y divide-hairline border-y border-hairline">
        {question.factors.map((factor, i) => (
          <li key={factor.label} className="flex items-baseline justify-between gap-4 py-1.5">
            <span className="flex items-baseline gap-2 text-[12px] text-secondary">
              <span className="tabular w-3 shrink-0 text-right text-[10px] text-muted">
                {i === 0 ? "" : "×"}
              </span>
              {factor.label}
            </span>
            <span className="tabular shrink-0 text-[13px] text-primary">
              {factor.kind === "money"
                ? `$${factor.value.toLocaleString("en-US")}`
                : factor.kind === "share"
                  ? factor.value.toFixed(2)
                  : factor.value.toLocaleString("en-US")}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-[11px] uppercase tracking-[0.3em] text-accent-ink">
          {question.asks}
        </span>
        {/* Dropped when the ask already says it. "Annual dining revenue"
            followed by "per year" is the same word twice. */}
        {!question.asks.toLowerCase().startsWith("annual") && (
          <span className="text-[10px] text-muted">{UNIT_NOUN[question.unit]}</span>
        )}
      </div>
    </div>
  );
}

const GAME: ChoiceGame<MarketSizeQuestion> = {
  name: "Market Size",
  code: "MKT",
  storageKey: "cmquant:marketsize:best",
  challengePath: "/g/market-size",
  roundMs: ROUND_MS,
  wrongPenaltyMs: WRONG_PENALTY_MS,
  questionAt,
  optionCount: () => 4,
  validate,
  score,
  difficultyOf: (question) => question.difficulty,

  renderPrompt: (question) => <Chain question={question} />,

  renderOption: (question, index) => (
    <span className="tabular text-xl sm:text-2xl">
      {formatValue(question.options[index], question.unit)}
    </span>
  ),

  optionsClassName: "grid w-full max-w-md grid-cols-2 gap-2 sm:grid-cols-4",

  diagnose: (question, chosen) => {
    const key = question.diagnoses[chosen];
    if (!key) return null;
    return { key, label: MISTAKE_LABEL[key], fix: MISTAKE_FIX[key] };
  },

  intro: {
    eyebrow: "Consulting / Estimation",
    title: "Market Size",
    blurb:
      "A decomposition, already broken into its lines, and sixty seconds to multiply it out. Every premise is on the screen - you are not being asked what the waste-management market is worth, you are being asked to chain four or five numbers without dropping one or losing a factor of ten. The wrong answers are the four ways that chain actually breaks.",
    startLabel: "Take the case",
    hint: "Keys 1 - 4, or tap. A wrong answer costs two seconds.",
    titleClassName: "font-display uppercase tracking-wing",
  },
};

export function MarketSizeGame() {
  return <ChoiceRun game={GAME} />;
}

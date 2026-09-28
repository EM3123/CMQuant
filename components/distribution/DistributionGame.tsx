"use client";

import { ChoiceRun, type ChoiceGame } from "@/components/game/ChoiceRun";
import {
  questionAt,
  validate,
  score,
  QUESTION,
  MISTAKE_LABEL,
  MISTAKE_FIX,
  ROUND_MS,
  WRONG_PENALTY_MS,
  type DistributionQuestion,
} from "@/lib/games/distribution";

/**
 * The chart is the question.
 *
 * Everything asked here could have been asked of a list of numbers, and then
 * it would be an arithmetic drill. Drawn as columns of dots it becomes a
 * reading exercise: the median is a position you walk to, the mode is the
 * tallest thing on screen, the range is how wide the picture is. That is the
 * skill, so the chart has to be legible at a glance and honest about its own
 * scale - the end columns always hold a dot, so the axis you can see is
 * exactly the data that exists.
 */
function DotPlot({ question }: { question: DistributionQuestion }) {
  const tallest = Math.max(...question.counts);

  return (
    <div className="flex w-full flex-col items-center">
      <div
        className="grid items-end justify-center gap-x-1.5"
        // A FIXED column width, not a share of the container.
        //
        // Spread across max-w-xl the four columns of an easy question were
        // sixteen pixels of dot in a hundred and forty of nothing, floating in
        // the middle of a black screen - the exact failure Equalize had before
        // its two panes reached the edges of their columns. A dot plot is a
        // dense object or it is not readable, so the columns are a constant
        // size and the chart is as wide as it needs to be. Nine columns, the
        // widest this generates, is 315px and still fits a phone.
        style={{ gridTemplateColumns: `repeat(${question.axis.length}, 2.1875rem)` }}
      >
        {question.counts.map((count, i) => (
          <div key={question.axis[i]} className="flex flex-col-reverse items-center gap-1">
            {Array.from({ length: count }).map((_, dot) => (
              <span
                key={dot}
                className="block h-3.5 w-6 bg-accent-ink sm:h-4 sm:w-7"
                // The top dot of the tallest column is where the eye lands on
                // a mode question, so it is the only one allowed to be full
                // strength.
                style={{ opacity: dot === count - 1 && count === tallest ? 1 : 0.6 }}
              />
            ))}
          </div>
        ))}
      </div>

      {/* The axis. A rule the columns stand on, exactly as wide as they are. */}
      <div
        className="mt-2 grid justify-center gap-x-1.5 border-t border-hairline-strong pt-2"
        style={{ gridTemplateColumns: `repeat(${question.axis.length}, 2.1875rem)` }}
      >
        {question.axis.map((value) => (
          <span key={value} className="tabular text-center text-xs text-secondary">
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}
const GAME: ChoiceGame<DistributionQuestion> = {
  name: "Distribution",
  code: "DST",
  storageKey: "cmquant:distribution:best",
  challengePath: "/g/distribution",
  roundMs: ROUND_MS,
  wrongPenaltyMs: WRONG_PENALTY_MS,
  questionAt,
  optionCount: () => 4,
  validate,
  score,
  difficultyOf: (question) => question.difficulty,

  renderPrompt: (question) => (
    <div className="flex w-full flex-col items-center gap-5">
      <DotPlot question={question} />
      <div className="flex flex-col items-center gap-1">
        <span className="text-base uppercase tracking-[0.3em] text-primary sm:text-lg">
          {QUESTION[question.kind]}
        </span>
        <span className="tabular text-[11px] text-muted">
          {question.n} observations
        </span>
      </div>
    </div>
  ),

  renderOption: (question, index) => (
    <span className="tabular text-2xl sm:text-3xl">
      {question.options[index].toLocaleString("en-US")}
    </span>
  ),

  optionsClassName: "grid grid-cols-2 gap-2 sm:grid-cols-4",

  diagnose: (question, chosen) => {
    const key = question.diagnoses[chosen];
    if (!key) return null;
    return { key, label: MISTAKE_LABEL[key], fix: MISTAKE_FIX[key] };
  },

  intro: {
    eyebrow: "Comp / Computational Thinking",
    title: "Distribution",
    blurb:
      "A column of dots for every value, and one question about the shape: the middle of it, the commonest part of it, how wide it is, or where its balance point sits. The four answers offered are the four things people actually reach for, so a wrong one tells you which reading you made.",
    startLabel: "Start",
    hint: "Keys 1 - 4, or tap. A wrong answer costs two seconds.",
  },
};

export function DistributionGame() {
  return <ChoiceRun game={GAME} />;
}

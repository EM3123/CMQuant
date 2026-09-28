"use client";

import { ChoiceRun, type ChoiceGame } from "@/components/game/ChoiceRun";
import {
  questionAt,
  validate,
  score,
  MISTAKE_LABEL,
  MISTAKE_FIX,
  ROUND_MS,
  WRONG_PENALTY_MS,
  type SignalQuestion,
} from "@/lib/games/signal";

/**
 * Four series, one shared scale.
 *
 * The shared scale is the whole reason this is readable. Normalise each
 * sparkline to its own minimum and maximum and every one of them fills its
 * box, which erases the two comparisons the game is built on - you can no
 * longer see that one finishes above the others, or that one swings further
 * than the rest. Those are the wrong rules the player is being taught to
 * distrust, so they have to be visible enough to be tempting.
 */
function Spark({ points, low, high }: { points: number[]; low: number; high: number }) {
  const span = Math.max(1, high - low);
  const stepX = 100 / Math.max(1, points.length - 1);
  // A little headroom top and bottom so the extreme points are not clipped
  // by the edge of the box.
  const y = (v: number) => 4 + (1 - (v - low) / span) * 30;
  const path = points.map((v, i) => `${(i * stepX).toFixed(2)},${y(v).toFixed(2)}`).join(" ");

  return (
    <svg
      viewBox="0 0 100 38"
      preserveAspectRatio="none"
      className="h-20 w-full sm:h-28"
      aria-hidden
    >
      <polyline
        points={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      {points.map((v, i) => (
        <circle
          key={i}
          cx={i * stepX}
          cy={y(v)}
          r="1"
          fill="currentColor"
          opacity="0.55"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

const GAME: ChoiceGame<SignalQuestion> = {
  name: "Signal",
  code: "SIG",
  storageKey: "cmquant:signal:best",
  challengePath: "/g/signal",
  roundMs: ROUND_MS,
  wrongPenaltyMs: WRONG_PENALTY_MS,
  questionAt,
  optionCount: () => 4,
  validate,
  score,
  difficultyOf: (question) => question.difficulty,

  renderPrompt: (question) => (
    <div className="flex flex-col items-center gap-2 text-center">
      <span className="text-base uppercase tracking-[0.3em] text-primary sm:text-lg">
        One of these is drifting
      </span>
      <span className="text-[11px] text-muted">
        The other three are noise. Same scale, {question.series[0].length} points each.
      </span>
    </div>
  ),

  renderOption: (question, index) => (
    <span className="block w-full text-accent-ink">
      <Spark points={question.series[index]} low={question.low} high={question.high} />
    </span>
  ),

  // Two by two rather than a row of four, and an explicit width.
  //
  // ChoiceRun sizes the option grid by its content, which is right for four
  // numbers and wrong for four charts: an SVG has no intrinsic width, so
  // these collapsed to about 145 pixels each - not enough line to read a
  // slope off. A quarter-width sparkline is a smudge, and the shape is the
  // entire question here.
  optionsClassName: "grid w-full max-w-3xl grid-cols-1 gap-2.5 sm:grid-cols-2",

  diagnose: (question, chosen) => {
    const key = question.diagnoses[chosen];
    if (!key) return null;
    return { key, label: MISTAKE_LABEL[key], fix: MISTAKE_FIX[key] };
  },

  intro: {
    eyebrow: "Comp / Computational Thinking",
    title: "Signal",
    blurb:
      "Four series on one scale. Exactly one of them is actually going somewhere; the other three are flat, and each is flat in a way that looks like a trend - one finishes highest, one swings widest, one contains the biggest single jump. Pick the one with a direction, not the one with a story.",
    startLabel: "Start",
    hint: "Keys 1 - 4, or tap. A wrong answer costs two seconds.",
  },
};

export function SignalGame() {
  return <ChoiceRun game={GAME} />;
}

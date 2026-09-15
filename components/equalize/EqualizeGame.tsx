"use client";

import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import {
  questionAt,
  validate,
  score,
  ROUND_MS,
  WRONG_PENALTY_MS,
  type Side,
} from "@/lib/games/equalize";
import { makeSeed } from "@/lib/rng";
import { useChallenge, usePersonalBest } from "@/lib/browserState";
import { useAssist } from "@/lib/assist";
import { ResultsCard } from "@/components/game/ResultsCard";
import { Rail, Tape } from "@/components/game/Rail";
import {
  WRONG_POINTS,
  streakMilestoneBonus,
  accuracyMultiplier,
  finalScore,
} from "@/lib/scoring";

type Phase = "idle" | "running" | "done";

type RunState = {
  phase: Phase;
  seed: string;
  index: number;
  correct: number;
  attempted: number;
  streak: number;
  bestStreak: number;
  points: number;
  endsAt: number;
  shownAt: number;
  /** Bumped on every answer so the flash overlay remounts and replays. */
  feedback: { id: number; ok: boolean } | null;
  /** The tape. Every answer with how long it took, oldest first. */
  tape: { id: number; ok: boolean; ms: number }[];
  /** Sticky. One assisted answer marks the whole run, and it never unsets. */
  assisted: boolean;
};

const EMPTY: RunState = {
  phase: "idle",
  seed: "",
  index: 0,
  correct: 0,
  attempted: 0,
  streak: 0,
  bestStreak: 0,
  points: 0,
  endsAt: 0,
  shownAt: 0,
  feedback: null,
  tape: [],
  assisted: false,
};

type Action =
  | { type: "start"; seed: string; now: number }
  | { type: "answer"; side: Side; now: number; assist: boolean }
  | { type: "finish" };

function reducer(state: RunState, action: Action): RunState {
  switch (action.type) {
    case "start":
      return {
        ...EMPTY,
        phase: "running",
        seed: action.seed,
        endsAt: action.now + ROUND_MS,
        shownAt: action.now,
      };

    case "answer": {
      if (state.phase !== "running") return state;

      const question = questionAt(state.seed, state.index);
      const ok = action.assist || validate(question, action.side);
      const elapsed = action.now - state.shownAt;

      // A wrong answer costs time rather than points. On a two-way choice,
      // guessing has to be worse than thinking or the game is a coin flip.
      const endsAt = ok ? state.endsAt : state.endsAt - WRONG_PENALTY_MS;
      const streak = ok ? state.streak + 1 : 0;

      const next: RunState = {
        ...state,
        assisted: state.assisted || action.assist,
        index: state.index + 1,
        attempted: state.attempted + 1,
        correct: state.correct + (ok ? 1 : 0),
        streak,
        bestStreak: Math.max(state.bestStreak, streak),
        points:
          state.points +
          (ok
            ? score(question, elapsed, state.streak) + streakMilestoneBonus(streak)
            : WRONG_POINTS),
        endsAt,
        shownAt: action.now,
        feedback: { id: state.index, ok },
        tape: [...state.tape, { id: state.index, ok, ms: elapsed }],
      };

      return endsAt <= action.now ? { ...next, phase: "done" } : next;
    }

    case "finish":
      return state.phase === "running" ? { ...state, phase: "done" } : state;
  }
}

export function EqualizeGame({ keysEnabled = true }: { keysEnabled?: boolean } = {}) {
  const [run, dispatch] = useReducer(reducer, EMPTY);
  const [now, setNow] = useState(0);
  const challenge = useChallenge();
  const assist = useAssist();
  const [best, recordBest] = usePersonalBest("cmquant:equalize:best");

  // The accuracy multiplier lands once, on the whole run, and the personal best
  // records what the player actually finished with. Computed here rather than
  // beside the results screen so the persist effect below can see it.
  const runMultiplier = accuracyMultiplier(run.correct, run.attempted);
  const runPoints = finalScore(run.points, run.correct, run.attempted);

  const start = useCallback(() => {
    dispatch({ type: "start", seed: challenge?.seed ?? makeSeed(), now: Date.now() });
    setNow(Date.now());
  }, [challenge]);

  const answer = useCallback(
    (side: Side) => {
      dispatch({ type: "answer", side, now: Date.now(), assist });
    },
    [assist]
  );

  // Clock. 100ms is fine because the digits are tabular and never jitter.
  useEffect(() => {
    if (run.phase !== "running") return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= run.endsAt) dispatch({ type: "finish" });
    }, 100);
    return () => window.clearInterval(id);
  }, [run.phase, run.endsAt]);

  // Persist the personal best once the round closes. This writes to an external
  // store rather than setting state, so the re-render comes from the store's
  // own subscription instead of a cascading update.
  useEffect(() => {
    if (run.phase === "done" && !run.assisted) recordBest(runPoints);
  }, [run.phase, run.assisted, runPoints, recordBest]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Auto-repeat. Holding a key down fires keydown dozens of times a
      // second, which turned "lean on one arrow" into a viable strategy.
      if (e.repeat) return;
      if (run.phase === "running") {
        if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") {
          e.preventDefault();
          answer("left");
        } else if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") {
          e.preventDefault();
          answer("right");
        }
        return;
      }
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        start();
      }
    }
    if (!keysEnabled) return;
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [run.phase, answer, start, keysEnabled]);

  const question = useMemo(
    () => (run.phase === "running" ? questionAt(run.seed, run.index) : null),
    [run.phase, run.seed, run.index]
  );

  const remaining = Math.max(0, run.endsAt - now);

  if (run.phase === "done") {
    return (
      <ResultsCard
        gameName="Equalize"
        challengePath="/"
        seed={run.seed}
        points={runPoints}
        rawPoints={run.points}
        accuracyMultiplier={runMultiplier}
        correct={run.correct}
        attempted={run.attempted}
        bestStreak={run.bestStreak}
        personalBest={best}
        isPersonalBest={runPoints >= best && runPoints > 0}
        challengeTarget={challenge?.target ?? 0}
        assisted={run.assisted}
        onReplay={start}
      />
    );
  }

  if (run.phase === "idle") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <span className="text-secondary text-[10px] uppercase tracking-[0.18em]">
          Comp / Computational Thinking
        </span>
        <h1 className="mt-5 text-5xl font-medium tracking-tight sm:text-6xl">Equalize</h1>
        <p className="mt-5 max-w-md text-sm leading-relaxed text-secondary">
          Pick the larger of two expressions before you could finish working out
          either one. You get sixty seconds, and every wrong answer takes two of
          them away.
        </p>

        {challenge && (
          <div className="mt-8 border border-hairline px-5 py-3">
            <span className="text-secondary text-[10px] uppercase tracking-[0.18em]">
              Challenge
            </span>
            <p className="mt-2 text-sm text-primary">
              Same questions, same order.{" "}
              {challenge.target > 0 && (
                <>
                  Score to beat{" "}
                  <span className="tabular text-accent-ink">
                    {challenge.target.toLocaleString()}
                  </span>
                </>
              )}
            </p>
            <p className="tabular mt-1 text-[11px] text-muted">seed {challenge.seed}</p>
          </div>
        )}

        <button
          onClick={start}
          className="mt-10 border border-hairline-strong px-10 py-4 text-sm uppercase tracking-[0.18em] text-primary transition-colors hover:border-accent-ink hover:text-accent-ink"
        >
          Start
        </button>
        <p className="mt-5 text-[11px] text-muted">
          Arrow keys or A / D. Space to start.
        </p>
      </div>
    );
  }

  const accuracy = run.attempted
    ? Math.round((run.correct / run.attempted) * 100)
    : 0;

  return (
    <div className="relative flex flex-1 flex-col">
      {/* Feedback layer. Keyed on the answer index so it remounts and replays
          on every single answer, including two of the same kind in a row. */}
      {run.feedback && (
        <div
          key={run.feedback.id}
          className={`flash-layer ${run.feedback.ok ? "flash-correct" : "flash-wrong"}`}
        />
      )}

      <Rail
        assisted={assist}
        code="EQZ"
        remainingMs={remaining}
        totalMs={ROUND_MS}
        penalty={
          run.feedback && !run.feedback.ok
            ? { id: run.feedback.id, label: "−2s" }
            : null
        }
        cells={[
          { label: "Diff", value: `d${String(question?.difficulty ?? 1).padStart(2, "0")}` },
          { label: "Q", value: String(run.index + 1) },
          { label: "Score", value: run.points.toLocaleString() },
          {
            label: "Streak",
            value: String(run.streak),
            tone: run.streak >= 5 ? "pos" : undefined,
          },
          {
            label: "Acc",
            value: run.attempted ? `${accuracy}%` : "—",
            tone: run.attempted && accuracy < 70 ? "neg" : undefined,
          },
          ...(challenge && challenge.target > 0
            ? [
                {
                  label: "Target",
                  value: challenge.target.toLocaleString(),
                  tone: "accent" as const,
                },
              ]
            : []),
        ]}
      />

      {/* Two panes sharing a divider, filling the frame. The expressions used
          to float in the middle of a 1440px screen under a seventy-two pixel
          clock, which is a quiz with the lights off. A comparison is two
          columns; making them two columns is the whole fix. */}
      <div className="relative grid min-h-0 flex-1 grid-cols-2 divide-x divide-hairline-strong">
        <ExprPane
          label="Left"
          hint="◀ / A"
          value={question!.left.display}
          onClick={() => answer("left")}
        />
        <ExprPane
          label="Right"
          hint="D / ▶"
          value={question!.right.display}
          onClick={() => answer("right")}
        />

        {/* The comparator, sitting on the divider itself rather than in a
            column of its own. A third grid column pushed the two panes apart
            and broke the single rule down the middle, which is the thing that
            makes them read as one instrument split in two. */}
        <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border border-hairline-strong bg-surface px-2 py-1 text-[9px] uppercase tracking-[0.18em] text-secondary">
          vs
        </span>
      </div>

      <Tape
        entries={run.tape}
        hint="Pick the larger expression. A wrong answer costs two seconds."
      />
    </div>
  );
}

/**
 * One side of the comparison, as a full-height pane you can click anywhere in.
 * The old version was a bordered button with a margin, which makes two cards
 * on a page; a pane that reaches the edges of its column makes an instrument.
 */
function ExprPane({
  label,
  value,
  hint,
  onClick,
}: {
  label: string;
  value: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex min-w-0 flex-col text-left transition-colors hover:bg-accent/[0.07]"
    >
      {/* A header strip on each pane. Without it the two expressions float in
          the middle of an empty column and the screen is a quiz again. */}
      <span className="flex w-full shrink-0 items-baseline justify-between border-b border-hairline px-3 py-1.5">
        <span className="text-[9px] uppercase tracking-[0.18em] text-secondary">
          {label}
        </span>
        <span className="tabular text-[9px] text-muted">{hint}</span>
      </span>

      <span className="flex min-h-0 flex-1 items-center justify-center px-4">
        <span className="tabular break-words text-center text-4xl leading-tight text-primary transition-colors group-hover:text-accent-ink sm:text-6xl">
          {value}
        </span>
      </span>

      <span className="w-full shrink-0 border-t border-hairline px-3 py-1.5 text-[9px] uppercase tracking-[0.18em] text-muted opacity-0 transition-opacity group-hover:opacity-100">
        Pick this one
      </span>
    </button>
  );
}

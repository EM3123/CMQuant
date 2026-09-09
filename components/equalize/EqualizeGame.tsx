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
import { ResultsCard } from "@/components/game/ResultsCard";
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
};

type Action =
  | { type: "start"; seed: string; now: number }
  | { type: "answer"; side: Side; now: number }
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
      const ok = validate(question, action.side);
      const elapsed = action.now - state.shownAt;

      // A wrong answer costs time rather than points. On a two-way choice,
      // guessing has to be worse than thinking or the game is a coin flip.
      const endsAt = ok ? state.endsAt : state.endsAt - WRONG_PENALTY_MS;
      const streak = ok ? state.streak + 1 : 0;

      const next: RunState = {
        ...state,
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

  const answer = useCallback((side: Side) => {
    dispatch({ type: "answer", side, now: Date.now() });
  }, []);

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
    if (run.phase === "done") recordBest(runPoints);
  }, [run.phase, runPoints, recordBest]);

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

  return (
    <div className="relative flex flex-1 flex-col">
      {/* Feedback layer. Keyed on the answer index so it remounts and replays
          on every single answer, including two of the same kind in a row. */}
      {run.feedback && (
        <div
          key={run.feedback.id}
          className={`flash-layer ${run.feedback.ok ? "bg-data-pos/20" : "bg-data-neg/25"}`}
        />
      )}

      <header className="flex shrink-0 items-center justify-between border-b border-hairline px-4 py-2">
        <div className="flex items-baseline gap-3">
          <span className="text-[10px] uppercase tracking-[0.18em] text-secondary">
            Equalize
          </span>
          <span className="tabular text-[10px] text-muted">
            d{String(question?.difficulty ?? 1).padStart(2, "0")}
          </span>
        </div>
        <div className="flex items-center gap-6">
          <Stat label="Score" value={run.points.toLocaleString()} />
          <Stat
            label="Streak"
            value={String(run.streak)}
            tone={run.streak >= 5 ? "pos" : undefined}
          />
          {challenge && challenge.target > 0 && (
            <Stat label="Target" value={challenge.target.toLocaleString()} tone="accent" />
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-10 px-4">
        <div className="relative">
          <span className="tabular text-7xl leading-none text-primary">
            {formatClock(remaining)}
          </span>
          {run.feedback && !run.feedback.ok && (
            <span
              key={run.feedback.id}
              className="rise-away tabular absolute -right-16 top-3 text-2xl text-data-neg"
            >
              −2s
            </span>
          )}
        </div>

        <div className="flex w-full max-w-4xl items-stretch">
          <ExprButton value={question!.left.display} onClick={() => answer("left")} />
          <div className="flex w-14 shrink-0 items-center justify-center border-y border-hairline">
            <span className="text-xs text-muted">vs</span>
          </div>
          <ExprButton value={question!.right.display} onClick={() => answer("right")} />
        </div>

        <div className="flex items-center gap-16">
          <KeyHint hint="◀" label="Left" />
          <KeyHint hint="▶" label="Right" />
        </div>
      </div>

      <footer className="shrink-0 border-t border-hairline px-4 py-1.5 text-center text-[10px] text-muted">
        Pick the larger expression. A wrong answer costs two seconds.
      </footer>
    </div>
  );
}

function formatClock(ms: number): string {
  const seconds = ms / 1000;
  // Under ten seconds the tenths do the work of making it feel urgent.
  if (seconds <= 10) return (Math.ceil(ms / 100) / 10).toFixed(1);
  const total = Math.ceil(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "pos" | "accent";
}) {
  const colour =
    tone === "pos" ? "text-data-pos" : tone === "accent" ? "text-accent-ink" : "text-primary";
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[10px] uppercase tracking-[0.18em] text-secondary">{label}</span>
      <span className={`tabular text-sm ${colour}`}>{value}</span>
    </div>
  );
}

function ExprButton({ value, onClick }: { value: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-1 basis-0 items-center justify-center border border-hairline px-5 py-12 transition-colors hover:border-hairline-strong hover:bg-white/[0.03] sm:py-16"
    >
      {/* Never wrap. An expression broken across two lines stops being one
          glanceable quantity, which is the whole skill being trained. */}
      <span className="tabular whitespace-nowrap text-[clamp(1.25rem,4vw,2.75rem)] text-primary">
        {value}
      </span>
    </button>
  );
}

function KeyHint({ hint, label }: { hint: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex h-10 w-10 items-center justify-center border border-hairline-strong text-secondary">
        {hint}
      </div>
      <span className="text-[10px] uppercase tracking-[0.18em] text-secondary">{label}</span>
    </div>
  );
}

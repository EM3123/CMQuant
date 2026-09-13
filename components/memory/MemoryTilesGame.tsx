"use client";

import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import {
  questionAt,
  score,
  ROUND_MS,
  WRONG_PENALTY_MS,
} from "@/lib/games/memorytiles";
import { makeSeed } from "@/lib/rng";
import { useChallenge, usePersonalBest } from "@/lib/browserState";
import { useAssist } from "@/lib/assist";
import { ResultsCard } from "@/components/game/ResultsCard";
import {
  WRONG_POINTS,
  streakMilestoneBonus,
  accuracyMultiplier,
  finalScore,
} from "@/lib/scoring";

/**
 * Memory Tiles does not run on ChoiceRun, and that is the useful finding.
 *
 * ChoiceRun assumes one keypress settles one question. A recall question has
 * a show phase, a recall phase, and takes several taps before it resolves, so
 * it needs its own reducer. What did generalise is everything below the
 * runtime: the seeded generator, the scoring economy, the personal-best store
 * and the results card are all shared unchanged.
 */

type Phase = "idle" | "running" | "done";
type Step = "show" | "recall";

type RunState = {
  phase: Phase;
  step: Step;
  seed: string;
  index: number;
  found: number[];
  correct: number;
  attempted: number;
  streak: number;
  bestStreak: number;
  points: number;
  endsAt: number;
  /** When the recall phase opened. The show phase must not count against the
   *  player's time, or a slower reveal would score worse for no reason. */
  recallFrom: number;
  /** Sticky. One assisted answer marks the whole run, and it never unsets. */
  assisted: boolean;
  feedback: { id: number; ok: boolean } | null;
};

const EMPTY: RunState = {
  phase: "idle",
  step: "show",
  seed: "",
  index: 0,
  found: [],
  correct: 0,
  attempted: 0,
  streak: 0,
  bestStreak: 0,
  points: 0,
  endsAt: 0,
  recallFrom: 0,
  feedback: null,
  assisted: false,
};

type Action =
  | { type: "start"; seed: string; now: number }
  | { type: "reveal"; now: number }
  | { type: "tap"; cell: number; now: number; assist: boolean }
  | { type: "finish" };

function advance(state: RunState, ok: boolean, now: number): RunState {
  const question = questionAt(state.seed, state.index);
  const endsAt = ok ? state.endsAt : state.endsAt - WRONG_PENALTY_MS;
  const streak = ok ? state.streak + 1 : 0;

  const next: RunState = {
    ...state,
    step: "show",
    index: state.index + 1,
    found: [],
    attempted: state.attempted + 1,
    correct: state.correct + (ok ? 1 : 0),
    streak,
    bestStreak: Math.max(state.bestStreak, streak),
    points:
      state.points +
      (ok
        ? score(question, now - state.recallFrom, state.streak) + streakMilestoneBonus(streak)
        : WRONG_POINTS),
    endsAt,
    feedback: { id: state.index, ok },
  };

  return endsAt <= now ? { ...next, phase: "done" } : next;
}

function reducer(state: RunState, action: Action): RunState {
  switch (action.type) {
    case "start":
      return {
        ...EMPTY,
        phase: "running",
        step: "show",
        seed: action.seed,
        endsAt: action.now + ROUND_MS,
        recallFrom: action.now,
      };

    case "reveal":
      if (state.phase !== "running" || state.step !== "show") return state;
      return { ...state, step: "recall", recallFrom: action.now };

    case "tap": {
      if (state.phase !== "running" || state.step !== "recall") return state;
      const question = questionAt(state.seed, state.index);

      // Assist completes the whole pattern on one tap - marking a single wrong
      // tile correct would leave the sequence unfinished and stall the round.
      if (action.assist) {
        return advance({ ...state, assisted: true }, true, action.now);
      }

      if (!question.tiles.includes(action.cell)) return advance(state, false, action.now);
      if (state.found.includes(action.cell)) return state;

      const found = [...state.found, action.cell];
      if (found.length === question.tiles.length) return advance(state, true, action.now);
      return { ...state, found };
    }

    case "finish":
      return state.phase === "running" ? { ...state, phase: "done" } : state;
  }
}

export function MemoryTilesGame() {
  const [run, dispatch] = useReducer(reducer, EMPTY);
  const [now, setNow] = useState(0);
  const challenge = useChallenge();
  const assist = useAssist();
  const [best, recordBest] = usePersonalBest("cmquant:memorytiles:best");

  const runMultiplier = accuracyMultiplier(run.correct, run.attempted);
  const runPoints = finalScore(run.points, run.correct, run.attempted);

  const start = useCallback(() => {
    dispatch({ type: "start", seed: challenge?.seed ?? makeSeed(), now: Date.now() });
    setNow(Date.now());
  }, [challenge]);

  const question = useMemo(
    () => (run.phase === "running" ? questionAt(run.seed, run.index) : null),
    [run.phase, run.seed, run.index]
  );

  // Hold the pattern up, then take it away. Keyed on the question index so a
  // new pattern always gets its own full reveal.
  useEffect(() => {
    if (run.phase !== "running" || run.step !== "show" || !question) return;
    const id = window.setTimeout(
      () => dispatch({ type: "reveal", now: Date.now() }),
      question.showMs
    );
    return () => window.clearTimeout(id);
  }, [run.phase, run.step, run.index, question]);

  useEffect(() => {
    if (run.phase !== "running") return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= run.endsAt) dispatch({ type: "finish" });
    }, 100);
    return () => window.clearInterval(id);
  }, [run.phase, run.endsAt]);

  useEffect(() => {
    if (run.phase === "done" && !run.assisted) recordBest(runPoints);
  }, [run.phase, run.assisted, runPoints, recordBest]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.repeat) return;
      if (run.phase !== "running" && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        start();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [run.phase, start]);

  const remaining = Math.max(0, run.endsAt - now);

  if (run.phase === "done") {
    return (
      <ResultsCard
        gameName="Memory Tiles"
        challengePath="/g/memory-tiles"
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
        <span className="text-[10px] uppercase tracking-[0.18em] text-secondary">
          Comp / Computational Thinking
        </span>
        <h1 className="mt-5 text-5xl font-medium tracking-tight sm:text-6xl">
          Memory Tiles
        </h1>
        <p className="mt-5 max-w-md text-sm leading-relaxed text-secondary">
          A pattern lights up and goes dark. Tap it back. The board grows and the
          reveal gets shorter, and one wrong tile ends the pattern.
        </p>

        {challenge && (
          <div className="mt-8 border border-hairline px-5 py-3">
            <span className="text-[10px] uppercase tracking-[0.18em] text-secondary">
              Challenge
            </span>
            <p className="mt-2 text-sm text-primary">
              Same patterns, same order.{" "}
              {challenge.target > 0 && (
                <>
                  Score to beat{" "}
                  <span className="tabular text-accent-ink">
                    {challenge.target.toLocaleString()}
                  </span>
                </>
              )}
            </p>
          </div>
        )}

        <button
          onClick={start}
          className="mt-10 border border-hairline-strong px-10 py-4 text-sm uppercase tracking-[0.18em] text-primary transition-colors hover:border-accent-ink hover:text-accent-ink"
        >
          Start
        </button>
        <p className="mt-5 text-[11px] text-muted">
          Tap or click the tiles. A miss costs three seconds.
        </p>
      </div>
    );
  }

  const showing = run.step === "show";

  return (
    <div className="relative flex flex-1 flex-col">
      {run.feedback && (
        <div
          key={run.feedback.id}
          className={`flash-layer ${run.feedback.ok ? "bg-data-pos/20" : "bg-data-neg/25"}`}
        />
      )}

      <header className="flex shrink-0 items-center justify-between border-b border-hairline px-4 py-2">
        <div className="flex items-baseline gap-3">
          <span className="text-[10px] uppercase tracking-[0.18em] text-secondary">
            Memory Tiles
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
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-4">
        <div className="relative">
          <span className="tabular text-5xl leading-none text-primary sm:text-6xl">
            {formatClock(remaining)}
          </span>
          {run.feedback && !run.feedback.ok && (
            <span
              key={run.feedback.id}
              className="rise-away tabular absolute -right-14 top-2 text-xl text-data-neg"
            >
              −3s
            </span>
          )}
        </div>

        <span className="text-[10px] uppercase tracking-[0.18em] text-secondary">
          {showing
            ? "Watch"
            : `${run.found.length} / ${question!.tiles.length} recalled`}
        </span>

        <div
          className="grid w-full max-w-[22rem] gap-1.5 sm:max-w-sm"
          style={{ gridTemplateColumns: `repeat(${question!.size}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: question!.size * question!.size }).map((_, cell) => {
            const inPattern = question!.tiles.includes(cell);
            const lit = showing && inPattern;
            const recalled = !showing && run.found.includes(cell);

            return (
              <button
                key={cell}
                type="button"
                disabled={showing}
                onPointerDown={(e) => {
                  e.preventDefault();
                  dispatch({ type: "tap", cell, now: Date.now(), assist });
                }}
                className={`aspect-square touch-manipulation border transition-colors duration-100 ${
                  lit
                    ? "border-accent-ink bg-accent-ink/70"
                    : recalled
                      ? "border-data-pos bg-data-pos/40"
                      : "border-hairline bg-surface-raised active:bg-white/[0.06]"
                }`}
                aria-label={`tile ${cell + 1}`}
              />
            );
          })}
        </div>
      </div>

      <footer className="shrink-0 border-t border-hairline px-4 py-1.5 text-center text-[10px] text-muted">
        {showing ? "Remember the pattern." : "Tap every tile that was lit."}
      </footer>
    </div>
  );
}

function formatClock(ms: number): string {
  const seconds = ms / 1000;
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
  tone?: "pos";
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[10px] uppercase tracking-[0.18em] text-secondary">{label}</span>
      <span className={`tabular text-sm ${tone === "pos" ? "text-data-pos" : "text-primary"}`}>
        {value}
      </span>
    </div>
  );
}

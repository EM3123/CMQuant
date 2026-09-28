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
import type { Answer } from "@/lib/insights";
import type { RunMode } from "@/components/game/ChoiceRun";
import {
  LIVES,
  livesAfter,
  windowMs,
  endlessScore,
  endlessKey,
  endlessRecord,
  unpackRecord,
} from "@/lib/endless";
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
  /** Fixed at start. A run that changed mode belongs on neither board. */
  mode: RunMode;
  seed: string;
  index: number;
  found: number[];
  correct: number;
  attempted: number;
  streak: number;
  bestStreak: number;
  points: number;
  endsAt: number;
  /** Endless only. Lives left, and the deadline on the recall in front of
   *  you. The deadline is zero while the pattern is still being shown: the
   *  window is set when the board goes dark, for the same reason recallFrom
   *  exists. A clock that ran during the reveal would take lives off a
   *  player who had not been allowed to touch anything yet. */
  lives: number;
  questionEndsAt: number;
  /** Endless only. Patterns recalled correctly - the headline number. */
  cleared: number;
  /** When the recall phase opened. The show phase must not count against the
   *  player's time, or a slower reveal would score worse for no reason. */
  recallFrom: number;
  /** Sticky. One assisted answer marks the whole run, and it never unsets. */
  assisted: boolean;
  feedback: { id: number; ok: boolean } | null;
  /** The tape. Every answer with how long it took, oldest first. */
  tape: Answer[];
};

const EMPTY: RunState = {
  phase: "idle",
  step: "show",
  mode: "timed",
  seed: "",
  index: 0,
  found: [],
  correct: 0,
  attempted: 0,
  streak: 0,
  bestStreak: 0,
  points: 0,
  endsAt: 0,
  lives: LIVES,
  questionEndsAt: 0,
  cleared: 0,
  recallFrom: 0,
  feedback: null,
  tape: [],
  assisted: false,
};

type Action =
  | { type: "start"; seed: string; now: number; mode: RunMode }
  | { type: "reveal"; now: number }
  | { type: "tap"; cell: number; now: number; assist: boolean }
  /** Endless only. The window on the current recall closed. */
  | { type: "timeout"; now: number }
  | { type: "finish" };

function advance(state: RunState, ok: boolean, now: number): RunState {
  const question = questionAt(state.seed, state.index);
  const endless = state.mode === "endless";
  // The three-second miss penalty is a sixty-second idea. Endless has no
  // round clock to take seconds off, so a miss costs a life instead.
  const endsAt = ok || endless ? state.endsAt : state.endsAt - WRONG_PENALTY_MS;
  const streak = ok ? state.streak + 1 : 0;
  const lives = endless ? livesAfter(state.lives, ok ? "correct" : "wrong") : state.lives;

  const next: RunState = {
    ...state,
    step: "show",
    index: state.index + 1,
    found: [],
    attempted: state.attempted + 1,
    correct: state.correct + (ok ? 1 : 0),
    cleared: state.cleared + (ok ? 1 : 0),
    lives,
    streak,
    bestStreak: Math.max(state.bestStreak, streak),
    // Endless scores by its own rules. Reusing the timed economy would
    // produce a number that sorts next to a timed score and means
    // something else - see lib/endless.ts.
    points:
      state.points +
      (endless
        ? ok
          ? endlessScore(state.index, question.difficulty, now - state.recallFrom)
          : 0
        : ok
          ? score(question, now - state.recallFrom, state.streak) + streakMilestoneBonus(streak)
          : WRONG_POINTS),
    endsAt,
    // Unset until the next pattern goes dark. The reveal is not the
    // player's time and must not be on their clock.
    questionEndsAt: 0,
    tape: [...state.tape, { id: state.index, ok, ms: now - state.recallFrom }],
    feedback: { id: state.index, ok },
  };

  if (endless) return lives <= 0 ? { ...next, phase: "done" } : next;
  return endsAt <= now ? { ...next, phase: "done" } : next;
}

function reducer(state: RunState, action: Action): RunState {
  switch (action.type) {
    case "start":
      return {
        ...EMPTY,
        phase: "running",
        step: "show",
        mode: action.mode,
        seed: action.seed,
        // Timed runs get a round clock. Endless runs get a per-recall one
        // and a deadline past the end of time, so nothing below has to
        // branch on the mode just to read one.
        endsAt:
          action.mode === "timed" ? action.now + ROUND_MS : Number.MAX_SAFE_INTEGER,
        recallFrom: action.now,
      };

    case "reveal":
      if (state.phase !== "running" || state.step !== "show") return state;
      // The window opens here rather than when the question did. Everything
      // before this moment was the game showing you something.
      return {
        ...state,
        step: "recall",
        recallFrom: action.now,
        questionEndsAt: action.now + windowMs(state.index),
      };

    case "timeout": {
      if (state.phase !== "running" || state.mode !== "endless") return state;
      // Only a recall can time out. A pattern still being shown has no
      // deadline, and questionEndsAt is zero until it does.
      if (state.step !== "recall") return state;

      // Flagged in the tape rather than left out of it. See the same branch
      // in ChoiceRun, and the Answer type in lib/insights.
      const lives = livesAfter(state.lives, "timeout");
      const next: RunState = {
        ...state,
        step: "show",
        index: state.index + 1,
        found: [],
        attempted: state.attempted + 1,
        lives,
        streak: 0,
        questionEndsAt: 0,
        feedback: { id: state.index, ok: false },
        tape: [
          ...state.tape,
          { id: state.index, ok: false, ms: windowMs(state.index), timedOut: true },
        ],
      };
      return lives <= 0 ? { ...next, phase: "done" } : next;
    }

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
  // A separate store. An endless record and a timed score are different
  // quantities and must never sort against each other.
  const [endlessBest, recordEndless] = usePersonalBest(
    endlessKey("cmquant:memorytiles:best")
  );
  const [mode, setMode] = useState<RunMode>("timed");
  const endless = run.mode === "endless";

  const runMultiplier = accuracyMultiplier(run.correct, run.attempted);
  const runPoints = endless
    ? run.points
    : finalScore(run.points, run.correct, run.attempted);

  const start = useCallback(() => {
    dispatch({ type: "start", seed: challenge?.seed ?? makeSeed(), now: Date.now(), mode });
    setNow(Date.now());
  }, [challenge, mode]);

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
      // Endless has no round clock - endsAt is set past the end of time - so
      // the deadline that matters is the one on the recall. Zero means the
      // pattern is still on screen and nothing is due yet.
      if (run.mode === "endless") {
        if (run.questionEndsAt > 0 && t >= run.questionEndsAt) {
          dispatch({ type: "timeout", now: t });
        }
      } else if (t >= run.endsAt) {
        dispatch({ type: "finish" });
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [run.phase, run.mode, run.endsAt, run.questionEndsAt]);

  useEffect(() => {
    if (run.phase !== "done" || run.assisted) return;
    if (run.mode === "endless") recordEndless(endlessRecord(run.cleared, run.points));
    else recordBest(runPoints);
  }, [
    run.phase,
    run.assisted,
    run.mode,
    run.cleared,
    run.points,
    runPoints,
    recordBest,
    recordEndless,
  ]);

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

  // In endless the number on screen is the window on this recall, and it
  // shows the full window while the pattern is still up - the clock has not
  // started, and a frozen number says that better than a blank does.
  const remaining = endless
    ? run.questionEndsAt > 0
      ? Math.max(0, run.questionEndsAt - now)
      : windowMs(run.index)
    : Math.max(0, run.endsAt - now);

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
        personalBest={endless ? unpackRecord(endlessBest).cleared : best}
        isPersonalBest={
          endless
            ? endlessRecord(run.cleared, run.points) >= endlessBest && run.cleared > 0
            : runPoints >= best && runPoints > 0
        }
        challengeTarget={endless ? 0 : challenge?.target ?? 0}
        endless={endless ? { cleared: run.cleared, lives: run.lives } : undefined}
        tape={run.tape}
        assisted={run.assisted}
        onReplay={start}
      />
    );
  }

  if (run.phase === "idle") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center [justify-content:safe_center] overflow-y-auto px-6 text-center">
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

        {/* Mode is chosen before the run, never during it - a run that
            switched halfway belongs on neither board. A challenge link pins
            you to timed, because the whole point of the link is that two
            people played the same thing. */}
        {!challenge && (
          <div className="mt-9 flex border border-hairline">
            {(["timed", "endless"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={`px-5 py-2 text-[10px] uppercase tracking-[0.18em] transition-colors ${
                  mode === m
                    ? "bg-accent/15 text-accent-ink"
                    : "text-secondary hover:text-primary"
                }`}
              >
                {m === "timed" ? "60 seconds" : "Endless"}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={start}
          className="mt-6 border border-hairline-strong px-10 py-4 text-sm uppercase tracking-[0.18em] text-primary transition-colors hover:border-accent-ink hover:text-accent-ink"
        >
          Start
        </button>
        <p className="mt-5 max-w-sm text-[11px] leading-relaxed text-muted">
          {mode === "endless" && !challenge
            ? `Three lives. No round clock - each recall has its own, starting at ${
                windowMs(0) / 1000
              } seconds and closing to ${windowMs(99) / 1000} by the fortieth. The clock starts when the pattern goes dark, never while it is up.`
            : "Tap or click the tiles. A miss costs three seconds."}
        </p>
        {mode === "endless" && !challenge && unpackRecord(endlessBest).cleared > 0 && (
          <p className="tabular mt-2 text-[11px] text-muted">
            furthest {unpackRecord(endlessBest).cleared}
          </p>
        )}
      </div>
    );
  }

  const showing = run.step === "show";

  return (
    <div className="relative flex flex-1 flex-col">
      {run.feedback && (
        <div
          key={run.feedback.id}
          className={`flash-layer ${run.feedback.ok ? "flash-correct" : "flash-wrong"}`}
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
          {endless && (
            <>
              <Stat
                label="Lives"
                value={"●".repeat(run.lives) || "—"}
                tone={run.lives <= 1 ? undefined : "pos"}
              />
              <Stat label="Cleared" value={String(run.cleared)} />
            </>
          )}
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
              {endless ? "−1" : "−3s"}
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

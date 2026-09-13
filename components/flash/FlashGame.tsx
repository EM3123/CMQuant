"use client";

import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import {
  questionAt,
  score,
  ROUND_MS,
  SKIP_PENALTY_MS,
} from "@/lib/games/flash";
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

type Phase = "idle" | "running" | "done";

type RunState = {
  phase: Phase;
  seed: string;
  index: number;
  typed: string;
  correct: number;
  attempted: number;
  streak: number;
  bestStreak: number;
  points: number;
  endsAt: number;
  shownAt: number;
  /** Sticky. One assisted answer marks the whole run, and it never unsets. */
  assisted: boolean;
  feedback: { id: number; ok: boolean } | null;
};

const EMPTY: RunState = {
  phase: "idle",
  seed: "",
  index: 0,
  typed: "",
  correct: 0,
  attempted: 0,
  streak: 0,
  bestStreak: 0,
  points: 0,
  endsAt: 0,
  shownAt: 0,
  feedback: null,
  assisted: false,
};

type Action =
  | { type: "start"; seed: string; now: number }
  | { type: "digit"; digit: string; now: number; assist: boolean }
  | { type: "backspace" }
  | { type: "skip"; now: number }
  | { type: "finish" };

/** Close the current question, right or wrong, and move to the next one. */
function advance(state: RunState, ok: boolean, now: number): RunState {
  const question = questionAt(state.seed, state.index);
  const elapsed = now - state.shownAt;
  const endsAt = ok ? state.endsAt : state.endsAt - SKIP_PENALTY_MS;
  const streak = ok ? state.streak + 1 : 0;

  const next: RunState = {
    ...state,
    index: state.index + 1,
    typed: "",
    attempted: state.attempted + 1,
    correct: state.correct + (ok ? 1 : 0),
    streak,
    bestStreak: Math.max(state.bestStreak, streak),
    points:
      state.points +
      (ok ? score(question, elapsed, state.streak) + streakMilestoneBonus(streak) : WRONG_POINTS),
    endsAt,
    shownAt: now,
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
        seed: action.seed,
        endsAt: action.now + ROUND_MS,
        shownAt: action.now,
      };

    case "digit": {
      if (state.phase !== "running") return state;
      const question = questionAt(state.seed, state.index);
      // Flash is typed, so assist cannot mark a choice correct - it closes
      // the question on the first keystroke instead.
      if (action.assist) return advance({ ...state, assisted: true }, true, action.now);

      const typed = state.typed + action.digit;

      // Auto-advance the instant the digits match. Nobody should have to press
      // Enter to confirm an answer they have already finished typing.
      if (Number(typed) === question.answer) return advance(state, true, action.now);

      // Once you have typed as many digits as the answer has and it still does
      // not match, it is wrong. Leaving it on screen would just strand you.
      if (typed.length >= String(question.answer).length) {
        return advance(state, false, action.now);
      }

      return { ...state, typed };
    }

    case "backspace":
      return state.phase === "running" ? { ...state, typed: state.typed.slice(0, -1) } : state;

    case "skip":
      return state.phase === "running" ? advance(state, false, action.now) : state;

    case "finish":
      return state.phase === "running" ? { ...state, phase: "done" } : state;
  }
}

export function FlashGame() {
  const [run, dispatch] = useReducer(reducer, EMPTY);
  const [now, setNow] = useState(0);
  const challenge = useChallenge();
  const assist = useAssist();
  const [best, recordBest] = usePersonalBest("cmquant:flash:best");

  // The accuracy multiplier lands once, on the whole run, and the personal best
  // records what the player actually finished with. Computed here rather than
  // beside the results screen so the persist effect below can see it.
  const runMultiplier = accuracyMultiplier(run.correct, run.attempted);
  const runPoints = finalScore(run.points, run.correct, run.attempted);

  const start = useCallback(() => {
    dispatch({ type: "start", seed: challenge?.seed ?? makeSeed(), now: Date.now() });
    setNow(Date.now());
  }, [challenge]);

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
      // Auto-repeat. Holding a key down fires keydown dozens of times a
      // second, which turned "lean on one arrow" into a viable strategy.
      if (e.repeat) return;
      if (run.phase === "running") {
        if (/^\d$/.test(e.key)) {
          e.preventDefault();
          dispatch({ type: "digit", digit: e.key, now: Date.now(), assist });
        } else if (e.key === "Backspace") {
          e.preventDefault();
          dispatch({ type: "backspace" });
        } else if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          dispatch({ type: "skip", now: Date.now() });
        }
        return;
      }
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        start();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [run.phase, start, assist]);

  const question = useMemo(
    () => (run.phase === "running" ? questionAt(run.seed, run.index) : null),
    [run.phase, run.seed, run.index]
  );

  const remaining = Math.max(0, run.endsAt - now);

  if (run.phase === "done") {
    return (
      <ResultsCard
        gameName="Flash"
        challengePath="/g/flash"
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
        <h1 className="mt-5 text-5xl font-medium tracking-tight sm:text-6xl">Flash</h1>
        <p className="mt-5 max-w-md text-sm leading-relaxed text-secondary">
          Arithmetic, one problem at a time, for sixty seconds. Type the answer and
          it submits itself the moment your digits match, which leaves nothing here
          to guess at.
        </p>

        {challenge && (
          <div className="mt-8 border border-hairline px-5 py-3">
            <span className="text-[10px] uppercase tracking-[0.18em] text-secondary">
              Challenge
            </span>
            <p className="mt-2 text-sm text-primary">
              Same problems, same order.{" "}
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
          Number keys, or tap the pad. Skip costs two seconds.
        </p>
      </div>
    );
  }

  const expected = String(question!.answer).length;

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
          <span className="text-[10px] uppercase tracking-[0.18em] text-secondary">Flash</span>
          <span className="tabular text-[10px] text-muted">
            d{String(question?.difficulty ?? 1).padStart(2, "0")}
          </span>
        </div>
        <div className="flex items-center gap-6">
          <Stat label="Score" value={run.points.toLocaleString()} />
          <Stat label="Streak" value={String(run.streak)} tone={run.streak >= 5 ? "pos" : undefined} />
          {challenge && challenge.target > 0 && (
            <Stat label="Target" value={challenge.target.toLocaleString()} tone="accent" />
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-4 sm:gap-8">
        <div className="relative">
          <span className="tabular text-5xl leading-none text-primary sm:text-6xl">
            {formatClock(remaining)}
          </span>
          {run.feedback && !run.feedback.ok && (
            <span
              key={run.feedback.id}
              className="rise-away tabular absolute -right-16 top-2 text-2xl text-data-neg"
            >
              −2s
            </span>
          )}
        </div>

        <div className="tabular whitespace-nowrap text-[clamp(2rem,7vw,4.5rem)] leading-none text-primary">
          {question!.display}
        </div>

        {/* One slot per digit of the answer. It tells you how long the answer
            is without telling you what it is, the way a crossword does. */}
        <div className="flex items-end gap-2">
          {Array.from({ length: expected }).map((_, i) => (
            <span
              key={i}
              className={`tabular flex h-12 w-9 items-center justify-center border-b-2 text-3xl sm:h-16 sm:w-11 sm:text-4xl ${
                run.typed[i]
                  ? "border-accent-ink text-primary"
                  : "border-hairline-strong text-muted"
              }`}
            >
              {run.typed[i] ?? ""}
            </span>
          ))}
        </div>

        {/* Flash was keyboard-only, which made it unplayable on a phone - and a
            phone is exactly where a shared challenge link gets opened. The pad
            renders everywhere rather than behind a touch check, because a
            visible pad also tells a first-time player what the game wants. */}
        <Keypad
          onDigit={(digit) => dispatch({ type: "digit", digit, now: Date.now(), assist })}
          onBackspace={() => dispatch({ type: "backspace" })}
          onSkip={() => dispatch({ type: "skip", now: Date.now() })}
        />
      </div>

      <footer className="shrink-0 border-t border-hairline px-4 py-1.5 text-center text-[10px] text-muted">
        Type the answer, or tap. Skip costs two seconds.
      </footer>
    </div>
  );
}

function Keypad({
  onDigit,
  onBackspace,
  onSkip,
}: {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="grid w-full max-w-[17rem] grid-cols-3 gap-1.5 sm:max-w-xs">
      {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
        <Key key={digit} onPress={() => onDigit(digit)}>
          {digit}
        </Key>
      ))}
      <Key onPress={onSkip} muted>
        Skip
      </Key>
      <Key onPress={() => onDigit("0")}>0</Key>
      <Key onPress={onBackspace} muted>
        ⌫
      </Key>
    </div>
  );
}

function Key({
  children,
  onPress,
  muted = false,
}: {
  children: React.ReactNode;
  onPress: () => void;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      // Pointer-down rather than click: a click waits for the release, and this
      // game is scored in tenths of a second.
      onPointerDown={(e) => {
        e.preventDefault();
        onPress();
      }}
      className={`tabular touch-manipulation select-none border border-hairline py-3 text-xl transition-colors active:border-accent-ink active:bg-white/[0.06] sm:py-2.5 sm:text-lg ${
        muted ? "text-secondary" : "text-primary"
      }`}
    >
      {children}
    </button>
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

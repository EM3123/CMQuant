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

type Phase = "idle" | "running" | "done";

type RunState = {
  phase: Phase;
  /** Fixed at start. A run that changed mode belongs on neither board. */
  mode: RunMode;
  seed: string;
  index: number;
  typed: string;
  correct: number;
  attempted: number;
  streak: number;
  bestStreak: number;
  points: number;
  endsAt: number;
  /** Endless only. Lives left, and the deadline on the problem on screen. */
  lives: number;
  questionEndsAt: number;
  /** Endless only. Problems answered correctly - the headline number. */
  cleared: number;
  shownAt: number;
  /** Sticky. One assisted answer marks the whole run, and it never unsets. */
  assisted: boolean;
  feedback: { id: number; ok: boolean } | null;
  /** The tape. Every answer with how long it took, oldest first. */
  tape: Answer[];
};

const EMPTY: RunState = {
  phase: "idle",
  mode: "timed",
  seed: "",
  index: 0,
  typed: "",
  correct: 0,
  attempted: 0,
  streak: 0,
  bestStreak: 0,
  points: 0,
  endsAt: 0,
  lives: LIVES,
  questionEndsAt: 0,
  cleared: 0,
  shownAt: 0,
  feedback: null,
  tape: [],
  assisted: false,
};

type Action =
  | { type: "start"; seed: string; now: number; mode: RunMode }
  | { type: "digit"; digit: string; now: number; assist: boolean }
  | { type: "backspace" }
  | { type: "skip"; now: number }
  /** Endless only. The window on the current problem closed. */
  | { type: "timeout"; now: number }
  | { type: "finish" };

/** Close the current question, right or wrong, and move to the next one. */
function advance(state: RunState, ok: boolean, now: number): RunState {
  const question = questionAt(state.seed, state.index);
  const elapsed = now - state.shownAt;
  const endless = state.mode === "endless";
  // The two-second skip penalty is a sixty-second idea. Endless has no
  // round clock to take seconds off, so a miss costs a life instead.
  const endsAt = ok || endless ? state.endsAt : state.endsAt - SKIP_PENALTY_MS;
  const streak = ok ? state.streak + 1 : 0;
  const lives = endless ? livesAfter(state.lives, ok ? "correct" : "wrong") : state.lives;

  const next: RunState = {
    ...state,
    index: state.index + 1,
    typed: "",
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
          ? endlessScore(state.index, question.difficulty, elapsed)
          : 0
        : ok
          ? score(question, elapsed, state.streak) + streakMilestoneBonus(streak)
          : WRONG_POINTS),
    endsAt,
    questionEndsAt: now + windowMs(state.index + 1),
    shownAt: now,
    tape: [...state.tape, { id: state.index, ok, ms: elapsed }],
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
        mode: action.mode,
        seed: action.seed,
        // Timed runs get a round clock. Endless runs get a per-question one
        // and a deadline past the end of time, so nothing below has to
        // branch on the mode just to read one.
        endsAt:
          action.mode === "timed" ? action.now + ROUND_MS : Number.MAX_SAFE_INTEGER,
        questionEndsAt: action.now + windowMs(0),
        shownAt: action.now,
      };

    case "timeout": {
      if (state.phase !== "running" || state.mode !== "endless") return state;

      // Flagged in the tape rather than left out of it. See the same branch
      // in ChoiceRun, and the Answer type in lib/insights.
      const lives = livesAfter(state.lives, "timeout");
      const next: RunState = {
        ...state,
        index: state.index + 1,
        typed: "",
        attempted: state.attempted + 1,
        lives,
        streak: 0,
        questionEndsAt: action.now + windowMs(state.index + 1),
        shownAt: action.now,
        feedback: { id: state.index, ok: false },
        tape: [
          ...state.tape,
          { id: state.index, ok: false, ms: windowMs(state.index), timedOut: true },
        ],
      };
      return lives <= 0 ? { ...next, phase: "done" } : next;
    }

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
  // A separate store. An endless record and a timed score are different
  // quantities and must never sort against each other.
  const [endlessBest, recordEndless] = usePersonalBest(endlessKey("cmquant:flash:best"));
  const [mode, setMode] = useState<RunMode>("timed");
  const endless = run.mode === "endless";

  // The accuracy multiplier lands once, on the whole run, and the personal best
  // records what the player actually finished with. Computed here rather than
  // beside the results screen so the persist effect below can see it.
  const runMultiplier = accuracyMultiplier(run.correct, run.attempted);
  const runPoints = endless
    ? run.points
    : finalScore(run.points, run.correct, run.attempted);

  const start = useCallback(() => {
    dispatch({ type: "start", seed: challenge?.seed ?? makeSeed(), now: Date.now(), mode });
    setNow(Date.now());
  }, [challenge, mode]);

  useEffect(() => {
    if (run.phase !== "running") return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      // Endless has no round clock - endsAt is set past the end of time - so
      // the deadline that matters is the one on the problem on screen.
      if (run.mode === "endless") {
        if (t >= run.questionEndsAt) dispatch({ type: "timeout", now: t });
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

  // In endless the number on screen is the window on this problem, not a
  // round clock - there is no round clock.
  const remaining = endless
    ? Math.max(0, run.questionEndsAt - now)
    : Math.max(0, run.endsAt - now);

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
            ? `Three lives. No round clock - each problem has its own, starting at ${
                windowMs(0) / 1000
              } seconds and closing to ${windowMs(99) / 1000} by the fortieth. A wrong answer, a skip or a closed window costs a life.`
            : "Number keys, or tap the pad. Skip costs two seconds."}
        </p>
        {mode === "endless" && !challenge && unpackRecord(endlessBest).cleared > 0 && (
          <p className="tabular mt-2 text-[11px] text-muted">
            furthest {unpackRecord(endlessBest).cleared}
          </p>
        )}
      </div>
    );
  }

  const expected = String(question!.answer).length;

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
          <span className="text-[10px] uppercase tracking-[0.18em] text-secondary">Flash</span>
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
              {endless ? "−1" : "−2s"}
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
        {endless
          ? "Type the answer, or tap. A miss or a closed window costs a life."
          : "Type the answer, or tap. Skip costs two seconds."}
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

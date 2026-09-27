"use client";

import { useCallback, useEffect, useMemo, useReducer, useState, type ReactNode } from "react";
import { makeSeed } from "@/lib/rng";
import { useChallenge, usePersonalBest } from "@/lib/browserState";
import { useAssist } from "@/lib/assist";
import {
  LIVES,
  livesAfter,
  windowMs,
  endlessScore,
  endlessKey,
  endlessRecord,
  unpackRecord,
} from "@/lib/endless";
import { ResultsCard } from "@/components/game/ResultsCard";
import { Rail, Tape } from "@/components/game/Rail";
import type { Answer } from "@/lib/insights";
import {
  WRONG_POINTS,
  streakMilestoneBonus,
  accuracyMultiplier,
  finalScore,
} from "@/lib/scoring";

/**
 * The shared runtime for any game that asks a question and offers numbered
 * choices.
 *
 * The spec says to build two games hardcoded and extract the engine from them.
 * Five was the point where the fifth copy of the same reducer, timer, keyboard
 * handler and results branch stopped being cheaper than the abstraction.
 *
 * The runtime owns the clock, the streak, the scoring, persistence and the
 * results screen. A game supplies its questions and how to draw them, and
 * nothing else.
 */
export type ChoiceGame<Q> = {
  name: string;
  /** Three-letter code for the status rail, e.g. APX. */
  code: string;
  /** localStorage key for this game's personal best. */
  storageKey: string;
  /** Route a challenge link should open. */
  challengePath: string;
  roundMs: number;
  wrongPenaltyMs: number;
  questionAt(seed: string, index: number): Q;
  optionCount(question: Q): number;
  validate(question: Q, chosen: number): boolean;
  score(question: Q, msElapsed: number, streak: number): number;
  difficultyOf(question: Q): number;
  renderPrompt(question: Q): ReactNode;
  renderOption(question: Q, index: number): ReactNode;
  /** Grid classes for the option row. */
  optionsClassName: string;
  /**
   * Optional. Given a wrong choice, name the mistake it represents.
   *
   * Games whose distractors are built out of real errors can say which error
   * a player made rather than only that they missed. Return null when the
   * option was just a near miss and carries no lesson.
   */
  diagnose?(question: Q, chosen: number): Mistake | null;
  intro: {
    eyebrow: string;
    title: string;
    blurb: string;
    startLabel: string;
    hint: string;
    /** Optional explainer, offered before the round rather than after. */
    learnHref?: string;
    /** Optional flourish above the title, e.g. a hand of cards. */
    ornament?: ReactNode;
    titleClassName?: string;
  };
};

/** A named error, and the one sentence that fixes it. */
export type Mistake = { key: string; label: string; fix: string };

export type MistakeTally = Record<string, { label: string; fix: string; count: number }>;

type Phase = "idle" | "running" | "done";

export type RunMode = "timed" | "endless";

type RunState = {
  phase: Phase;
  mode: RunMode;
  seed: string;
  index: number;
  correct: number;
  attempted: number;
  streak: number;
  bestStreak: number;
  points: number;
  endsAt: number;
  shownAt: number;
  mistakes: MistakeTally;
  feedback: { id: number; ok: boolean } | null;
  /** The tape. Every answer with how long it took, oldest first. */
  tape: Answer[];
  /** Sticky. One assisted answer marks the whole run, and it never unsets. */
  assisted: boolean;
  /** Endless only. Lives left, and the deadline for the question on screen. */
  lives: number;
  questionEndsAt: number;
  /** Endless only. Questions answered correctly - the headline number. */
  cleared: number;
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
  mistakes: {},
  feedback: null,
  tape: [],
  assisted: false,
  mode: "timed",
  lives: LIVES,
  questionEndsAt: 0,
  cleared: 0,
};

type Action =
  | { type: "start"; seed: string; now: number; mode: RunMode }
  | { type: "answer"; chosen: number; now: number; assist: boolean }
  /** Endless only. The window on the current question closed. */
  | { type: "timeout"; now: number }
  | { type: "finish" };

function makeReducer<Q>(game: ChoiceGame<Q>) {
  return function reducer(state: RunState, action: Action): RunState {
    switch (action.type) {
      case "start":
        return {
          ...EMPTY,
          phase: "running",
          mode: action.mode,
          seed: action.seed,
          // Timed runs get a round clock. Endless runs get a per-question one
          // and a round clock that never expires, so nothing else in here has
          // to branch on the mode to read a deadline.
          endsAt:
            action.mode === "timed" ? action.now + game.roundMs : Number.MAX_SAFE_INTEGER,
          questionEndsAt: action.now + windowMs(0),
          shownAt: action.now,
        };

      case "answer": {
        if (state.phase !== "running") return state;

        const question = game.questionAt(state.seed, state.index);
        // Assist marks the answer correct AND marks the run, permanently. It
        // has to be sticky: turning it off halfway through would otherwise
        // launder an assisted run back into a scoring one.
        const ok = action.assist || game.validate(question, action.chosen);
        const elapsed = action.now - state.shownAt;
        const endsAt = ok ? state.endsAt : state.endsAt - game.wrongPenaltyMs;
        const streak = ok ? state.streak + 1 : 0;

        // Tally the named mistake, if this game can name it.
        let mistakes = state.mistakes;
        if (!ok && game.diagnose) {
          const mistake = game.diagnose(question, action.chosen);
          if (mistake) {
            const seen = mistakes[mistake.key];
            mistakes = {
              ...mistakes,
              [mistake.key]: {
                label: mistake.label,
                fix: mistake.fix,
                count: (seen?.count ?? 0) + 1,
              },
            };
          }
        }

        const endless = state.mode === "endless";
        const lives = endless
          ? livesAfter(state.lives, ok ? "correct" : "wrong")
          : state.lives;

        const next: RunState = {
          ...state,
          index: state.index + 1,
          attempted: state.attempted + 1,
          correct: state.correct + (ok ? 1 : 0),
          cleared: state.cleared + (ok ? 1 : 0),
          lives,
          mistakes,
          streak,
          bestStreak: Math.max(state.bestStreak, streak),
          assisted: state.assisted || action.assist,
          // Endless scores by its own rules. Reusing the timed economy would
          // produce a number that sorts next to a timed score and means
          // something else - see lib/endless.ts.
          points:
            state.points +
            (endless
              ? ok
                ? endlessScore(state.index, game.difficultyOf(question), elapsed)
                : 0
              : ok
                ? game.score(question, elapsed, state.streak) + streakMilestoneBonus(streak)
                : WRONG_POINTS),
          endsAt,
          questionEndsAt: action.now + windowMs(state.index + 1),
          shownAt: action.now,
          feedback: { id: state.index, ok },
          tape: [...state.tape, { id: state.index, ok, ms: elapsed }],
        };

        if (endless) return lives <= 0 ? { ...next, phase: "done" } : next;
        return endsAt <= action.now ? { ...next, phase: "done" } : next;
      }

      case "timeout": {
        if (state.phase !== "running" || state.mode !== "endless") return state;

        // A window that closes costs a life and moves on. It goes into the
        // tape flagged as a timeout rather than left out of it: the question
        // was on screen for the whole window, so it belongs in the accuracy
        // and run-time findings - but nobody answered it, so lib/insights
        // keeps it out of every finding whose sentence says "answer".
        const lives = livesAfter(state.lives, "timeout");
        const next: RunState = {
          ...state,
          index: state.index + 1,
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

      case "finish":
        return state.phase === "running" ? { ...state, phase: "done" } : state;
    }
  };
}

export function ChoiceRun<Q>({ game }: { game: ChoiceGame<Q> }) {
  const reducer = useMemo(() => makeReducer(game), [game]);
  const [run, dispatch] = useReducer(reducer, EMPTY);
  const [now, setNow] = useState(0);
  const challenge = useChallenge();
  const assist = useAssist();
  const [best, recordBest] = usePersonalBest(game.storageKey);
  // A separate store, deliberately. An endless record and a timed score are
  // different quantities and must never sort against each other.
  const [endlessBest, recordEndless] = usePersonalBest(endlessKey(game.storageKey));
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

  const answer = useCallback(
    (chosen: number) => {
      dispatch({ type: "answer", chosen, now: Date.now(), assist });
    },
    [assist]
  );

  useEffect(() => {
    if (run.phase !== "running") return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      // Endless has no round clock - `endsAt` is set past the end of time - so
      // the deadline that matters is the one on the question in front of you.
      if (run.mode === "endless") {
        if (t >= run.questionEndsAt) dispatch({ type: "timeout", now: t });
      } else if (t >= run.endsAt) {
        dispatch({ type: "finish" });
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [run.phase, run.mode, run.endsAt, run.questionEndsAt]);

  useEffect(() => {
    // An assisted run never touches either personal best.
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

  const question = useMemo(
    () => (run.phase === "running" ? game.questionAt(run.seed, run.index) : null),
    [game, run.phase, run.seed, run.index]
  );

  const optionCount = question ? game.optionCount(question) : 0;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Auto-repeat. Holding a key down fires keydown dozens of times a
      // second, which turned "lean on one arrow" into a viable strategy.
      if (e.repeat) return;
      if (run.phase === "running") {
        const slot = Number(e.key);
        if (Number.isInteger(slot) && slot >= 1 && slot <= optionCount) {
          e.preventDefault();
          answer(slot - 1);
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
  }, [run.phase, optionCount, answer, start]);

  const remaining = Math.max(0, run.endsAt - now);

  if (run.phase === "done") {
    return (
      <ResultsCard
        gameName={game.name}
        challengePath={game.challengePath}
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
        mistakes={run.mistakes}
        tape={run.tape}
        assisted={run.assisted}
        onReplay={start}
      />
    );
  }

  if (run.phase === "idle") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        {game.intro.ornament}
        <span className="text-[10px] uppercase tracking-[0.18em] text-secondary">
          {game.intro.eyebrow}
        </span>
        <h1
          className={
            game.intro.titleClassName ??
            "mt-5 font-display text-5xl font-semibold tracking-tight sm:text-6xl"
          }
        >
          {game.intro.title}
        </h1>
        <p className="mt-5 max-w-md text-sm leading-relaxed text-secondary">
          {game.intro.blurb}
        </p>

        {challenge && (
          <div className="mt-8 rounded-panel border border-hairline px-6 py-4">
            <span className="text-[10px] uppercase tracking-[0.18em] text-secondary">
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
          </div>
        )}

        {/* Two modes, chosen before the run rather than mid-run, because a
            mode switch halfway through is a run that belongs on neither
            board. A challenge link pins you to timed - the whole point of the
            link is that both people played the same thing. */}
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
          className="mt-6 rounded-control border border-hairline-strong px-10 py-4 text-sm uppercase tracking-[0.18em] text-primary transition-colors hover:border-accent-ink hover:text-accent-ink"
        >
          {game.intro.startLabel}
        </button>
        <p className="mt-5 max-w-sm text-[11px] leading-relaxed text-muted">
          {mode === "endless" && !challenge
            ? `Three lives. No round clock - each question has its own, starting at ${
                windowMs(0) / 1000
              } seconds and closing to ${windowMs(99) / 1000} by question forty. A wrong answer or a closed window costs a life.`
            : game.intro.hint}
        </p>
        {mode === "endless" && !challenge && unpackRecord(endlessBest).cleared > 0 && (
          <p className="tabular mt-2 text-[11px] text-muted">
            furthest {unpackRecord(endlessBest).cleared}
          </p>
        )}
        {game.intro.learnHref && (
          <a
            href={game.intro.learnHref}
            className="mt-6 text-[11px] uppercase tracking-[0.18em] text-secondary underline underline-offset-4 transition-colors hover:text-accent-ink"
          >
            How this works
          </a>
        )}
      </div>
    );
  }

  const accuracy = run.attempted
    ? Math.round((run.correct / run.attempted) * 100)
    : 0;

  return (
    <div className="relative flex flex-1 flex-col">
      {run.feedback && (
        <div
          key={run.feedback.id}
          className={`flash-layer ${run.feedback.ok ? "flash-correct" : "flash-wrong"}`}
        />
      )}

      <Rail
        assisted={assist}
        code={game.code}
        remainingMs={endless ? Math.max(0, run.questionEndsAt - now) : remaining}
        totalMs={endless ? windowMs(run.index) : game.roundMs}
        penalty={
          run.feedback && !run.feedback.ok
            ? { id: run.feedback.id, label: `−${Math.round(game.wrongPenaltyMs / 1000)}s` }
            : null
        }
        cells={[
          {
            label: "Diff",
            value: `d${String(question ? game.difficultyOf(question) : 1).padStart(2, "0")}`,
          },
          { label: "Q", value: String(run.index + 1) },
          ...(endless
            ? [
                {
                  label: "Lives",
                  value: "●".repeat(run.lives) || "—",
                  tone: (run.lives <= 1 ? "neg" : "pos") as "neg" | "pos",
                },
                { label: "Cleared", value: String(run.cleared) },
              ]
            : []),
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

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 overflow-y-auto px-4 py-3">
        {game.renderPrompt(question!)}

        <div className={game.optionsClassName}>
          {Array.from({ length: optionCount }).map((_, i) => (
            <button
              key={i}
              onClick={() => answer(i)}
              className="group relative flex flex-col items-center gap-2 border border-hairline bg-surface-raised px-3 py-4 transition-colors hover:border-accent-ink hover:bg-accent/[0.07]"
            >
              {game.renderOption(question!, i)}
              <kbd className="tabular absolute right-1 top-1 px-1 text-[9px] text-muted">
                {i + 1}
              </kbd>
            </button>
          ))}
        </div>
      </div>

      <Tape entries={run.tape} hint={game.intro.hint} />
    </div>
  );
}

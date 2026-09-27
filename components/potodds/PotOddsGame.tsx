"use client";

import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import {
  questionAt,
  validate,
  score,
  formatPercent,
  MISTAKE_LABEL,
  MISTAKE_FIX,
  ROUND_MS,
  WRONG_PENALTY_MS,
} from "@/lib/games/potodds";
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
import type { RunMode } from "@/components/game/ChoiceRun";
import { ResultsCard } from "@/components/game/ResultsCard";
import { Rail, Tape } from "@/components/game/Rail";
import {
  WRONG_POINTS,
  streakMilestoneBonus,
  accuracyMultiplier,
  finalScore,
} from "@/lib/scoring";
import { CardFan } from "@/components/cards/PlayingCard";
import { Felt } from "@/components/poker/Felt";
import { deal } from "@/lib/cards";
import type { Answer } from "@/lib/insights";

type Phase = "idle" | "running" | "done";

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
  mistakes: Record<string, { label: string; fix: string; count: number }>;
  feedback: { id: number; ok: boolean; chosen: number } | null;
  /** The tape. Every answer with how long it took, oldest first. */
  tape: Answer[];
  /** Sticky. One assisted answer marks the whole run, and it never unsets. */
  assisted: boolean;
  /** Endless only. Lives left, the deadline on the spot in front of you, and
   *  how many you have cleared - which is the headline in that mode. */
  lives: number;
  questionEndsAt: number;
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
  tape: [],
  mistakes: {},
  feedback: null,
  assisted: false,
  mode: "timed",
  lives: LIVES,
  questionEndsAt: 0,
  cleared: 0,
};

type Action =
  | { type: "start"; seed: string; now: number; mode: RunMode }
  | { type: "timeout"; now: number }
  | { type: "answer"; chosen: number; now: number; assist: boolean }
  | { type: "finish" };

function reducer(state: RunState, action: Action): RunState {
  switch (action.type) {
    case "start":
      return {
        ...EMPTY,
        phase: "running",
        mode: action.mode,
        seed: action.seed,
        // Endless gets a round clock past the end of time, so nothing below
        // has to branch on the mode just to read a deadline.
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
        attempted: state.attempted + 1,
        lives,
        streak: 0,
        questionEndsAt: action.now + windowMs(state.index + 1),
        shownAt: action.now,
        feedback: { id: state.index, ok: false, chosen: -1 },
        tape: [
          ...state.tape,
          { id: state.index, ok: false, ms: windowMs(state.index), timedOut: true },
        ],
      };
      return lives <= 0 ? { ...next, phase: "done" } : next;
    }

    case "answer": {
      if (state.phase !== "running") return state;

      const question = questionAt(state.seed, state.index);
      const ok = action.assist || validate(question, action.chosen);
      const elapsed = action.now - state.shownAt;
      const endsAt = ok ? state.endsAt : state.endsAt - WRONG_PENALTY_MS;
      const streak = ok ? state.streak + 1 : 0;

      // Name the error rather than only marking it wrong. Every distractor in
      // this game is a mistake somebody actually makes at a table.
      let mistakes = state.mistakes;
      const kind = ok ? null : question.diagnoses[action.chosen];
      if (kind) {
        mistakes = {
          ...mistakes,
          [kind]: {
            label: MISTAKE_LABEL[kind],
            fix: MISTAKE_FIX[kind],
            count: (mistakes[kind]?.count ?? 0) + 1,
          },
        };
      }

      const endless = state.mode === "endless";
      const lives = endless ? livesAfter(state.lives, ok ? "correct" : "wrong") : state.lives;

      const next: RunState = {
        ...state,
        assisted: state.assisted || action.assist,
        index: state.index + 1,
        attempted: state.attempted + 1,
        mistakes,
        correct: state.correct + (ok ? 1 : 0),
        cleared: state.cleared + (ok ? 1 : 0),
        lives,
        streak,
        bestStreak: Math.max(state.bestStreak, streak),
        // Endless scores by its own rules. See lib/endless.ts - reusing the
        // timed economy would make the two boards silently incomparable.
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
        questionEndsAt: action.now + windowMs(state.index + 1),
        shownAt: action.now,
        feedback: { id: state.index, ok, chosen: action.chosen },
        tape: [...state.tape, { id: state.index, ok, ms: elapsed }],
      };

      if (endless) return lives <= 0 ? { ...next, phase: "done" } : next;
      return endsAt <= action.now ? { ...next, phase: "done" } : next;
    }

    case "finish":
      return state.phase === "running" ? { ...state, phase: "done" } : state;
  }
}

export function PotOddsGame() {
  const [run, dispatch] = useReducer(reducer, EMPTY);
  const [now, setNow] = useState(0);
  const challenge = useChallenge();
  const assist = useAssist();
  const [best, recordBest] = usePersonalBest("cmquant:potodds:best");
  // A separate store. An endless record and a timed score are different
  // quantities and must never sort against each other.
  const [endlessBest, recordEndless] = usePersonalBest(endlessKey("cmquant:potodds:best"));
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
      // Endless has no round clock; the deadline that matters is the one on
      // the spot in front of you.
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
        const slot = Number(e.key);
        if (slot >= 1 && slot <= 4) {
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
  }, [run.phase, answer, start]);

  const question = useMemo(
    () => (run.phase === "running" ? questionAt(run.seed, run.index) : null),
    [run.phase, run.seed, run.index]
  );

  // A real seeded table: your two cards and a three-card board. They are dealt
  // from the run seed like everything else, so a shared challenge shows both
  // players the same table. They do not enter the arithmetic - the price you
  // are being offered is the whole question - but a poker trainer that deals
  // face-down cards looks broken rather than principled.
  const table = useMemo(
    () => (run.phase === "running" ? deal(`${run.seed}#${run.index}`, 5) : []),
    [run.phase, run.seed, run.index]
  );

  const remaining = Math.max(0, run.endsAt - now);

  if (run.phase === "done") {
    return (
      <ResultsCard
        gameName="Pot Odds"
        challengePath="/g/pot-odds"
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
        <div>
          <CardFan cards={["As", "Kd", null, null]} size="md" className="justify-center" />
        </div>

        <span className="mt-12 text-[10px] uppercase tracking-[0.3em] text-secondary">
          Poker Lab / Probability in Practice
        </span>
        <h1 className="mt-4 font-display text-3xl font-medium uppercase tracking-wing text-primary sm:text-4xl">
          Pot Odds
        </h1>
        <p className="mt-5 max-w-md text-sm leading-relaxed text-secondary">
          You are facing a bet and deciding whether to call. The question is how
          often you need to win for that call to break even, and the answer is
          the amount you are calling divided by the pot as it will stand after
          your money is in it. Most people divide by the pot before their call,
          which quietly makes the price look worse than it is.
        </p>

        {challenge && (
          <div className="mt-8 rounded-panel border border-hairline px-6 py-4">
            <span className="text-[10px] uppercase tracking-[0.3em] text-secondary">
              Challenge
            </span>
            <p className="mt-2 text-sm text-primary">
              Same spots, same order.{" "}
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
          className="mt-6 rounded-control border border-hairline-strong px-12 py-4 text-sm uppercase tracking-[0.3em] text-primary transition-colors hover:border-rare hover:text-rare"
        >
          Deal
        </button>
        <p className="mt-5 max-w-sm text-[11px] leading-relaxed text-muted">
          {mode === "endless" && !challenge
            ? `Three lives. No round clock - each spot has its own, starting at ${
                windowMs(0) / 1000
              } seconds and closing to ${windowMs(99) / 1000} by the fortieth. A wrong answer or a closed window costs a life.`
            : "Keys 1 – 4. Space to deal. A wrong answer costs two seconds."}
        </p>
        {mode === "endless" && !challenge && unpackRecord(endlessBest).cleared > 0 && (
          <p className="tabular mt-2 text-[11px] text-muted">
            furthest {unpackRecord(endlessBest).cleared}
          </p>
        )}
        <a
          href="/learn/pot-odds"
          className="mt-6 text-[11px] uppercase tracking-[0.3em] text-secondary underline underline-offset-4 transition-colors hover:text-rare"
        >
          How this works
        </a>
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

      {/* The clock lives in the rail, not above the table.
          It was a numeral stacked on top of the felt, and once the felt got
          a rail and chips the whole column grew past the viewport - so the
          first thing to scroll out of sight was the timer, in a game that is
          entirely about a timer. A fixed rail cannot do that. */}
      <Rail
        assisted={assist}
        code="POT"
        remainingMs={endless ? Math.max(0, run.questionEndsAt - now) : remaining}
        totalMs={endless ? windowMs(run.index) : ROUND_MS}
        penalty={
          run.feedback && !run.feedback.ok
            ? { id: run.feedback.id, label: `−${Math.round(WRONG_PENALTY_MS / 1000)}s` }
            : null
        }
        cells={[
          { label: "Diff", value: `d${String(question?.difficulty ?? 1).padStart(2, "0")}` },
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

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-y-auto px-4 py-3">
        {/* The pot after the call is deliberately NOT shown anywhere. Building
            that denominator - remembering that your own call belongs in it -
            is the entire skill, and printing it would answer the question. */}
        <Felt
          board={table.slice(2)}
          hero={table.slice(0, 2)}
          pot={question!.pot}
          bet={question!.bet}
        />

        <p className="max-w-sm text-center text-[13px] leading-relaxed text-secondary">
          How often do you need to win for that call to break even?
        </p>

        <div className="grid w-full max-w-2xl grid-cols-2 gap-px bg-hairline sm:grid-cols-4">
          {question!.options.map((option, i) => (
            <button
              key={i}
              onClick={() => answer(i)}
              className="group relative flex flex-col items-center gap-1 bg-surface px-3 py-3 transition-colors hover:bg-accent/10"
            >
              <span className="tabular text-xl text-primary transition-colors group-hover:text-accent-ink">
                {formatPercent(option)}
              </span>
              <kbd className="tabular absolute right-1 top-1 text-[9px] text-muted">
                {i + 1}
              </kbd>
            </button>
          ))}
        </div>
      </div>

      <Tape
        entries={run.tape}
        hint="Your call goes into the pot you are trying to win."
      />
    </div>
  );
}

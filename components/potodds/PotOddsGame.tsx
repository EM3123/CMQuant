"use client";

import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import {
  questionAt,
  validate,
  score,
  formatPercent,
  ROUND_MS,
  WRONG_PENALTY_MS,
} from "@/lib/games/potodds";
import { makeSeed } from "@/lib/rng";
import { useChallenge, usePersonalBest } from "@/lib/browserState";
import { ResultsCard } from "@/components/game/ResultsCard";
import {
  WRONG_POINTS,
  streakMilestoneBonus,
  accuracyMultiplier,
  finalScore,
} from "@/lib/scoring";
import { PlayingCard, CardFan } from "@/components/cards/PlayingCard";
import { deal } from "@/lib/cards";

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
  feedback: { id: number; ok: boolean; chosen: number } | null;
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
  | { type: "answer"; chosen: number; now: number }
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
      const ok = validate(question, action.chosen);
      const elapsed = action.now - state.shownAt;
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
        feedback: { id: state.index, ok, chosen: action.chosen },
      };

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
  const [best, recordBest] = usePersonalBest("cmquant:potodds:best");

  // The accuracy multiplier lands once, on the whole run, and the personal best
  // records what the player actually finished with. Computed here rather than
  // beside the results screen so the persist effect below can see it.
  const runMultiplier = accuracyMultiplier(run.correct, run.attempted);
  const runPoints = finalScore(run.points, run.correct, run.attempted);

  const start = useCallback(() => {
    dispatch({ type: "start", seed: challenge?.seed ?? makeSeed(), now: Date.now() });
    setNow(Date.now());
  }, [challenge]);

  const answer = useCallback((chosen: number) => {
    dispatch({ type: "answer", chosen, now: Date.now() });
  }, []);

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
    if (run.phase === "done") recordBest(runPoints);
  }, [run.phase, runPoints, recordBest]);

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
        personalBest={best}
        isPersonalBest={runPoints >= best && runPoints > 0}
        challengeTarget={challenge?.target ?? 0}
        onReplay={start}
      />
    );
  }

  if (run.phase === "idle") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <div className="spotlight">
          <div className="spotlight-glow" />
          <CardFan cards={["As", "Kd", null, null]} size="lg" className="justify-center" />
        </div>

        <span className="mt-12 text-[10px] uppercase tracking-[0.3em] text-secondary">
          Poker Lab / Probability in Practice
        </span>
        <h1 className="mt-4 font-display text-6xl font-light tracking-wing text-rare">
          Pot Odds
        </h1>
        <p className="mt-5 max-w-md text-sm leading-relaxed text-secondary">
          You are facing a bet. How often do you need to win for calling to break
          even? The money you put in is part of the pot you are trying to win, and
          that is the half everyone drops.
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

        <button
          onClick={start}
          className="mt-10 rounded-control border border-hairline-strong px-12 py-4 text-sm uppercase tracking-[0.3em] text-primary transition-colors hover:border-rare hover:text-rare"
        >
          Deal
        </button>
        <p className="mt-5 text-[11px] text-muted">
          Keys 1 – 4. Space to deal. A wrong answer costs two seconds.
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col">
      {run.feedback && (
        <div
          key={run.feedback.id}
          className={`flash-layer ${run.feedback.ok ? "bg-data-pos/15" : "bg-data-neg/20"}`}
        />
      )}

      <header className="flex shrink-0 items-center justify-between px-5 py-3">
        <div className="flex items-baseline gap-3">
          <span className="text-[10px] uppercase tracking-[0.3em] text-secondary">
            Pot Odds
          </span>
          <span className="tabular text-[10px] text-muted">
            d{String(question?.difficulty ?? 1).padStart(2, "0")}
          </span>
        </div>
        <div className="flex items-center gap-6">
          <Stat label="Score" value={run.points.toLocaleString()} />
          <Stat label="Streak" value={String(run.streak)} tone={run.streak >= 5 ? "rare" : undefined} />
          {challenge && challenge.target > 0 && (
            <Stat label="Target" value={challenge.target.toLocaleString()} tone="accent" />
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-4 pb-8">
        {/* The board. */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.3em] text-secondary">Board</span>
          <div className="flex gap-1.5">
            {table.slice(2).map((code) => (
              <PlayingCard key={code} code={code} size="sm" />
            ))}
          </div>
        </div>

        <div className="relative flex flex-col items-center">
          <span className="tabular text-5xl leading-none text-primary sm:text-6xl">
            {formatClock(remaining)}
          </span>
          {run.feedback && !run.feedback.ok && (
            <span
              key={run.feedback.id}
              className="rise-away tabular absolute -right-14 top-2 text-xl text-data-neg"
            >
              −2s
            </span>
          )}
        </div>

        {/* The spot.
            This used to read "POT 900 / BET TO YOU 850". On a screen full of
            percentages a slash between two numbers reads as division, so the
            first thing a player saw was 900 ÷ 850. Now it is a labelled ledger
            with the numbers right-aligned.

            The pot after the call is deliberately NOT shown. Building that
            denominator - remembering your own call belongs in it - is the
            entire skill; printing it would answer the question. */}
        <div className="relative w-full max-w-sm">
          <div className="absolute inset-x-0 -inset-y-5 rounded-[50%] bg-[radial-gradient(60%_70%_at_50%_50%,rgba(11,58,30,0.5),transparent_70%)]" />
          <div className="relative rounded-panel border border-hairline bg-surface-raised/70 px-6 py-5 backdrop-blur-md">
            <Line label="Pot" value={question!.pot} />
            <Line label="They bet" value={question!.bet} tone="accent" />
            <div className="my-3 h-px bg-hairline" />
            <Line label="To call" value={question!.bet} strong />
          </div>
        </div>

        <p className="max-w-sm text-center text-sm leading-relaxed text-secondary">
          How often do you need to win for that call to break even?
        </p>

        <div className="grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
          {question!.options.map((option, i) => (
            <button
              key={i}
              onClick={() => answer(i)}
              className="group flex flex-col items-center gap-2 rounded-panel border border-hairline bg-surface-raised px-3 py-5 backdrop-blur-md transition-colors hover:border-rare"
            >
              <span className="tabular text-2xl text-primary">{formatPercent(option)}</span>
              <kbd className="tabular rounded-control border border-accent/40 bg-accent/10 px-2 text-[10px] text-accent-ink">
                {i + 1}
              </kbd>
            </button>
          ))}
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-1.5">
            {table.slice(0, 2).map((code) => (
              <PlayingCard key={code} code={code} size="sm" />
            ))}
          </div>
          <span className="text-[10px] uppercase tracking-[0.3em] text-secondary">You</span>
        </div>
      </div>

      <footer className="shrink-0 px-5 py-2 text-center text-[10px] text-muted">
        Your call goes into the pot you are trying to win.
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

/** One row of the spot. Label left, number right, tabular so the columns of
 *  digits line up between rows and between questions. */
function Line({
  label,
  value,
  tone,
  strong = false,
}: {
  label: string;
  value: number;
  tone?: "accent";
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-1">
      <span className="text-[10px] uppercase tracking-[0.3em] text-secondary">{label}</span>
      <span
        className={`tabular ${strong ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"} ${
          tone === "accent" ? "text-accent-ink" : "text-primary"
        }`}
      >
        {value.toLocaleString()}
      </span>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "rare" | "accent";
}) {
  const colour =
    tone === "rare" ? "text-rare" : tone === "accent" ? "text-accent-ink" : "text-primary";
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[10px] uppercase tracking-[0.3em] text-secondary">{label}</span>
      <span className={`tabular text-sm ${colour}`}>{value}</span>
    </div>
  );
}

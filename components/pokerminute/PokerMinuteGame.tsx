"use client";

import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import {
  spotAt,
  grade,
  evLoss,
  scoreSpot,
  nextStreak,
  decisionCredit,
  breakEvenEquity,
  GRADE_LABEL,
  GRADE_GLYPH,
  ROUND_MS,
  type Action,
  type Grade,
  type PokerMinuteSpot,
} from "@/lib/games/pokerminute";
import { makeSeed } from "@/lib/rng";
import { useChallenge, usePersonalBest } from "@/lib/browserState";
import { useAssist } from "@/lib/assist";
import { ResultsCard } from "@/components/game/ResultsCard";
import { Felt } from "@/components/poker/Felt";
import { Rail } from "@/components/game/Rail";
import type { Answer } from "@/lib/insights";
import { accuracyMultiplier, finalScore } from "@/lib/scoring";

/**
 * POKER MINUTE - the run.
 *
 * THIS GAME TELLS YOU NOTHING WHILE YOU PLAY, AND THAT IS THE DESIGN.
 *
 * Every other game here flashes green or red on the answer, because they are
 * tests of recall and arithmetic where the answer is a fact and knowing it
 * immediately is the lesson. This one grades judgement against an EV
 * calculation, and three things break if it shows the grade mid-run:
 *
 * 1. It stops being a test of judgement. Told you were right, you keep doing
 *    the thing; told you were wrong, you flip. Within a few spots you are
 *    reading the feedback rather than the board, which is the opposite of the
 *    skill - at a real table nobody turns their hand over to tell you.
 * 2. The bands are narrow. "Defensible" covers everything inside six per cent
 *    of the contested pot, so a yellow and a green often differ by a fraction
 *    of a blind. Flashing that distinction in a sixty-second run reads as
 *    noise and teaches the wrong lesson about how close the decision was.
 * 3. There is nothing to do about it in the moment. The next spot is a
 *    different board against a different range.
 *
 * So the rail carries a clock and a spot count and nothing else - no score, no
 * streak, no accuracy, because all three of those leak the grade. Everything
 * arrives at once in the review, where there is time to read the range and see
 * the arithmetic.
 *
 * WHICH ALSO MEANS NO ENDLESS MODE. Endless is three lives, and a life you can
 * lose is feedback: watching the count drop tells you the last decision was a
 * leak, which is exactly what this game withholds. The two are incompatible
 * rather than merely unbuilt, and sixty seconds is in the name.
 */

type Phase = "idle" | "running" | "done";

/** What the player did on one spot, kept for the review. */
type Decision = { index: number; action: Action; ms: number };

type RunState = {
  phase: Phase;
  seed: string;
  index: number;
  points: number;
  streak: number;
  bestStreak: number;
  /** The three bands, tallied as they happen but shown only at the end. */
  best: number;
  close: number;
  error: number;
  endsAt: number;
  shownAt: number;
  decisions: Decision[];
  tape: Answer[];
  /** Sticky. One assisted decision marks the whole run, and it never unsets. */
  assisted: boolean;
};

const EMPTY: RunState = {
  phase: "idle",
  seed: "",
  index: 0,
  points: 0,
  streak: 0,
  bestStreak: 0,
  best: 0,
  close: 0,
  error: 0,
  endsAt: 0,
  shownAt: 0,
  decisions: [],
  tape: [],
  assisted: false,
};

type ActionMsg =
  | { type: "start"; seed: string; now: number }
  | { type: "decide"; action: Action; now: number; assist: boolean }
  | { type: "finish" };

function reducer(state: RunState, msg: ActionMsg): RunState {
  switch (msg.type) {
    case "start":
      return {
        ...EMPTY,
        phase: "running",
        seed: msg.seed,
        endsAt: msg.now + ROUND_MS,
        shownAt: msg.now,
      };

    case "decide": {
      if (state.phase !== "running") return state;

      const spot = spotAt(state.seed, state.index);
      // Assist takes the best line rather than marking a chosen one correct:
      // the grade is computed from the action, so there is no "correct" flag
      // to set. Playtesting wants a finished run, not a forced one.
      const action = msg.assist ? spot.best : msg.action;
      const elapsed = msg.now - state.shownAt;
      const g = grade(spot, action);

      // A wrong decision does not cost time here. The minute is the minute,
      // and a time penalty on a judgement call would punish the spots that
      // deserve the most thought.
      const next: RunState = {
        ...state,
        assisted: state.assisted || msg.assist,
        index: state.index + 1,
        points: state.points + scoreSpot(spot, action, elapsed, state.streak),
        streak: nextStreak(state.streak, g),
        bestStreak: Math.max(state.bestStreak, nextStreak(state.streak, g)),
        best: state.best + (g === "best" ? 1 : 0),
        close: state.close + (g === "close" ? 1 : 0),
        error: state.error + (g === "error" ? 1 : 0),
        shownAt: msg.now,
        decisions: [...state.decisions, { index: state.index, action, ms: elapsed }],
        // The tape feeds the post-game analysis, which talks about pace. A
        // leak is the "wrong" one there; a defensible line is not.
        tape: [...state.tape, { id: state.index, ok: g !== "error", ms: elapsed }],
      };

      return state.endsAt <= msg.now ? { ...next, phase: "done" } : next;
    }

    case "finish":
      return state.phase === "running" ? { ...state, phase: "done" } : state;
  }
}

export function PokerMinuteGame() {
  const [run, dispatch] = useReducer(reducer, EMPTY);
  const [now, setNow] = useState(0);
  const challenge = useChallenge();
  const assist = useAssist();
  const [best, recordBest] = usePersonalBest("cmquant:pokerminute:best");

  // Credit is fractional here - a defensible line is worth half a best one -
  // so the shared accuracy multiplier gets a real number rather than a count.
  const credit = decisionCredit(run.best, run.close);
  const runMultiplier = accuracyMultiplier(credit, run.index);
  const runPoints = finalScore(run.points, credit, run.index);

  const start = useCallback(() => {
    dispatch({ type: "start", seed: challenge?.seed ?? makeSeed(), now: Date.now() });
    setNow(Date.now());
  }, [challenge]);

  const decide = useCallback(
    (action: Action) => {
      dispatch({ type: "decide", action, now: Date.now(), assist });
    },
    [assist]
  );

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
      if (run.phase === "running") {
        if (e.key === "1" || e.key.toLowerCase() === "f") {
          e.preventDefault();
          decide("fold");
        } else if (e.key === "2" || e.key.toLowerCase() === "c") {
          e.preventDefault();
          decide("call");
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
  }, [run.phase, decide, start]);

  const spot = useMemo(
    () => (run.phase === "running" ? spotAt(run.seed, run.index) : null),
    [run.phase, run.seed, run.index]
  );

  const remaining = Math.max(0, run.endsAt - now);

  if (run.phase === "done") {
    return (
      <div className="flex flex-1 flex-col">
        <ResultsCard
          gameName="Poker Minute"
          challengePath="/g/poker-minute"
          seed={run.seed}
          points={runPoints}
          rawPoints={run.points}
          accuracyMultiplier={runMultiplier}
          correct={run.best + run.close}
          attempted={run.index}
          bestStreak={run.bestStreak}
          personalBest={best}
          isPersonalBest={runPoints >= best && runPoints > 0}
          challengeTarget={challenge?.target ?? 0}
          tape={run.tape}
          assisted={run.assisted}
          onReplay={start}
        />
        <Review run={run} />
      </div>
    );
  }

  if (run.phase === "idle") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center [justify-content:safe_center] overflow-y-auto px-6 py-12 text-center">
        <span className="text-[10px] uppercase tracking-[0.3em] text-secondary">
          Poker Lab / Decisions
        </span>
        <h1 className="mt-4 font-display text-3xl font-medium uppercase tracking-wing text-primary sm:text-4xl">
          Poker Minute
        </h1>
        <p className="mt-5 max-w-md text-sm leading-relaxed text-secondary">
          River spots, one after another, for sixty seconds. You are facing a
          bet and the only question is fold or call. Each spot states the range
          you are up against, and your decision is graded on the blinds it gave
          up against that range.
        </p>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-secondary">
          You will not be told how you did until the minute is over. Knowing
          would let you play the feedback instead of the board, and nobody
          turns their hand over at a real table.
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
          className="mt-9 rounded-control border border-hairline-strong px-12 py-4 text-sm uppercase tracking-[0.3em] text-primary transition-colors hover:border-rare hover:text-rare"
        >
          Sit down
        </button>
        <p className="mt-5 max-w-sm text-[11px] leading-relaxed text-muted">
          1 or F to fold, 2 or C to call. Space to start.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* No flash layer. There is nothing to flash - the grade is not known to
          the player until the review. */}
      <Rail
        assisted={assist}
        code="PKM"
        remainingMs={remaining}
        totalMs={ROUND_MS}
        penalty={null}
        cells={[
          { label: "Diff", value: `d${String(spot!.difficulty).padStart(2, "0")}` },
          { label: "Spot", value: String(run.index + 1) },
          // Deliberately no score, streak or accuracy. Each of them would say
          // whether the last decision was right.
          { label: "Graded", value: "after" },
        ]}
      />

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-4 py-4">
        <Felt
          board={spot!.board}
          hero={spot!.hero}
          pot={spot!.pot}
          bet={spot!.bet}
          betLabel="They bet"
        >
          <p className="mt-3 text-center text-[11px] leading-relaxed text-secondary">
            They bet this line with{" "}
            <span className="text-primary">{spot!.range.value.length} value</span> combinations
            and <span className="text-primary">{spot!.range.bluff.length} bluffs</span>. Calling
            costs {spot!.bet} to win {spot!.pot + spot!.bet}.
          </p>
        </Felt>

        <div className="flex w-full max-w-sm gap-3">
          <Decide label="Fold" hint="1 / F" onClick={() => decide("fold")} />
          <Decide label="Call" hint="2 / C" onClick={() => decide("call")} accent />
        </div>
      </div>

      <footer className="shrink-0 border-t border-hairline px-4 py-1.5 text-center text-[10px] text-muted">
        Every decision is graded on the blinds it gave up. You will see all of
        them when the minute ends.
      </footer>
    </div>
  );
}

function Decide({
  label,
  hint,
  onClick,
  accent = false,
}: {
  label: string;
  hint: string;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-baseline justify-center gap-3 rounded-control border py-4 text-sm uppercase tracking-[0.3em] transition-colors ${
        accent
          ? "border-hairline-strong text-primary hover:border-rare hover:text-rare"
          : "border-hairline text-secondary hover:border-rare hover:text-rare"
      }`}
    >
      {label}
      <span className="tabular text-[10px] tracking-normal text-muted">{hint}</span>
    </button>
  );
}

/**
 * The review. Every spot, what you did, and the arithmetic behind the grade.
 *
 * This is where the whole game actually happens - the minute is just how the
 * spots get in front of you. So it shows the range that was assumed, the
 * equity against it, the price, and the blinds the decision gave up. Every
 * number is computed by enumerating that range, which is why it can be printed
 * as a fact rather than hedged as an estimate.
 */
function Review({ run }: { run: RunState }) {
  const spots = run.decisions.map((d) => ({ d, spot: spotAt(run.seed, d.index) }));
  if (!spots.length) return null;

  const grid = spots.map(({ d, spot }) => GRADE_GLYPH[grade(spot, d.action)]).join("");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-12">
      <div className="flex items-baseline justify-between border-b border-hairline pb-2">
        <span className="text-[10px] uppercase tracking-[0.3em] text-secondary">
          The review
        </span>
        <span className="text-[10px] tracking-[0.18em]">{grid}</span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-px border border-hairline bg-hairline">
        <Band label={GRADE_LABEL.best} value={run.best} tone="text-data-pos" />
        <Band label={GRADE_LABEL.close} value={run.close} tone="text-rare" />
        <Band label={GRADE_LABEL.error} value={run.error} tone="text-data-neg" />
      </div>

      <ul className="mt-5 flex flex-col gap-4">
        {spots.map(({ d, spot }) => (
          <SpotReview key={d.index} spot={spot} action={d.action} ms={d.ms} />
        ))}
      </ul>

      <p className="mt-6 text-center text-[10px] leading-relaxed text-muted">
        Every number here is exact against the range printed with the spot,
        enumerated combination by combination. None of it is a solver output
        and none of it is an estimate.
      </p>
    </div>
  );
}

function Band({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex flex-col items-center gap-1 bg-surface py-3">
      <span className={`tabular text-xl ${tone}`}>{value}</span>
      <span className="text-[9px] uppercase tracking-[0.16em] text-secondary">{label}</span>
    </div>
  );
}

function SpotReview({
  spot,
  action,
  ms,
}: {
  spot: PokerMinuteSpot;
  action: Action;
  ms: number;
}) {
  const g: Grade = grade(spot, action);
  const lost = evLoss(spot, action);
  const tone =
    g === "best" ? "text-data-pos" : g === "close" ? "text-rare" : "text-data-neg";

  return (
    <li className="border border-hairline px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="tabular text-[12px] text-primary">
          {spot.hero.join(" ")} on {spot.board.join(" ")}
        </span>
        <span className={`text-[10px] uppercase tracking-[0.18em] ${tone}`}>
          {GRADE_LABEL[g]}
        </span>
      </div>

      <p className="tabular mt-2 text-[11px] leading-relaxed text-secondary">
        You {action === "call" ? "called" : "folded"} in {(ms / 1000).toFixed(1)}s. Best was
        to {spot.best === "call" ? "call" : "fold"}.
        {lost > 0.001 && (
          <>
            {" "}
            <span className="text-data-neg">Gave up {lost.toFixed(2)}bb.</span>
          </>
        )}
      </p>

      <p className="tabular mt-1.5 text-[11px] leading-relaxed text-muted">
        You beat {(spot.equity * 100).toFixed(1)}% of their{" "}
        {spot.range.value.length + spot.range.bluff.length} combinations and needed{" "}
        {(breakEvenEquity(spot.pot, spot.bet) * 100).toFixed(1)}% to call for{" "}
        {spot.bet} into {spot.pot}. Calling is worth {spot.evCall.toFixed(2)}bb against
        folding.
      </p>
    </li>
  );
}

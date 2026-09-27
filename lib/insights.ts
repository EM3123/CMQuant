// Post-game analysis: what the run says about how you played.
//
// Every run already records enough to say something useful and then throws it
// away. The tape has the time you took on every single answer and whether it
// was right. The mistake tally has which named error you made and how often.
// Until now the results screen showed a score, an accuracy percentage and
// nothing else, which is the same information a stopwatch gives you.
//
// THE RULE THIS FILE IS WRITTEN UNDER: every finding is a fact about the run,
// derived arithmetically from data the run actually produced. No estimates, no
// benchmarks against other players, no "you are in the top 20%" - there is no
// server and there are no other players to compare against. If a finding
// cannot be computed from one run's own numbers, it does not belong here.
//
// A finding also has to be ACTIONABLE or it is decoration. "You answered 14
// questions" is a fact and not an insight. "Your wrong answers took half as
// long as your right ones, so you are guessing when you are unsure" is one.

export type Answer = {
  /** Question index within the run. */
  id: number;
  ok: boolean;
  ms: number;
};

export type Insight = {
  /** Stable key, so the UI can list findings without index keys. */
  key: string;
  /** One line. The finding itself. */
  headline: string;
  /** One or two sentences. What to do about it. */
  detail: string;
  /** Whether this is something going well or something to fix. */
  tone: "good" | "warn" | "neutral";
};

/** Fewer answers than this and any pattern is noise. */
const MIN_ANSWERS = 6;

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const seconds = (ms: number) => (ms / 1000).toFixed(1);

/**
 * Speed against accuracy.
 *
 * The most useful thing a run can tell you, because the fix is the opposite in
 * each direction. If the wrong answers were the fast ones you are guessing
 * under pressure and should slow down. If they were the slow ones you were not
 * guessing at all - you were stuck, and the answer is to learn the pattern
 * rather than to grind it out.
 */
function paceVersusAccuracy(answers: Answer[]): Insight | null {
  const right = answers.filter((a) => a.ok).map((a) => a.ms);
  const wrong = answers.filter((a) => !a.ok).map((a) => a.ms);
  if (right.length < 3 || wrong.length < 3) return null;

  const r = median(right);
  const w = median(wrong);
  const ratio = w / r;

  if (ratio <= 0.7) {
    return {
      key: "rushing",
      tone: "warn",
      headline: `Your wrong answers were ${Math.round((1 - ratio) * 100)}% faster than your right ones`,
      detail: `Right answers took ${seconds(r)}s, wrong ones ${seconds(w)}s. That gap means you are answering before you know, not getting them wrong after thinking. The wrong answer already costs you time, so guessing early costs twice.`,
    };
  }

  if (ratio >= 1.5) {
    return {
      key: "stuck",
      tone: "neutral",
      headline: `Your wrong answers took ${Math.round(ratio * 10) / 10}x as long as your right ones`,
      detail: `Right answers took ${seconds(r)}s, wrong ones ${seconds(w)}s. You are not guessing, you are grinding - these are the questions you do not have a method for yet. The explainer is worth more to you than another run.`,
    };
  }

  return null;
}

/**
 * Whether the run fell apart at the end.
 *
 * Difficulty climbs with the question index, so a drop in the second half is
 * expected and is not the finding. The finding is a drop far bigger than the
 * difficulty alone explains, which usually means the clock got to you.
 */
function endOfRun(answers: Answer[]): Insight | null {
  if (answers.length < 10) return null;
  const half = Math.floor(answers.length / 2);
  const first = answers.slice(0, half);
  const second = answers.slice(half);

  const firstAcc = first.filter((a) => a.ok).length / first.length;
  const secondAcc = second.filter((a) => a.ok).length / second.length;
  const drop = firstAcc - secondAcc;

  if (drop >= 0.3) {
    return {
      key: "faded",
      tone: "warn",
      headline: `Accuracy fell from ${Math.round(firstAcc * 100)}% to ${Math.round(secondAcc * 100)}% in the second half`,
      detail:
        "Questions do get harder as a run goes on, but not by that much. A drop this size is usually the clock rather than the difficulty - you started trading accuracy for speed.",
    };
  }

  if (secondAcc > firstAcc + 0.2 && secondAcc >= 0.8) {
    return {
      key: "warmed-up",
      tone: "good",
      headline: `You were ${Math.round(secondAcc * 100)}% accurate in the second half, up from ${Math.round(firstAcc * 100)}%`,
      detail:
        "You got better as the questions got harder, which means the slow start was warm-up rather than difficulty. The first three answers are costing you a run's worth of points.",
    };
  }

  return null;
}

/** The single answer that cost the most time. Worth naming if it dominated. */
function slowestAnswer(answers: Answer[]): Insight | null {
  if (answers.length < MIN_ANSWERS) return null;
  const total = answers.reduce((sum, a) => sum + a.ms, 0);
  const slowest = answers.reduce((worst, a) => (a.ms > worst.ms ? a : worst));
  const share = slowest.ms / total;
  if (share < 0.25) return null;

  return {
    key: "one-slow",
    tone: "neutral",
    headline: `One question ate ${Math.round(share * 100)}% of your run`,
    detail: `Question ${slowest.id + 1} took ${seconds(slowest.ms)}s and you got it ${
      slowest.ok ? "right" : "wrong"
    }. On a clock, a question you cannot see a route into is worth abandoning - the next one is probably easier and worth the same.`,
  };
}

/**
 * Consistency. A steady pace is worth saying out loud when it happens.
 *
 * THE TEST IS THE SENTENCE. The headline claims every answer landed inside a
 * band, so the check counts how many actually did. The first version used the
 * median absolute deviation instead, which is defeated by exactly the run this
 * finding is supposed to reject: answer two thirds of the questions in 2.6s
 * and the rest in 0.25s and the median deviation is zero, because most of the
 * deviations are zero. It called that run a metronome. Caught by playing it,
 * not by the fuzzer - uniformly random times never produce a majority cluster.
 */
const BAND = 0.25;
const WITHIN_BAND = 0.9;

function consistency(answers: Answer[]): Insight | null {
  if (answers.length < 10) return null;
  const times = answers.map((a) => a.ms);
  const mid = median(times);
  if (mid <= 0) return null;

  const inside = times.filter((t) => Math.abs(t - mid) <= mid * BAND).length;
  if (inside / times.length < WITHIN_BAND) return null;

  return {
    key: "metronome",
    tone: "good",
    headline: `${inside} of your ${times.length} answers landed within a quarter of ${seconds(mid)}s`,
    detail:
      "That is a rhythm rather than a series of guesses, and it is the thing that separates a repeatable score from a lucky one.",
  };
}

/** The mistake you kept making. Only worth saying if it really repeated. */
function repeatedMistake(
  mistakes: Record<string, { label: string; fix: string; count: number }>
): Insight | null {
  const entries = Object.entries(mistakes);
  if (!entries.length) return null;
  const [key, worst] = entries.reduce((a, b) => (b[1].count > a[1].count ? b : a));
  if (worst.count < 3) return null;

  return {
    key: `mistake:${key}`,
    tone: "warn",
    headline: `${worst.label}, ${worst.count} times`,
    detail: worst.fix,
  };
}

/**
 * Everything worth saying about one run, best finding first.
 *
 * Capped at three. A results screen with seven bullet points is a report, and
 * nobody reads a report about a sixty-second game.
 */
export function runInsights(
  answers: Answer[],
  mistakes: Record<string, { label: string; fix: string; count: number }> = {}
): Insight[] {
  if (answers.length < MIN_ANSWERS) return [];

  const found = [
    repeatedMistake(mistakes),
    paceVersusAccuracy(answers),
    endOfRun(answers),
    slowestAnswer(answers),
    consistency(answers),
  ].filter((x): x is Insight => x !== null);

  return found.slice(0, 3);
}

/** Median seconds per answer, for the summary line above the findings. */
export function medianSeconds(answers: Answer[]): number {
  return median(answers.map((a) => a.ms)) / 1000;
}

"use client";

import { useEffect, useState } from "react";
import { todayKey, dailySeed, writeDailyResult } from "@/lib/daily";

/**
 * This is the marketing budget.
 *
 * It is designed as a screenshot first and a webpage second: fixed aspect
 * ratio, score dominant, wordmark small but present, legible at the size a
 * phone renders it inside a group chat. Everything interactive lives outside
 * the card so it never appears in the capture.
 *
 * Shared across games and across wings. It names no colours, so the poker room
 * and the workbench each render it in their own palette without a second copy.
 */
export function ResultsCard({
  gameName,
  challengePath,
  seed,
  points,
  rawPoints,
  accuracyMultiplier,
  correct,
  attempted,
  bestStreak,
  personalBest,
  isPersonalBest,
  challengeTarget,
  onReplay,
}: {
  gameName: string;
  /** Route the challenge link should open, e.g. "/" or "/g/pot-odds". */
  challengePath: string;
  seed: string;
  /** Final score, after the accuracy multiplier. */
  points: number;
  /** What was earned before the multiplier, so the maths is visible. */
  rawPoints: number;
  accuracyMultiplier: number;
  correct: number;
  attempted: number;
  bestStreak: number;
  personalBest: number;
  isPersonalBest: boolean;
  challengeTarget: number;
  onReplay: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const accuracy = attempted ? Math.round((correct / attempted) * 100) : 0;

  // Every game ends here, so this is the one place that has to know a run
  // finished. If the seed is today's daily seed, the result is recorded - and
  // only the first result of the day is kept.
  useEffect(() => {
    const dayKey = todayKey();
    if (seed !== dailySeed(dayKey)) return;
    writeDailyResult({
      dayKey,
      game: gameName,
      points,
      correct,
      attempted,
      bestStreak,
    });
  }, [seed, gameName, points, correct, attempted, bestStreak]);

  async function copyChallenge() {
    const url = `${window.location.origin}${challengePath}?seed=${encodeURIComponent(
      seed
    )}&s=${points}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard is blocked outside a secure context. Fall back to showing
      // the URL so the share is still possible by hand.
      window.prompt("Copy this challenge link", url);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-7 px-4 py-8">
      <div className="flex aspect-[4/5] w-full max-w-[360px] flex-col rounded-panel border border-hairline-strong bg-surface-sunken px-7 py-8 shadow-panel">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium tracking-tight text-primary">CMQuant</span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-secondary">
            {gameName}
          </span>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center">
          <span className="text-[10px] uppercase tracking-[0.18em] text-secondary">Score</span>
          <span
            className={`tabular mt-1 text-[4.5rem] leading-none ${
              isPersonalBest ? "text-rare" : "text-primary"
            }`}
          >
            {points.toLocaleString()}
          </span>
          {isPersonalBest ? (
            <span className="mt-3 text-[10px] uppercase tracking-[0.18em] text-rare">
              Personal best
            </span>
          ) : (
            <span className="tabular mt-3 text-[11px] text-muted">
              best {personalBest.toLocaleString()}
            </span>
          )}

          {challengeTarget > 0 && (
            <span
              className={`tabular mt-5 text-xs ${
                points > challengeTarget ? "text-data-pos" : "text-data-neg"
              }`}
            >
              {points > challengeTarget
                ? `beat the challenge by ${(points - challengeTarget).toLocaleString()}`
                : `short by ${(challengeTarget - points).toLocaleString()}`}
            </span>
          )}
        </div>

        {/* Show the multiplier and what it acted on. A score that silently
            shrank by two thirds reads as a bug rather than a penalty. */}
        {attempted > 0 && accuracyMultiplier !== 1 && (
          <div className="mb-4 text-center">
            <span className="tabular text-[11px] text-muted">
              {rawPoints.toLocaleString()} earned
            </span>
            <span
              className={`tabular ml-2 text-[11px] ${
                accuracyMultiplier > 1 ? "text-data-pos" : "text-data-neg"
              }`}
            >
              ×{accuracyMultiplier} accuracy
            </span>
          </div>
        )}

        <div className="grid grid-cols-3 border-t border-hairline pt-4">
          <CardStat label="Correct" value={`${correct}/${attempted}`} />
          <CardStat label="Accuracy" value={`${accuracy}%`} />
          <CardStat label="Streak" value={String(bestStreak)} />
        </div>

        <div className="mt-4 flex items-baseline justify-between">
          <span className="tabular text-[10px] text-muted">{seed}</span>
          <span className="text-[10px] text-muted">cmquant</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={onReplay}
          className="rounded-control border border-hairline-strong px-7 py-3 text-xs uppercase tracking-[0.18em] text-primary transition-colors hover:border-accent-ink hover:text-accent-ink"
        >
          Play again
        </button>
        <button
          onClick={copyChallenge}
          className="rounded-control border border-hairline px-7 py-3 text-xs uppercase tracking-[0.18em] text-secondary transition-colors hover:border-accent-ink hover:text-accent-ink"
        >
          {copied ? "Link copied" : "Challenge a friend"}
        </button>
      </div>

      <p className="max-w-xs text-center text-[11px] leading-relaxed text-muted">
        The link carries this seed. Whoever opens it gets the same questions in
        the same order.
      </p>
    </div>
  );
}

function CardStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="tabular text-lg text-primary">{value}</span>
      <span className="text-[9px] uppercase tracking-[0.16em] text-secondary">{label}</span>
    </div>
  );
}

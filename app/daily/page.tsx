"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Wing, Label } from "@/components/Wing";
import { SiteFooter } from "@/components/SiteFooter";
import {
  todayKey,
  dailySeed,
  dailyGame,
  readDailyResult,
  msUntilNextDaily,
  formatCountdown,
  type DailyResult,
} from "@/lib/daily";
import { Wordmark } from "@/components/site/Wordmark";

/**
 * One puzzle a day, one attempt, the same for everybody.
 *
 * Which game you get rotates by date and is computed rather than looked up, so
 * this page works for any date without a server. That is also what makes the
 * archive cheap later: it is this same function pointed at yesterday.
 */
export default function DailyPage() {
  const dayKey = todayKey();
  const game = dailyGame(dayKey);
  const seed = dailySeed(dayKey);

  const result = useDailyResult(dayKey);
  const countdown = useCountdown();

  return (
    <Wing wing="comp">
      <nav className="flex shrink-0 items-center justify-between border-b border-hairline px-4 py-2">
        <Wordmark />
        <div className="flex items-center gap-5 text-[10px] uppercase tracking-[0.18em] text-secondary">
          <Link href="/comp" className="transition-colors hover:text-primary">
            Comp
          </Link>
          <Link href="/poker" className="transition-colors hover:text-primary">
            Poker Lab
          </Link>
        </div>
      </nav>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
        <Label>Daily challenge</Label>
        <p className="tabular mt-2 text-[11px] text-muted">{dayKey}</p>

        <h1 className="mt-6 font-display text-5xl font-semibold tracking-tight sm:text-6xl">
          {game.name}
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-secondary">
          {game.blurb} Everyone in the world gets this one today, and you
          get one attempt at it.
        </p>

        {result ? (
          <div className="mt-10 w-full max-w-xs border border-hairline-strong px-6 py-7">
            <Label>Your run</Label>
            <p className="tabular mt-3 text-5xl text-rare">
              {result.points.toLocaleString()}
            </p>
            <div className="mt-5 grid grid-cols-3 border-t border-hairline pt-4">
              <Stat value={`${result.correct}/${result.attempted}`} label="Correct" />
              <Stat
                value={`${
                  result.attempted
                    ? Math.round((result.correct / result.attempted) * 100)
                    : 0
                }%`}
                label="Accuracy"
              />
              <Stat value={String(result.bestStreak)} label="Streak" />
            </div>
          </div>
        ) : (
          <Link
            href={`${game.path}?seed=${encodeURIComponent(seed)}`}
            className="mt-10 border border-hairline-strong px-12 py-4 text-sm uppercase tracking-[0.18em] text-primary transition-colors hover:border-accent-ink hover:text-accent-ink"
          >
            Play today
          </Link>
        )}

        <p className="tabular mt-8 text-[11px] text-muted">
          {result ? "Next challenge in " : "Resets in "}
          {countdown}
        </p>

        {result && (
          <ShareButton
            dayKey={dayKey}
            game={game.name}
            path={game.path}
            seed={seed}
            result={result}
          />
        )}
      </div>

      <SiteFooter />
    </Wing>
  );
}

/** Reads the stored result, and re-reads it when the tab regains focus - the
 *  common path here is play the game, come back, expect to see your score. */
function useDailyResult(dayKey: string): DailyResult | null {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener("focus", onChange);
      window.addEventListener("storage", onChange);
      return () => {
        window.removeEventListener("focus", onChange);
        window.removeEventListener("storage", onChange);
      };
    },
    () => cachedResult(dayKey),
    () => null
  );
}

// getSnapshot must return a stable reference, so the parsed result is cached
// and only replaced when the underlying JSON actually changes.
let cache: { raw: string | null; value: DailyResult | null } = { raw: null, value: null };

function cachedResult(dayKey: string): DailyResult | null {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(`cmquant:daily:${dayKey}`);
  } catch {
    return null;
  }
  if (raw !== cache.raw) {
    cache = { raw, value: raw ? readDailyResult(dayKey) : null };
  }
  return cache.value;
}

function useCountdown(): string {
  const [label, setLabel] = useState("—");
  useEffect(() => {
    const tick = () => setLabel(formatCountdown(msUntilNextDaily()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return label;
}

function ShareButton({
  dayKey,
  game,
  path,
  seed,
  result,
}: {
  dayKey: string;
  game: string;
  path: string;
  seed: string;
  result: DailyResult;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}${path}?seed=${encodeURIComponent(seed)}&s=${result.points}`;
    const text = `CMQuant ${game} ${dayKey}\n${result.points.toLocaleString()} · ${result.correct}/${result.attempted}\n${url}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy your result", text);
    }
  }

  return (
    <button
      onClick={share}
      className="mt-6 border border-hairline px-8 py-3 text-xs uppercase tracking-[0.18em] text-secondary transition-colors hover:border-accent-ink hover:text-accent-ink"
    >
      {copied ? "Copied" : "Share your result"}
    </button>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="tabular text-lg text-primary">{value}</span>
      <span className="text-[9px] uppercase tracking-[0.16em] text-secondary">{label}</span>
    </div>
  );
}

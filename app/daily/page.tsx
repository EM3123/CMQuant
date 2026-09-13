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

      {/* This was a heading, a sentence and a button centred in a screen with
          nothing else on it, and it read as unfinished because it was. A daily
          is a fixture: it wants a date, a countdown and a slot number, laid
          out like a board rather than like a landing page. */}
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col justify-center px-5 py-10">
        <div className="border border-hairline-strong">
          <div className="flex items-baseline justify-between border-b border-hairline px-4 py-2">
            <Label>Daily challenge</Label>
            <span className="tabular text-[10px] text-muted">{dayKey}</span>
          </div>

          <div className="grid divide-y divide-hairline sm:grid-cols-[1.4fr_1fr] sm:divide-x sm:divide-y-0">
            <div className="px-5 py-6">
              <span className="text-[10px] uppercase tracking-[0.18em] text-secondary">
                Today&apos;s game
              </span>
              <h1 className="mt-2 font-display text-3xl font-medium uppercase tracking-wing text-primary sm:text-4xl">
                {game.name}
              </h1>
              <p className="mt-4 text-[12px] leading-relaxed text-secondary">
                {game.blurb} Everyone in the world gets this one today, and you
                get one attempt at it.
              </p>
              <p className="tabular mt-4 text-[10px] text-muted">seed {seed}</p>
            </div>

            <div className="flex flex-col justify-between px-5 py-6">
              <div>
                <span className="text-[10px] uppercase tracking-[0.18em] text-secondary">
                  {result ? "Next challenge" : "Resets in"}
                </span>
                <p className="tabular mt-2 text-3xl leading-none text-primary">
                  {countdown}
                </p>
              </div>

              {result ? (
                <div className="mt-6">
                  <Label>Your run</Label>
                  <p className="tabular mt-1 text-4xl leading-none text-rare">
                    {result.points.toLocaleString()}
                  </p>
                </div>
              ) : (
                <Link
                  href={`${game.path}?seed=${encodeURIComponent(seed)}`}
                  className="mt-6 block border border-hairline-strong px-6 py-3 text-center text-xs uppercase tracking-[0.18em] text-primary transition-colors hover:border-accent-ink hover:bg-accent/10 hover:text-accent-ink"
                >
                  Play today
                </Link>
              )}
            </div>
          </div>

          {result && (
            <div className="grid grid-cols-3 divide-x divide-hairline border-t border-hairline">
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
          )}
        </div>

        {result && (
          <div className="mt-4 flex justify-center">
            <ShareButton
              dayKey={dayKey}
              game={game.name}
              path={game.path}
              seed={seed}
              result={result}
            />
          </div>
        )}

        <p className="mt-4 text-center text-[10px] leading-relaxed text-muted">
          One puzzle a day, one attempt, the same questions for everyone. The
          day turns over at midnight UTC.
        </p>
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
    <div className="flex flex-col items-center gap-1 py-3">
      <span className="tabular text-lg text-primary">{value}</span>
      <span className="text-[9px] uppercase tracking-[0.16em] text-secondary">{label}</span>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { dailyGame, dailySeed, todayKey } from "@/lib/daily";
import { FEED_TARGET, levelFor, rankFor, type Gain } from "@/lib/progression";
import { recordRun, useProgression } from "@/lib/progressionStore";
import { MAX_LEVEL, progressFor, stageFor } from "@/lib/pet";

/**
 * What the run just earned.
 *
 * WHICH NUMBER IS THE HEADLINE. There are two ladders here and only one of
 * them is the point. The dragon's stage counts FED DAYS - distinct days you
 * came back and did enough to feed it - and that is the thing the product is
 * actually asking for. XP and rank are the texture on top: they move every
 * single run, which makes them satisfying and makes them cheap, because ten
 * runs in one afternoon climbs them and changes nothing about whether anyone
 * came back tomorrow.
 *
 * So the dragon gets the banner and XP gets a line. This was the other way
 * round when the two systems first met, which put a full-width LEVEL UP on a
 * screen that said nothing about the dragon at all.
 *
 * Outside the card, like everything else on this screen that is worth
 * reading once and not worth screenshotting.
 */
export function RunProgress({
  gameName,
  seed,
  correct,
  attempted,
  assisted,
  endless,
}: {
  gameName: string;
  seed: string;
  correct: number;
  attempted: number;
  assisted: boolean;
  endless: boolean;
}) {
  const { ledger, growthDays } = useProgression();
  const [result, setResult] = useState<{ gain: Gain; beforeXp: number; day: string } | null>(
    null
  );
  // One record per results screen. The ref survives React's development-mode
  // double effect, so a run is never counted twice.
  const recorded = useRef(false);

  useEffect(() => {
    // An assisted run earns nothing, same as it sets no personal best. An
    // empty run - started and abandoned - is not a finished run.
    if (recorded.current || assisted || attempted === 0) return;
    recorded.current = true;

    const day = todayKey();
    // The daily bonus is for the daily as the rotation set it: today's game,
    // today's seed, the timed round. The seed pasted into another game, or
    // played endless, is an ordinary run.
    const daily = !endless && seed === dailySeed(day) && gameName === dailyGame(day).name;
    const { gain, beforeXp } = recordRun({ day, correct, daily });
    setResult({ gain, beforeXp, day });
  }, [assisted, attempted, correct, endless, gameName, seed]);

  if (!result) return null;

  const afterXp = result.beforeXp + result.gain.xp;
  const before = levelFor(result.beforeXp);
  const after = levelFor(afterXp);
  const rank = rankFor(after.level);
  const rankBefore = rankFor(before.level);
  const levelledUp = after.level > before.level;

  const todayXp = ledger[result.day]?.xp ?? 0;
  const fedNow = todayXp >= FEED_TARGET && todayXp - result.gain.xp < FEED_TARGET;

  // Fed days before and after this run. The store has already recorded it, so
  // growthDays is the after; the before is one fewer only if this run is what
  // crossed the bowl.
  const daysAfter = growthDays;
  const daysBefore = fedNow ? growthDays - 1 : growthDays;
  const stageAfter = stageFor(daysAfter);
  // stageFor never returns below level one, so the very first fed day cannot
  // be detected by comparing levels - it has to be named separately.
  const grew = daysAfter > 0 && (daysBefore === 0 || stageAfter.level > stageFor(daysBefore).level);
  const { next, remaining } = progressFor(daysAfter);

  return (
    <div className="flex w-full max-w-[360px] flex-col gap-3">
      {grew && (
        <div
          className="level-up border px-4 py-3 text-center"
          style={{ borderColor: stageAfter.tone, color: stageAfter.tone }}
        >
          <p className="text-[10px] uppercase tracking-[0.3em]">Your dragon grew</p>
          <p className="mt-2 font-display text-xl uppercase tracking-wing">{stageAfter.name}</p>
          <p className="tabular mt-1 text-[11px]">
            stage {stageAfter.level} of {MAX_LEVEL} · {daysAfter} fed{" "}
            {daysAfter === 1 ? "day" : "days"}
          </p>
        </div>
      )}

      {fedNow && !grew && (
        <div className="level-up border border-data-pos/60 px-4 py-3 text-center text-data-pos">
          <p className="text-[10px] uppercase tracking-[0.3em]">Dragon fed</p>
          <p className="tabular mt-1.5 text-[11px]">
            {daysAfter} fed {daysAfter === 1 ? "day" : "days"}
            {next ? ` · ${remaining} more to ${next.name}` : " · fully grown"}
          </p>
        </div>
      )}

      <div>
        <div className="flex items-baseline justify-between">
          <span className="tabular text-sm text-data-pos">+{result.gain.xp} XP</span>
          <Link
            href="/firm"
            className="text-[10px] uppercase tracking-[0.18em] underline-offset-4 hover:underline"
            style={{ color: rank.tone }}
          >
            Lvl {after.level} · {rank.name}
          </Link>
        </div>
        <div className="mt-2 h-px w-full bg-hairline">
          <div
            className="h-px"
            style={{ width: `${Math.round(after.fraction * 100)}%`, backgroundColor: rank.tone }}
          />
        </div>
        <p className="tabular mt-1.5 text-[10px] text-muted">
          {result.gain.parts.map((p) => `${p.label} ${p.xp}`).join(" · ")}
          {" · "}
          {after.into}/{after.needed} to level {after.level + 1}
          {levelledUp && ` · levelled up${rank.name !== rankBefore.name ? ` to ${rank.name}` : ""}`}
        </p>
      </div>

      <p className="text-[11px] text-secondary">
        {todayXp >= FEED_TARGET ? (
          <>Fed for today. Come back tomorrow and it grows again. </>
        ) : (
          <>{FEED_TARGET - todayXp} more XP feeds your dragon today. </>
        )}
        <Link href="/daily" className="text-accent-ink underline hover:text-primary">
          See it
        </Link>
      </p>
    </div>
  );
}

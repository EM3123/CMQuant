"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { dailyGame, dailySeed, todayKey } from "@/lib/daily";
import { FEED_TARGET, levelFor, rankFor, type Gain } from "@/lib/progression";
import { recordRun, useProgression } from "@/lib/progressionStore";

/**
 * What the run just earned: XP, the level bar, a level-up when one happens,
 * and whether the dragon has been fed today.
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
  const { ledger } = useProgression();
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

  return (
    <div className="flex w-full max-w-[360px] flex-col gap-3">
      {levelledUp && (
        <div
          className="level-up border px-4 py-3 text-center"
          style={{ borderColor: rank.tone, color: rank.tone }}
        >
          <p className="text-[10px] uppercase tracking-[0.3em]">Level up</p>
          <p className="tabular mt-1 text-2xl leading-none">{after.level}</p>
          {rank.name !== rankBefore.name && (
            <p className="mt-2 text-[11px] uppercase tracking-[0.18em]">New rank: {rank.name}</p>
          )}
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
        </p>
      </div>

      <p className="text-[11px] text-secondary">
        {fedNow ? (
          <>Your dragon is fed for today. </>
        ) : todayXp >= FEED_TARGET ? (
          <>Your dragon is already fed today. </>
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

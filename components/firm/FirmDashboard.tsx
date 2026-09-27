"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Label } from "@/components/Wing";
import { DragonPet } from "@/components/site/DragonPet";
import { todayKey } from "@/lib/daily";
import { usePersonalBest } from "@/lib/browserState";
import { endlessKey, unpackRecord } from "@/lib/endless";
import {
  FEED_TARGET,
  RANKS,
  XP_RULES,
  currentStreak,
  levelFor,
  longestStreak,
  nextRank,
  playedDays,
  rankFor,
  shiftDay,
  totalRuns,
  totalXp,
  xpForLevel,
  type Ledger,
} from "@/lib/progression";
import { useProgression } from "@/lib/progressionStore";

/**
 * My Firm: the player's career at a glance.
 *
 * Read top to bottom it answers, in order: where am I, what did I do, how do I
 * move up, and how far is the top. Every number is computed from the same
 * ledger the results screen writes, so the two can never disagree.
 */

const GAMES = [
  { name: "Equalize", href: "/g/equalize", storageKey: "cmquant:equalize:best", wing: "Comp" },
  { name: "Flash", href: "/g/flash", storageKey: "cmquant:flash:best", wing: "Comp" },
  { name: "Approx", href: "/g/approx", storageKey: "cmquant:approx:best", wing: "Comp" },
  { name: "Doomsday", href: "/g/doomsday", storageKey: "cmquant:doomsday:best", wing: "Comp" },
  { name: "Memory Tiles", href: "/g/memory-tiles", storageKey: "cmquant:memorytiles:best", wing: "Comp" },
  { name: "Pot Odds", href: "/g/pot-odds", storageKey: "cmquant:potodds:best", wing: "Poker Lab" },
  { name: "Outs", href: "/g/outs", storageKey: "cmquant:outs:best", wing: "Poker Lab" },
  { name: "Combinatorics", href: "/g/combinatorics", storageKey: "cmquant:combinatorics:best", wing: "Poker Lab" },
  { name: "Equity", href: "/g/equity", storageKey: "cmquant:equity:best", wing: "Poker Lab" },
];

export function FirmDashboard() {
  const { ledger } = useProgression();
  const today = todayKey();

  const xp = totalXp(ledger);
  const level = levelFor(xp);
  const rank = rankFor(level.level);
  const promotion = nextRank(level.level);
  const runs = totalRuns(ledger);
  const days = playedDays(ledger).length;
  const streak = currentStreak(ledger, today);
  const bestStreak = longestStreak(ledger);
  const todayEntry = ledger[today];

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-10">
      {/* 1. Where am I. */}
      <section className="border border-hairline-strong">
        <div className="flex items-baseline justify-between border-b border-hairline px-4 py-2">
          <Label>Your firm</Label>
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted">Career</span>
        </div>
        <div className="px-5 py-6">
          <span className="text-[10px] uppercase tracking-[0.18em] text-secondary">
            Level {level.level}
          </span>
          <h1
            className="mt-2 font-display text-4xl font-medium uppercase tracking-wing sm:text-5xl"
            style={{ color: rank.tone }}
          >
            {rank.name}
          </h1>

          <div className="mt-6 flex items-baseline justify-between">
            <span className="tabular text-[11px] text-secondary">
              {level.into.toLocaleString()} / {level.needed.toLocaleString()} XP
            </span>
            <span className="tabular text-[11px] text-secondary">
              {(level.needed - level.into).toLocaleString()} to level {level.level + 1}
            </span>
          </div>
          <div className="mt-2 h-1 w-full rounded-full bg-hairline">
            <div
              className="h-1 rounded-full transition-[width] duration-500"
              style={{ width: `${Math.round(level.fraction * 100)}%`, backgroundColor: rank.tone }}
            />
          </div>
          <p className="mt-3 text-[12px] text-secondary">
            {promotion ? (
              <>
                Next promotion: <span className="text-primary">{promotion.name}</span> at level{" "}
                {promotion.from} ({(xpForLevel(promotion.from) - xp).toLocaleString()} XP away).
              </>
            ) : (
              <>You made Partner. There is no one left to promote you.</>
            )}
          </p>

          {runs === 0 && (
            <p className="mt-5 border border-hairline px-4 py-3 text-[12px] leading-relaxed text-secondary">
              Your desk is empty. Finish any game to earn your first XP -{" "}
              <Link href="/daily" className="text-accent-ink underline hover:text-primary">
                today&apos;s daily
              </Link>{" "}
              pays the most.
            </p>
          )}
        </div>
      </section>

      {/* 2. What did I do. A bare number is the right form for a total. */}
      <section className="mt-6 grid grid-cols-2 gap-px border border-hairline-strong bg-hairline sm:grid-cols-4">
        <Tile label="Total XP" value={xp.toLocaleString()} />
        <Tile label="Runs finished" value={runs.toLocaleString()} />
        <Tile label="Days played" value={days.toLocaleString()} />
        <Tile
          label="Day streak"
          value={streak.toLocaleString()}
          note={bestStreak > 0 ? `best ${bestStreak}` : undefined}
        />
      </section>

      <section className="mt-6 border border-hairline-strong">
        <div className="flex items-baseline justify-between border-b border-hairline px-4 py-2">
          <Label>XP, last 14 days</Label>
          <span className="text-[10px] text-muted">dashed line: {FEED_TARGET} XP feeds the dragon</span>
        </div>
        <div className="px-5 py-5">
          <XpChart ledger={ledger} today={today} />
        </div>
      </section>

      {/* 3. How do I move up. */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="border border-hairline-strong">
          <div className="border-b border-hairline px-4 py-2">
            <Label>How you earn XP</Label>
          </div>
          <table className="w-full text-[12px]">
            <tbody className="divide-y divide-hairline">
              <Rule what="Finish any run" xp={`+${XP_RULES.finish}`} />
              <Rule what="Each correct answer" xp={`+${XP_RULES.perCorrect}`} />
              <Rule what="First run of the day" xp={`+${XP_RULES.firstOfDay}`} />
              <Rule what="Today's daily challenge" xp={`+${XP_RULES.daily}`} />
              <Rule what={`After ${XP_RULES.fullRateRuns} runs in a day`} xp="half" />
              <Rule what="Assisted runs" xp="0" />
            </tbody>
          </table>
          <p className="border-t border-hairline px-4 py-3 text-[11px] leading-relaxed text-secondary">
            Today: <span className="tabular text-primary">{(todayEntry?.xp ?? 0).toLocaleString()} XP</span>{" "}
            from {todayEntry?.runs ?? 0} {todayEntry?.runs === 1 ? "run" : "runs"}.{" "}
            {!todayEntry
              ? "Your first run today earns the +50 bonus."
              : todayEntry.runs < XP_RULES.fullRateRuns
                ? `${XP_RULES.fullRateRuns - todayEntry.runs} more at full rate.`
                : "Runs are at half rate for the rest of today."}{" "}
            {todayEntry?.daily ? "Daily done." : "Daily bonus still available."}
          </p>
        </section>

        <section className="border border-hairline-strong">
          <div className="border-b border-hairline px-4 py-2">
            <Label>Career ladder</Label>
          </div>
          <ul className="divide-y divide-hairline">
            {RANKS.map((r) => {
              const current = r.name === rank.name;
              const reached = level.level >= r.from;
              return (
                <li key={r.name} className="flex items-baseline justify-between px-4 py-2">
                  <span
                    className={`text-[11px] uppercase tracking-[0.16em] ${
                      reached ? "text-primary" : "text-muted"
                    }`}
                    style={current ? { color: r.tone } : undefined}
                  >
                    {r.name}
                    {current && <span className="ml-2 text-[10px] tracking-[0.12em]">← you</span>}
                  </span>
                  <span className={`tabular text-[10px] ${reached ? "text-secondary" : "text-muted"}`}>
                    lvl {r.from} · {xpForLevel(r.from).toLocaleString()} XP
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {/* 4. Records and the dragon. */}
      <div className="mt-6 grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <section className="border border-hairline-strong">
          <div className="border-b border-hairline px-4 py-2">
            <Label>Personal bests</Label>
          </div>
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left text-[9px] uppercase tracking-[0.16em] text-muted">
                <th className="px-4 py-2 font-normal">Game</th>
                <th className="px-2 py-2 text-right font-normal">60 seconds</th>
                <th className="px-4 py-2 text-right font-normal">Endless</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline border-t border-hairline">
              {GAMES.map((g) => (
                <BestRow key={g.storageKey} {...g} />
              ))}
            </tbody>
          </table>
        </section>

        <section className="border border-hairline-strong">
          <div className="flex items-baseline justify-between border-b border-hairline px-4 py-2">
            <Label>Firm dragon</Label>
            <Link
              href="/daily"
              className="text-[10px] uppercase tracking-[0.18em] text-secondary hover:text-primary"
            >
              Daily →
            </Link>
          </div>
          <div className="flex justify-center px-5 py-6">
            <DragonPet size={112} />
          </div>
        </section>
      </div>

      <p className="mt-6 text-center text-[10px] leading-relaxed text-muted">
        Everything here lives in this browser until you sign in; a different
        device starts a new firm.
      </p>
    </div>
  );
}

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="bg-surface px-4 py-4">
      <span className="text-[9px] uppercase tracking-[0.16em] text-secondary">{label}</span>
      <p className="tabular mt-2 text-3xl leading-none text-primary">{value}</p>
      {note && <p className="tabular mt-1.5 text-[10px] text-muted">{note}</p>}
    </div>
  );
}

function Rule({ what, xp }: { what: string; xp: ReactNode }) {
  return (
    <tr>
      <td className="px-4 py-2 text-secondary">{what}</td>
      <td className="tabular px-4 py-2 text-right text-primary">{xp}</td>
    </tr>
  );
}

function BestRow({ name, href, storageKey, wing }: (typeof GAMES)[number]) {
  const [best] = usePersonalBest(storageKey);
  const [endless] = usePersonalBest(endlessKey(storageKey));
  const deepest = unpackRecord(endless).cleared;
  return (
    <tr>
      <td className="px-4 py-2">
        <Link href={href} className="text-primary hover:text-accent-ink">
          {name}
        </Link>
        <span className="ml-2 text-[9px] uppercase tracking-[0.14em] text-muted">{wing}</span>
      </td>
      <td className="tabular px-2 py-2 text-right text-primary">
        {best > 0 ? best.toLocaleString() : <span className="text-muted">—</span>}
      </td>
      <td className="tabular px-4 py-2 text-right text-primary">
        {deepest > 0 ? `${deepest} cleared` : <span className="text-muted">—</span>}
      </td>
    </tr>
  );
}

/**
 * XP per day, one series, fourteen bars. Scaled so the feeding line always
 * fits, so an empty fortnight still shows where "fed" would be. Each column is
 * a hover and focus target the full height of the plot, not just the bar.
 */
function XpChart({ ledger, today }: { ledger: Ledger; today: string }) {
  const [active, setActive] = useState<number | null>(null);
  const days = Array.from({ length: 14 }, (_, i) => shiftDay(today, i - 13));
  const values = days.map((d) => ledger[d]?.xp ?? 0);
  const max = Math.max(FEED_TARGET * 1.25, ...values);
  const HEIGHT = 120;
  const feedY = (FEED_TARGET / max) * HEIGHT;
  const label = (d: string) =>
    new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });

  return (
    <div>
      {/* Headroom above the plot, so the tooltip on the tallest bar stays inside
          the panel instead of riding over its header. */}
      <div className="relative mt-10" style={{ height: HEIGHT }} onMouseLeave={() => setActive(null)}>
        {/* The one reference line: where a day becomes a fed day. */}
        <div
          className="pointer-events-none absolute inset-x-0 border-t border-dashed border-hairline-strong"
          style={{ bottom: feedY }}
        />
        <div className="absolute inset-0 flex items-end gap-[2px]">
          {days.map((d, i) => {
            const v = values[i];
            const h = v > 0 ? Math.max(2, (v / max) * HEIGHT) : 0;
            return (
              <button
                key={d}
                type="button"
                aria-label={`${label(d)}: ${v} XP, ${ledger[d]?.runs ?? 0} runs`}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className="relative flex h-full flex-1 items-end outline-none focus-visible:bg-hairline/40"
              >
                <span
                  className={`block w-full rounded-t-[4px] bg-data-pos transition-opacity ${
                    active !== null && active !== i ? "opacity-40" : "opacity-90"
                  }`}
                  style={{ height: h }}
                />
              </button>
            );
          })}
        </div>

        {active !== null && (
          <div
            // Centred over its bar, except near the edges, where it opens
            // inward so it is never clipped by the panel.
            className={`pointer-events-none absolute z-10 whitespace-nowrap border border-hairline-strong bg-surface-raised px-2.5 py-1.5 text-[10px] shadow-panel ${
              active < 3 ? "" : active > days.length - 4 ? "-translate-x-full" : "-translate-x-1/2"
            }`}
            style={{
              left: `${((active + 0.5) / days.length) * 100}%`,
              bottom: (values[active] / max) * HEIGHT + 8,
            }}
          >
            <p className="text-secondary">{days[active] === today ? "Today" : label(days[active])}</p>
            <p className="tabular text-primary">
              {values[active]} XP · {ledger[days[active]]?.runs ?? 0} runs
              {values[active] >= FEED_TARGET ? " · fed" : ""}
            </p>
          </div>
        )}
      </div>

      <div className="mt-2 flex justify-between border-t border-hairline pt-1.5 text-[9px] text-muted">
        <span>{label(days[0])}</span>
        <span>{label(days[7])}</span>
        <span>Today</span>
      </div>
    </div>
  );
}

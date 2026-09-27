"use client";

import { useId } from "react";
import { useDaysPlayed, progressFor, MAX_LEVEL, STAGES } from "@/lib/pet";
import { todayKey } from "@/lib/daily";
import {
  FEED_TARGET,
  levelFor,
  moodFor,
  rankFor,
  totalXp,
  type Mood,
} from "@/lib/progression";
import { useProgression } from "@/lib/progressionStore";
import { DRAGON_PATH } from "@/components/site/DragonMark";

/**
 * The pet. It grows because you came back.
 *
 * THE DRAGON IS THE SITE'S DRAGON. From stage three onwards this is the exact
 * path in `DragonMark` - the thing in the nav and on the favicon - rather than
 * a new creature drawn for the occasion. A pet that looked like something else
 * would be the fourth dragon on this site, and the point of a pet is that it
 * is yours and it is ours. The early stages are an egg and a hatchling because
 * a partially drawn mark reads as a rendering bug.
 *
 * NO CANVAS. The first version ran matrix rain on a canvas behind a clipping
 * mask, driven by requestAnimationFrame and a setTimeout. Three problems: the
 * loop never stops, so it burns battery on a page nobody is looking at; rAF is
 * throttled in a background tab, so it can sit frozen mid-frame; and the
 * `prefers-reduced-motion` clamp in globals.css cannot reach a canvas. What is
 * left is a scanline sweeping the inside of the silhouette, which is a CSS
 * keyframe and has none of those properties.
 *
 * NO HEX CODES. Every stage colour is a role token, so the pet reads correctly
 * in both wings instead of being terminal green in a room that has no green.
 */

/** Stages one and two, in the same 64 x 64 space as the mark. */
const EGG =
  "M32 14 C43 14 48 26 48 36 C48 48 41 54 32 54 C23 54 16 48 16 36 C16 26 21 14 32 14 Z";

const HATCHLING =
  "M17 54 C15 44 18 36 24 32 L18 18 L30 26 L38 24 L44 30 C49 35 50 45 48 54 Z";

function shapeFor(level: number): string {
  if (level <= 1) return EGG;
  if (level === 2) return HATCHLING;
  return DRAGON_PATH;
}

const MOOD_LABEL: Record<Mood, string> = {
  fed: "Fed today",
  peckish: "Peckish",
  hungry: "Hungry",
};

export function DragonPet({ size = 132 }: { size?: number }) {
  const days = useDaysPlayed();
  const { stage, next, remaining, fraction } = progressFor(days);
  const { ledger } = useProgression();
  const today = todayKey();
  const todayXp = ledger[today]?.xp ?? 0;
  const mood = moodFor(ledger, today);
  const level = levelFor(totalXp(ledger));
  const rank = rankFor(level.level);
  const id = useId();
  const clipId = `pet-clip-${id}`;

  const shape = shapeFor(stage.level);
  // Stage three is the mark in outline: the shape is there but not yet solid.
  const outlineOnly = stage.level === 3;

  return (
    <div className="flex w-full max-w-xs flex-col items-center">
      <div
        className="relative flex items-center justify-center transition-opacity duration-500"
        // Hunger is only ever a look. It dims; it never costs a stage.
        style={{ width: size, height: size, color: stage.tone, opacity: mood === "hungry" ? 0.55 : 1 }}
      >
        <svg viewBox="0 0 64 64" width={size} height={size} role="img"
             aria-label={`${stage.name}, level ${stage.level} of ${MAX_LEVEL}`}>
          <defs>
            <clipPath id={clipId}>
              <path d={shape} fillRule="evenodd" />
            </clipPath>
          </defs>

          {/* The body, and the thing moving through it. */}
          <g clipPath={`url(#${clipId})`}>
            <rect
              width="64"
              height="64"
              fill="currentColor"
              opacity={outlineOnly ? 0.14 : 0.3}
            />
            <rect className="pet-scan" width="64" height="20" fill="currentColor" opacity="0.55" />
          </g>

          {/* An outline on every stage, so the silhouette is legible even at
              the moment the scanline is nowhere near it. */}
          <path
            d={shape}
            fillRule="evenodd"
            fill="none"
            stroke="currentColor"
            strokeWidth={outlineOnly ? 1.6 : 1}
            strokeLinejoin="round"
            opacity={outlineOnly ? 1 : 0.75}
          />
        </svg>
      </div>

      <Hoard coins={level.level - 1} />

      <div className="mt-5 w-full">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] uppercase tracking-[0.18em] text-primary">
            {stage.name}
          </span>
          <span className="tabular text-[10px] text-muted">
            lvl {stage.level}/{MAX_LEVEL}
          </span>
        </div>

        <div className="mt-2 h-px w-full bg-hairline">
          <div
            className="h-px transition-[width] duration-500"
            style={{ width: `${Math.round(fraction * 100)}%`, backgroundColor: stage.tone }}
          />
        </div>

        <p className="tabular mt-2 text-[10px] text-secondary">
          {days} fed {days === 1 ? "day" : "days"}
          {next ? ` · ${remaining} more to ${next.name}` : " · fully grown"}
        </p>
        <p className="mt-2 text-[10px] leading-relaxed text-muted">{stage.note}</p>

        {/* Today's bowl. XP feeds it; a fed day is what it grows on. */}
        <div className="mt-5 flex items-baseline justify-between">
          <span
            className={`text-[10px] uppercase tracking-[0.18em] ${
              mood === "fed" ? "text-data-pos" : mood === "hungry" ? "text-data-neg" : "text-secondary"
            }`}
          >
            {MOOD_LABEL[mood]}
          </span>
          <span className="tabular text-[10px] text-muted">
            {Math.min(todayXp, FEED_TARGET)}/{FEED_TARGET} XP today
          </span>
        </div>
        <div className="mt-2 h-px w-full bg-hairline">
          <div
            className="h-px bg-data-pos transition-[width] duration-500"
            style={{ width: `${Math.round(Math.min(1, todayXp / FEED_TARGET) * 100)}%` }}
          />
        </div>

        {/* You, rather than the dragon: level and rank from all-time XP. */}
        <div className="mt-5 flex items-baseline justify-between">
          <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: rank.tone }}>
            {rank.name}
          </span>
          <span className="tabular text-[10px] text-muted">lvl {level.level}</span>
        </div>
        <div className="mt-2 h-px w-full bg-hairline">
          <div
            className="h-px transition-[width] duration-500"
            style={{ width: `${Math.round(level.fraction * 100)}%`, backgroundColor: rank.tone }}
          />
        </div>
        <p className="tabular mt-2 text-[10px] text-secondary">
          {level.into}/{level.needed} XP to level {level.level + 1}
        </p>
      </div>
    </div>
  );
}

/** The ladder, for a page that wants to show where this is going. */
export function PetLadder() {
  const days = useDaysPlayed();
  return (
    <ul className="w-full max-w-xs divide-y divide-hairline border-y border-hairline">
      {STAGES.map((s) => {
        const reached = days >= s.at;
        return (
          <li key={s.level} className="flex items-baseline justify-between py-1.5">
            <span
              className={`text-[10px] uppercase tracking-[0.16em] ${
                reached ? "text-primary" : "text-muted"
              }`}
            >
              {s.name}
            </span>
            <span
              className={`tabular text-[10px] ${reached ? "text-data-pos" : "text-muted"}`}
            >
              {s.at} fed {s.at === 1 ? "day" : "days"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The hoard: one coin per level past the first, piled into a pyramid under
 * the dragon, up to a full pile of twenty-one. It is the one thing on the pet
 * that grows with XP rather than with days.
 */
function Hoard({ coins }: { coins: number }) {
  const n = Math.max(0, Math.min(21, coins));
  if (n === 0) return null;

  // Fill a pyramid bottom-up: rows of 6, 5, 4, 3, 2, 1.
  const positions: { x: number; y: number }[] = [];
  for (let row = 0, width = 6; width > 0 && positions.length < n; row++, width--) {
    for (let i = 0; i < width && positions.length < n; i++) {
      positions.push({ x: 8 + row * 4 + i * 8, y: 22 - row * 3.5 });
    }
  }

  return (
    <svg
      viewBox="0 0 64 26"
      width={96}
      height={39}
      className="-mt-3"
      role="img"
      aria-label={`A hoard of ${n} ${n === 1 ? "coin" : "coins"}`}
      style={{ color: "var(--color-gold-leaf)" }}
    >
      {positions.map((p, i) => (
        <ellipse key={i} cx={p.x} cy={p.y} rx={3.6} ry={1.8} fill="currentColor" opacity={0.85} />
      ))}
    </svg>
  );
}

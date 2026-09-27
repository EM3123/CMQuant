"use client";

import { useId } from "react";
import { useDaysPlayed, progressFor, MAX_LEVEL, STAGES } from "@/lib/pet";
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

export function DragonPet({ size = 132 }: { size?: number }) {
  const days = useDaysPlayed();
  const { stage, next, remaining, fraction } = progressFor(days);
  const id = useId();
  const clipId = `pet-clip-${id}`;

  const shape = shapeFor(stage.level);
  // Stage three is the mark in outline: the shape is there but not yet solid.
  const outlineOnly = stage.level === 3;

  return (
    <div className="flex w-full max-w-xs flex-col items-center">
      <div
        className="relative flex items-center justify-center"
        style={{ width: size, height: size, color: stage.tone }}
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
          {days} {days === 1 ? "day" : "days"} played
          {next ? ` · ${remaining} more to ${next.name}` : " · fully grown"}
        </p>
        <p className="mt-2 text-[10px] leading-relaxed text-muted">{stage.note}</p>
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
              {s.at} {s.at === 1 ? "day" : "days"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

import type { ReactNode } from "react";
import { DragonField } from "@/components/site/DragonField";

export type WingName = "comp" | "poker";

/**
 * The route root. Everything below it reads its colours, radii, shadows and
 * display face from the data-wing attribute stamped here, so a page never
 * names a wing and a component never branches on one.
 *
 * COMP is a fixed canvas: the viewport is the window, panes scroll inside it,
 * the page itself never does. POKER is fluid and breathes - it is a room, not
 * an instrument.
 */
export function Wing({
  wing,
  children,
  className = "",
  scroll = false,
  wallpaper = "engraved",
}: {
  wing: WingName;
  children: ReactNode;
  className?: string;
  /**
   * Opts out of the fixed canvas for pages that are meant to scroll - the
   * landing page, the wing indexes, the explainers.
   *
   * Game routes leave this off, and that is load-bearing rather than
   * cosmetic: on a fixed canvas the status rail physically cannot leave the
   * screen. Pot Odds shipped as a growing page and the clock scrolled out of
   * sight behind a tall poker table, in a game that is entirely about a clock.
   */
  scroll?: boolean;
  /**
   * COMP only. `engraved` is the line-art dragon field that textures the
   * interior pages. The landing page passes `none` and paints the real brand
   * artwork behind its own hero instead - two different dragons on one screen
   * is one dragon too many.
   */
  wallpaper?: "engraved" | "none";
}) {
  // `isolate` on the COMP root matters more than it looks. The dragon layer is
  // positioned, and a positioned element paints above its static siblings no
  // matter what order they are written in - so it needs a negative z-index, and
  // a negative z-index needs a stacking context to stay inside or it slides
  // behind the page background and disappears.
  //
  // POKER has no such layer any more. Its atmosphere is a background-image on
  // the root itself, which is what a grid should have been all along.
  //
  // `overflow-clip`, not `overflow-hidden`. A hidden box is still a scroll
  // container - it just has no scrollbar - so the browser will happily scroll
  // it to chase focus. Clicking Deal focused a button, the run replaced it, and
  // the browser scrolled the root by 124px to keep the vanished element in
  // view, taking the status rail off the top of the screen with it. A clipped
  // box is not a scroll container and cannot be scrolled by anything.
  if (wing === "poker") {
    return (
      <div
        data-wing="poker"
        className={`wing-ambient relative isolate flex flex-col overflow-clip bg-surface text-primary ${
          scroll ? "min-h-dvh" : "h-dvh"
        } ${className}`}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      data-wing="comp"
      className={`wing-grid relative isolate flex flex-col bg-surface text-primary ${
        scroll ? "min-h-dvh" : "h-dvh overflow-clip"
      } ${className}`}
    >
      {wallpaper === "engraved" && <DragonField />}
      {children}
    </div>
  );
}

/** Hairline-framed pane. Square in COMP, softened and lit in POKER. */
export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`border border-hairline bg-surface-raised rounded-panel shadow-panel ${className}`}
    >
      {children}
    </div>
  );
}

/** Small all-caps label. The workbench uses these constantly; the poker room
 *  uses them rarely, and wider.
 *
 *  Colour is a prop rather than something you pass through className, because
 *  two text-colour utilities on one element are resolved by stylesheet order,
 *  not by the order you wrote them. */
export function Label({
  children,
  tone = "secondary",
  className = "",
}: {
  children: ReactNode;
  tone?: "secondary" | "muted" | "rare" | "accent";
  className?: string;
}) {
  const tones = {
    secondary: "text-secondary",
    muted: "text-muted",
    rare: "text-rare",
    accent: "text-accent-ink",
  } as const;

  return (
    <span
      className={`${tones[tone]} text-[10px] uppercase tracking-[0.18em] wing-poker:tracking-[0.3em] ${className}`}
    >
      {children}
    </span>
  );
}

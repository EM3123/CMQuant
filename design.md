# UI Architecture Configuration: Quant vs. Poker Lab Split

This file is the visual contract. Anything that contradicts it is a bug.

Read it before touching `app/globals.css`, any page under `app/`, or any
component that decides a layout. The tokens named here are implemented in
`globals.css` section 1 and bound to roles in section 2 — components consume
the role, never the hex.

## Global Variables

- **font-family**: `JetBrains Mono`, `Fira Code`, monospace. **Strictly no
  sans-serif.** One family for the whole product: labels, prose, digits,
  headings. A second family is a bug.
- **border-radius**: `0px`. Absolute zero rounded corners on every component,
  both realms. `--radius-panel` and `--radius-control` both resolve to zero and
  exist only so a component never hard-codes a radius.
- **layout-grid**: CSS Grid, dense multi-pane matrices. Panels butt against
  each other and share hairline borders. No card shadows, no floating boxes, no
  decorative gutters.
- **Density over whitespace.** Aesthetic appeal here comes from tightly packed,
  high-utility panels filling the frame — not from breathing room. If a screen
  looks calm and airy, it is wrong.

## Theme 1: The Quant Finance Matrix — `[data-wing="comp"]`

| Token | Hex | Role |
| --- | --- | --- |
| background | `#0B0C10` | Deep void black |
| structural-borders | `#1F2833` | Dark iron, 1px |
| primary-text | `#E5E9F0` | Matte silver / ice |
| secondary-text | `#666666` | Muted slate |
| alpha-positive | `#00FF66` | High-luminance terminal green, long positions |
| alpha-negative | `#FF3366` | High-luminance crimson, shorts and dips |

### Layout Blocks (Quant)

1. **Code Workspace Panel** — a raw dark IDE pane with line numbers and syntax
   colour.
2. **Analytics Panel** — flat, borderless statistical plot. No drop shadows, no
   axes chrome beyond hairlines.
3. **System Output Panel** — monospaced execution log, timings, counts.

## Theme 2: The Underground Poker Lab — `[data-wing="poker"]`

| Token | Hex | Role |
| --- | --- | --- |
| background | `#050505` | Absolute matte black |
| structural-borders | `#1A0D0D` | Smoky dark red tint, 1px |
| primary-text | `#E6B8B8` | Ash red |
| highlighting-glow | `#CC0000` | Deep red, active data and risk alerts |
| matrix-neutral | `#262626` | Charcoal, folded and inactive matrix cells |

### Layout Blocks (Poker)

1. **Table Grid** — a top-down minimalist vector table. Seat positions only
   (UTG, MP, CO, BTN, SB, BB). No felt texture, no illustration, no chips.
2. **Range Grid** — the dense 13 x 13 starting-hand array, shaded by intensity.
3. **Telemetry Panel** — compact columns of statistics in tiny monospace.

## The rule this file does not get to override

**Every number on screen is real.** Computed by this codebase, enumerated
rather than sampled, and checkable by anyone who cares to. That constraint
predates this document and outranks it.

Two blocks in the brief were built differently because of it, and the
substitutes fill the same visual role:

- **The Code Workspace shows this repository's own source**, read off disk at
  build time, rather than a mocked-up pandas backtest. The site runs no
  backtests, and a screenshot of code it does not run is a lie told in a
  monospace font. Real source is also strictly more interesting: the panel
  shows the seeded generator that produced the question you are about to play.
- **The Telemetry Panel shows enumerated poker constants and your own local
  results**, not VPIP, PFR or 3-bet frequencies. Those are statistics about
  tracked opponents. There are no opponents here, no hand histories and no
  database, so any number under those headings would be invented — the exact
  failure the poker wing exists to avoid.

Same for the Range Grid: it is shaded by an exactly computed quantity with the
method stated on screen, never by an invented EV distribution.

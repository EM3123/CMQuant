# CMQuant

**CM stands for Computational Mathematics.** Short, timed, procedurally generated
games for mental arithmetic, estimation and probability. Six games are playable;
the poker wing teaches the same quantitative skills through simulated cards and
carries no money, wagering or prizes of any kind.

Live at [cm-quant.vercel.app](https://cm-quant.vercel.app). Every push to `main`
deploys.

CMQuant is a student-built project and is not affiliated with or endorsed by
Carnegie Mellon University.

## Running it

```bash
npm install
npm run dev
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on :3000 |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run verify` | Property tests for every generator |
| `npm run verify:equalize` | One generator on its own |

If `npm run build` fails with `EPERM: operation not permitted, unlink '.next/...'`,
the dev server is holding files, or OneDrive is syncing `.next` mid-write. Stop
the dev server, delete `.next`, build again. Excluding `.next` and `node_modules`
from OneDrive sync stops it recurring.

## The one rule

**A generator must be pure and seeded.** Given the same seed and difficulty it
returns the same question, forever, on any machine.

Everything else rests on this. A generator that reaches for `Math.random()`
cannot be challenged, cannot be a daily, and cannot be validated on a server
when ranked scoring arrives. There is one source of randomness, `lib/rng.ts`,
and it takes a seed string.

The same rule has a second half that is easy to miss: **difficulty ramps on
question index, never on performance.** If difficulty responded to how well you
were playing, two people opening the same challenge link would get different
questions and the link would be a lie.

## Layout

```
app/                  routes
  page.tsx            landing - Equalize, playable immediately
  comp/               COMP index
  poker/              POKER LAB index
  g/<game>/           one route per game
lib/
  rng.ts              seeded PRNG. The only randomness in the project.
  scoring.ts          shared economy: wrong-answer cost, streaks, accuracy
  cards.ts            seeded deck
  games/<game>.ts     generators - pure functions, no React
components/
  game/ChoiceRun.tsx  runtime for any game with numbered choices
  game/ResultsCard.tsx the screenshot object
  <game>/             per-game UI
scripts/verify-*.ts   property tests
```

## Adding a game

1. Write `lib/games/yourgame.ts`. Export `generate(seed, difficulty)`,
   `questionAt(runSeed, index)`, `validate`, `score`, and `difficultyForIndex`.
   No React, no DOM, no `Math.random()`.
2. Write `scripts/verify-yourgame.ts` and add it to the `verify` script. Assert
   the properties across a few thousand seeds before you build any UI.
3. If the game is a question with numbered options, describe it as a
   `ChoiceGame` and hand it to `ChoiceRun` — Approx and Doomsday are about sixty
   lines each because of this. If it needs phases, it needs its own reducer;
   Memory Tiles is the worked example.
4. Add a route under `app/g/` and a row in `app/comp/page.tsx`.

### Generators are the hard part

Rendering a game takes an afternoon. Making it ask good questions takes days,
and the property tests are where that work actually happens. Three real bugs
that shipped past code review and were caught by assertions:

- **Pot Odds** could never place the correct answer in the first or last slot,
  because two of its three distractors are mathematically always larger than the
  answer. Measured at 0/65/35/0 across the four positions. Anyone who noticed
  would never pick an outer box again.
- **Approx** compounded its option spacing with the retry counter and spread
  four options across more than ten times the answer, so no estimation was
  needed — you could read the magnitude and stop.
- **Equalize** paid a full speed bonus for answers submitted in 200ms, which is
  a coin flip rather than a fast answer.

None of these are visible by playing a few rounds. Write the assertions first.

## Scoring

A player who is guessing must not out-earn a player who is thinking. On a
two-way question guessing is right half the time, so a wrong answer costs what a
correct one pays at the base rate, which puts random guessing at zero before the
accuracy multiplier and negative after it. Streaks pay milestones at 5, 10 and
25, and the whole run is multiplied by accuracy at the end.

Measured on Equalize: mashing one key scores about 335, and a clean 40-for-40
run scores about 31,000.

Keyboard handlers ignore `e.repeat`. Holding a key down fires `keydown` dozens
of times a second, and that alone was a viable strategy before it was blocked.

## Design system

`app/globals.css` holds CODEPACK in three layers: a raw palette no component may
touch, a semantic layer bound with `@theme inline`, then one block of custom
properties per wing. Components name roles (`bg-surface`, `border-hairline`,
`text-secondary`) and never colours. `data-wing` on the route root decides what
those resolve to, so adding a wing is a block of variables rather than a fork of
the UI.

Two things worth knowing before you touch it:

- Carnegie Red is 2.5:1 on black and **fails as text**. Use `--accent` for glow,
  fills and card backs; use `--accent-ink` for anything a person has to read.
- Tailwind resolves competing utilities by stylesheet order, not by the order
  you write them in `className`. A component that sets a default colour needs a
  `tone` prop, not a `className` override.

CMU colours are usable. CMU marks are not — no wordmark, no seal, no Scottie
Dog, no tartan pattern, and the word "Tartan" appears nowhere in the code.

## Work split

The clean seam is runtime versus content. One person owns routing, the CODEPACK
layer, persistence and `ChoiceRun`. The other owns `lib/games/*` and
`scripts/verify-*`, which are pure functions testable in isolation and mergeable
without conflict.

## The daily

`/daily` serves one puzzle a day, one attempt. Which game you get rotates by
date and both the rotation and the seed are computed from the date rather than
looked up, so the page works for any date without a server. That is also what
makes the archive cheap when the subscription arrives: it is the same function
pointed at yesterday.

The day rolls over at UTC midnight, deliberately. Local midnight would put a
player in Pittsburgh and a player in Tokyo on different puzzles while sharing
one leaderboard.

Results are recorded in `ResultsCard`, because every game ends there and it is
the only place that has to know a run finished. One attempt is enforced in
`localStorage` and nowhere else, so anyone can clear their own storage and
replay. That is fine while the board is unranked and labelled as such; it stops
being fine the day scores start meaning something, which is when generation and
validation have to move to a server.

## Where this is going

Six games are live and the daily is running. Next is the campus leaderboard
gated on `@andrew.cmu.edu`, then Outs — which needs a seven-card hand evaluator
pulled off npm rather than written by hand.

The moment a subscription launches, this stops being a personal project under
Vercel's fair-use terms and has to move to a paid plan.

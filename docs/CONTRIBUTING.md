# Working on CMQuant

This is the practical guide. [`README.md`](../README.md) covers what the
project is; this covers how to change it without breaking the parts that other
parts depend on.

## Getting set up

```bash
npm install
npm run dev
```

Then open http://localhost:3000. That is the landing page, and it is also
Equalize — the game is the front page on purpose, because a wall between a
click and the first question kills a share.

Four commands do everything:

```bash
npm run dev              # dev server
npm run verify           # every generator's property tests
npm run lint             # eslint
npm run build            # production build, run before pushing
```

If `npm run build` fails with `EPERM ... unlink '.next/...'`, the dev server is
still running or OneDrive is syncing `.next` mid-write. Stop the server, delete
`.next`, build again.

## The split

The clean seam is **runtime versus content**, and it exists so two people can
work without stepping on each other.

**Content** is `lib/games/*` and `scripts/verify-*`. Pure functions. No React,
no DOM, no `Math.random()`. They can be run and tested without a browser, and
two people editing different generators will never produce a merge conflict.

**Runtime** is `components/game/*`, `app/*`, `lib/browserState.ts` and
`app/globals.css`. Routing, the clock, persistence, the design tokens.

If you are picking up generators, you will spend almost all of your time in two
files per game and never need to touch the runtime.

## Your first game

```bash
npm run new:game -- bayes "Bayes" comp
```

That writes four files and wires the test into `npm run verify`:

```
lib/games/bayes.ts            the generator
scripts/verify-bayes.ts       the property test
components/bayes/BayesGame.tsx the UI, on the shared runtime
app/g/bayes/page.tsx          the route
```

Everything it writes compiles and runs immediately. Then:

```bash
npm run verify:bayes
```

**It fails, on purpose.** The placeholder generator puts the correct answer in
the first slot every single time, and the test catches it. That is the first
lesson: this is the exact class of bug you cannot see by playing.

## The two rules

**Generators must be pure and seeded.** `generate(seed, difficulty)` returns
the same question forever, on any machine. The only randomness in the project
lives in `lib/rng.ts` and it takes a seed string. A generator that reaches for
`Math.random()` cannot be shared as a challenge, cannot be a daily, and cannot
ever be validated on a server.

**Difficulty follows the question index, not the player.** If difficulty
responded to how well someone was doing, two people opening the same challenge
link would get different questions and the link would be a lie.

## Write the test first

Every generator bug this project has shipped was invisible from playing and
obvious from a distribution. All four were caught by assertions, not by eyes:

- **Pot Odds** could never put the correct answer in the first or last slot,
  because two of its three distractors are always larger than the answer.
  Measured at 0/65/35/0.
- **Approx** spread four options across more than ten times the answer, so you
  could pick by magnitude without estimating anything.
- **Outs** offered "a flush" on boards where a flush was impossible, counting
  full-house cards towards it. Technically true to "or better", and nothing a
  player would ever count.
- **Equalize** paid a full speed bonus for 200ms answers, which is a coin flip.

So the order is: generator, then test, then UI. Not the other way around.

### What a good test asserts

Beyond the scaffold's structural checks, the one that matters is **recompute
the answer by a second, independent route and check it agrees**. Examples in
the repo:

- `verify-hand.ts` enumerates all 2,598,960 five-card hands and checks the
  category counts against the published table. Not "passes some cases" —
  correct, with nothing left to test.
- `verify-doomsday.ts` uses the platform `Date` object as the oracle for
  Zeller's congruence, across 160,000 dates and every leap day from 1800.
- `verify-outs.ts` re-walks all 46 unseen cards and recounts the outs by hand.

Then check the distributions. Answer position should be roughly even across
slots. Option spacing should be tight enough that guessing does not work and
loose enough that two options never round to the same label.

### Distractors are the design

A wrong answer should tell the player which mistake they made. Pot Odds is the
model: its three distractors are forgetting your own call, using the raw
bet-to-pot ratio, and double-counting the call. Every one is a real error
someone makes at a table. Random numbers teach nothing.

Once the distractors *are* named errors, keep the names. Return a `diagnoses`
array alongside `options`, then give the `ChoiceGame` a `diagnose` function that
maps a chosen index to `{ key, label, fix }`. `ChoiceRun` tallies them across
the run and the results screen tells the player which mistakes they made and how
to fix each one. This is the single highest-value thing a generator can do,
and it costs about twenty lines.

## Building UI

If the game is a question with numbered choices, describe it as a `ChoiceGame`
and hand it to `ChoiceRun`. Approx and Doomsday are about sixty lines each
because the runtime owns the clock, the streak, the scoring, persistence and
the results screen.

If it needs phases — show something, then take it away — it needs its own
reducer. `MemoryTilesGame.tsx` is the worked example. The generator, scoring,
storage and results card are still shared; only the run loop is not.

**Everything must work by tap.** The whole distribution model is a screenshot
in a group chat, and the person who taps that link is on a phone. Keyboard
shortcuts are a convenience for people at a desk, never the only way in.

## Design tokens

Never name a colour in a component. Name a role: `bg-surface`,
`border-hairline`, `text-secondary`, `text-accent-ink`. `data-wing` on the
route root decides what those resolve to, which is how one component tree
serves both the workbench and the poker room.

Two traps:

- **Carnegie Red is 2.5:1 on black and fails as text.** `--accent` is for glow,
  fills and card backs. `--accent-ink` is for anything a person reads.
- **Tailwind resolves competing utilities by stylesheet order**, not by the
  order you write them in `className`. A component with a default colour needs
  a `tone` prop; a `className` override will silently lose.

## Before you push

```bash
npm run verify && npm run lint && npm run build
```

Every push to `main` deploys to production. There is no staging environment, so
that command is the staging environment.

Commit messages explain *why*, and record numbers when there are numbers — the
git log is the only place the reasoning behind a tuning decision survives.

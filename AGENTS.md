<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# CMQuant

Read [`README.md`](README.md) for what this is and
[`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) for how to change it.

Two rules break everything else if ignored:

- **A generator must be pure and seeded.** `generate(seed, difficulty)` returns
  the same question forever, on any machine. The only randomness in the project
  is `lib/rng.ts`, and it takes a seed string.
- **Difficulty follows the question index, never the player.** Otherwise two
  people opening the same challenge link get different questions.

## Animation

Motion (`motion@13`) is installed. The full guide is
[`.claude/skills/motion/SKILL.md`](.claude/skills/motion/SKILL.md) — read it
before writing animation code.

- **Nothing animates between a question and the next question.** These are
  sixty-second timed games; the round loop is the product. Motion belongs on
  the surfaces around the game — landing, wing indexes, learn pages, intro
  screens, the results card — and never inside a live round.
- **If CSS already does it, CSS keeps doing it.** The dragon drift, club light
  beams, round flash and score rise are keyframes in `app/globals.css`.
- **`prefers-reduced-motion` does not reach Motion.** The clamp in
  `globals.css` covers CSS animation only, so every Motion component calls
  `useReducedMotion()` and passes `initial={false}` when it is set.
- `"use client"` on any file importing `motion/react`.
- Animate `transform` and `opacity`; let CSS own colour, because Motion writes
  inline styles that bypass the `data-wing` token system.

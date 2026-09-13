# CMQuant

Sixty-second, seed-driven games for mental arithmetic and probability.
Next.js App Router, React 19, TypeScript, Tailwind CSS 4. There is no
`tailwind.config.js` — tokens live in `app/globals.css`.

Start with [`README.md`](../README.md), then
[`docs/CONTRIBUTING.md`](../docs/CONTRIBUTING.md).

## The two rules that break everything else if ignored

- **A generator must be pure and seeded.** `generate(seed, difficulty)` returns
  the same question forever, on any machine. The only randomness in the project
  is `lib/rng.ts` and it takes a seed string. `Math.random()` in a generator
  makes challenge links a lie.
- **Difficulty follows the question index, never the player.** Two people
  opening the same challenge link must get the same questions.

## Design tokens

Never name a colour in a component. Name a role: `bg-surface`,
`border-hairline`, `text-secondary`, `text-accent-ink`. `data-wing` on the route
root decides what those resolve to.

Carnegie Red is 2.5:1 on black and fails as text — `--accent` is for glow and
fills, `--accent-ink` is for anything a person reads.

## Animation

Motion (`motion@13`) is installed. The full guide is
[`.claude/skills/motion/SKILL.md`](../.claude/skills/motion/SKILL.md).

- **Nothing animates between a question and the next question.** The round loop
  is the product. Motion goes on the surfaces around the game — landing, wing
  indexes, learn pages, intro screens, the results card — never inside a live
  round.
- **If CSS already does it, CSS keeps doing it.** The dragon drift, round flash
  and score rise are keyframes in `globals.css`. Anything with fixed delays and
  no interaction belongs there: a JavaScript animation runs off the frame loop,
  so a page mounting in a throttled tab can leave it queued and never ticked.
- **`prefers-reduced-motion` does not reach Motion.** The clamp in
  `globals.css` covers CSS only, so every Motion component calls
  `useReducedMotion()` and passes `initial={false}` when it is set.
- `"use client"` on any file importing `motion/react`.
- Animate `transform` and `opacity`. Let CSS own colour.

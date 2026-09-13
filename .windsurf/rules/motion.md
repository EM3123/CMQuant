---
trigger: glob
globs: app/**/*.tsx,components/**/*.tsx
---

# Motion in CMQuant

Full guide: `.claude/skills/motion/SKILL.md`.
Read it before writing animation code. The rules that matter most:

1. **Nothing animates between a question and the next question.** CMQuant is a
   set of sixty-second timed games and the round loop is the product. Feedback
   is a CSS keyframe at 90ms. Motion goes on the surfaces around the game —
   landing, wing indexes, learn pages, game intro screens, the results card —
   and never inside a live round or the Memory Tiles reveal.
2. **If CSS already does it, CSS keeps doing it.** The dragon drift, the club
   light beams, the round flash and the score rise are keyframes in
   `globals.css`. They cost no JavaScript. Do not port them.
3. **`prefers-reduced-motion` does not reach Motion.** The clamp in
   `globals.css` only covers CSS animation. Every Motion component must call
   `useReducedMotion()` and pass `initial={false}` when it is set.
4. **`"use client"`** on any file importing `motion/react`, placed on the
   smallest component that needs it.
5. **Animate `transform` and `opacity` only.** Animating `width`, `height` or
   `top` forces layout every frame. Let CSS own colour, because Motion writes
   inline styles that bypass the `data-wing` token system.

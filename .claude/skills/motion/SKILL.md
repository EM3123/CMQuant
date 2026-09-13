---
name: motion
description: Guides implementation of Motion (formerly Framer Motion) for React, JavaScript, and Vue. Use this skill when building web animations, layout transitions, scroll-driven animations, or configuring Motion+ / AI Kit integrations. In CMQuant it also carries the rule about which parts of the product an animation library is allowed to touch.
---

# Motion Animation Skill

Implement smooth, accessible, high-performance UI animations using
[Motion](https://motion.dev/docs). Installed here at `motion@13`.

```bash
npm install motion
```

## Read this before the API section

CMQuant is a set of sixty-second timed games. That imposes one rule that
overrides every pattern below:

> **Nothing animates between a question and the next question.**

The round loop is the product. `--dur-feedback` is 90ms, the wrong-answer flash
is a CSS keyframe, and the gap between answering and seeing the next question
has to stay at zero. A spring on a question card would be an animation the
player is waiting on, and waiting is the one cost this product cannot pay.

So Motion belongs on the surfaces around the game, never inside it:

| Surface | Motion? | Why |
| --- | --- | --- |
| Landing page, `/comp`, `/poker`, `/learn/*` | Yes | Nobody is on a clock |
| Game intro screen, before Start | Yes | Same |
| Results card, after the run | Yes | The run is over |
| Between questions, the flash, the timer | **No** | CSS only, under 120ms |
| Memory Tiles reveal phases | **No** | Its timing is the puzzle |

Second rule: **if CSS can already do it, CSS does it.** `globals.css` animates
the dragon drift, the round flash and the score rise with keyframes. Those cost
no JavaScript and are already covered by the global `prefers-reduced-motion`
clamp. Do not port them to Motion.

This rule has teeth. A staggered card deal was built with Motion and it broke
twice: a JavaScript animation runs off the frame loop, so a page mounting in a
throttled or hidden tab can leave the animation queued and never ticked, and
the thing you were animating in never appears at all. A CSS animation resolves
off the document timeline and `animation-fill-mode: both` holds the last frame.
**Anything with fixed delays and no interaction belongs in CSS.**

## Accessibility

The `@media (prefers-reduced-motion: reduce)` block in `globals.css` clamps CSS
animations only. **It does not reach Motion**, because Motion animates via
JavaScript, so every Motion component has to opt in itself:

```tsx
import { motion, useReducedMotion } from "motion/react"

export function Rise({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  )
}
```

`initial={false}` skips the entrance entirely rather than playing it fast. A
fast animation is still an animation.

## Next.js note

Every file using `motion/react` needs `"use client"` at the top. Keep the
directive on the smallest component that needs it, not on the page, so the rest
of the route stays a server component.

## Core API

### 1. Basic component animation

```tsx
"use client"
import { motion } from "motion/react"

export function FadeInCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      Card Content
    </motion.div>
  )
}
```

### 2. Layout animations

Animates layout changes automatically — reordering, expand and collapse:

```tsx
<motion.div layout transition={{ type: "spring", stiffness: 300, damping: 30 }}>
  <motion.h2 layout="position">Title</motion.h2>
  {isOpen && <p>Detailed body content expanding smoothly...</p>}
</motion.div>
```

`layout="position"` moves an element without stretching its text, which is what
you almost always want on a heading.

### 3. Exit animations with `AnimatePresence`

The one thing CSS genuinely cannot do — animate an element that React has
already removed:

```tsx
<AnimatePresence>
  {isVisible && (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
    >
      Notification message
    </motion.div>
  )}
</AnimatePresence>
```

### 4. Scroll-driven animation

```tsx
const { scrollYProgress } = useScroll()
const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])

return <motion.div style={{ scaleX: scrollYProgress, opacity, transformOrigin: "0%" }} />
```

`useScroll` values are motion values, not state. Passing one to `style` drives
the animation off the main render path, so it never triggers a React re-render.
Never read `.get()` into state on scroll.

For "animate once when this enters the viewport", prefer `whileInView` with
`viewport={{ once: true }}` over a scroll listener.

### 5. Vanilla JavaScript

For non-React or plain DOM work:

```js
import { animate } from "motion"

animate(".box", { opacity: [0, 1], y: [8, 0] }, { duration: 0.8, ease: "easeOut" })
```

## Best practices

- **Animate `transform` and `opacity`.** `x`, `y`, `scale`, `rotate` and
  `opacity` are composited on the GPU. Animating `width`, `height`, `top` or
  `margin` forces layout on every frame.
- **Springs for anything a finger touched**, durations for anything that plays
  on its own. `type: "spring"` with `stiffness: 300, damping: 30` is a good
  default for buttons and popovers.
- **Stagger with `delayChildren` and `staggerChildren`** on a parent variant
  rather than hand-writing a delay per child.
- **Respect the design tokens.** Motion sets inline styles, so a colour or
  radius written into an `animate` prop bypasses `data-wing` entirely. Animate
  geometry and opacity; let CSS own colour.

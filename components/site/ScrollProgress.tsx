"use client";

import { motion, useScroll, useReducedMotion } from "motion/react";

/**
 * How far down the landing page you are, as a hairline across the top.
 *
 * This is the one place a scroll effect belongs on this site: the landing page
 * is three full screens and nothing else tells you there is a third one.
 *
 * scrollYProgress is a motion value, not React state. Handing it straight to
 * `style` drives the bar outside the render path, so scrolling the page costs
 * zero re-renders - which is the whole reason to reach for Motion here rather
 * than a scroll listener and a `useState`.
 *
 * Colour comes from a class, not from the animation. Motion writes inline
 * styles, and an inline colour would bypass `data-wing` entirely.
 */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const reduce = useReducedMotion();

  // A progress bar is information, not decoration, so it is not removed for
  // reduced motion - but it stops easing and simply tracks the scroll.
  return (
    <motion.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-40 h-px origin-left bg-accent-ink"
      style={{ scaleX: scrollYProgress }}
      transition={reduce ? { duration: 0 } : undefined}
    />
  );
}

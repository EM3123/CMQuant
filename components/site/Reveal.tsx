"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import type { ReactNode } from "react";

/**
 * Content that arrives when you scroll to it.
 *
 * Only for pages nobody is timed on - the landing page, the wing indexes, the
 * explainers. Inside a round, an entrance is an animation the player is
 * waiting on, and waiting is the one cost a sixty-second game cannot pay.
 *
 * `viewport={{ once: true }}` matters more than it looks. Without it the
 * section replays every time it scrolls back into view, which turns a piece of
 * polish into a page that will not sit still.
 *
 * The reduced-motion branch passes `initial={false}` rather than shortening
 * the duration, because a fast animation is still an animation. It renders the
 * finished state and never moves.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.5, delay, ease: [0.2, 0, 0, 1] }}
    >
      {children}
    </motion.div>
  );
}

/**
 * A list whose items arrive one after another.
 *
 * The stagger lives on the parent variant rather than as a hand-written delay
 * per child, so adding a row to the list does not mean renumbering anything.
 */
const listVariants: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.045, delayChildren: 0.05 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.2, 0, 0, 1] } },
};

export function RevealList({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      variants={listVariants}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, amount: 0.15 }}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  );
}

"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import { PlayingCard, type CardCode } from "@/components/cards/PlayingCard";

/**
 * The hand on the Poker Lab table, dealt rather than already sitting there.
 *
 * This page has no clock on it, which is the entire reason an animation is
 * allowed here at all. Four cards arriving one at a time is the first thing a
 * visitor sees of the poker wing, and a dealt hand says "cards" faster than a
 * static hand does.
 *
 * The wrapper is what moves. PlayingCard writes its own rotate and translateY
 * into an inline transform to fan the hand, so animating the card itself would
 * fight that; the motion element sits outside it and only carries the deal.
 */

type Dealt = { code?: CardCode; faceDown?: boolean; rotate: number; lift: number };

const HAND: Dealt[] = [
  { code: "As", rotate: -13, lift: 10 },
  { code: "Kd", rotate: -4, lift: 0 },
  { faceDown: true, rotate: 5, lift: 0 },
  { faceDown: true, rotate: 14, lift: 10 },
];

const table: Variants = {
  hidden: {},
  dealt: { transition: { staggerChildren: 0.11, delayChildren: 0.15 } },
};

// Off the left, low, and slightly under-rotated, so each card settles into the
// fan rather than appearing in it. Spring rather than duration: a card landing
// on a table overshoots a little.
const card: Variants = {
  hidden: { opacity: 0, x: -70, y: 26, rotate: -14 },
  dealt: {
    opacity: 1,
    x: 0,
    y: 0,
    rotate: 0,
    transition: { type: "spring", stiffness: 260, damping: 26 },
  },
};

export function DealtHand() {
  const reduce = useReducedMotion();

  const cards = HAND.map((c, i) => (
    <PlayingCard
      key={i}
      code={c.code}
      faceDown={c.faceDown}
      size="lg"
      rotate={c.rotate}
      lift={c.lift}
    />
  ));

  if (reduce) {
    return (
      <div className="relative flex items-end">
        {cards.map((node, i) => (
          <div key={i} className={i === 0 ? undefined : "-ml-5"}>
            {node}
          </div>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      className="relative flex items-end"
      variants={table}
      initial="hidden"
      animate="dealt"
    >
      {cards.map((node, i) => (
        <motion.div key={i} variants={card} className={i === 0 ? undefined : "-ml-5"}>
          {node}
        </motion.div>
      ))}
    </motion.div>
  );
}

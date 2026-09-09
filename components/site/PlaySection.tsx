"use client";

import { useEffect, useRef, useState } from "react";
import { EqualizeGame } from "@/components/equalize/EqualizeGame";

/**
 * Equalize, embedded in a page that scrolls.
 *
 * The game binds Space to start a round, and Space is also how people scroll.
 * On the old landing page that was fine, because the page was a fixed canvas
 * and the game was the only thing on it. Here it would mean pressing Space in
 * the hero silently starts a sixty-second round somewhere below the fold.
 *
 * So the keyboard only goes live once the game is actually on screen. Clicking
 * and tapping work either way.
 */
export function PlaySection() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      // Half of it has to be showing. A sliver at the edge of the viewport is
      // not "looking at the game".
      { threshold: 0.5 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="flex min-h-dvh flex-col">
      <EqualizeGame keysEnabled={inView} />
    </div>
  );
}

"use client";

import { usePersonalBest } from "@/lib/browserState";

/**
 * A real personal best, read from this browser. Renders an em dash until the
 * store reports in, which is also what a player with no runs yet should see.
 * The index page had fabricated numbers here; a leaderboard that lies about
 * your own score is worse than an empty one.
 */
export function BestCell({ storageKey }: { storageKey: string }) {
  const [best] = usePersonalBest(storageKey);
  return best > 0 ? (
    <span className="tabular">{best.toLocaleString()}</span>
  ) : (
    <span className="text-muted">—</span>
  );
}

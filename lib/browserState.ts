"use client";

import { useSyncExternalStore } from "react";

/**
 * The two pieces of state that live outside React: the challenge sitting in the
 * URL, and the personal best sitting in localStorage.
 *
 * Both differ between the server render and the browser, so neither can be read
 * during render. Reading them in an effect and calling setState works but costs
 * a cascading render on every mount, so they are modelled as what they actually
 * are - external stores that React subscribes to.
 */

const BEST_KEY = "cmquant:equalize:best";

export type Challenge = { seed: string; target: number };

/* -------------------------------------------------------------------------- */
/* Challenge (URL)                                                            */
/* -------------------------------------------------------------------------- */

// getSnapshot has to return a stable reference or React re-renders forever, so
// the parsed result is cached against the query string it came from.
let challengeCache: { search: string; value: Challenge | null } | null = null;

function readChallenge(): Challenge | null {
  const search = window.location.search;
  if (challengeCache?.search === search) return challengeCache.value;

  const params = new URLSearchParams(search);
  const seed = params.get("seed");
  const target = Number(params.get("s"));
  const value: Challenge | null = seed
    ? { seed, target: Number.isFinite(target) && target > 0 ? target : 0 }
    : null;

  challengeCache = { search, value };
  return value;
}

// The URL cannot change under this component without a navigation, which
// remounts it, so there is nothing to subscribe to.
function subscribeNothing(): () => void {
  return () => {};
}

export function useChallenge(): Challenge | null {
  return useSyncExternalStore(subscribeNothing, readChallenge, () => null);
}

/* -------------------------------------------------------------------------- */
/* Personal best (localStorage)                                               */
/* -------------------------------------------------------------------------- */

const bestListeners = new Set<() => void>();
let bestCache: number | null = null;

function subscribeBest(onChange: () => void): () => void {
  bestListeners.add(onChange);
  return () => {
    bestListeners.delete(onChange);
  };
}

function readBest(): number {
  if (bestCache !== null) return bestCache;
  try {
    const stored = Number(window.localStorage.getItem(BEST_KEY));
    bestCache = Number.isFinite(stored) ? stored : 0;
  } catch {
    // Private mode, or storage disabled. A missing best is not an error.
    bestCache = 0;
  }
  return bestCache;
}

function writeBest(points: number): void {
  if (points <= readBest()) return;
  bestCache = points;
  try {
    window.localStorage.setItem(BEST_KEY, String(points));
  } catch {
    // Nothing to do; the run still shows the right number for this session.
  }
  for (const listener of bestListeners) listener();
}

export function usePersonalBest(): [number, (points: number) => void] {
  const best = useSyncExternalStore(subscribeBest, readBest, () => 0);
  // writeBest is module-level and never changes identity, so it is already a
  // stable dependency.
  return [best, writeBest];
}

"use client";

import { useMemo, useSyncExternalStore } from "react";

/**
 * The two pieces of state that live outside React: the challenge sitting in the
 * URL, and personal bests sitting in localStorage.
 *
 * Both differ between the server render and the browser, so neither can be read
 * during render. Reading them in an effect and calling setState works but costs
 * a cascading render on every mount, so they are modelled as what they actually
 * are - external stores that React subscribes to.
 */

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
/* Personal bests (localStorage)                                              */
/* -------------------------------------------------------------------------- */

type BestStore = { cache: number | null; listeners: Set<() => void> };

// One store per storage key, so each game keeps its own best and a write to one
// never re-renders a component watching another.
const stores = new Map<string, BestStore>();

function storeFor(key: string): BestStore {
  let store = stores.get(key);
  if (!store) {
    store = { cache: null, listeners: new Set() };
    stores.set(key, store);
  }
  return store;
}

function readBest(key: string): number {
  const store = storeFor(key);
  if (store.cache !== null) return store.cache;
  try {
    const stored = Number(window.localStorage.getItem(key));
    store.cache = Number.isFinite(stored) ? stored : 0;
  } catch {
    // Private mode, or storage disabled. A missing best is not an error.
    store.cache = 0;
  }
  return store.cache;
}

function writeBest(key: string, points: number): void {
  if (points <= readBest(key)) return;
  const store = storeFor(key);
  store.cache = points;
  try {
    window.localStorage.setItem(key, String(points));
  } catch {
    // Nothing to do; the run still shows the right number for this session.
  }
  for (const listener of store.listeners) listener();
}

export function usePersonalBest(key: string): [number, (points: number) => void] {
  const api = useMemo(() => {
    const store = storeFor(key);
    return {
      subscribe(onChange: () => void) {
        store.listeners.add(onChange);
        return () => {
          store.listeners.delete(onChange);
        };
      },
      getSnapshot: () => readBest(key),
      write: (points: number) => writeBest(key, points),
    };
  }, [key]);

  const best = useSyncExternalStore(api.subscribe, api.getSnapshot, () => 0);
  return [best, api.write];
}

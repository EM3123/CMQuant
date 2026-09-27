"use client";

import { useSyncExternalStore } from "react";
import { applyRun, fedDays, totalXp, type Gain, type Ledger, type RunResult } from "@/lib/progression";

/**
 * The XP ledger, in this browser, like every other record here until
 * accounts land. One entry per day played, so it stays small however long
 * someone keeps coming back.
 */

const KEY = "cmquant:xp:v1";

/** The pet's original record: a list of days a run was finished. It is no
 *  longer written - the dragon now grows on fed days - but every day in it
 *  still counts, so nobody's dragon shrinks the day this ships. */
const LEGACY_PET_KEY = "cmquant:pet:days";

export type Snapshot = {
  ledger: Ledger;
  /** Distinct days the dragon has grown on: fed days plus legacy days. */
  growthDays: number;
};

const EMPTY: Snapshot = { ledger: {}, growthDays: 0 };

let snapshot: Snapshot | null = null;
const listeners = new Set<() => void>();

function readJson(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function isEntry(v: unknown): boolean {
  if (!v || typeof v !== "object") return false;
  const e = v as Record<string, unknown>;
  return typeof e.xp === "number" && typeof e.runs === "number" && typeof e.daily === "boolean";
}

function build(ledger: Ledger): Snapshot {
  const legacy = readJson(LEGACY_PET_KEY);
  const days = new Set(fedDays(ledger));
  if (Array.isArray(legacy)) for (const d of legacy) if (typeof d === "string") days.add(d);
  return { ledger, growthDays: days.size };
}

function read(): Snapshot {
  if (snapshot) return snapshot;
  const parsed = readJson(KEY);
  const ledger: Ledger = {};
  // Somebody else's junk under the key is a fresh ledger, not a crash on the
  // results screen.
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    for (const [day, entry] of Object.entries(parsed)) {
      if (isEntry(entry)) ledger[day] = entry as Ledger[string];
    }
  }
  snapshot = build(ledger);
  return snapshot;
}

function notify() {
  for (const listener of listeners) listener();
}

/** Record a finished, unassisted run. Returns what it paid, and the total
 *  before it, so the results screen can tell whether it crossed a level. */
export function recordRun(run: RunResult): { gain: Gain; beforeXp: number } {
  const previous = read().ledger;
  const { ledger, gain } = applyRun(previous, run);
  snapshot = build(ledger);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ledger));
  } catch {
    // Still right for this session.
  }
  notify();
  return { gain, beforeXp: totalXp(previous) };
}

function subscribe(onChange: () => void) {
  // Another tab finishing a run should move this tab's numbers too.
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === LEGACY_PET_KEY) {
      snapshot = null;
      onChange();
    }
  };
  listeners.add(onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** The ledger and growth, as an external store. Server-renders as empty. */
export function useProgression(): Snapshot {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

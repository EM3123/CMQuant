"use client";

import { useSyncExternalStore } from "react";

/**
 * Assist mode. A key sequence that makes every answer count as correct, so a
 * run can be played to the end in seconds instead of sixty of them.
 *
 * WHY IT DOES NOT SIMPLY CHEAT
 *
 * Anything that lives in the client can be read out of the bundle by anyone who
 * opens the network tab, so a "secret" sequence is not secret and cannot be the
 * protection. The protection is that an assisted run does not count: no
 * personal best is written, no daily result is recorded, the shared link
 * carries no score, and the results card says ASSISTED across it. A screenshot
 * of a cheated run therefore labels itself.
 *
 * That also means this can stay in the production build, which is the point -
 * playtesting the deployed site is exactly when you need it.
 *
 * THE SEQUENCE
 *
 *   Ctrl+E   Ctrl+M   Ctrl+Alt+3   ArrowUp
 *
 * Ctrl+Alt+3 rather than Ctrl+3, and that substitution is forced. Chrome and
 * Edge reserve Ctrl+1 through Ctrl+8 for switching tabs at a level a page
 * cannot intercept: preventDefault does nothing, the tab changes, and the
 * sequence dies halfway through. Adding Alt takes it out of the reserved set.
 *
 * Entering the sequence again turns it off.
 */

const STEPS = [
  (e: KeyboardEvent) => e.ctrlKey && !e.altKey && e.key.toLowerCase() === "e",
  (e: KeyboardEvent) => e.ctrlKey && !e.altKey && e.key.toLowerCase() === "m",
  (e: KeyboardEvent) => e.ctrlKey && e.altKey && (e.key === "3" || e.code === "Digit3"),
  (e: KeyboardEvent) => !e.ctrlKey && !e.altKey && e.key === "ArrowUp",
] as const;

/** Give up on a half-entered sequence, so a stray Ctrl+E is not a landmine. */
const STEP_TIMEOUT_MS = 3_000;

const KEY = "cmquant:assist";

let active = false;
let progress = 0;
let lastStepAt = 0;
let installed = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function setActive(next: boolean) {
  if (active === next) return;
  active = next;
  try {
    // Session, not local. Assist should survive clicking from the index into a
    // game and die when the tab does - leaving it on across days is how you
    // end up wondering why every answer is green.
    if (next) window.sessionStorage.setItem(KEY, "1");
    else window.sessionStorage.removeItem(KEY);
  } catch {
    // Private mode. The flag still works for this page.
  }
  emit();
}

function onKeyDown(e: KeyboardEvent) {
  // Never while typing. Flash takes digits, and a shortcut that fires inside a
  // text field is a shortcut that eats input.
  const target = e.target as HTMLElement | null;
  if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;

  const now = Date.now();
  if (progress > 0 && now - lastStepAt > STEP_TIMEOUT_MS) progress = 0;

  if (!STEPS[progress](e)) {
    // Restart rather than reset, so entering the first key twice still works.
    progress = STEPS[0](e) ? 1 : 0;
    if (progress === 1) {
      lastStepAt = now;
      e.preventDefault();
    }
    return;
  }

  e.preventDefault();
  progress++;
  lastStepAt = now;

  if (progress === STEPS.length) {
    progress = 0;
    setActive(!active);
  }
}

function install() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  try {
    active = window.sessionStorage.getItem(KEY) === "1";
  } catch {
    active = false;
  }
  window.addEventListener("keydown", onKeyDown);
}

function subscribe(onChange: () => void) {
  install();
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

/**
 * Whether assist is on. Server-renders as off, which is correct - the flag
 * lives in sessionStorage and the server has never met this tab.
 */
export function useAssist(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => active,
    () => false
  );
}

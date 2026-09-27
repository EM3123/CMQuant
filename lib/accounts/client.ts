"use client";

import { useSyncExternalStore } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ACCOUNTS_ENABLED, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/accounts/config";

/**
 * The signed-in player, as an external store.
 *
 * Sign-in lives entirely in the browser: Supabase keeps the session in
 * localStorage and the server is handed the access token only when a run is
 * saved. That keeps every page static and the site cookie-free, which is what
 * the privacy page promises.
 */

export type AccountState =
  | { status: "disabled" }
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "signed-in"; userId: string; email: string; username: string | null };

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!ACCOUNTS_ENABLED) return null;
  client ??= createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  return client;
}

const INITIAL: AccountState = ACCOUNTS_ENABLED ? { status: "loading" } : { status: "disabled" };

let state: AccountState = INITIAL;
let started = false;
const listeners = new Set<() => void>();

function set(next: AccountState) {
  state = next;
  listeners.forEach((listener) => listener());
}

async function loadProfile(userId: string, email: string) {
  const supabase = getSupabase();
  if (!supabase) return;
  const { data } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();
  set({ status: "signed-in", userId, email, username: data?.username ?? null });
}

function start() {
  const supabase = getSupabase();
  if (started || !supabase) return;
  started = true;
  // Fires once straight away with the stored session, then on every change.
  supabase.auth.onAuthStateChange((_event, session) => {
    if (!session) {
      set({ status: "signed-out" });
      return;
    }
    const { id, email } = session.user;
    // Supabase warns against awaiting its own calls inside this callback - it
    // can deadlock the auth lock - so the profile read is deferred a tick.
    window.setTimeout(() => void loadProfile(id, email ?? ""), 0);
  });
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useAccount(): AccountState {
  return useSyncExternalStore(subscribe, () => state, () => INITIAL);
}

/** Re-read the username after the player sets or changes it. */
export async function refreshProfile() {
  if (state.status === "signed-in") await loadProfile(state.userId, state.email);
}

/** The bearer token the API routes check, or null when signed out. */
export async function accessToken(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { accessToken, useAccount } from "@/lib/accounts/client";
import { gameIdFor } from "@/lib/accounts/games";

type Outcome = "saving" | "saved" | "daily-taken" | "failed";

/**
 * Saves a finished run to the signed-in player's account, and says so in one
 * line under the results card. Outside the card on purpose: the card is the
 * screenshot, and "saved" is not something anyone needs in a group chat.
 *
 * Signed out, it is an invitation. Accounts switched off, it is nothing.
 */
export function SaveRun({
  gameName,
  seed,
  points,
  correct,
  attempted,
  bestStreak,
  assisted,
  endless,
}: {
  gameName: string;
  seed: string;
  points: number;
  correct: number;
  attempted: number;
  bestStreak: number;
  assisted: boolean;
  /** Present on an endless run, which is saved and ranked separately. */
  endless?: { cleared: number };
}) {
  const account = useAccount();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  // One save per results screen. The ref survives React's development-mode
  // double effect, so a run is never posted twice.
  const sent = useRef(false);

  const game = gameIdFor(gameName);
  const eligible = account.status === "signed-in" && !assisted && game !== null && attempted > 0;
  const cleared = endless?.cleared ?? null;

  useEffect(() => {
    if (!eligible || sent.current) return;
    sent.current = true;

    void (async () => {
      setOutcome("saving");
      try {
        const token = await accessToken();
        const res = await fetch("/api/runs", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
          body: JSON.stringify({
            game,
            mode: cleared === null ? "timed" : "endless",
            cleared,
            seed,
            score: points,
            correct,
            attempted,
            bestStreak,
          }),
        });
        setOutcome(res.ok ? "saved" : res.status === 409 ? "daily-taken" : "failed");
      } catch {
        setOutcome("failed");
      }
    })();
  }, [eligible, game, cleared, seed, points, correct, attempted, bestStreak]);

  if (assisted || account.status === "disabled" || account.status === "loading") return null;

  if (account.status === "signed-out") {
    return (
      <p className="text-center text-[11px] text-muted">
        <Link href="/account" className="text-accent-ink underline hover:text-primary">
          Sign in
        </Link>{" "}
        to save your runs and get on the leaderboards.
      </p>
    );
  }

  const message: Record<Outcome, string> = {
    saving: "Saving to your account…",
    saved: "Saved to your account.",
    "daily-taken": "Today's daily is already on your account. Only the first attempt counts.",
    failed: "Could not save this run.",
  };

  if (!outcome) return null;

  return (
    <p
      className={`text-center text-[11px] ${
        outcome === "failed" ? "text-data-neg" : outcome === "saved" ? "text-data-pos" : "text-muted"
      }`}
    >
      {message[outcome]}
      {outcome === "saved" && !account.username && (
        <>
          {" "}
          <Link href="/account" className="underline hover:text-primary">
            Pick a username
          </Link>{" "}
          to appear on leaderboards.
        </>
      )}
    </p>
  );
}

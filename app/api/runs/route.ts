import { dailyGame, dailySeed, todayKey } from "@/lib/daily";
import { isGameId } from "@/lib/accounts/games";
import { getAdmin, json, userFromRequest } from "@/lib/accounts/server";

/**
 * Save a finished run for the signed-in player.
 *
 * For now the browser reports the score and this trusts it, so every row is
 * saved with verified = false. Verification replaces the body of this handler,
 * not its shape: the browser will send its answers instead of a score, and the
 * server will rebuild the questions from the seed and score them itself.
 */
export async function POST(request: Request) {
  const admin = getAdmin();
  if (!admin) return json({ error: "accounts-disabled" }, 503);

  const user = await userFromRequest(request, admin);
  if (!user) return json({ error: "signed-out" }, 401);

  const body: unknown = await request.json().catch(() => null);
  const run = parseRun(body);
  if (!run) return json({ error: "bad-run" }, 400);

  // The server's own clock decides whether this is today's daily, and only
  // the game the rotation actually picked counts - the daily seed pasted into
  // some other game's URL is just an ordinary run.
  const today = todayKey();
  const isDaily =
    run.mode === "timed" && run.seed === dailySeed(today) && run.game === dailyGameId(today);

  const { error } = await admin.from("runs").insert({
    user_id: user.id,
    game: run.game,
    mode: run.mode,
    seed: run.seed,
    day_key: isDaily ? today : null,
    score: run.score,
    cleared: run.cleared,
    correct: run.correct,
    attempted: run.attempted,
    best_streak: run.bestStreak,
  });

  // 23505 is Postgres's unique violation: the one-daily-per-player index.
  if (error?.code === "23505") return json({ error: "daily-already-recorded" }, 409);
  if (error) return json({ error: "save-failed" }, 500);
  return json({ saved: true, daily: isDaily }, 201);
}

type Run = {
  game: string;
  mode: "timed" | "endless";
  /** Endless only: questions cleared. Null on a timed run. */
  cleared: number | null;
  seed: string;
  score: number;
  correct: number;
  attempted: number;
  bestStreak: number;
};

/** Generous bounds: a sixty-second round cannot answer 500 questions or score
 *  ten million. Anything outside them is not a run this site produced. */
function parseRun(body: unknown): Run | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const int = (v: unknown, max: number) =>
    typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max;

  if (!isGameId(b.game)) return null;
  if (typeof b.seed !== "string" || b.seed.length < 1 || b.seed.length > 64) return null;
  if (!int(b.score, 10_000_000) || !int(b.attempted, 500) || !int(b.correct, 500)) return null;
  if (!int(b.bestStreak, 500)) return null;
  const correct = b.correct as number;
  const attempted = b.attempted as number;
  const bestStreak = b.bestStreak as number;
  if (correct > attempted || bestStreak > correct) return null;

  const mode = b.mode ?? "timed";
  if (mode !== "timed" && mode !== "endless") return null;
  // Every correct answer on an endless run clears a question.
  if (mode === "endless" && b.cleared !== correct) return null;
  if (mode === "timed" && b.cleared !== undefined && b.cleared !== null) return null;

  return {
    game: b.game,
    mode,
    cleared: mode === "endless" ? correct : null,
    seed: b.seed,
    score: b.score as number,
    correct,
    attempted,
    bestStreak,
  };
}

function dailyGameId(dayKey: string): string {
  return dailyGame(dayKey).path.replace(/^\/g\//, "");
}

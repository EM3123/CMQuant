// The stable id each game is saved under.
//
// Display names are for people and can change; these cannot, because every
// saved run and every leaderboard query keys on them. Equalize's challenge
// path is "/", which is why this is a table rather than something derived
// from the route.

export const GAME_IDS = {
  Equalize: "equalize",
  Flash: "flash",
  Approx: "approx",
  Doomsday: "doomsday",
  "Memory Tiles": "memory-tiles",
  "Pot Odds": "pot-odds",
  Outs: "outs",
  Combinatorics: "combinatorics",
  Equity: "equity",
  "Poker Minute": "poker-minute",
  Distribution: "distribution",
  Signal: "signal",
} as const;

export type GameId = (typeof GAME_IDS)[keyof typeof GAME_IDS];

const KNOWN = new Set<string>(Object.values(GAME_IDS));

export function gameIdFor(name: string): GameId | null {
  return (GAME_IDS as Record<string, GameId>)[name] ?? null;
}

export function isGameId(value: unknown): value is GameId {
  return typeof value === "string" && KNOWN.has(value);
}

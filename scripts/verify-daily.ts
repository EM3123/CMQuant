/**
 * Property test for the daily rotation.
 *
 * THE BUG THIS EXISTS TO CATCH ALREADY HAPPENED. Outs, Combinatorics and
 * Equity all shipped, all went live on the Poker Lab index, and none of them
 * was ever added to the rotation. For months the daily could not land on a
 * third of the catalogue, and nothing anywhere said so - the games worked, the
 * index worked, the daily worked, and the hole was only visible to somebody
 * who happened to compare two lists.
 *
 * So the first check reads the filesystem rather than trusting a constant: if
 * a route exists under `app/g/` that the rotation has never heard of, this
 * fails. Adding a game and forgetting the rotation is now a broken build
 * rather than a silence.
 */

import { readdirSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DAILY_ROTATION, dailyGame, dailySeed, todayKey } from "../lib/daily";

const failures: string[] = [];

/* -------------------------------------------------------------------------- */
/* Every built game is in the rotation, and every entry is a real route       */
/* -------------------------------------------------------------------------- */

const routes = readdirSync(join(process.cwd(), "app", "g"), { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => `/g/${e.name}`)
  .sort();

const listed = DAILY_ROTATION.map((g) => g.path).sort();

for (const route of routes) {
  if (!listed.includes(route)) {
    failures.push(`${route} is a live game and is not in the rotation`);
  }
}
for (const path of listed) {
  if (!routes.includes(path)) {
    failures.push(`rotation lists ${path}, which has no route`);
  }
  if (!existsSync(join(process.cwd(), "app", path.slice(1), "page.tsx"))) {
    failures.push(`rotation lists ${path}, which has no page.tsx`);
  }
}

// No duplicates, or that game is twice as likely as every other.
if (new Set(listed).size !== listed.length) failures.push("a path appears twice");
if (new Set(DAILY_ROTATION.map((g) => g.name)).size !== DAILY_ROTATION.length) {
  failures.push("a name appears twice");
}
for (const g of DAILY_ROTATION) {
  if (!g.blurb.trim()) failures.push(`${g.path} has no blurb`);
  if (!g.blurb.trim().endsWith(".")) failures.push(`${g.path} blurb is not a sentence`);
}

/* -------------------------------------------------------------------------- */
/* The rotation's name is the name the game reports                           */
/* -------------------------------------------------------------------------- */

/**
 * ResultsCard records a daily result only when the finished run is BOTH today's
 * seed and today's game, which it decides by comparing the game's own name
 * against `dailyGame(dayKey).name`. That makes these two strings, written in
 * two files by two people, load-bearing: rename "Pot Odds" to "Pot odds" in one
 * of them and the daily silently stops recording for that game. Nothing else
 * would break, and nobody would notice until somebody compared two lists again -
 * which is the exact failure at the top of this file.
 *
 * So: follow each route to the component it renders and read the name back out.
 */
function reportedName(routePath: string): string | null {
  const page = readFileSync(join(process.cwd(), "app", routePath.slice(1), "page.tsx"), "utf8");

  // Only the component whose name ends in "Game" - Wing and SiteFooter are on
  // every page and have fields of their own.
  const imports = [...page.matchAll(/from "@\/(components\/[^"]+Game)"/g)].map(
    (m) => m[1]
  );

  for (const rel of imports) {
    const file = join(process.cwd(), `${rel}.tsx`);
    if (!existsSync(file)) continue;
    const src = readFileSync(file, "utf8");
    // Bespoke reducers pass a literal; ChoiceRun games carry it on the game.
    const literal = src.match(/gameName="([^"]+)"/);
    if (literal) return literal[1];
    const field = src.match(/\bname:\s*"([^"]+)"/);
    if (field) return field[1];
  }
  return null;
}

for (const g of DAILY_ROTATION) {
  const reported = reportedName(g.path);
  if (reported === null) {
    failures.push(`${g.path} renders no component that names itself`);
  } else if (reported !== g.name) {
    failures.push(`${g.path} calls itself "${reported}", the rotation calls it "${g.name}"`);
  }
}

/* -------------------------------------------------------------------------- */
/* The rotation is deterministic, and it actually rotates                     */
/* -------------------------------------------------------------------------- */

function dayKeyAt(offsetDays: number): string {
  const d = new Date(Date.UTC(2026, 0, 1));
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return todayKey(d);
}

const YEAR = 365;
const counts = new Map<string, number>();
let repeats = 0;
let previous = "";

for (let i = 0; i < YEAR; i++) {
  const key = dayKeyAt(i);
  const game = dailyGame(key);

  // Same day, same game, forever. Everyone in the world has to get this one.
  if (dailyGame(key).path !== game.path) failures.push(`${key} is not deterministic`);
  if (dailySeed(key) !== dailySeed(key)) failures.push(`${key} seed is not deterministic`);
  if (!listed.includes(game.path)) failures.push(`${key} chose ${game.path}, not in the rotation`);

  counts.set(game.path, (counts.get(game.path) ?? 0) + 1);
  if (game.path === previous) repeats++;
  previous = game.path;
}

// Every game must come up inside a year. One that never does is a game nobody
// is ever handed.
const never = listed.filter((p) => !counts.has(p));

// And none should dominate. Uniform would be 1/n; allow a wide band, because
// this is a hash and not a shuffle, but catch a real skew.
const expected = YEAR / listed.length;
const worst = Math.max(...[...counts.values()].map((n) => Math.abs(n - expected) / expected));

// Back-to-back repeats happen by chance at 1/n per day. Flag only a real run.
const repeatRate = repeats / YEAR;

/* -------------------------------------------------------------------------- */

console.log(`routes on disk    ${routes.length}`);
console.log(`rotation entries  ${listed.length}`);
console.log(`days simulated    ${YEAR}`);
console.log(`worst skew        ${(worst * 100).toFixed(0)}% from even`);
console.log(`same as yesterday ${(repeatRate * 100).toFixed(1)}% of days`);
console.log(`failures          ${failures.length}`);

if (never.length) console.log(`\nNEVER CHOSEN IN A YEAR: ${never.join(", ")}`);
if (worst > 0.6) console.log(`\nROTATION IS SKEWED: one game is ${(worst * 100).toFixed(0)}% off even`);

if (failures.length || never.length || worst > 0.6) {
  console.log("\nfirst failures");
  for (const f of failures.slice(0, 12)) console.log(`  ${f}`);
  process.exit(1);
}

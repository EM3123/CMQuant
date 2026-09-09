/**
 * Property test for the Poker Minute spot generator.
 *
 * The claim this has to defend is the one on screen: "against this range,
 * calling loses X bb". So the oracle recomputes equity a completely different
 * way - walk the stated range combination by combination, rank each against
 * the hero, tally - and checks the EV arithmetic follows from it.
 *
 * If the two ever disagree, the game is telling players a number about their
 * own decision that is not true.
 */

import {
  spotAt,
  evOfCall,
  breakEvenEquity,
  evLoss,
  grade,
  difficultyForIndex,
  BEST_BAND_SHARE,
  evLossShare,
  type PokerMinuteSpot,
} from "../lib/games/pokerminute";
import { encode } from "../lib/poker/hand";
import { bestRank } from "../lib/poker/rank";

const RUNS = 400;
const SPOTS_PER_RUN = 18;

const failures: { where: string; why: string }[] = [];
const bestAction = { fold: 0, call: 0 };
const equities: number[] = [];
const evs: number[] = [];
let generated = 0;
let slowest = 0;

for (let run = 0; run < RUNS; run++) {
  const seed = `verify-${run}`;
  for (let i = 0; i < SPOTS_PER_RUN; i++) {
    const started = performance.now();
    let s: PokerMinuteSpot;
    try {
      s = spotAt(seed, i);
    } catch (err) {
      failures.push({ where: `${seed}#${i}`, why: `threw: ${(err as Error).message}` });
      continue;
    }
    slowest = Math.max(slowest, performance.now() - started);
    generated++;

    const board = s.board.map(encode);
    const hero = s.hero.map(encode);
    const heroRank = bestRank([...hero, ...board]);
    const combos = [...s.range.value, ...s.range.bluff];

    // 1. No card may appear twice anywhere - hero, board, or any combination
    //    of the villain's range.
    const seen = new Set([...s.hero, ...s.board]);
    if (seen.size !== 7) {
      failures.push({ where: `${seed}#${i}`, why: "duplicate card in hero or board" });
    }
    for (const combo of combos) {
      if (combo.some((c) => seen.has(c))) {
        failures.push({
          where: `${seed}#${i}`,
          why: `range holds ${combo.join("")}, which is already on the board or in the hand`,
        });
        break;
      }
      if (combo[0] === combo[1]) {
        failures.push({ where: `${seed}#${i}`, why: "range combination uses one card twice" });
        break;
      }
    }

    // 2. Recount equity the slow way, straight from the stated range.
    let beat = 0;
    let tied = 0;
    for (const combo of combos) {
      const v = bestRank([...combo.map(encode), ...board]);
      if (heroRank > v) beat++;
      else if (heroRank === v) tied++;
    }
    const recomputed = (beat + tied / 2) / combos.length;
    if (Math.abs(recomputed - s.equity) > 1e-9) {
      failures.push({
        where: `${seed}#${i}`,
        why: `equity says ${s.equity.toFixed(4)}, recount says ${recomputed.toFixed(4)}`,
      });
    }

    // 3. The value half must actually beat the hero and the bluff half must not.
    for (const combo of s.range.value) {
      if (bestRank([...combo.map(encode), ...board]) <= heroRank) {
        failures.push({ where: `${seed}#${i}`, why: "a value combination does not beat the hero" });
        break;
      }
    }
    for (const combo of s.range.bluff) {
      if (bestRank([...combo.map(encode), ...board]) >= heroRank) {
        failures.push({ where: `${seed}#${i}`, why: "a bluff combination is not losing" });
        break;
      }
    }

    // 4. The arithmetic on screen has to follow from the equity.
    if (Math.abs(breakEvenEquity(s.pot, s.bet) - s.breakEven) > 1e-9) {
      failures.push({ where: `${seed}#${i}`, why: "break-even does not match pot and bet" });
    }
    if (Math.abs(evOfCall(s.pot, s.bet, s.equity) - s.evCall) > 1e-9) {
      failures.push({ where: `${seed}#${i}`, why: "EV of calling does not match the equity" });
    }

    // 5. The recommendation has to agree with the EV, and with break-even.
    const shouldCall = s.evCall > 0;
    if ((s.best === "call") !== shouldCall) {
      failures.push({ where: `${seed}#${i}`, why: "best action disagrees with its own EV" });
    }
    if (shouldCall !== s.equity > s.breakEven) {
      failures.push({
        where: `${seed}#${i}`,
        why: "EV sign and break-even comparison disagree",
      });
    }

    // 6. Taking the best action must never be graded as a loss.
    if (evLoss(s, s.best) > 1e-9) {
      failures.push({ where: `${seed}#${i}`, why: "best action shows an EV loss" });
    }
    if (grade(s, s.best) !== "best") {
      failures.push({ where: `${seed}#${i}`, why: "best action is not graded best" });
    }

    // 7. The spot must be decidable - if both actions grade the same the
    //    question has no answer.
    const other = s.best === "call" ? "fold" : "call";
    if (evLossShare(evLoss(s, other), s.pot, s.bet) <= BEST_BAND_SHARE) {
      failures.push({ where: `${seed}#${i}`, why: "both actions grade as best" });
    }

    if (s.difficulty !== difficultyForIndex(i)) {
      failures.push({ where: `${seed}#${i}`, why: "difficulty does not match index" });
    }
    if (s.pot <= 0 || s.bet <= 0) {
      failures.push({ where: `${seed}#${i}`, why: "pot or bet not positive" });
    }

    bestAction[s.best]++;
    equities.push(s.equity);
    evs.push(Math.abs(s.evCall));
  }
}

let determinismBreaks = 0;
for (let run = 0; run < 120; run++) {
  for (let i = 0; i < 6; i++) {
    const a = spotAt(`determinism-${run}`, i);
    const b = spotAt(`determinism-${run}`, i);
    if (
      a.hero.join() !== b.hero.join() ||
      a.board.join() !== b.board.join() ||
      a.pot !== b.pot ||
      a.bet !== b.bet ||
      a.best !== b.best
    ) {
      determinismBreaks++;
    }
  }
}

const total = bestAction.fold + bestAction.call;
const callShare = (bestAction.call / total) * 100;
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

console.log(`generated        ${generated.toLocaleString()} river spots`);
console.log(`failures         ${failures.length}`);
console.log(`determinism      ${determinismBreaks === 0 ? "stable" : `${determinismBreaks} BREAKS`}`);
console.log(`slowest spot     ${slowest.toFixed(0)}ms`);
console.log(`best is call     ${callShare.toFixed(1)}%  (want 40-60)`);
console.log(`median equity    ${(median(equities) * 100).toFixed(1)}%`);
console.log(`median |EV|      ${median(evs).toFixed(2)} bb`);

console.log("\nsample run (seed sample-1)");
for (const i of [0, 4, 9, 14, 17]) {
  const s = spotAt("sample-1", i);
  console.log(
    `  #${String(i).padStart(2)} d${String(s.difficulty).padStart(2)}  ` +
      `${s.hero.join(" ")} | ${s.board.join(" ")}  pot ${String(s.pot).padStart(4)} bet ${String(s.bet).padStart(4)}  ` +
      `eq ${(s.equity * 100).toFixed(0)}% vs ${(s.breakEven * 100).toFixed(0)}%  -> ${s.best.toUpperCase()} (${s.evCall >= 0 ? "+" : ""}${s.evCall.toFixed(2)}bb)`
  );
}

const lopsided = callShare < 40 || callShare > 60;
if (failures.length || determinismBreaks || lopsided) {
  if (lopsided) console.log("\nBEST ACTION IS LOPSIDED - one answer beats guessing");
  console.log("\nfirst failures");
  for (const f of failures.slice(0, 10)) console.log(`  ${f.where}: ${f.why}`);
  process.exit(1);
}

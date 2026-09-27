/**
 * Property test for the pet.
 *
 * The pet makes two claims on screen - a level and a progress bar - and both
 * are the kind of thing a player checks against their own memory. "It says I
 * am 60% of the way to the next stage" is falsifiable by anyone who counts
 * the days, so it has to be right.
 *
 * The progress bar is the specific thing being guarded. The first version
 * took the total modulo the band WIDTH rather than measuring from the band
 * FLOOR, which put a player 1,000 into a band starting at 5,000 at 60%
 * instead of 10%. That is not a rounding error, it is a different number.
 */

import { STAGES, MAX_LEVEL, stageFor, progressFor } from "../lib/pet";

const failures: string[] = [];

/* -------------------------------------------------------------------------- */
/* The ladder itself                                                          */
/* -------------------------------------------------------------------------- */

if (STAGES.length !== MAX_LEVEL) failures.push("MAX_LEVEL does not match the ladder");
if (STAGES[0].at !== 1) failures.push("the first stage is not reachable on day one");

for (let i = 0; i < STAGES.length; i++) {
  const s = STAGES[i];
  if (s.level !== i + 1) failures.push(`stage ${i} is labelled level ${s.level}`);
  if (!s.name.trim()) failures.push(`stage ${s.level} has no name`);
  if (!s.note.trim()) failures.push(`stage ${s.level} has no note`);
  // Every colour must be a token. A hex here is a pet that is the wrong
  // colour in one of the two wings, which is the rule this repo keeps most.
  if (!s.tone.startsWith("var(--")) failures.push(`stage ${s.level} names a colour: ${s.tone}`);
  if (i > 0 && s.at <= STAGES[i - 1].at) {
    failures.push(`stage ${s.level} is not further away than stage ${s.level - 1}`);
  }
}

/* -------------------------------------------------------------------------- */
/* Every day count, exhaustively, well past the top                           */
/* -------------------------------------------------------------------------- */

const TOP = STAGES[STAGES.length - 1].at;
let previousLevel = 0;

for (let days = 0; days <= TOP * 3; days++) {
  const stage = stageFor(days);
  const p = progressFor(days);

  // 1. The level never goes backwards as days go up.
  if (stage.level < previousLevel) {
    failures.push(`level fell from ${previousLevel} to ${stage.level} at ${days} days`);
  }
  previousLevel = stage.level;

  // 2. stageFor and progressFor must agree about which stage you are in.
  if (p.stage.level !== stage.level) {
    failures.push(`at ${days} days stageFor says ${stage.level}, progressFor says ${p.stage.level}`);
  }

  // 3. The fraction is a fraction.
  if (!Number.isFinite(p.fraction) || p.fraction < 0 || p.fraction > 1) {
    failures.push(`fraction ${p.fraction} at ${days} days`);
  }

  // 4. THE BAND CHECK. At the exact day a stage is earned the bar resets to
  //    empty, and one day before the next stage it is nearly full. This is
  //    the assertion the old modulo arithmetic fails.
  if (p.next) {
    if (days === stage.at && p.fraction !== 0) {
      failures.push(`bar is ${p.fraction} on the day stage ${stage.level} was earned`);
    }
    if (days === p.next.at - 1) {
      const band = p.next.at - stage.at;
      const expected = (band - 1) / band;
      if (Math.abs(p.fraction - expected) > 1e-9) {
        failures.push(
          `one day short of stage ${p.next.level}: bar is ${p.fraction}, should be ${expected}`
        );
      }
    }
    // 5. Remaining has to be the truth, and has to reach zero exactly when
    //    the next stage is earned.
    if (p.remaining !== p.next.at - days) {
      failures.push(`at ${days} days remaining is ${p.remaining}, should be ${p.next.at - days}`);
    }
    if (p.remaining <= 0) failures.push(`remaining is ${p.remaining} below the next stage`);
  } else {
    if (p.fraction !== 1) failures.push(`top stage bar is ${p.fraction}, should be full`);
    if (p.remaining !== 0) failures.push(`top stage wants ${p.remaining} more days`);
    if (stage.level !== MAX_LEVEL) failures.push(`no next stage below the top at ${days} days`);
  }

  // 6. Zero days must still render something rather than crash or read as
  //    level zero. A new player has a pet, it is just an egg.
  if (stage.level < 1) failures.push(`level ${stage.level} at ${days} days`);
}

// 7. Each stage is actually reachable, and lands exactly on its threshold.
for (const s of STAGES) {
  if (stageFor(s.at).level !== s.level) {
    failures.push(`${s.at} days does not give stage ${s.level}`);
  }
  if (s.at > 1 && stageFor(s.at - 1).level !== s.level - 1) {
    failures.push(`stage ${s.level} is reached a day early`);
  }
}

const ladder = STAGES.map((s) => `${s.name} @ ${s.at}`).join(", ");
console.log(`stages            ${STAGES.length}`);
console.log(`ladder            ${ladder}`);
console.log(`day counts tested 0 to ${TOP * 3} (exhaustive)`);
console.log(`failures          ${failures.length}`);

if (failures.length) {
  console.log("\nfirst failures");
  for (const f of failures.slice(0, 12)) console.log(`  ${f}`);
  process.exit(1);
}

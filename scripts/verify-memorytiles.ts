/**
 * Property test for the Memory Tiles generator.
 *
 * The failure that matters here is a pattern that cannot be recalled because it
 * was never coherent: a repeated cell, an index off the board, or more lit
 * tiles than the board has squares. All three are silent - the game would just
 * feel unfair.
 */

import {
  questionAt,
  difficultyForIndex,
  type MemoryTilesQuestion,
} from "../lib/games/memorytiles";

const RUNS = 6000;
const QUESTIONS_PER_RUN = 20;

const failures: { where: string; why: string }[] = [];
const shapeByDifficulty = new Map<number, { size: number; count: number }>();
const cellUse = new Map<number, number[]>();
let generated = 0;

for (let run = 0; run < RUNS; run++) {
  const seed = `verify-${run}`;
  for (let i = 0; i < QUESTIONS_PER_RUN; i++) {
    let q: MemoryTilesQuestion;
    try {
      q = questionAt(seed, i);
    } catch (err) {
      failures.push({ where: `${seed}#${i}`, why: `threw: ${(err as Error).message}` });
      continue;
    }
    generated++;

    const cells = q.size * q.size;

    if (new Set(q.tiles).size !== q.tiles.length) {
      failures.push({ where: `${seed}#${i}`, why: "repeated cell in pattern" });
    }
    if (q.tiles.some((t) => t < 0 || t >= cells)) {
      failures.push({ where: `${seed}#${i}`, why: `cell index off a ${q.size}x${q.size} board` });
    }
    if (q.tiles.length > cells) {
      failures.push({ where: `${seed}#${i}`, why: "more lit tiles than squares" });
    }
    // A pattern covering most of the board is easier to recall as its inverse,
    // which is a different game.
    if (q.tiles.length / cells > 0.5) {
      failures.push({ where: `${seed}#${i}`, why: `pattern fills ${Math.round((q.tiles.length / cells) * 100)}% of the board` });
    }
    for (let k = 1; k < q.tiles.length; k++) {
      if (q.tiles[k] <= q.tiles[k - 1]) {
        failures.push({ where: `${seed}#${i}`, why: "tiles not ascending" });
        break;
      }
    }
    if (q.difficulty !== difficultyForIndex(i)) {
      failures.push({ where: `${seed}#${i}`, why: "difficulty does not match index" });
    }
    if (q.showMs < 500 || q.showMs > 1500) {
      failures.push({ where: `${seed}#${i}`, why: `show time ${q.showMs}ms out of range` });
    }

    shapeByDifficulty.set(q.difficulty, { size: q.size, count: q.tiles.length });

    // Every cell on a board should get used across many seeds. A generator
    // biased away from corners would be hard to spot by playing.
    const uses = cellUse.get(q.size) ?? new Array(q.size * q.size).fill(0);
    for (const t of q.tiles) uses[t]++;
    cellUse.set(q.size, uses);
  }
}

let determinismBreaks = 0;
for (let run = 0; run < 300; run++) {
  for (let i = 0; i < 8; i++) {
    const a = questionAt(`determinism-${run}`, i);
    const b = questionAt(`determinism-${run}`, i);
    if (a.tiles.join() !== b.tiles.join() || a.size !== b.size) determinismBreaks++;
  }
}

console.log(`generated        ${generated.toLocaleString()} patterns`);
console.log(`failures         ${failures.length}`);
console.log(`determinism      ${determinismBreaks === 0 ? "stable" : `${determinismBreaks} BREAKS`}`);

console.log("\nshape by difficulty");
for (const d of [...shapeByDifficulty.keys()].sort((a, b) => a - b)) {
  const { size, count } = shapeByDifficulty.get(d)!;
  const density = Math.round((count / (size * size)) * 100);
  console.log(`  d${String(d).padStart(2)}  ${size}x${size} board, ${count} tiles  (${density}% lit)`);
}

console.log("\ncell coverage - spread between least and most used cell");
for (const size of [...cellUse.keys()].sort()) {
  const uses = cellUse.get(size)!;
  const lo = Math.min(...uses);
  const hi = Math.max(...uses);
  const spread = lo === 0 ? "a cell never used" : `${((hi / lo - 1) * 100).toFixed(1)}%`;
  console.log(`  ${size}x${size}  ${spread}`);
  if (lo === 0) failures.push({ where: `${size}x${size}`, why: "a cell never lit across all seeds" });
}

if (failures.length || determinismBreaks) {
  console.log("\nfirst failures");
  for (const f of failures.slice(0, 10)) console.log(`  ${f.where}: ${f.why}`);
  process.exit(1);
}

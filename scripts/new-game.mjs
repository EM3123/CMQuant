#!/usr/bin/env node
/**
 * Scaffold a new game.
 *
 *   npm run new:game -- bayes "Bayes" comp
 *
 * Writes a seeded generator, a property test wired into `npm run verify`, a
 * component on the shared runtime, and a route. Everything it writes compiles
 * and runs on the first try; the TODOs are about what the questions should be,
 * not about how to plug it in.
 *
 * The point is that the boring half is done, so the interesting half - what
 * makes a good question - is the only thing left to think about.
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const [slug, displayRaw, wingRaw] = process.argv.slice(2);

if (!slug || !/^[a-z][a-z0-9-]*$/.test(slug)) {
  console.error(
    'Usage: npm run new:game -- <slug> "<Display Name>" [comp|poker]\n' +
      "  slug must be lowercase kebab-case, e.g. bayes or decision-tree"
  );
  process.exit(1);
}

const display = displayRaw ?? slug.replace(/(^|-)(\w)/g, (_, d, c) => (d ? " " : "") + c.toUpperCase());
const wing = wingRaw === "poker" ? "poker" : "comp";
const flat = slug.replace(/-/g, "");
const Pascal = slug.replace(/(^|-)(\w)/g, (_, _d, c) => c.toUpperCase());

const files = [];
function write(path, contents) {
  if (existsSync(path)) {
    console.error(`refusing to overwrite ${path}`);
    process.exit(1);
  }
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, contents, "utf8");
  files.push(path);
}

write(
  `lib/games/${flat}.ts`,
  `// ${display.toUpperCase()} - one line on the skill this trains.
//
// Read docs/CONTRIBUTING.md before filling this in. The rule that matters:
// generate() must be pure and seeded, and difficulty must depend on the
// question index rather than on how the player is doing.

import { createRng, randInt, ramp, clampDifficulty } from "@/lib/rng";

export type ${Pascal}Question = {
  /** What the player reads. */
  prompt: string;
  /** Choices, in the order they are shown. */
  options: string[];
  answerIndex: number;
  difficulty: number;
};

const MAX_ATTEMPTS = 300;

export function generate(seed: string, difficulty: number): ${Pascal}Question {
  const d = clampDifficulty(difficulty);
  const rng = createRng(\`${flat}:\${seed}:\${d}\`);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    // TODO: sample a question here.
    const answer = randInt(rng, 2, Math.round(ramp(d, 20, 200)));

    // TODO: build three distractors. Make them the mistakes a real player
    // makes, not random numbers - being wrong should tell you which error you
    // carry. And decide up front how many sit below the answer, or the correct
    // option ends up in a predictable slot. See lib/games/potodds.ts.
    const values = [answer, answer + 1, answer + 2, answer + 3];

    const sorted = [...values].sort((a, b) => a - b);
    return {
      prompt: \`TODO question at difficulty \${d}\`,
      options: sorted.map(String),
      answerIndex: sorted.indexOf(answer),
      difficulty: d,
    };
  }

  throw new Error(\`${flat}: no valid question for seed \${seed} at difficulty \${d}\`);
}

/** Difficulty follows the question index, never the player's performance. */
export function difficultyForIndex(index: number): number {
  return clampDifficulty(1 + Math.floor(index / 3));
}

export function questionAt(runSeed: string, index: number): ${Pascal}Question {
  return generate(\`\${runSeed}#\${index}\`, difficultyForIndex(index));
}

export function validate(question: ${Pascal}Question, chosen: number): boolean {
  return chosen === question.answerIndex;
}

export const ROUND_MS = 60_000;
export const WRONG_PENALTY_MS = 2_000;

/** Below this nobody read the question; they picked a box. */
export const GUESS_FLOOR_MS = 500;

export function score(
  question: ${Pascal}Question,
  msElapsed: number,
  streak: number
): number {
  const base = 100;
  const speed =
    msElapsed < GUESS_FLOOR_MS
      ? 0
      : Math.max(0, Math.min(1, (7000 - msElapsed) / 5200));
  const multiplier = Math.min(2, 1 + streak * 0.05);
  const difficultyBonus = 1 + (question.difficulty - 1) * 0.05;
  return Math.round((base + speed * 100) * multiplier * difficultyBonus);
}
`
);

write(
  `scripts/verify-${slug}.ts`,
  `/**
 * Property test for the ${display} generator.
 *
 * Write the assertions before the UI. Every generator bug this project has
 * shipped was invisible from playing a few rounds and obvious from a
 * distribution.
 */

import {
  questionAt,
  difficultyForIndex,
  type ${Pascal}Question,
} from "../lib/games/${flat}";

const RUNS = 3000;
const QUESTIONS_PER_RUN = 40;

const failures: { where: string; why: string }[] = [];
const answerSlot = [0, 0, 0, 0];
let generated = 0;
let slowest = 0;

for (let run = 0; run < RUNS; run++) {
  const seed = \`verify-\${run}\`;
  for (let i = 0; i < QUESTIONS_PER_RUN; i++) {
    const started = performance.now();
    let q: ${Pascal}Question;
    try {
      q = questionAt(seed, i);
    } catch (err) {
      failures.push({ where: \`\${seed}#\${i}\`, why: \`threw: \${(err as Error).message}\` });
      continue;
    }
    slowest = Math.max(slowest, performance.now() - started);
    generated++;

    if (q.options.length !== 4) {
      failures.push({ where: \`\${seed}#\${i}\`, why: \`\${q.options.length} options\` });
      continue;
    }
    if (new Set(q.options).size !== 4) {
      failures.push({ where: \`\${seed}#\${i}\`, why: "duplicate options" });
    }
    if (q.answerIndex < 0 || q.answerIndex > 3) {
      failures.push({ where: \`\${seed}#\${i}\`, why: "answerIndex out of range" });
    }
    if (q.difficulty !== difficultyForIndex(i)) {
      failures.push({ where: \`\${seed}#\${i}\`, why: "difficulty does not match index" });
    }
    if (!q.prompt) {
      failures.push({ where: \`\${seed}#\${i}\`, why: "empty prompt" });
    }

    // TODO: the assertion that actually matters for this game - recompute the
    // answer by a second, independent route and check it agrees.

    answerSlot[q.answerIndex]++;
  }
}

let determinismBreaks = 0;
for (let run = 0; run < 200; run++) {
  for (let i = 0; i < 10; i++) {
    const a = questionAt(\`determinism-\${run}\`, i);
    const b = questionAt(\`determinism-\${run}\`, i);
    if (a.prompt !== b.prompt || a.answerIndex !== b.answerIndex) determinismBreaks++;
  }
}

const total = answerSlot.reduce((a, b) => a + b, 0);
const share = answerSlot.map((n) => (n / total) * 100);
const skewed = share.some((s) => s < 12 || s > 45);

console.log(\`generated        \${generated.toLocaleString()} questions\`);
console.log(\`failures         \${failures.length}\`);
console.log(\`determinism      \${determinismBreaks === 0 ? "stable" : \`\${determinismBreaks} BREAKS\`}\`);
console.log(\`slowest question \${slowest.toFixed(2)}ms\`);
console.log(\`answer position  \${share.map((s) => s.toFixed(1) + "%").join("  ")}\`);

console.log("\\nsample run (seed sample-1)");
for (const i of [0, 6, 15, 30, 39]) {
  const q = questionAt("sample-1", i);
  const row = q.options
    .map((o, k) => (k === q.answerIndex ? \`[\${o}]\` : \` \${o} \`))
    .join(" ");
  console.log(\`  #\${String(i).padStart(2)} d\${String(q.difficulty).padStart(2)}  \${q.prompt}   \${row}\`);
}

if (failures.length || determinismBreaks || skewed) {
  if (skewed) console.log("\\nANSWER POSITION IS UNBALANCED");
  for (const f of failures.slice(0, 10)) console.log(\`  \${f.where}: \${f.why}\`);
  process.exit(1);
}
`
);

write(
  `components/${flat}/${Pascal}Game.tsx`,
  `"use client";

import { ChoiceRun, type ChoiceGame } from "@/components/game/ChoiceRun";
import {
  questionAt,
  validate,
  score,
  ROUND_MS,
  WRONG_PENALTY_MS,
  type ${Pascal}Question,
} from "@/lib/games/${flat}";

const ${slug.toUpperCase().replace(/-/g, "_")}: ChoiceGame<${Pascal}Question> = {
  name: "${display}",
  storageKey: "cmquant:${flat}:best",
  challengePath: "/g/${slug}",
  roundMs: ROUND_MS,
  wrongPenaltyMs: WRONG_PENALTY_MS,
  questionAt,
  optionCount: (q) => q.options.length,
  validate,
  score,
  difficultyOf: (q) => q.difficulty,
  renderPrompt: (q) => (
    <div className="tabular whitespace-nowrap text-[clamp(1.6rem,5.5vw,3.5rem)] leading-none text-primary">
      {q.prompt}
    </div>
  ),
  renderOption: (q, i) => (
    <span className="tabular text-xl text-primary sm:text-2xl">{q.options[i]}</span>
  ),
  optionsClassName: "grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4",
  intro: {
    eyebrow: "${wing === "poker" ? "Poker Lab / Probability in Practice" : "Comp / Computational Thinking"}",
    title: "${display}",
    blurb: "TODO: one short paragraph on what the player is being asked to do.",
    startLabel: "${wing === "poker" ? "Deal" : "Start"}",
    hint: "Keys 1 – 4. A wrong answer costs two seconds.",
  },
};

export function ${Pascal}Game() {
  return <ChoiceRun game={${slug.toUpperCase().replace(/-/g, "_")}} />;
}
`
);

write(
  `app/g/${slug}/page.tsx`,
  `import Link from "next/link";
import { Wing } from "@/components/Wing";
import { SiteFooter } from "@/components/SiteFooter";
import { ${Pascal}Game } from "@/components/${flat}/${Pascal}Game";

export default function ${Pascal}Page() {
  return (
    <Wing wing="${wing}">
      <nav className="flex shrink-0 items-center justify-between border-b border-hairline px-4 py-2">
        <Link href="/" className="text-sm font-medium tracking-tight">
          CMQuant
        </Link>
        <Link
          href="/${wing}"
          className="text-[10px] uppercase tracking-[0.18em] text-secondary transition-colors hover:text-primary"
        >
          ${wing === "poker" ? "Poker Lab" : "Comp"}
        </Link>
      </nav>

      <${Pascal}Game />

      <SiteFooter />
    </Wing>
  );
}
`
);

// Wire the new property test into npm run verify.
const pkgPath = "package.json";
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
pkg.scripts[`verify:${slug}`] = `tsx scripts/verify-${slug}.ts`;
if (!pkg.scripts.verify.includes(`verify:${slug}`)) {
  pkg.scripts.verify += ` && npm run verify:${slug}`;
}
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");

console.log(`\nScaffolded ${display} (${wing} wing):\n`);
for (const f of files) console.log("  " + f);
console.log(`  package.json  (added verify:${slug})`);
console.log(`
Next:
  1. npm run verify:${slug}
     It fails immediately, on purpose. The placeholder generator puts the
     answer in the first slot every single time, and the test catches it.
     That is the exact class of bug that is invisible from playing.
  2. Write the real generator in lib/games/${flat}.ts
  3. Write the assertion that matters in scripts/verify-${slug}.ts
  4. npm run dev, then open http://localhost:3000/g/${slug}
  5. Add a row for it in app/${wing}/page.tsx so it is reachable
`);

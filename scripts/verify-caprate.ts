/**
 * Property test for Cap Rate.
 *
 * The oracle rebuilds the chain from the premises printed on screen, with its
 * own code, in the order a person would: gross rent, vacancy, collected income,
 * each operating line converted to a year, net income, then the value or the
 * implied rate. It shares no function with the generator.
 *
 * Each named error is recomputed the same way, from the printed premises, so a
 * diagnosis that names the wrong mistake fails here.
 */

import {
  generate,
  questionAt,
  difficultyForIndex,
  validate,
  labelFor,
  score,
  MISTAKE_LABEL,
  MISTAKE_FIX,
  type CapQuestion,
  type MistakeKey,
} from "../lib/games/caprate";

const failures: string[] = [];
const note = (why: string) => failures.push(why);

/** The chain, rebuilt from the printed premises. Returns NOI and the rent figures. */
function rebuild(q: CapQuestion) {
  const gross = q.units * q.monthlyRent * 12;
  const vacancy = gross * (q.vacancyPct / 100);
  const collected = Math.round(gross - vacancy);
  let opex = 0;
  for (const line of q.costs) {
    if (line.basis === "annual") opex += line.amount;
    else if (line.basis === "monthly") opex += line.amount * 12;
    else opex += Math.round((collected * line.percent) / 100);
  }
  return { gross, collected, opex, noi: collected - opex };
}

const SEEDS = 300;
const slots = [0, 0, 0, 0];
const ranks = [0, 0, 0, 0];
const kinds: Record<string, number> = {};
const mistakes = new Set<MistakeKey>();
let questions = 0;
let named = 0;

for (let d = 1; d <= 10; d++) {
  for (let s = 0; s < SEEDS; s++) {
    const seed = `verify-${d}-${s}`;
    let q: CapQuestion;
    try {
      q = generate(seed, d);
    } catch (err) {
      note(`d${d} ${seed}: threw ${(err as Error).message}`);
      continue;
    }
    questions++;
    kinds[q.kind] = (kinds[q.kind] ?? 0) + 1;

    if (JSON.stringify(generate(seed, d)) !== JSON.stringify(q)) note(`d${d} ${seed}: not deterministic`);

    // 1. The chain reproduces from the printed premises.
    const r = rebuild(q);
    if (r.gross !== q.gpr) note(`d${d} ${seed}: gross is ${q.gpr}, rebuild says ${r.gross}`);
    if (r.collected !== q.egi) note(`d${d} ${seed}: income is ${q.egi}, rebuild says ${r.collected}`);
    if (r.opex !== q.opex) note(`d${d} ${seed}: costs are ${q.opex}, rebuild says ${r.opex}`);
    if (r.noi !== q.noi) note(`d${d} ${seed}: NOI is ${q.noi}, rebuild says ${r.noi}`);
    if (!Number.isInteger(q.noi)) note(`d${d} ${seed}: NOI is not a whole dollar amount`);
    if (q.noi <= 0) note(`d${d} ${seed}: non-positive NOI`);

    // 2. The answer, from the printed premises.
    let truth: number;
    if (q.kind === "value") truth = r.noi / (q.capPct / 100);
    else if (q.kind === "implied") truth = (r.noi / (q.price as number)) * 100;
    else truth = r.noi / ((q.nextCapPct as number) / 100);
    if (Math.abs(truth - q.exact) > 1e-6 * Math.max(1, Math.abs(truth))) {
      note(`d${d} ${seed}: exact ${q.exact} vs rebuild ${truth}`);
    }

    // 3. The screen labels the answer and every option, and no two read the same.
    const labels = q.options.map((o) => labelFor(q.kind, o));
    if (new Set(labels).size !== 4) note(`d${d} ${seed}: two options read the same: ${labels.join(", ")}`);
    if (labels[q.answerIndex] !== labelFor(q.kind, q.exact)) note(`d${d} ${seed}: answer label mismatch`);
    if (q.options[q.answerIndex] !== q.exact) note(`d${d} ${seed}: answerIndex is wrong`);
    if (!validate(q, q.answerIndex)) note(`d${d} ${seed}: validate rejects its own answer`);
    for (let i = 0; i < 4; i++) if (i !== q.answerIndex && validate(q, i)) note(`d${d} ${seed}: slot ${i} accepted`);
    if (q.options.some((o) => !(o > 0))) note(`d${d} ${seed}: a non-positive option`);
    slots[q.answerIndex]++;

    const below = q.options.filter((o) => o < q.exact).length;
    ranks[below]++;

    // 4. Decoys are never counted in NOI: the answer must use the rebuilt NOI.
    //    (Covered by step 2.) Here: decoy amounts must be present on screen but
    //    not in the cost lines.
    for (const decoy of q.decoys) {
      if (q.costs.some((c) => c.label === decoy.label)) note(`d${d} ${seed}: a decoy is also a cost line`);
    }

    // 5. Each named error is recomputed from the printed premises and must match.
    q.diagnoses.forEach((key, i) => {
      if (key === null) return;
      named++;
      mistakes.add(key);
      if (!MISTAKE_LABEL[key] || !MISTAKE_FIX[key]) note(`d${d} ${seed}: ${key} has no copy`);
      if (i === q.answerIndex) note(`d${d} ${seed}: the correct option is labelled ${key}`);
      const want = recompute(q, key, r);
      if (want === null) note(`d${d} ${seed}: ${key} named but its premise is absent`);
      else if (Math.abs(want - q.options[i]) > 1e-6 * Math.max(1, Math.abs(want))) {
        note(`d${d} ${seed}: ${key} is ${q.options[i]}, recomputes to ${want}`);
      }
    });

    // 6. Scoring stays sane.
    for (const ms of [0, 500, 8000, 40_000]) {
      const p = score(q, ms, 7);
      if (!Number.isFinite(p) || p < 0) note(`d${d} ${seed}: score ${p}`);
    }
  }
}

/** The value a named error produces, from the rebuilt chain. */
function recompute(q: CapQuestion, key: MistakeKey, r: ReturnType<typeof rebuild>): number | null {
  const at = (noi: number) => {
    if (q.kind === "value") return noi / (q.capPct / 100);
    if (q.kind === "implied") return (noi / (q.price as number)) * 100;
    return null;
  };
  const debt = q.decoys.find((x) => x.label.startsWith("Debt"))?.amount;
  const dep = q.decoys.find((x) => x.label.startsWith("Depreciation"))?.amount;
  const roof = q.decoys.find((x) => x.label.startsWith("Roof"))?.amount;
  const monthly = q.costs.find((c) => c.basis === "monthly");

  if (q.kind === "cap-move") {
    const next = q.nextCapPct as number;
    if (key === "ignored-cap-change") return r.noi / (q.capPct / 100);
    if (key === "moved-wrong-way") return r.noi / ((2 * q.capPct - next) / 100);
    if (key === "halved-move") return r.noi / (((q.capPct + next) / 2) / 100);
    if (key === "overshot-move") return r.noi / ((2 * next - q.capPct) / 100);
    return null;
  }

  if (key === "vacancy-missed") {
    if (q.vacancyPct <= 0) return null;
    // Management charged on gross, rebuilt independently of the generator.
    let fixed = 0;
    let pctOnGross = 0;
    for (const c of q.costs) {
      if (c.basis === "annual") fixed += c.amount;
      else if (c.basis === "monthly") fixed += c.amount * 12;
      else pctOnGross += Math.round((r.gross * c.percent) / 100);
    }
    return at(r.gross - fixed - pctOnGross);
  }
  if (key === "financing-in-noi") return debt === undefined ? null : at(r.noi - debt);
  if (key === "depreciation-in-noi") return dep === undefined ? null : at(r.noi - dep);
  if (key === "one-off-in-noi") return roof === undefined ? null : at(r.noi - roof);
  if (key === "monthly-unannualised") return monthly && monthly.basis === "monthly" ? at(r.noi + monthly.amount * 11) : null;
  if (key === "gross-capitalised") return at(r.gross);
  return null;
}

let previous = 0;
for (let i = 0; i < 60; i++) {
  const d = difficultyForIndex(i);
  if (d < previous) note(`difficulty fell at index ${i}`);
  previous = d;
  if (questionAt("run", i).difficulty !== d) note(`index ${i}: wrong difficulty`);
}

const worstSlot = Math.max(...slots.map((c) => Math.abs(c / questions - 0.25)));
const worstRank = Math.max(...ranks.map((c) => Math.abs(c / questions - 0.25)));
const unreachable = (Object.keys(MISTAKE_LABEL) as MistakeKey[]).filter((k) => !mistakes.has(k));

console.log(`questions        ${questions.toLocaleString()}`);
console.log(`kinds            ${Object.entries(kinds).map(([k, n]) => `${k} ${n}`).join(", ")}`);
console.log(`answer slot      ${slots.map((c) => `${((c / questions) * 100).toFixed(1)}%`).join("  ")}`);
console.log(`answer rank      ${ranks.map((c) => `${((c / questions) * 100).toFixed(1)}%`).join("  ")}`);
console.log(`named errors     ${(named / questions).toFixed(2)} per question`);
console.log(`errors reached   ${mistakes.size}/${Object.keys(MISTAKE_LABEL).length}`);
console.log(`failures         ${failures.length}`);

if (worstSlot > 0.08) console.log(`\nSLOT IS SKEWED: ${(worstSlot * 100).toFixed(1)} points off even.`);
if (worstRank > 0.08) console.log(`\nRANK IS SKEWED: ${(worstRank * 100).toFixed(1)} points off even.`);
if (unreachable.length) console.log(`\nERRORS NO QUESTION CAN PRODUCE: ${unreachable.join(", ")}`);

if (failures.length || unreachable.length || worstSlot > 0.08 || worstRank > 0.08) {
  console.log("\nfirst failures");
  for (const f of failures.slice(0, 12)) console.log(`  ${f}`);
  process.exit(1);
}

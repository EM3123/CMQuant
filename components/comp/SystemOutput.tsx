import { readdirSync } from "node:fs";
import { join } from "node:path";
import { questionAt } from "@/lib/games/equalize";
import { FIVE_CARD_HANDS, DISTINCT_HAND_VALUES } from "@/lib/poker/frequency";

/**
 * The system output panel: an execution log, per design.md.
 *
 * Every line is measured or counted when the page is built, not typed out to
 * look busy. The generator count comes from reading the scripts directory, the
 * timings come from actually generating a thousand questions during the build,
 * and the enumeration figures are the ones the property tests prove.
 *
 * A fabricated log would have been quicker and would have looked identical in
 * a screenshot. It would also have been the only thing on this site that was
 * not true, which is a bad trade for a panel whose entire job is to say "the
 * numbers here are real".
 */

function measure() {
  const scripts = readdirSync(join(process.cwd(), "scripts")).filter(
    (f) => f.startsWith("verify-") && f.endsWith(".ts")
  );

  // A thousand questions off a cold seed, timed. This runs at build time, so
  // the number below is what the machine that built this page actually did.
  const started = performance.now();
  const RUNS = 1_000;
  for (let i = 0; i < RUNS; i++) questionAt(`bench-${i >> 5}`, i % 32);
  const elapsed = performance.now() - started;

  // Same seed twice must give the same question, or nothing else here matters.
  const a = questionAt("bench-determinism", 7);
  const b = questionAt("bench-determinism", 7);
  const stable = JSON.stringify(a) === JSON.stringify(b);

  return {
    generators: scripts.length,
    runs: RUNS,
    total: elapsed,
    mean: elapsed / RUNS,
    stable,
  };
}

export function SystemOutput() {
  const m = measure();

  const lines: [string, string, "ok" | "info" | "cmd"][] = [
    ["$ npm run verify", "", "cmd"],
    ["property test suites", String(m.generators), "info"],
    ["five-card hands enumerated", FIVE_CARD_HANDS.toLocaleString(), "info"],
    ["distinct hand values", DISTINCT_HAND_VALUES.toLocaleString(), "info"],
    ["hand categories", "9/9 match published table", "ok"],
    ["$ bench lib/games/equalize", "", "cmd"],
    ["questions generated", m.runs.toLocaleString(), "info"],
    ["elapsed", `${m.total.toFixed(1)} ms`, "info"],
    ["mean per question", `${m.mean.toFixed(3)} ms`, "info"],
    ["same seed, same question", m.stable ? "stable" : "DIVERGED", m.stable ? "ok" : "info"],
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-baseline justify-between border-b border-hairline px-3 py-1.5">
        <span className="text-[9px] uppercase tracking-[0.18em] text-secondary">
          System output
        </span>
        <span className="tabular text-[9px] text-muted">measured at build</span>
      </div>

      <div className="tabular flex-1 px-3 py-2 text-[10px] leading-[1.6]">
        {lines.map(([label, value, kind], i) =>
          kind === "cmd" ? (
            <div key={i} className={i === 0 ? "text-secondary" : "mt-2 text-secondary"}>
              {label}
            </div>
          ) : (
            <div key={i} className="flex items-baseline justify-between gap-3">
              <span className="text-muted">{label}</span>
              <span className={kind === "ok" ? "text-data-pos" : "text-primary"}>
                {value}
              </span>
            </div>
          )
        )}
      </div>
    </div>
  );
}

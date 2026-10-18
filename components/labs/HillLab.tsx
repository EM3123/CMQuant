"use client";

import { useMemo, useState } from "react";
import {
  hill,
  hillPlot,
  tailSample,
  TAIL_SOURCES,
  TAIL_LABEL,
  TRUE_XI,
  TAIL_N,
  type TailSource,
} from "@/lib/labs/tailrisk";
import { LabShell, Section, ContractPanel, Figure, Choice } from "@/components/labs/LabShell";

/**
 * How heavy is the tail, and how sure am I?
 *
 * The Hill estimate is a function of k, the number of largest observations
 * used. The lesson is that the number is not the answer: the plot across k is.
 * A stable plateau is a reason to take a reading seriously, not proof that the
 * reading is right, and a drifting plot is the estimator telling you the tail
 * is not a power law over the range you chose.
 */

/** The window the stability question is asked about. */
const WINDOW: [number, number] = [100, 400];

/** A teaching threshold, not a statistical test. Stated on screen wherever it applies. */
const STABLE_SPREAD = 0.05;

type Stage = 0 | 1 | 2 | 3;
const STAGES = ["Predict", "Experiment", "Reveal", "Result"] as const;

const PREDICTIONS = [
  { key: "settles", label: "It settles near one value across that range" },
  { key: "drifts", label: "It keeps moving as k changes" },
] as const;

export function HillLab() {
  const [stage, setStage] = useState<Stage>(0);
  const [reached, setReached] = useState<Stage>(0);
  const [prediction, setPrediction] = useState<(typeof PREDICTIONS)[number]["key"] | null>(null);
  const [source, setSource] = useState<TailSource>("pareto");
  const [k, setK] = useState(200);
  const [sample, setSample] = useState(1);

  const data = useMemo(() => tailSample(`tail-lesson-${sample}`, source, TAIL_N), [sample, source]);

  const fit = useMemo(() => hill(data, k), [data, k]);
  const plot = useMemo(() => hillPlot(data, 20, Math.floor(data.length / 2), 10), [data]);

  const windowPoints = plot.filter((p) => p.k >= WINDOW[0] && p.k <= WINDOW[1]);
  const spread = windowPoints.length
    ? Math.max(...windowPoints.map((p) => p.xi)) - Math.min(...windowPoints.map((p) => p.xi))
    : Number.NaN;
  const observedStable = spread <= STABLE_SPREAD;
  const predictedRight =
    (prediction === "settles" && observedStable) || (prediction === "drifts" && !observedStable);

  const go = (next: Stage) => {
    setStage(next);
    setReached((r) => (next > r ? next : r));
  };

  const reset = (nextSample: number) => {
    setSample(nextSample);
    setPrediction(null);
    setStage(0);
    setReached(0);
  };

  // Plot geometry. The vertical scale is fitted to the data, with the true index
  // in view whenever one exists, so the reveal cannot be hidden by the axis.
  const W = 640;
  const H = 200;
  const kMax = Math.floor(data.length / 2);
  const xs = (kv: number) => ((kv - 20) / (kMax - 20)) * W;
  const values = plot.map((p) => p.xi);
  const truth = TRUE_XI[source];
  const lo = Math.min(...values, truth ?? Infinity) - 0.05;
  const hi = Math.max(...values, truth ?? -Infinity) + 0.05;
  const ys = (v: number) => H - ((v - lo) / (hi - lo)) * H;
  const path = plot.map((p) => `${xs(p.k).toFixed(1)},${ys(p.xi).toFixed(1)}`).join(" ");

  return (
    <LabShell
      eyebrow="Learn / Decision under uncertainty"
      title="How heavy is the tail, and how sure am I?"
      standfirst="A tail estimate is one number from a choice you made: how many of the largest observations to use. This lab asks you to look at the whole plot before you believe any single value."
      nav={
        <nav aria-label="Lesson stages" className="flex flex-wrap gap-2">
          {STAGES.map((name, i) => {
            const open = i <= reached;
            return (
              <button
                key={name}
                type="button"
                disabled={!open}
                aria-current={stage === i ? "step" : undefined}
                onClick={() => setStage(i as Stage)}
                className={`border px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] transition-colors ${
                  stage === i
                    ? "border-accent-ink text-accent-ink"
                    : open
                      ? "border-hairline text-secondary hover:text-primary"
                      : "border-hairline text-muted opacity-50"
                }`}
              >
                {i + 1}. {name}
              </button>
            );
          })}
        </nav>
      }
    >
      <ContractPanel
        rows={[
          ["Objective", "Estimate how fast the tail decays, and how confident that estimate deserves to be."],
          ["Observed", "2,000 positive tail magnitudes, from a process you do not get to inspect."],
          ["Hidden", "Which process generated the sample. Revealed at stage 3."],
          ["Assumptions", "Observations are iid. Real loss data is not, and this lab does not pretend otherwise."],
          ["Parameters", "k, the number of largest observations used. The estimator has no other tuning."],
          ["Units", "Tail magnitudes, in the same units as the input. ξ and α are dimensionless."],
          ["Benchmark", "The plot across k. A single k is never the result."],
          ["Failure", "The estimate drifts across the window, or the sample is too small to hold the window."],
        ]}
      />

      {stage === 0 && (
        <Section title="1. Predict the shape">
          <p>
            You have 2,000 positive tail magnitudes and a Hill estimate for each choice of k. Across k from 100 to 400
            (inclusive, in steps of 10), which description fits the plot better?
          </p>
          <div className="grid gap-2">
            {PREDICTIONS.map((p) => (
              <Choice key={p.key} selected={prediction === p.key} onClick={() => setPrediction(p.key)}>
                {p.label}
              </Choice>
            ))}
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              disabled={!prediction}
              onClick={() => go(1)}
              className="border border-hairline-strong px-6 py-2.5 text-[10px] uppercase tracking-[0.18em] text-primary transition-colors hover:border-accent-ink hover:text-accent-ink disabled:opacity-40"
            >
              Estimate the tail
            </button>
          </div>
        </Section>
      )}

      {stage === 1 && (
        <Section title="2. Experiment">
          <p>
            Choose the sample, then move k. The formula is on the page: the mean log-ratio of the k largest observations
            to the observation just below them. Notice what the estimate does as k moves, not only where it lands.
          </p>

          <div className="grid gap-2 sm:grid-cols-3">
            {TAIL_SOURCES.map((s) => (
              <Choice key={s} selected={source === s} onClick={() => setSource(s)}>
                {TAIL_LABEL[s]}
              </Choice>
            ))}
          </div>

          <label className="block space-y-2">
            <span className="text-[11px] text-primary">
              k = {k} largest observations, threshold X<sub>(n−k)</sub> = {fit && "error" in fit ? "–" : fit.threshold.toFixed(2)}
            </span>
            <input
              type="range"
              min={20}
              max={kMax}
              step={10}
              value={k}
              onChange={(e) => setK(Number(e.target.value))}
              className="w-full accent-current"
            />
          </label>

          <Figure>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="h-48 w-full text-secondary"
              role="img"
              aria-label={`Hill estimate of the tail index against k from 20 to ${kMax}. The estimate ${
                observedStable ? "settles" : "drifts"
              } between k ${WINDOW[0]} and ${WINDOW[1]}.`}
            >
              <rect x={xs(WINDOW[0])} width={xs(WINDOW[1]) - xs(WINDOW[0])} y="0" height={H} fill="currentColor" className="text-accent-ink" opacity="0.08" />
              {truth !== null && (
                <line x1="0" x2={W} y1={ys(truth)} y2={ys(truth)} stroke="currentColor" className="text-data-pos" strokeDasharray="6 4" strokeWidth="1" />
              )}
              <polyline points={path} fill="none" stroke="currentColor" strokeWidth="1.2" />
              {!("error" in fit) && (
                <circle cx={xs(k)} cy={ys(fit.xi)} r="4" fill="currentColor" className="text-accent-ink" />
              )}
            </svg>
            <figcaption className="mt-2 text-[10px] leading-relaxed text-muted">
              Hill estimate ξ̂ against k, one point every ten observations. The shaded band is k {WINDOW[0]}–{WINDOW[1]}.
              {truth !== null ? " Dashed line: the true index for this source." : " This source has no power-law index, so there is no true line to compare with."}
            </figcaption>
          </Figure>

          {!("error" in fit) && (
            <dl className="grid grid-cols-2 gap-px border border-hairline bg-hairline text-[12px] sm:grid-cols-4">
              <Stat label="ξ̂ at this k" value={fit.xi.toFixed(3)} />
              <Stat label="α̂ = 1/ξ̂" value={fit.alpha.toFixed(2)} />
              <Stat label={`Spread, k ${WINDOW[0]}–${WINDOW[1]}`} value={spread.toFixed(3)} />
              <Stat label="Observations used" value={`${k} of ${fit.n}`} />
            </dl>
          )}

          <p className="text-secondary">
            Small k is noisy: a handful of observations decides the answer. Large k reaches into the body of the
            distribution, where a power law is a poor description, so the estimate absorbs the wrong shape. Neither end
            is the answer; the question is where the plot is steady, if it is steady anywhere.
          </p>

          <div className="flex justify-between gap-3">
            <button type="button" onClick={() => reset(sample + 1)} className="text-[10px] uppercase tracking-[0.18em] text-secondary hover:text-primary">
              New sample
            </button>
            <button
              type="button"
              onClick={() => go(2)}
              className="border border-hairline-strong px-6 py-2.5 text-[10px] uppercase tracking-[0.18em] text-primary transition-colors hover:border-accent-ink hover:text-accent-ink"
            >
              Reveal the source
            </button>
          </div>
        </Section>
      )}

      {stage === 2 && (
        <Section title="3. Reveal">
          <p>
            The source is <span className="text-primary">{TAIL_LABEL[source].toLowerCase()}</span>.{" "}
            {truth !== null
              ? `Its true extreme-value index is ${truth.toFixed(3)}, which is ${source === "pareto" ? "exact" : "an asymptotic value that the estimator approaches only slowly"}.`
              : "It has no power-law tail, so no index is correct, and an honest plot should keep moving."}
          </p>
          <p>
            Across k {WINDOW[0]}–{WINDOW[1]} the estimate spread by{" "}
            <span className="text-primary">{Number.isFinite(spread) ? spread.toFixed(3) : "–"}</span>. Using the lab&apos;s
            declared threshold of {STABLE_SPREAD}, the plot was{" "}
            <span className="text-primary">{observedStable ? "steady" : "drifting"}</span> there, and your prediction was{" "}
            <span className="text-primary">{predictedRight ? "right" : "wrong"}</span>.
          </p>
          {source === "student" && (
            <p className="border-l border-hairline-strong pl-4 text-secondary">
              A Student tail is not exactly Pareto, and Hill is biased on it. At this sample size, averaged over 30
              samples, the estimate sits about 0.05 above the true 0.33 at k = 100, about 0.07 at k = 200, and about
              0.14 at k = 400, and the bias grows as k grows. A plateau is therefore not a proof of accuracy. That is
              the lesson, and it is why this lab reports the bias rather than a confidence band it cannot back.
            </p>
          )}
          {source === "lognormal" && (
            <p className="border-l border-hairline-strong pl-4 text-secondary">
              A lognormal is lighter than any power law. An estimator that settles on it is reporting its own choice of
              k, not a property of the tail.
            </p>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => go(3)}
              className="border border-hairline-strong px-6 py-2.5 text-[10px] uppercase tracking-[0.18em] text-primary transition-colors hover:border-accent-ink hover:text-accent-ink"
            >
              Result
            </button>
          </div>
        </Section>
      )}

      {stage === 3 && (
        <Section title="4. Result">
          <dl className="grid grid-cols-2 gap-px border border-hairline bg-hairline text-[12px]">
            <Stat label="Your prediction" value={predictedRight ? "Right" : "Missed"} />
            <Stat label="The plot" value={observedStable ? "Steady" : "Drifting"} />
          </dl>
          <div className="border border-hairline p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-secondary">The misconception to fix</p>
            <p className="mt-2 text-primary">
              A single tail index is not a fact about the data. It is a function of k, and the honest result is the
              plot, with its stable region and its bias stated.
            </p>
          </div>
          <div className="border border-hairline p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-secondary">Connect it to the limit</p>
            <p className="mt-2 text-secondary">
              A risk limit that uses a tail estimate inherits every choice in this plot. Before a limit depends on a
              tail index, ask how much one extreme day changes the estimate, and whether the answer survives a different
              k.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={() => reset(sample + 1)} className="text-[10px] uppercase tracking-[0.18em] text-secondary hover:text-primary">
              Run it on a new sample
            </button>
            <a
              href="/learn/risk-limit"
              className="border border-hairline-strong px-6 py-2.5 text-[10px] uppercase tracking-[0.18em] text-primary transition-colors hover:border-accent-ink hover:text-accent-ink"
            >
              Back to the risk limit
            </a>
          </div>
        </Section>
      )}

      <p className="text-[11px] leading-relaxed text-muted">
        Synthetic iid samples only. The estimator assumes a power-law tail above the threshold, and real financial
        data is neither iid nor guaranteed to have one.
      </p>
    </LabShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 bg-surface p-3">
      <dt className="text-[10px] uppercase tracking-[0.14em] text-secondary">{label}</dt>
      <dd className="tabular text-primary">{value}</dd>
    </div>
  );
}

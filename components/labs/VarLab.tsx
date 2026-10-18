"use client";

import { useMemo, useState } from "react";
import {
  generateScenario,
  fitGaussian,
  backtest,
  binomialCentralInterval,
  population,
  evidenceOf,
  explainBacktest,
  transferKind,
  KINDS,
  KIND_LABEL,
  CAUSE_LABEL,
  CONFIDENCE,
  EVAL_DAYS,
  MU,
  SIGMA,
  type Kind,
  type Cause,
  type Scenario,
  type Forecast,
  type Backtest,
} from "@/lib/labs/tailrisk";
import { normalQuantile, normalPdf } from "@/lib/labs/distributions";
import { LabShell, Section, ContractPanel, Figure, Choice } from "@/components/labs/LabShell";

/**
 * Break a Gaussian VaR limit.
 *
 * The loop is the product: commit a prediction, run an experiment, explain what
 * the evidence supports, see the formula, see what was actually true, and then
 * do it again on a scenario whose label you are not shown. The stages are
 * gated, so nobody reaches the reveal without first committing to a reading.
 */

type Stage = 0 | 1 | 2 | 3 | 4 | 5 | 6;
const STAGES = ["Predict", "Experiment", "Explain", "Formalize", "Reveal", "Transfer", "Result"] as const;

const PREDICTIONS = [
  { key: "two", label: "About 2" },
  { key: "ten", label: "About 10" },
  { key: "thirty", label: "About 30" },
  { key: "depends", label: "It depends on the data" },
] as const;

const CAUSE_ORDER: Cause[] = ["noise", "heavy", "regime", "estimation", "unclear"];

function predictionFeedback(key: (typeof PREDICTIONS)[number]["key"], range: [number, number]): string {
  if (key === "ten") {
    return `Correct. 1% of 1,000 days is 10. The count is random, though: a correct limit produces anything from ${range[0]} to ${range[1]} about 95% of the time. Commit to the distribution, not the average.`;
  }
  if (key === "two") {
    return "Two breaches would mean the limit is far more conservative than its 99% label. That is a finding too, and it is not the expected count.";
  }
  if (key === "thirty") {
    return "Three times the rate. A count that high would be a real break, but a forecast cannot tell you that before the days happen.";
  }
  return "The count is random, but its distribution is known before the days happen. That distribution is what to commit to.";
}

function verdictSentence(b: Backtest, range: [number, number]): string {
  if (b.verdict === "consistent") {
    return `${b.breaches} breaches against ${b.expected} expected. A correct limit produces between ${range[0]} and ${range[1]} breaches about 95% of the time, so this count is inside that range.`;
  }
  if (b.verdict === "too-many") {
    return `${b.breaches} breaches is above the ${range[0]}–${range[1]} range a correct limit produces. The limit is breached more often than its confidence level says.`;
  }
  return `${b.breaches} breaches is below the ${range[0]}–${range[1]} range a correct limit produces. The limit is more conservative than its confidence level says.`;
}

function explanationFeedback(picked: Cause, correct: Cause): string {
  if (picked === correct) {
    return "Defensible. This is the explanation the visible numbers support, and it is the one a risk team should be able to defend in a review.";
  }
  if (correct === "noise") {
    return "The count is inside the range a correct limit produces. Explaining a break you cannot see is the error this lab is about.";
  }
  if (picked === "noise") {
    return "The count is outside the range a correct limit produces, so there is evidence against the limit. Noise is not a defence once the count is this far out.";
  }
  if (correct === "unclear") {
    return "Nothing visible singles out one cause, and the honest answer is that the backtest cannot say which. Naming one anyway would be a guess dressed as a finding.";
  }
  return `The backtest says the limit is wrong, not why. Several causes push the count up. The visible evidence here points to ${CAUSE_LABEL[correct].split(":")[0].toLowerCase()}, and the reveal shows what was really true.`;
}

function LossStrip({ scenario, forecast, backtestResult }: { scenario: Scenario; forecast: Forecast; backtestResult: Backtest }) {
  const losses = scenario.evaluation;
  const lo = Math.min(...losses, forecast.var) - 0.4;
  const hi = Math.max(...losses, forecast.var) + 0.4;
  const W = 640;
  const H = 180;
  const x = (i: number) => (i / (losses.length - 1)) * W;
  const y = (v: number) => H - ((v - lo) / (hi - lo)) * H;
  const path = losses.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const breaches = losses.map((v, i) => ({ v, i })).filter((d) => d.v > forecast.var);

  return (
    <figure className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-44 w-full text-secondary"
        role="img"
        aria-label={`Daily losses over ${losses.length} days against a 99% limit of ${forecast.var.toFixed(2)}%. ${backtestResult.breaches} days breached it, expected ${backtestResult.expected}.`}
      >
        <line x1="0" x2={W} y1={y(forecast.var)} y2={y(forecast.var)} stroke="currentColor" className="text-accent-ink" strokeDasharray="6 4" strokeWidth="1" />
        <polyline points={path} fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.7" />
        {breaches.map((d) => (
          // A breach is an X, not a dot: the mark has a shape as well as a colour.
          <g key={d.i} className="text-data-neg" stroke="currentColor" strokeWidth="1.6">
            <line x1={x(d.i) - 3} x2={x(d.i) + 3} y1={y(d.v) - 3} y2={y(d.v) + 3} />
            <line x1={x(d.i) - 3} x2={x(d.i) + 3} y1={y(d.v) + 3} y2={y(d.v) - 3} />
          </g>
        ))}
      </svg>
      <figcaption className="mt-2 text-[10px] leading-relaxed text-muted">
        Daily loss, % of portfolio, one-day horizon. Positive is a loss. Dashed: the 99% limit fitted on
        the calibration window and frozen. X marks a day that breached it.
      </figcaption>
    </figure>
  );
}

export function VarLab() {
  const [stage, setStage] = useState<Stage>(0);
  const [reached, setReached] = useState<Stage>(0);
  const [sample, setSample] = useState(1);
  const [prediction, setPrediction] = useState<(typeof PREDICTIONS)[number]["key"] | null>(null);
  const [kind, setKind] = useState<Kind | null>(null);
  const [explained, setExplained] = useState<Cause | null>(null);
  const [transferPick, setTransferPick] = useState<Cause | null>(null);

  const lessonSeed = `risk-lesson-${sample}`;
  const transferSeed = `risk-transfer-${sample}`;
  const transferTrue = transferKind(transferSeed);

  const z = normalQuantile(CONFIDENCE);
  const range = useMemo(() => binomialCentralInterval(EVAL_DAYS, 1 - CONFIDENCE), []);

  const lesson = useMemo(() => {
    if (!kind) return null;
    const scenario = generateScenario(lessonSeed, kind);
    const forecast = fitGaussian(scenario.calibration);
    const result = backtest(scenario.evaluation, forecast);
    const evidence = evidenceOf(scenario, forecast);
    return { scenario, forecast, result, evidence, correct: explainBacktest(result, evidence) };
  }, [kind, lessonSeed]);

  const transfer = useMemo(() => {
    const scenario = generateScenario(transferSeed, transferTrue);
    const forecast = fitGaussian(scenario.calibration);
    const result = backtest(scenario.evaluation, forecast);
    const evidence = evidenceOf(scenario, forecast);
    return { scenario, forecast, result, evidence, correct: explainBacktest(result, evidence) };
  }, [transferSeed, transferTrue]);

  const predictedRight = prediction === "ten";
  const explainedRight = lesson !== null && explained === lesson.correct;
  const transferRight = transferPick !== null && transferPick === transfer.correct;

  const go = (next: Stage) => {
    setStage(next);
    setReached((r) => (next > r ? next : r));
  };

  const reset = (nextSample: number) => {
    setSample(nextSample);
    setPrediction(null);
    setKind(null);
    setExplained(null);
    setTransferPick(null);
    setStage(0);
    setReached(0);
  };

  const trueFacts = kind ? population(kind) : null;

  return (
    <LabShell
      eyebrow="Learn / Decision under uncertainty"
      title="Why does my risk limit miss disasters?"
      standfirst="A 99% limit says a loss this big should happen on one day in a hundred. This lesson asks whether a limit was honest, and what the evidence can and cannot tell you about it. Every number is synthetic, and every chart states its units."
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
          ["Objective", "A one-day 99% loss limit, fitted on a calibration window and then frozen."],
          ["Observed", "The calibration days, the frozen limit, and the evaluation days once they are read."],
          ["Hidden", "Which process generated the days. Revealed only at stage 5."],
          ["Assumptions", "Days are independent once the process is fixed. The limit is not refitted during evaluation."],
          ["Parameters", "Mean and volatility are estimated from calibration. Confidence is chosen, not estimated."],
          ["Units", "Loss in % of portfolio per day. Positive is a loss. Horizon: one trading day."],
          ["Benchmark", "A correct limit for the scenario, which the count is compared against."],
          ["Failure", "A breach count outside the 95% range of a correct limit, sustained across fresh days."],
        ]}
      />

      {stage === 0 && (
        <Section title="1. Predict before you look">
          <p>
            Your 99% limit was fitted on 250 quiet days and is now frozen. Over the next 1,000 trading days, how many
            breaches do you expect if the model is right?
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {PREDICTIONS.map((p) => (
              <Choice key={p.key} selected={prediction === p.key} onClick={() => setPrediction(p.key)}>
                {p.label}
              </Choice>
            ))}
          </div>
          {prediction && (
            <p className="border-l border-hairline-strong pl-4 text-secondary">
              {predictionFeedback(prediction, range)}
            </p>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              disabled={!prediction}
              onClick={() => go(1)}
              className="border border-hairline-strong px-6 py-2.5 text-[10px] uppercase tracking-[0.18em] text-primary transition-colors hover:border-accent-ink hover:text-accent-ink disabled:opacity-40"
            >
              Run the backtest
            </button>
          </div>
        </Section>
      )}

      {stage === 1 && (
        <Section title="2. Experiment">
          <p>
            Pick a scenario. The limit is fitted on its calibration window, frozen, and judged on 1,000 fresh days it
            never saw. Labels are shown here so you can compare; the transfer task later hides them.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {KINDS.map((k) => (
              <Choice key={k} selected={kind === k} onClick={() => setKind(k)}>
                {KIND_LABEL[k]}
              </Choice>
            ))}
          </div>

          {lesson && (
            <>
              <Figure>
                <LossStrip scenario={lesson.scenario} forecast={lesson.forecast} backtestResult={lesson.result} />
              </Figure>
              <dl className="grid grid-cols-2 gap-px border border-hairline bg-hairline text-[12px] sm:grid-cols-3">
                <Stat label="Calibration days" value={`${lesson.evidence.calDays}`} />
                <Stat label="Frozen 99% limit" value={`${lesson.forecast.var.toFixed(2)}%`} />
                <Stat label="Forecast shortfall" value={`${lesson.forecast.es.toFixed(2)}%`} />
                <Stat label="Breaches" value={`${lesson.result.breaches} of ${EVAL_DAYS}`} />
                <Stat label="Correct-limit range" value={`${range[0]}–${range[1]}`} />
                <Stat label="Volatility, evaluation ÷ calibration" value={lesson.evidence.sdRatio.toFixed(2)} />
              </dl>
              <p className="border-l border-hairline-strong pl-4 text-primary">{verdictSentence(lesson.result, range)}</p>
            </>
          )}

          <div className="flex justify-between gap-3">
            <button type="button" onClick={() => reset(sample + 1)} className="text-[10px] uppercase tracking-[0.18em] text-secondary hover:text-primary">
              New sample
            </button>
            <button
              type="button"
              disabled={!lesson}
              onClick={() => go(2)}
              className="border border-hairline-strong px-6 py-2.5 text-[10px] uppercase tracking-[0.18em] text-primary transition-colors hover:border-accent-ink hover:text-accent-ink disabled:opacity-40"
            >
              Explain it
            </button>
          </div>
        </Section>
      )}

      {stage === 2 && lesson && (
        <Section title="3. Explain">
          <p>
            Which explanation does this backtest support? Only the numbers on the previous screen are yours to use:
            the breach count, the range, the calibration length, and the volatility ratio.
          </p>
          <div className="grid gap-2">
            {CAUSE_ORDER.map((c) => (
              <Choice key={c} selected={explained === c} onClick={() => setExplained(c)}>
                {CAUSE_LABEL[c]}
              </Choice>
            ))}
          </div>
          {explained && (
            <p className="border-l border-hairline-strong pl-4 text-secondary">{explanationFeedback(explained, lesson.correct)}</p>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              disabled={!explained}
              onClick={() => go(3)}
              className="border border-hairline-strong px-6 py-2.5 text-[10px] uppercase tracking-[0.18em] text-primary transition-colors hover:border-accent-ink hover:text-accent-ink disabled:opacity-40"
            >
              Show the formula
            </button>
          </div>
        </Section>
      )}

      {stage === 3 && (
        <Section title="4. Formalize">
          <p>
            The limit is a quantile of a fitted normal. With μ̂ and σ̂ estimated from the calibration window and z the
            normal quantile at the confidence level:
          </p>
          <pre className="overflow-x-auto border border-hairline bg-surface-sunken p-4 text-[12px] leading-relaxed text-primary">
{`VaR  = μ̂ + σ̂ · Φ⁻¹(0.99)            Φ⁻¹(0.99) = ${z.toFixed(4)}
ES   = μ̂ + σ̂ · φ(z) / (1 − 0.99)    φ(z)     = ${normalPdf(z).toFixed(4)}
count ~ Binomial(1000, 0.01) if the limit is correct and days are independent`}
          </pre>
          <p>
            VaR is the loss exceeded on one day in a hundred. It is not the largest loss you can suffer, and a breach
            says nothing about how large it was. Expected shortfall is the average loss on the days that do breach,
            which is the number a coverage test cannot see.
          </p>
          <p>
            Note the axis: {MU}% is the calm mean and {SIGMA}% the calm volatility, both per day. A limit is wrong in a
            direction and by an amount, and both belong on the chart.
          </p>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => go(4)}
              className="border border-hairline-strong px-6 py-2.5 text-[10px] uppercase tracking-[0.18em] text-primary transition-colors hover:border-accent-ink hover:text-accent-ink"
            >
              Reveal what was true
            </button>
          </div>
        </Section>
      )}

      {stage === 4 && lesson && trueFacts && (
        <Section title="5. Reveal">
          <p>
            Here is the process the evaluation days came from. You committed to a reading before seeing it; now the
            hidden label is shown, with the three things a coverage test can and cannot tell you.
          </p>
          <dl className="grid grid-cols-1 gap-px border border-hairline bg-hairline text-[12px] sm:grid-cols-3">
            <Stat label="True 99% loss" value={`${trueFacts.quantile.toFixed(2)}%`} />
            <Stat label="Your limit breaches at" value={`${(trueFacts.limitBreachRate * 100).toFixed(2)}% of days`} />
            <Stat label="True shortfall beyond it" value={`${trueFacts.shortfall.toFixed(2)}%`} />
          </dl>
          <p className="text-secondary">
            This scenario is <span className="text-primary">{KIND_LABEL[kind!].toLowerCase()}</span>. The true
            shortfall is <span className="text-primary">{trueFacts.shortfall.toFixed(2)}%</span>, against a forecast
            shortfall of <span className="text-primary">{lesson.forecast.es.toFixed(2)}%</span>.
            {trueFacts.shortfall > lesson.forecast.es * 1.2
              ? " The count can look fine while the losses beyond it are far larger than the limit's shortfall. A coverage test asks how often you were wrong, not how wrong."
              : " Here the forecast shortfall is close to the truth, so the count and the severity tell the same story."}
          </p>
          {lesson.result.verdict === "consistent" && kind === "heavy" && (
            <p className="border-l border-hairline-strong pl-4 text-primary">
              This is the case the lab is built around: the count passed, and the severity was wrong.
            </p>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => go(5)}
              className="border border-hairline-strong px-6 py-2.5 text-[10px] uppercase tracking-[0.18em] text-primary transition-colors hover:border-accent-ink hover:text-accent-ink"
            >
              Transfer task
            </button>
          </div>
        </Section>
      )}

      {stage === 5 && (
        <Section title="6. Transfer">
          <p>
            A new scenario with no name and no hint. Same question: which explanation do the visible numbers support?
          </p>
          <Figure>
            <LossStrip scenario={transfer.scenario} forecast={transfer.forecast} backtestResult={transfer.result} />
          </Figure>
          <dl className="grid grid-cols-2 gap-px border border-hairline bg-hairline text-[12px] sm:grid-cols-3">
            <Stat label="Calibration days" value={`${transfer.evidence.calDays}`} />
            <Stat label="Frozen 99% limit" value={`${transfer.forecast.var.toFixed(2)}%`} />
            <Stat label="Breaches" value={`${transfer.result.breaches} of ${EVAL_DAYS}`} />
          </dl>
          <p className="border-l border-hairline-strong pl-4 text-primary">{verdictSentence(transfer.result, range)}</p>
          <div className="grid gap-2">
            {CAUSE_ORDER.map((c) => (
              <Choice key={c} selected={transferPick === c} onClick={() => setTransferPick(c)}>
                {CAUSE_LABEL[c]}
              </Choice>
            ))}
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              disabled={!transferPick}
              onClick={() => go(6)}
              className="border border-hairline-strong px-6 py-2.5 text-[10px] uppercase tracking-[0.18em] text-primary transition-colors hover:border-accent-ink hover:text-accent-ink disabled:opacity-40"
            >
              See the result
            </button>
          </div>
        </Section>
      )}

      {stage === 6 && lesson && (
        <Section title="7. Result">
          <dl className="grid grid-cols-3 gap-px border border-hairline bg-hairline text-[12px]">
            <Stat label="Prediction" value={predictedRight ? "Right" : "Missed"} />
            <Stat label="Explanation" value={explainedRight ? "Defensible" : "Not supported"} />
            <Stat label="Transfer" value={transferRight ? "Defensible" : "Not supported"} />
          </dl>

          <div className="border border-hairline p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-secondary">The misconception to fix</p>
            <p className="mt-2 text-primary">
              {!predictedRight
                ? "The expected count is not a guess from the limit's name. It is n × (1 − confidence): 1,000 × 1% = 10."
                : !explainedRight
                  ? explanationFeedback(explained!, lesson.correct)
                  : !transferRight
                    ? `Without labels, the same evidence still decides. In this sample the visible signature was ${CAUSE_LABEL[transfer.correct].split(":")[0].toLowerCase()}.`
                    : "You separated noise from a break on both samples. What a count cannot show is how bad the breaches were, and that is the next question."}
            </p>
          </div>

          <div className="border border-hairline p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-secondary">A worked example to keep</p>
            <p className="mt-2 text-secondary">
              A 1,000-day backtest with 14 breaches against 10 expected sits inside the range a correct limit produces.
              &ldquo;Consistent&rdquo; is a verdict about how often you were wrong. Before you call the limit safe,
              check how wrong you were when you were wrong.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={() => reset(sample + 1)} className="text-[10px] uppercase tracking-[0.18em] text-secondary hover:text-primary">
              Run it on a new sample
            </button>
            <a
              href="/learn/tail-index"
              className="border border-hairline-strong px-6 py-2.5 text-[10px] uppercase tracking-[0.18em] text-primary transition-colors hover:border-accent-ink hover:text-accent-ink"
            >
              Next: how heavy is the tail?
            </a>
          </div>
        </Section>
      )}

      <p className="text-[11px] leading-relaxed text-muted">
        Synthetic iid scenarios only. Nothing here is historical market data, and a result on these processes does not
        establish that a limit would have worked on a real book.
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

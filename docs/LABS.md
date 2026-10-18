# Labs

A lab is a free, guided lesson built around a single decision under
uncertainty. It is not a game and it does not have a timer. It commits the
learner to a prediction before anything is revealed, asks them to explain what
the evidence supports, and then checks that explanation against a hidden truth
they were not shown while deciding.

This page is the contract for building one. The rules come from the
"From Fast Answers to Defensible Decisions" review, which is the reason the
labs exist, and they are not optional.

## What is built

| Lab | Route | Engine | Verifier |
| --- | --- | --- | --- |
| Why does my risk limit miss disasters? | `/learn/risk-limit` | `lib/labs/tailrisk.ts` | `scripts/verify-tailrisk.ts` |
| How heavy is the tail, and how sure am I? | `/learn/tail-index` | `lib/labs/tailrisk.ts` | `scripts/verify-tailrisk.ts` |

Both are linked from the Consulting index under **Labs**.

## What is not built

The review's release sequence is larger than this. Recorded here so nobody
mistakes the list above for the whole plan:

- **Time-series route:** Ornstein–Uhlenbeck, a scalar Kalman filter.
- **Covariance route:** the eigen/PCA bridge and the Marchenko–Pastur benchmark.
- **Market route:** the event-driven limit order book, with its accounting
  invariants and an independent review before any strategy is built on it.
- **Desk route:** Avellaneda–Stoikov, Hawkes processes, Almgren–Chriss.
- **Computation:** optimisation with momentum, MCMC, complexity.
- **Signal inference mode:** unknown signal count, probability responses,
  information budgets.
- **Modes:** Sprint, Practice and Learn are not split out; the existing games
  still have one mode.
- **Instrumentation:** the learning events are not recorded anywhere. There is
  no analytics in the product and the lab does not add any.
- **Result screen bridge** for the existing games: only the labs have the
  outcome / misconception / worked example / next action screen.

The review asks for four complete advanced experiences before a broad rollout.
Two exist. The next labs should be built to the same contract rather than as
shallow demonstrations.

## The teaching contract

Every lab runs the same loop, and each stage has a single job:

1. **Predict.** Commit to a direction, an interval or a count before the output
   is shown. A prediction is graded, and the feedback says why the wrong answers
   are wrong.
2. **Experiment.** Change one meaningful variable and observe the result.
3. **Explain.** Choose the explanation the visible evidence supports. Include an
   option for "cannot tell", and accept it when that is the honest answer.
4. **Formalize.** Show the formula with its symbols and assumptions. Selecting a
   term should later highlight what it controls.
5. **Reveal.** Show what was actually true, after the commitment.
6. **Transfer.** Solve a new case with the labels removed.
7. **Result.** Outcome, one misconception, one worked example, one next action.

The reveal is never a score on its own. It exists so that the explanation can be
compared with the truth.

## The model contract panel

Every lab shows the same panel, collapsed by default and always present. The
fields are fixed:

- **Objective:** what is being estimated or decided.
- **Observed:** what the learner sees at decision time.
- **Hidden:** what exists but is not shown until the reveal.
- **Assumptions:** the conditions the claims depend on.
- **Parameters:** known, estimated, or chosen.
- **Units:** of every quantity on screen.
- **Benchmark:** the simple alternative the method must beat.
- **Failure:** the evidence that would make the learner stop trusting it.

The question a lab asks is never "can you reproduce the formula?". It is "what
conclusion are you entitled to draw from this formula and these observations?"

## Grading on evidence, not on the hidden label

This is the most important rule in the directory, and the one most easily
broken by accident.

A grader that compares the learner's explanation with the generator's label
will sometimes mark a correct reading wrong, because the learner was never shown
the thing the label refers to. The risk-limit lab avoids this by grading against
statistics the learner can see on the screen:

- the breach count and the range a correct limit produces,
- the length of the calibration window,
- the volatility of the evaluation days relative to the calibration days,
- the sample excess kurtosis of the evaluation days.

`explainBacktest` is the rule. Its order is deliberate: a short window is checked
first because it makes every other reading unreliable; a passed test is never
explained as a break; and when the count fails with no visible signature, the
answer is "cannot tell".

The verifier measures how often that rule agrees with the generator. Those
numbers are printed on every run and they are the honest record of how good the
grading is. Current figures, from 200 seeds per scenario:

| Scenario | Graded as |
| --- | --- |
| Stable market | noise 88%, cannot tell 12% |
| Fat tails, same variance | noise 53%, heavy tails 45%, volatility 3% |
| Volatility jumps | volatility 100% |
| Only 40 calibration days | noise 56%, estimation 45% |

Two of these are limitations the lab states rather than hides. A stable-market
limit is rejected about 12% of the time, not the 5% a textbook test gives, because
the limit is itself fitted on 250 noisy days. And one extreme day can inflate a
sample standard deviation enough to look like a volatility shift.

## Honesty rules

These are checked, or stated on screen, in every lab:

- **Synthetic only.** Every scenario is an iid process the lab specifies. Nothing
  is historical data, and a lab must never imply that a result on synthetic
  processes establishes what would have happened in a real market.
- **Units and horizon on every chart.** Losses are positive. The horizon is
  stated.
- **Coverage is not severity.** A count that passes says nothing about how large
  the breaches were. The tail-risk lab exists largely to show this.
- **Estimators are shown across their range.** A single k, a single window, a
  single threshold is never presented as the result.
- **Bias is reported when it is known.** The Student-tail Hill estimate is biased
  at every sample size the lab uses, and the lab says so and measures it.
- **Thresholds are declared as teaching thresholds.** The 0.05 spread in the Hill
  lab is labelled as one, not as a statistical test.
- **Nothing is rounded into a false precision.** Figures are shown to the
  precision the sample supports.

## Numerical rules

- **Pure and seeded.** A scenario is a function of its seed and kind. Calibration
  and evaluation come from separate streams, so the days a limit is fitted on are
  never the days it is judged on.
- **Common random numbers, deliberately.** Scenarios that differ in one
  parameter share their underlying draws, so a comparison changes the thing being
  compared and nothing else. The verifier checks this exactly.
- **Floating point is not a grade.** `Math.log`, `Math.exp` and `Math.cos` can
  differ in the last bit between engines. Anything graded is a whole count or a
  value rounded for display. A lab whose answer depended on the last bit would
  disagree between browsers, which breaks the seed promise.
- **Each function has a second route.** The normal CDF is integrated and checked
  against a Taylor series. The log-gamma is checked against factorials. The
  Student-t tail mean is closed form and checked by quadrature. The Hill
  estimator is checked by a descending sort. Expectations are checked by Monte
  Carlo.

## Adding a lab

1. **Write the question first.** Use the decision as the title and the formal
   model as the subtitle.
2. **Write the engine in `lib/labs/`, pure and seeded.** Give every quantity a
   unit. Decide what is hidden and what is observed before writing any UI.
3. **Write the verifier before the UI.** Each closed-form claim gets a second
   route. Each grading rule gets measured across seeds, and the rates are printed.
4. **Write the grading rule against visible evidence**, and state its order.
5. **Build the lesson in `components/labs/`** using `LabShell`, `Section`,
   `ContractPanel`, `Figure` and `Choice`. Keep the stages gated.
6. **Add the route under `app/learn/`**, link it from the Consulting index, and
   add the verifier to `npm run verify`.
7. **Play it in the browser** from the first prediction to the last stage, and
   read the feedback for each wrong answer. Several defects in these labs were
   found this way and not by the verifier.

## Style

The labs use the Consulting wing. A lab that wants a different wing should say
why in its own file. Labs use no motion library: nothing animates inside a lab,
and the lesson does not need to. Colour is never the only signal: a breach is an
X as well as a colour, and a selected choice has a border as well as a shade.

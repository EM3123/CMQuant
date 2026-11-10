"use client";

import { ChoiceRun, type ChoiceGame } from "@/components/game/ChoiceRun";
import {
  questionAt,
  validate,
  score,
  labelFor,
  MISTAKE_LABEL,
  MISTAKE_FIX,
  ROUND_MS,
  WRONG_PENALTY_MS,
  type CapQuestion,
} from "@/lib/games/caprate";

const money = (n: number) => `$${n.toLocaleString("en-US")}`;

/**
 * The rent roll and the operating costs, as an owner would list them. The
 * decoys are printed under a neutral heading, so that the player has to decide
 * which numbers belong in the income statement.
 */
function Property({ question }: { question: CapQuestion }) {
  const costLabel = (c: CapQuestion["costs"][number]) =>
    c.basis === "annual"
      ? money(c.amount) + " a year"
      : c.basis === "monthly"
        ? money(c.amount) + " a month"
        : `${c.percent}% of collected income`;

  return (
    <div className="w-full max-w-md space-y-5 text-left">
      <section>
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-secondary">Rent roll</h3>
        <ul className="mt-2 divide-y divide-hairline border-y border-hairline">
          <li className="flex items-baseline justify-between py-1.5 text-[13px]">
            <span className="text-secondary">Units</span>
            <span className="tabular text-primary">{question.units}</span>
          </li>
          <li className="flex items-baseline justify-between py-1.5 text-[13px]">
            <span className="text-secondary">Rent per unit</span>
            <span className="tabular text-primary">{money(question.monthlyRent)} a month</span>
          </li>
          {question.vacancyPct > 0 && (
            <li className="flex items-baseline justify-between py-1.5 text-[13px]">
              <span className="text-secondary">Vacancy and bad debt</span>
              <span className="tabular text-primary">{question.vacancyPct}% of rent</span>
            </li>
          )}
        </ul>
      </section>

      <section>
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-secondary">Operating costs</h3>
        <ul className="mt-2 divide-y divide-hairline border-y border-hairline">
          {question.costs.map((c) => (
            <li key={c.label} className="flex items-baseline justify-between py-1.5 text-[13px]">
              <span className="text-secondary">{c.label}</span>
              <span className="tabular text-primary">{costLabel(c)}</span>
            </li>
          ))}
        </ul>
      </section>

      {question.decoys.length > 0 && (
        <section>
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-muted">Other items</h3>
          <ul className="mt-2 space-y-1 text-[12px] text-muted">
            {question.decoys.map((d) => (
              <li key={d.label} className="flex justify-between">
                <span>{d.label}</span>
                <span className="tabular">
                  {money(d.amount)}
                  {d.label.startsWith("Roof") ? ", one-off" : ", a year"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ask(question: CapQuestion): string {
  if (question.kind === "implied") {
    return `The asking price is ${money(question.price as number)}. What cap rate does it imply?`;
  }
  if (question.kind === "cap-move") {
    return `Value at a ${(question.nextCapPct as number).toFixed(2)}% cap rate, up from ${question.capPct.toFixed(2)}%.`;
  }
  return `Value at a ${question.capPct.toFixed(2)}% cap rate.`;
}

const GAME: ChoiceGame<CapQuestion> = {
  name: "Cap Rate",
  code: "CAP",
  storageKey: "cmquant:caprate:best",
  challengePath: "/g/cap-rate",
  roundMs: ROUND_MS,
  wrongPenaltyMs: WRONG_PENALTY_MS,
  questionAt,
  optionCount: () => 4,
  validate,
  score,
  difficultyOf: (question) => question.difficulty,

  renderPrompt: (question) => (
    <div className="flex w-full flex-col items-center gap-5">
      <Property question={question} />
      <p className="text-center text-[13px] text-primary">
        {ask(question)}
        <span className="block text-[11px] text-muted">
          Net operating income is income after operating costs and before the mortgage.
        </span>
      </p>
    </div>
  ),

  renderOption: (question, index) => (
    <span className="tabular text-xl sm:text-2xl">{labelFor(question.kind, question.options[index])}</span>
  ),

  optionsClassName: "grid w-full max-w-md grid-cols-2 gap-2 sm:grid-cols-4",

  diagnose: (question, chosen) => {
    const key = question.diagnoses[chosen];
    if (!key) return null;
    return { key, label: MISTAKE_LABEL[key], fix: MISTAKE_FIX[key] };
  },

  intro: {
    eyebrow: "Consulting / Real estate",
    title: "Cap Rate",
    blurb:
      "A building is worth what it earns after running costs, divided by the rate a buyer demands. Build the income from the rent roll, leave out everything that is financing or accounting, and divide. The decoys are printed on the screen; the trick is knowing which ones are not income.",
    startLabel: "Walk the property",
    hint: "Keys 1 - 4, or tap. A wrong answer costs two seconds.",
    titleClassName: "font-display uppercase tracking-wing",
  },
};

export function CapRateGame() {
  return <ChoiceRun game={GAME} />;
}

"use client";

import { ChoiceRun, type ChoiceGame } from "@/components/game/ChoiceRun";
import {
  questionAt,
  validate,
  score,
  MISTAKE_LABEL,
  MISTAKE_FIX,
  ROUND_MS,
  WRONG_PENALTY_MS,
  type BreakevenQuestion,
} from "@/lib/games/breakeven";

const money = (n: number) => `$${n.toLocaleString("en-US")}`;
const cents = (c: number) => `$${(c / 100).toFixed(2)}`;
const BASIS: Record<"month" | "week" | "year", string> = { month: "a month", week: "a week", year: "a year" };

/**
 * The business, as the owner would state it. Every line is shown in the basis
 * it is given in, because converting it is part of the question. The one
 * decoy is marked as already spent, not as a recurring cost.
 */
function Business({ question }: { question: BreakevenQuestion }) {
  return (
    <div className="w-full max-w-md space-y-5 text-left">
      <section>
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-secondary">Fixed costs</h3>
        <ul className="mt-2 divide-y divide-hairline border-y border-hairline">
          {question.fixed.map((line) => (
            <li key={line.label} className="flex items-baseline justify-between py-1.5 text-[13px]">
              <span className="text-secondary">{line.label}</span>
              <span className="tabular text-primary">
                {money(line.amount)} {BASIS[line.basis]}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-secondary">Per cup</h3>
        <ul className="mt-2 divide-y divide-hairline border-y border-hairline">
          <li className="flex items-baseline justify-between py-1.5 text-[13px]">
            <span className="text-secondary">Price</span>
            <span className="tabular text-primary">{cents(question.priceCents)}</span>
          </li>
          {question.unitCosts.map((c) => (
            <li key={c.label} className="flex items-baseline justify-between py-1.5 text-[13px]">
              <span className="text-secondary">{c.label}</span>
              <span className="tabular text-primary">{cents(c.cents)}</span>
            </li>
          ))}
          {question.feePct > 0 && (
            <li className="flex items-baseline justify-between py-1.5 text-[13px]">
              <span className="text-secondary">Card fee, on the price</span>
              <span className="tabular text-primary">{question.feePct}%</span>
            </li>
          )}
        </ul>
      </section>

      {question.target > 0 && (
        <p className="text-[13px] text-secondary">
          The owner wants a profit of <span className="tabular text-primary">{money(question.target)}</span> a month
          on top of covering costs.
        </p>
      )}

      {question.sunk && (
        <p className="border-l border-hairline-strong pl-3 text-[12px] text-muted">
          Already spent: {question.sunk.label.toLowerCase()} of{" "}
          <span className="tabular">{money(question.sunk.amount)}</span>.
        </p>
      )}
    </div>
  );
}

const GAME: ChoiceGame<BreakevenQuestion> = {
  name: "Breakeven",
  code: "BRK",
  storageKey: "cmquant:breakeven:best",
  challengePath: "/g/breakeven",
  roundMs: ROUND_MS,
  wrongPenaltyMs: WRONG_PENALTY_MS,
  questionAt,
  optionCount: () => 4,
  validate,
  score,
  difficultyOf: (question) => question.difficulty,

  renderPrompt: (question) => (
    <div className="flex w-full flex-col items-center gap-5">
      <Business question={question} />
      <p className="text-center text-[13px] text-primary">
        {question.target > 0
          ? `How many cups a month for a monthly profit of at least ${money(question.target)}?`
          : "How many cups a month before the business stops losing money?"}
        <span className="block text-[11px] text-muted">
          {question.target > 0
            ? `Smallest whole number of cups at which monthly profit reaches ${money(question.target)}. Round up.`
            : "Smallest whole number of cups at which monthly profit is not negative. Round up."}
        </span>
      </p>
    </div>
  ),

  renderOption: (question, index) => (
    <span className="tabular text-xl sm:text-2xl">
      {question.options[index].toLocaleString("en-US")}
    </span>
  ),

  optionsClassName: "grid w-full max-w-md grid-cols-2 gap-2 sm:grid-cols-4",

  diagnose: (question, chosen) => {
    const key = question.diagnoses[chosen];
    if (!key) return null;
    return { key, label: MISTAKE_LABEL[key], fix: MISTAKE_FIX[key] };
  },

  intro: {
    eyebrow: "Consulting / Unit economics",
    title: "Breakeven",
    blurb:
      "A café, stated the way its owner would state it: fixed costs in whatever period they come in, a price, and the costs of each cup. Find the number of cups that stops the losses. Only the margin left after each cup's own costs pays towards the fixed ones.",
    startLabel: "Open the books",
    hint: "Keys 1 - 4, or tap. A wrong answer costs two seconds.",
    titleClassName: "font-display uppercase tracking-wing",
  },
};

export function BreakevenGame() {
  return <ChoiceRun game={GAME} />;
}

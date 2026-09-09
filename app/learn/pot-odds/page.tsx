import type { Metadata } from "next";
import { LearnPage, Section, Working, Mistake } from "@/components/learn/LearnPage";

export const metadata: Metadata = {
  title: "Pot odds — CMQuant",
  description:
    "How to price a call in four seconds, and the three ways people get it wrong.",
};

export default function LearnPotOdds() {
  return (
    <LearnPage
      eyebrow="Learn / Poker Lab"
      title="Pot odds"
      standfirst="Someone bets. Before you can decide anything, you need the price you are being offered — the share of the time you must win for calling to break even."
      playHref="/g/pot-odds"
      playLabel="Play Pot Odds"
    >
      <Section title="The question">
        <p>
          A call costs you chips now and pays you the pot later. Break-even is
          the point where those two cancel out: win often enough and calling
          makes money, win less often and it burns money. The number you want is
          that threshold.
        </p>
        <p>
          It has one form and it never changes:
        </p>
        <Working>break-even = call ÷ (pot after your call)</Working>
        <p>
          Everything difficult about this is in the denominator, and everything
          people get wrong is in the denominator too.
        </p>
      </Section>

      <Section title="A worked example">
        <p>
          The pot is 800. Your opponent bets 400. You have to put in 400 to
          continue.
        </p>
        <p>Three things are going into that pot, so add all three:</p>
        <Working>
          <div className="flex items-baseline justify-between">
            <span className="text-secondary">pot already there</span>
            <span>800</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-secondary">their bet</span>
            <span>400</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-secondary">your call</span>
            <span>400</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between border-t border-hairline pt-3">
            <span className="text-secondary">pot you are playing for</span>
            <span className="text-rare">1,600</span>
          </div>
        </Working>
        <p>Then the price is your call against that total:</p>
        <Working>400 ÷ 1,600 = 25%</Working>
        <p>
          You need to win at least a quarter of the time. Above that, calling
          makes money. Below it, folding does.
        </p>
      </Section>

      <Section title="The shortcut worth having">
        <p>
          At a table you will not be doing long division. What you actually
          learn is the handful of bet sizes people use, because each one has a
          fixed answer no matter how big the pot is.
        </p>
        <Working>
          <div className="flex items-baseline justify-between">
            <span className="text-secondary">quarter-pot bet</span>
            <span>17%</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-secondary">half-pot bet</span>
            <span>25%</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-secondary">two-thirds pot</span>
            <span>29%</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-secondary">pot-sized bet</span>
            <span>33%</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-secondary">double the pot</span>
            <span>40%</span>
          </div>
        </Working>
        <p>
          Notice how little the answer moves. A bet eight times larger than
          another only shifts the threshold from 17% to 40%, which is why big
          bets are less punishing than they feel and small bets are harder to
          fold to than they look.
        </p>
      </Section>

      <Section title="The three ways to get it wrong">
        <p>
          The game&apos;s wrong answers are not random numbers. Each one is a
          specific error, so when you miss, the results screen can tell you
          which of these you did.
        </p>

        <Mistake title="Leaving your own call out of the pot">
          The most common one by far. Using 800 + 400 = 1,200 instead of 1,600
          gives 33% rather than 25%, and makes every call look worse than it is.
          The chips you put in are part of the pot you win.
        </Mistake>

        <Mistake title="Using the raw bet-to-pot ratio">
          400 ÷ 800 = 50% is a description of the bet size, not a probability.
          It is a useful number for a different purpose and it is never the
          break-even point.
        </Mistake>

        <Mistake title="Counting your call twice">
          Adding the call to a total that already contains it gives 2,000 and an
          answer of 20%. Your money goes in once.
        </Mistake>
      </Section>

      <Section title="What this does not tell you">
        <p>
          Pot odds give you a threshold, not a decision. To act on it you also
          need some sense of how often you actually win, which is what{" "}
          <a href="/learn/outs" className="text-rare underline underline-offset-4">
            counting outs
          </a>{" "}
          is for. The two together are the whole calculation: this is the price,
          that is whether you can pay it.
        </p>
      </Section>
    </LearnPage>
  );
}

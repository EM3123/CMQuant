import type { Metadata } from "next";
import { LearnPage, Section, Working, Mistake } from "@/components/learn/LearnPage";
import { PlayingCard } from "@/components/cards/PlayingCard";

export const metadata: Metadata = {
  title: "Outs — CMQuant",
  description:
    "How to count the cards that still save a hand, and how to turn that count into a probability.",
};

export default function LearnOuts() {
  return (
    <LearnPage
      eyebrow="Learn / Poker Lab"
      title="Outs"
      standfirst="An out is a card that turns a hand you are losing into one you are not. Counting them is the other half of every call — pot odds give you the price, outs tell you whether you can pay it."
      playHref="/g/outs"
      playLabel="Play Outs"
    >
      <Section title="Counting them">
        <p>
          There are 52 cards. You can see six of them — your two and the four on
          the board — which leaves 46 you cannot. An out is one of those 46 that
          gets you where you need to go.
        </p>
        <p>Say you are holding two hearts and two more are on the board:</p>

        <div className="flex flex-wrap items-end justify-center gap-1.5 py-2">
          <PlayingCard code="Ah" size="sm" />
          <PlayingCard code="9h" size="sm" />
          <span className="mx-2 self-center text-[10px] uppercase tracking-[0.3em] text-secondary">
            board
          </span>
          <PlayingCard code="Kh" size="sm" />
          <PlayingCard code="4h" size="sm" />
          <PlayingCard code="Jc" size="sm" />
          <PlayingCard code="2s" size="sm" />
        </div>

        <p>
          Thirteen hearts exist. You are looking at four of them, so nine are
          unaccounted for. That is the number.
        </p>
        <Working>13 hearts − 4 you can see = 9 outs</Working>
        <p>
          The counting is always this literal. Work out which cards finish the
          hand, then subtract the ones already face up.
        </p>
      </Section>

      <Section title="The counts worth memorising">
        <p>
          A few board textures come up constantly, and knowing them saves you
          the arithmetic every time.
        </p>
        <Working>
          <div className="flex items-baseline justify-between">
            <span className="text-secondary">flush draw</span>
            <span>9</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-secondary">open-ended straight draw</span>
            <span>8</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-secondary">gutshot straight draw</span>
            <span>4</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-secondary">two overcards</span>
            <span>6</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-secondary">set to a full house or better</span>
            <span>7</span>
          </div>
        </Working>
        <p>
          Learn them, then be suspicious of them. They are answers to specific
          board textures, and reaching for one without checking the board in
          front of you is the second-most-common way to be wrong.
        </p>
      </Section>

      <Section title="Turning outs into a probability">
        <p>
          A count is not yet a decision. With one card still to come, each out
          is worth roughly two percent:
        </p>
        <Working>chance of hitting ≈ outs × 2%</Working>
        <p>
          Nine outs is about 18%. Eight is about 16%. Four is about 8%. The real
          numbers are a shade higher — nine outs out of 46 unseen cards is
          19.6% — so the shortcut is slightly pessimistic, which is the right
          direction for a shortcut to err.
        </p>
        <p>
          Now the two halves meet. If a half-pot bet needs you to win 25% of the
          time and your flush draw gets there 18% of the time, the call loses
          money. Nine outs is not enough at that price. Against a quarter-pot
          bet, needing 17%, the same draw is a call.
        </p>
        <Working>
          <div className="flex items-baseline justify-between">
            <span className="text-secondary">price you are offered</span>
            <span>25%</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-secondary">chance you get there</span>
            <span>18%</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between border-t border-hairline pt-3">
            <span className="text-secondary">verdict</span>
            <span className="text-data-neg">fold</span>
          </div>
        </Working>
      </Section>

      <Section title="The two ways to get it wrong">
        <p>
          As with Pot Odds, the wrong answers in the game are specific errors
          rather than arbitrary numbers, so a miss tells you something.
        </p>

        <Mistake title="Counting only the cards that make exactly that hand">
          If you are drawing to a straight and the board pairs your ace, the card
          that makes you trips also saves the hand. Anything that reaches the
          target or passes it counts, so count the improvements you did not plan
          for.
        </Mistake>

        <Mistake title="Using a memorised count from a different draw">
          Nine is the answer for a flush draw with four suited cards visible. It
          is not the answer for a flush draw where one of your suit is already
          on the board twice over, or for a board that is not a flush draw at
          all. Count the board in front of you.
        </Mistake>
      </Section>

      <Section title="What counting cannot tell you">
        <p>
          Every out here is a card that improves <em>your</em> hand. Whether the
          improved hand actually wins is a different question, and it depends on
          what the other player has. A flush that arrives on a paired board can
          be second best. Treat the count as an upper bound on how often you are
          saved, then discount it for the times you improve and still lose.
        </p>
        <p>
          For the other half of the calculation, see{" "}
          <a href="/learn/pot-odds" className="text-rare underline underline-offset-4">
            pot odds
          </a>
          .
        </p>
      </Section>
    </LearnPage>
  );
}

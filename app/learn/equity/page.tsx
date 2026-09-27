import type { Metadata } from "next";
import { LearnPage, Section, Working, Mistake } from "@/components/learn/LearnPage";

export const metadata: Metadata = {
  title: "Equity — CMQuant",
  description:
    "What a count of outs is actually worth, and the two ways the shortcut lies to you.",
};

export default function LearnEquity() {
  return (
    <LearnPage
      eyebrow="Learn / Poker Lab"
      title="Equity"
      standfirst="Counting outs tells you how many cards help. Equity tells you how often you win, and the two are not the same number — the gap between them is where money goes."
      playHref="/g/equity"
      playLabel="Play Equity"
    >
      <Section title="The number underneath everything">
        <p>
          Equity is the share of the pot your hand is worth right now, if the
          rest of the cards were dealt out and the hand went to showdown. Not
          how strong it feels, not how often it is ahead. The share.
        </p>
        <p>
          On the turn, with one card to come, there are 44 cards you cannot
          see. Every one of them is equally likely. So the calculation is not
          an estimate at all — it is a count:
        </p>
        <Working>equity = cards that win ÷ 44</Working>
        <p>
          That is the whole thing. Everything difficult about equity is working
          out which cards win, and the shortcut everybody learns is a way of
          avoiding exactly that work.
        </p>
      </Section>

      <Section title="Where the rule of two comes from">
        <p>
          One card out of 44 is 2.27%, so each out is worth a shade over two
          per cent. Round it down and you get the rule people quote:
        </p>
        <Working>chance of hitting ≈ outs × 2</Working>
        <p>
          Nine outs gives 18%, and the real number is 20.5%. The shortcut is a
          little pessimistic, which is the right direction for a shortcut to
          err — you will occasionally fold something marginal, and you will
          never call something you should not have.
        </p>
        <p>
          It is a good rule. It is also doing something very specific, and it
          stops working the moment you use it for something else.
        </p>
      </Section>

      <Section title="The first lie: times four">
        <p>
          The rule has two versions and they are not interchangeable. On the
          flop, two cards are still to come, so it is outs times four. On the
          turn, one card is coming, so it is outs times two.
        </p>
        <Working>
          <div className="flex items-baseline justify-between">
            <span className="text-secondary">flop, two cards to come</span>
            <span>outs × 4</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-secondary">turn, one card to come</span>
            <span className="text-rare">outs × 2</span>
          </div>
        </Working>
        <p>
          Reaching for the wrong one does not make you slightly wrong. It
          doubles your answer, and it doubles it in the direction that makes
          every call look profitable. Nine outs on the turn is 20%, not 36%,
          and there is a very large difference between those two numbers when
          somebody has just bet the pot at you.
        </p>
      </Section>

      <Section title="The second lie: not every out is an out">
        <p>
          This is the one that costs real money, because it survives knowing
          the first one.
        </p>
        <p>
          An out is a card that <em>wins</em>. Not a card that improves you.
          Those are different sets, and the difference is invisible if you only
          look at your own two cards.
        </p>
        <p>
          You hold two spades and there are two more on the board. Nine spades
          left, so nine outs, so 18%. Except the board is paired. Two of those
          nine spades pair it again, and the flush you just made loses to the
          full house they already had. You do not have nine outs. You have
          seven, and you were about to call a bet priced for nine.
        </p>
        <Working>
          <div className="flex items-baseline justify-between">
            <span className="text-secondary">spades remaining</span>
            <span>9</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-secondary">spades that pair the board</span>
            <span className="text-data-neg">−2</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between border-t border-hairline pt-3">
            <span className="text-secondary">outs that actually win</span>
            <span className="text-rare">7</span>
          </div>
        </Working>
        <p>
          The same thing happens with straights. The card that completes yours
          can complete a better one, or put a third suit out and hand them a
          flush. Count what beats them, not what helps you.
        </p>
      </Section>

      <Section title="The two ways to get it wrong">
        <p>
          The wrong answers in the game are these two errors and nothing else,
          so a miss tells you which one you made.
        </p>

        <Mistake title="Counting as if two cards were still to come">
          Times four is the flop rule. On the turn there is one card left, so
          it is times two, and using the wrong multiplier doubles your answer.
        </Mistake>

        <Mistake title="Counting outs that improve your hand but still lose">
          Look at what the card does for them as well as for you. A flush card
          that pairs the board, a straight card that makes them a better
          straight — these look like outs from your side of the table and are
          not.
        </Mistake>
      </Section>

      <Section title="How the answers here are worked out">
        <p>
          Every equity in this game is exact. Not simulated, not looked up, not
          estimated — the game deals all 44 remaining cards one at a time, plays
          each hand out, and counts who wins. Ties count as half to each side,
          which is what a split pot is.
        </p>
        <p>
          That matters because you can check it. Every other equity trainer
          shows you a number from a simulator and asks you to trust it. If you
          disagree with a number here, you can deal the 44 cards yourself and
          find out which of us is wrong.
        </p>
      </Section>

      <Section title="What equity does not tell you">
        <p>
          Equity is how often you win. Whether to call is a different question,
          and it needs a price — which is what{" "}
          <a href="/learn/pot-odds" className="text-rare underline underline-offset-4">
            pot odds
          </a>{" "}
          are for. Equity above the break-even price is a call; below it is a
          fold. The three games are one calculation split into its parts:{" "}
          <a href="/learn/outs" className="text-rare underline underline-offset-4">
            count the cards
          </a>
          , turn the count into a percentage, compare it to the price.
        </p>
        <p>
          It also assumes the hand goes to showdown with no more betting, which
          real hands do not. Money still to go on the river cuts both ways: it
          can make a draw worth more than its equity when you get paid, and
          worth less when you are bet off it.
        </p>
      </Section>
    </LearnPage>
  );
}

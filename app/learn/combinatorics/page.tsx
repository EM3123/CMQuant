import type { Metadata } from "next";
import { LearnPage, Section, Working, Mistake } from "@/components/learn/LearnPage";
import { PlayingCard } from "@/components/cards/PlayingCard";

export const metadata: Metadata = {
  title: "Combinatorics — CMQuant",
  description:
    "How many ways a hand can still be dealt, and why the board changes the answer.",
};

export default function LearnCombinatorics() {
  return (
    <LearnPage
      eyebrow="Learn / Poker Lab"
      title="Combinatorics"
      standfirst="“They might have aces” is a feeling. “There are three combinations of aces left and nine of ace-king” is a number, and the difference between the two is a subtraction anyone can do."
      playHref="/g/combinatorics"
      playLabel="Play Combinatorics"
    >
      <Section title="Three shapes, three numbers">
        <p>
          Before any cards are dealt, every hand has a fixed number of
          combinations, and there are only three answers to remember.
        </p>
        <Working>
          <div className="flex items-baseline justify-between">
            <span className="text-secondary">a pocket pair</span>
            <span>6</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-secondary">two ranks, suited</span>
            <span>4</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-secondary">two ranks, offsuit</span>
            <span>12</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between border-t border-hairline pt-3">
            <span className="text-secondary">two ranks, any suits</span>
            <span className="text-rare">16</span>
          </div>
        </Working>
        <p>
          A pair is six because you are choosing two cards from four, and there
          are six ways to do that. Two different ranks is four suits times four
          suits, which is sixteen — of which four are suited and the other twelve
          are not.
        </p>
        <p>
          That last line is worth sitting with. Offsuit hands are three times as
          common as suited ones, which is why an opponent turning up with suited
          connectors feels rarer than it is unfair.
        </p>
      </Section>

      <Section title="Then the board takes cards away">
        <p>
          Every card face up is a card nobody is holding. That is the whole idea,
          and it is called card removal or blocking.
        </p>

        <div className="flex flex-wrap items-end justify-center gap-1.5 py-2">
          <PlayingCard code="Ah" size="sm" />
          <PlayingCard code="7d" size="sm" />
          <PlayingCard code="2c" size="sm" />
        </div>

        <p>
          There is an ace on that board, so only three aces remain. Choosing two
          from three gives three combinations, not six.
        </p>
        <Working>
          <div className="flex items-baseline justify-between">
            <span className="text-secondary">pocket aces, before the flop</span>
            <span>6</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-secondary">pocket aces, on this board</span>
            <span className="text-rare">3</span>
          </div>
        </Working>
        <p>
          Half of the hands you were worried about stopped existing when the
          flop came down. Nothing about your opponent changed; the deck did.
        </p>
      </Section>

      <Section title="Why this decides hands">
        <p>
          Counting one hand is arithmetic. Counting two and comparing them is
          the part that wins pots.
        </p>
        <p>
          On that same ace-high board, suppose you can only beat ace-king and you
          lose to aces. Aces are down to three combinations. Ace-king is now
          three remaining aces times four kings, which is twelve — and if you
          hold a king yourself, nine.
        </p>
        <Working>
          <div className="flex items-baseline justify-between">
            <span className="text-secondary">combinations that beat you</span>
            <span>3</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-secondary">combinations you beat</span>
            <span>9</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between border-t border-hairline pt-3">
            <span className="text-secondary">you are ahead</span>
            <span className="text-data-pos">9 in 12, or 75%</span>
          </div>
        </Working>
        <p>
          That 75% is the number that goes into{" "}
          <a href="/learn/pot-odds" className="text-rare underline underline-offset-4">
            pot odds
          </a>
          . Combinations are how a read becomes a probability, and pot odds are
          what you do with it.
        </p>
      </Section>

      <Section title="The two ways to get it wrong">
        <Mistake title="Counting the full deck and forgetting the board">
          Answering six for pocket aces on an ace-high board is the single most
          common slip, and it doubles your estimate of the hands that beat you.
          Subtract the board before you count, not after.
        </Mistake>

        <Mistake title="Using the count for a different shape">
          Six, four and twelve are easy to swap under time pressure. Check
          whether you were asked for a pair, for suited, or for offsuit before
          you reach for a number.
        </Mistake>
      </Section>

      <Section title="What the count does not include">
        <p>
          Combinations tell you how many ways a hand can exist, not how likely
          somebody is to be holding it. Nobody plays every hand they are dealt,
          so a range is combinations filtered by whether a person would actually
          have played that way. The counting comes first because it is the part
          that is objectively true; the filtering is judgement, and judgement
          applied to a wrong count is just a confident mistake.
        </p>
      </Section>
    </LearnPage>
  );
}

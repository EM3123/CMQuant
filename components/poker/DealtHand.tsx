import { PlayingCard, type CardCode } from "@/components/cards/PlayingCard";

/**
 * The hand on the Poker Lab table, dealt rather than already sitting there.
 *
 * No JavaScript. This started as a Motion mount animation and that was the
 * wrong tool: a staggered entrance with fixed delays is exactly what CSS
 * keyframes do, and a JavaScript animation depends on the frame loop running.
 * A page that mounts in a throttled tab left the animation queued and never
 * ticked, so the hand - the whole identity of this page - stayed invisible.
 * The `deal-in` keyframe resolves off the document timeline instead and holds
 * its last frame, so the worst case is that you miss the deal rather than the
 * cards.
 *
 * It also means this is a server component, and the poker index ships no
 * client JavaScript at all.
 *
 * The wrapper is what moves. PlayingCard writes its own rotate and translateY
 * into an inline transform to fan the hand, so animating the card itself would
 * fight that.
 */

type Dealt = { code?: CardCode; faceDown?: boolean; rotate: number; lift: number };

const HAND: Dealt[] = [
  { code: "As", rotate: -13, lift: 10 },
  { code: "Kd", rotate: -4, lift: 0 },
  { faceDown: true, rotate: 5, lift: 0 },
  { faceDown: true, rotate: 14, lift: 10 },
];

export function DealtHand() {
  return (
    <div className="relative flex items-end">
      {HAND.map((c, i) => (
        <div
          key={i}
          className={`deal-in ${i === 0 ? "" : "-ml-5"}`}
          style={{ animationDelay: `${140 + i * 110}ms` }}
        >
          <PlayingCard
            code={c.code}
            faceDown={c.faceDown}
            size="lg"
            rotate={c.rotate}
            lift={c.lift}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * Playing cards, drawn in CSS rather than imported as artwork.
 *
 * Two reasons they are not images: the spec forbids borrowing any poker site's
 * card art, and a card that is real DOM can be sized, rotated, lit and
 * shadowed by the same token system as everything else.
 *
 * The red pips use Carnegie Red. It is the quietest place on the site to put
 * the university colour - nobody reads a card face as branding, but the room
 * inherits the palette anyway.
 */

export type Suit = "s" | "h" | "d" | "c";
export type Rank =
  | "A" | "K" | "Q" | "J" | "T"
  | "9" | "8" | "7" | "6" | "5" | "4" | "3" | "2";

export type CardCode = `${Rank}${Suit}`;

const GLYPH: Record<Suit, string> = {
  s: "♠",
  h: "♥",
  d: "♦",
  c: "♣",
};

const IS_RED: Record<Suit, boolean> = { s: false, h: true, d: true, c: false };

/** Rank as it reads on a real card - T is printed as 10. */
function rankLabel(rank: Rank): string {
  return rank === "T" ? "10" : rank;
}

export type CardSize = "sm" | "md" | "lg";

const WIDTH: Record<CardSize, string> = {
  sm: "clamp(2.1rem, 4.2vw, 2.9rem)",
  md: "clamp(3rem, 6vw, 4.2rem)",
  lg: "clamp(4.2rem, 8.5vw, 6.2rem)",
};

export function PlayingCard({
  code,
  faceDown = false,
  size = "md",
  rotate = 0,
  lift = 0,
  className = "",
}: {
  code?: CardCode;
  faceDown?: boolean;
  size?: CardSize;
  /** Degrees. A hand that is perfectly square to the table looks like a diagram. */
  rotate?: number;
  /** Pixels of vertical offset, for fanning a row of cards. */
  lift?: number;
  className?: string;
}) {
  const width = WIDTH[size];

  // Standard playing card proportions, 2.5 x 3.5 inches.
  const shell: React.CSSProperties = {
    width,
    aspectRatio: "5 / 7",
    transform: `rotate(${rotate}deg) translateY(${lift}px)`,
  };

  if (faceDown || !code) {
    return (
      <div
        style={shell}
        aria-hidden
        className={`relative shrink-0 overflow-hidden rounded-[9%] shadow-[0_14px_30px_-10px_rgba(0,0,0,0.85)] ${className}`}
      >
        <div className="absolute inset-0 bg-carnegie-red" />
        {/* Woven diagonals. Faint enough to read as texture at thumbnail size. */}
        <div
          className="absolute inset-0 opacity-[0.22]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, rgba(0,0,0,0.55) 0 2px, transparent 2px 6px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.35) 0 1px, transparent 1px 7px)",
          }}
        />
        <div className="absolute inset-[7%] rounded-[6%] border border-gold-leaf/45" />
        <div className="absolute inset-0 bg-gradient-to-br from-white/12 via-transparent to-black/35" />
      </div>
    );
  }

  const rank = code[0] as Rank;
  const suit = code[1] as Suit;
  const red = IS_RED[suit];
  const ink = red ? "text-carnegie-red" : "text-[#141414]";

  return (
    <div
      style={shell}
      className={`relative shrink-0 overflow-hidden rounded-[9%] bg-[#F6F3EA] shadow-[0_14px_30px_-10px_rgba(0,0,0,0.85)] ${className}`}
      role="img"
      aria-label={`${rankLabel(rank)} of ${
        { s: "spades", h: "hearts", d: "diamonds", c: "clubs" }[suit]
      }`}
    >
      <span
        className={`absolute left-[7%] top-[4%] flex flex-col items-center leading-none ${ink}`}
        style={{ fontSize: `calc(${width} * 0.27)` }}
      >
        <span className="font-semibold tabular">{rankLabel(rank)}</span>
        <span style={{ fontSize: "0.82em" }}>{GLYPH[suit]}</span>
      </span>

      <span
        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 leading-none ${ink}`}
        style={{ fontSize: `calc(${width} * 0.52)` }}
      >
        {GLYPH[suit]}
      </span>

      <span
        className={`absolute bottom-[4%] right-[7%] flex rotate-180 flex-col items-center leading-none ${ink}`}
        style={{ fontSize: `calc(${width} * 0.27)` }}
      >
        <span className="font-semibold tabular">{rankLabel(rank)}</span>
        <span style={{ fontSize: "0.82em" }}>{GLYPH[suit]}</span>
      </span>

      {/* Lamp falling across the face from the upper left. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-black/12" />
    </div>
  );
}

/** A row of cards that overlap and fan, the way a hand sits on a table. */
export function CardFan({
  cards,
  size = "md",
  className = "",
}: {
  cards: (CardCode | null)[];
  size?: CardSize;
  className?: string;
}) {
  const mid = (cards.length - 1) / 2;

  return (
    <div className={`flex items-end ${className}`}>
      {cards.map((code, i) => {
        const offset = i - mid;
        return (
          <div key={i} style={{ marginLeft: i === 0 ? 0 : "-3.5%" }}>
            <PlayingCard
              code={code ?? undefined}
              faceDown={code === null}
              size={size}
              rotate={offset * 5}
              lift={Math.abs(offset) * 5}
            />
          </div>
        );
      })}
    </div>
  );
}

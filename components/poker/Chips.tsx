/**
 * Casino chips, drawn rather than imported, for the same reason the playing
 * cards are: no artwork to license, no request to make, and they take a size
 * from the layout instead of from a bitmap.
 *
 * A pot printed as the number 900 is a spreadsheet cell. The same pot as three
 * black chips and four green ones is a table, and it is the single cheapest
 * thing that makes a poker screen look like poker. The denominations and their
 * colours are the standard ones a cardroom uses, so anyone who has sat at a
 * table reads the stack before they read the number.
 *
 * The amounts are real. Whatever the generator produced is what gets broken
 * into chips, and the numeral is printed alongside so nothing is guessed from
 * the picture.
 */

type Denom = {
  value: number;
  body: string;
  edge: string;
  ink: string;
};

/** Cardroom standard, largest first, because the break-down is greedy. */
const DENOMS: Denom[] = [
  { value: 1000, body: "#c9a227", edge: "#7d6314", ink: "#211a05" },
  { value: 500, body: "#5b3f9e", edge: "#38265f", ink: "#ece6ff" },
  { value: 100, body: "#141414", edge: "#3d3d3d", ink: "#efefef" },
  { value: 25, body: "#1f7a4d", edge: "#0f4a2d", ink: "#e8fff3" },
  { value: 5, body: "#a11122", edge: "#5f0a14", ink: "#ffeaea" },
  { value: 1, body: "#d6d3ca", edge: "#95928a", ink: "#1e1e1c" },
];

/** One chip, face on. The rim spots are what make a disc read as a chip. */
function Chip({ denom, size = 26 }: { denom: Denom; size?: number }) {
  const spots = [0, 60, 120, 180, 240, 300];
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      className="block shrink-0"
      aria-hidden
    >
      <circle cx="20" cy="20" r="19" fill={denom.body} />
      {spots.map((angle) => (
        <rect
          key={angle}
          x="17.6"
          y="1.4"
          width="4.8"
          height="6.4"
          fill={denom.ink}
          opacity="0.9"
          transform={`rotate(${angle} 20 20)`}
        />
      ))}
      <circle
        cx="20"
        cy="20"
        r="13.4"
        fill={denom.body}
        stroke={denom.edge}
        strokeWidth="1.1"
      />
      <circle cx="20" cy="20" r="19" fill="none" stroke={denom.edge} strokeWidth="1.6" />
      <text
        x="20"
        y="23.6"
        textAnchor="middle"
        fontSize="10"
        fontWeight="600"
        fill={denom.ink}
        style={{ fontFamily: "var(--mono-stack)" }}
      >
        {denom.value >= 1000 ? `${denom.value / 1000}K` : denom.value}
      </text>
      {/* Light from above left, so a stack of these has a direction. */}
      <circle cx="20" cy="20" r="19" fill="url(#chip-sheen)" />
      <defs>
        <radialGradient id="chip-sheen" cx="32%" cy="26%" r="72%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.3" />
        </radialGradient>
      </defs>
    </svg>
  );
}

/** Chips of one denomination, stacked, seen slightly from the side. */
function Stack({ denom, count, size }: { denom: Denom; count: number; size: number }) {
  // Six is as tall as a stack reads before it is just a column. Anything past
  // that is a numeral, which is what the label under it is for.
  const shown = Math.min(count, 6);
  const lip = Math.max(3, Math.round(size * 0.16));

  // No per-stack caption. It was "1x500 4x100" in grey under every stack, and
  // three of those in a row is a line of noise under a picture that already
  // says the same thing. The total is printed once, beneath the pile.
  return (
    <div
      className="relative"
      style={{ width: size, height: size + lip * (shown - 1) }}
      title={`${count} x ${denom.value}`}
    >
      {Array.from({ length: shown }).map((_, i) => (
        <div
          key={i}
          className="absolute left-0"
          style={{
            bottom: i * lip,
            filter: i === shown - 1 ? "none" : "brightness(0.8)",
          }}
        >
          <Chip denom={denom} size={size} />
        </div>
      ))}
      {count > shown && (
        <span className="tabular absolute -right-1 -top-1 text-[9px] leading-none text-white/70">
          +{count - shown}
        </span>
      )}
    </div>
  );
}

/** Greedy break-down. Largest denomination first, the way a dealer colours up. */
export function chipBreakdown(amount: number): { denom: Denom; count: number }[] {
  let left = Math.max(0, Math.round(amount));
  const out: { denom: Denom; count: number }[] = [];
  for (const denom of DENOMS) {
    const count = Math.floor(left / denom.value);
    if (count > 0) {
      out.push({ denom, count });
      left -= count * denom.value;
    }
  }
  return out;
}

export function ChipPile({
  amount,
  size = 24,
  className = "",
}: {
  amount: number;
  size?: number;
  className?: string;
}) {
  const stacks = chipBreakdown(amount);
  if (!stacks.length) return null;

  return (
    <div className={`flex items-end gap-2 ${className}`}>
      {stacks.map(({ denom, count }) => (
        <Stack key={denom.value} denom={denom} count={count} size={size} />
      ))}
    </div>
  );
}

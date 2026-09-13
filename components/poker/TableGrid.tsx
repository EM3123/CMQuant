/**
 * The table, top-down, as a vector diagram.
 *
 * design.md: "a top-down, minimalist vector rendering of a dark felt poker
 * table, omitting distracting illustrations to focus purely on position
 * markers". So there is no felt texture, no chips, no cards and no lamp - the
 * only information here is where the six seats are and what each one is
 * called, because position is the variable every poker decision depends on and
 * the one this site never had a picture of.
 *
 * The button is highlighted because everything else is named relative to it.
 */

type Seat = {
  code: string;
  name: string;
  /** Clock angle in degrees, 0 at the top, running clockwise. */
  angle: number;
};

const SEATS: Seat[] = [
  { code: "BTN", name: "Button", angle: 180 },
  { code: "SB", name: "Small blind", angle: 240 },
  { code: "BB", name: "Big blind", angle: 300 },
  { code: "UTG", name: "Under the gun", angle: 0 },
  { code: "MP", name: "Middle", angle: 60 },
  { code: "CO", name: "Cutoff", angle: 120 },
];

// Ellipse, because a real table is wider than it is deep.
const RX = 40;
const RY = 27;

function seatPos(angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: 50 + RX * Math.cos(rad), y: 50 + RY * Math.sin(rad) };
}

export function TableGrid({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between border-b border-hairline pb-1.5">
        <span className="text-[9px] uppercase tracking-[0.18em] text-secondary">
          Table
        </span>
        <span className="text-[9px] uppercase tracking-[0.18em] text-muted">
          6-max
        </span>
      </div>

      <svg viewBox="0 0 100 78" className="mt-3 w-full" aria-hidden>
        <ellipse
          cx="50"
          cy="50"
          rx={RX - 9}
          ry={RY - 8}
          fill="none"
          stroke="var(--color-smoke-red)"
          strokeWidth="0.6"
        />
        <ellipse
          cx="50"
          cy="50"
          rx={RX}
          ry={RY}
          fill="none"
          stroke="var(--color-smoke-red)"
          strokeWidth="0.4"
          strokeDasharray="1.4 1.8"
        />

        {SEATS.map((seat) => {
          const { x, y } = seatPos(seat.angle);
          const live = seat.code === "BTN";
          return (
            <g key={seat.code}>
              <rect
                x={x - 8}
                y={y - 4}
                width="16"
                height="8"
                fill={live ? "var(--color-deep-red)" : "var(--color-charcoal)"}
                stroke={live ? "var(--color-deep-red)" : "var(--color-smoke-red)"}
                strokeWidth="0.4"
              />
              <text
                x={x}
                y={y + 1.6}
                textAnchor="middle"
                fontSize="4"
                letterSpacing="0.3"
                fill={live ? "#ffffff" : "var(--color-ash-red)"}
                style={{ fontFamily: "var(--mono-stack)" }}
              >
                {seat.code}
              </text>
            </g>
          );
        })}
      </svg>

      <dl className="mt-3 space-y-0.5">
        {SEATS.map((seat) => (
          <div key={seat.code} className="flex items-baseline gap-2">
            <dt
              className={`tabular w-9 shrink-0 text-[9px] tracking-[0.12em] ${
                seat.code === "BTN" ? "text-accent-ink" : "text-secondary"
              }`}
            >
              {seat.code}
            </dt>
            <dd className="truncate text-[9px] text-muted">{seat.name}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

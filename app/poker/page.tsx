import Link from "next/link";
import { Wing } from "@/components/Wing";
import { PlayingCard } from "@/components/cards/PlayingCard";

const TABLES = [
  {
    name: "Pot Odds",
    line: "Break-even probability from a pot and a bet.",
    href: "/g/pot-odds",
    status: "Open",
  },
  {
    name: "Outs",
    line: "Count the cards that still save the hand.",
    href: null,
    status: "Dealing soon",
  },
  {
    name: "Equity",
    line: "Run the hand out, ten thousand times.",
    href: null,
    status: "Phase 2",
  },
  {
    name: "Combinatorics",
    line: "How many ways a range can contain it.",
    href: null,
    status: "Phase 2",
  },
];

export default function PokerPage() {
  return (
    <Wing wing="poker">
      <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-6 py-10">
        <nav className="flex shrink-0 items-center justify-between">
          <Link href="/" className="text-sm font-medium tracking-tight">
            CMQuant
          </Link>
          <Link
            href="/comp"
            className="text-[10px] uppercase tracking-[0.3em] text-secondary transition-colors hover:text-primary"
          >
            Comp
          </Link>
        </nav>

        {/* The table. A felt surface catching the lamp, with a hand on it -
            rather than a header floating in a gradient. */}
        <header className="relative mt-14 flex flex-col items-center text-center">
          <div className="spotlight-glow" />

          <div className="relative flex w-full justify-center pb-6">
            {/* Felt, and the rail around it. The ellipse sits low and wide so
                the hand rests on the near edge of the table rather than
                hovering over a dark shape. */}
            <div className="absolute inset-x-0 bottom-0 mx-auto h-56 w-full max-w-2xl rounded-[50%] bg-[radial-gradient(58%_68%_at_50%_50%,rgba(19,92,46,0.85)_0%,rgba(8,48,26,0.75)_52%,transparent_78%)] shadow-[inset_0_0_70px_rgba(0,0,0,0.75)]" />
            <div className="absolute inset-x-0 bottom-0 mx-auto h-56 w-full max-w-2xl rounded-[50%] border border-gold-leaf/15" />

            {/* Shadow the hand casts onto the felt. */}
            <div className="absolute bottom-8 left-1/2 h-8 w-64 -translate-x-1/2 rounded-[50%] bg-black/60 blur-xl" />

            <div className="relative flex items-end">
              <PlayingCard code="As" size="lg" rotate={-13} lift={10} />
              <div className="-ml-5">
                <PlayingCard code="Kd" size="lg" rotate={-4} />
              </div>
              <div className="-ml-5">
                <PlayingCard faceDown size="lg" rotate={5} />
              </div>
              <div className="-ml-5">
                <PlayingCard faceDown size="lg" rotate={14} lift={10} />
              </div>
            </div>
          </div>

          <span className="mt-14 text-[10px] uppercase tracking-[0.3em] text-secondary">
            Probability in Practice
          </span>
          <h1 className="mt-4 font-display text-6xl font-light tracking-wing text-rare sm:text-7xl">
            Poker Lab
          </h1>
          <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-secondary">
            Nothing here is played for money. The cards are here because
            probability is easier to learn when the numbers are attached to a
            decision you have four seconds to make.
          </p>
        </header>

        <div className="mt-16 flex-1">
          <div className="rule-x" />
          {TABLES.map((table) => {
            const open = Boolean(table.href);
            const row = (
              <div
                className={`flex items-baseline gap-5 py-6 transition-colors ${
                  open ? "group cursor-pointer" : "opacity-55"
                }`}
              >
                <h2
                  className={`font-display text-3xl font-light tracking-wing ${
                    open ? "text-primary group-hover:text-rare" : "text-primary"
                  }`}
                >
                  {table.name}
                </h2>
                <p className="hidden flex-1 text-sm text-secondary sm:block">{table.line}</p>
                <span
                  className={`shrink-0 text-[10px] uppercase tracking-[0.3em] ${
                    open ? "text-rare" : "text-muted"
                  }`}
                >
                  {table.status}
                </span>
              </div>
            );

            return (
              <div key={table.name}>
                {table.href ? <Link href={table.href}>{row}</Link> : row}
                <div className="rule-x" />
              </div>
            );
          })}
        </div>

        <footer className="mt-16 space-y-2 text-center text-[11px] leading-relaxed text-muted">
          <p>CM stands for Computational Mathematics.</p>
          <p>
            Simulated cards only. Nothing can be wagered here and nothing can be
            cashed out.
          </p>
          <p>
            CMQuant is a student-built project and is not affiliated with or
            endorsed by Carnegie Mellon University.
          </p>
        </footer>
      </div>
    </Wing>
  );
}

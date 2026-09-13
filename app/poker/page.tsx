import Link from "next/link";
import { Wing } from "@/components/Wing";
import { SiteFooter } from "@/components/SiteFooter";
import { DealtHand } from "@/components/poker/DealtHand";

const TABLES = [
  {
    name: "Pot Odds",
    line: "Break-even probability from a pot and a bet.",
    href: "/g/pot-odds",
    learn: "/learn/pot-odds",
    status: "Open",
  },
  {
    name: "Outs",
    line: "Count the cards that still save the hand.",
    href: "/g/outs",
    learn: "/learn/outs",
    status: "Open",
  },
  {
    name: "Equity",
    line: "Run the hand out, ten thousand times.",
    href: null,
    learn: null,
    status: "Phase 2",
  },
  {
    name: "Combinatorics",
    line: "How many ways a hand can still be dealt.",
    href: "/g/combinatorics",
    learn: "/learn/combinatorics",
    status: "Open",
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
            {/* The table, and the light on it.
                This was a dark ellipse at first, which was wrong twice over:
                it painted an opaque shape ON TOP of a lit room, so the table
                came out darker than the floor and read as a hole. A table
                under a lamp is the brightest thing in a club, not the
                dimmest. So it is a pool of light now - rose overhead, violet
                bleeding in from the room, nothing opaque anywhere. The
                ellipse sits low and wide so the hand rests on the near edge
                rather than hovering over a shape. */}
            <div className="absolute inset-x-0 bottom-0 mx-auto h-56 w-full max-w-2xl rounded-[50%] bg-[radial-gradient(56%_66%_at_50%_44%,rgba(255,61,129,0.15)_0%,rgba(139,92,246,0.11)_46%,transparent_78%)]" />
            {/* No drawn rim. A border on the ellipse traced a hard rose arc
                right across the header, and a drawn outline is the one thing
                a pool of light does not have. What is left is the glow. */}
            <div className="absolute inset-x-0 bottom-0 mx-auto h-56 w-full max-w-2xl rounded-[50%] shadow-[0_0_60px_-20px_rgba(255,61,129,0.55)]" />

            {/* Shadow the hand casts onto the felt. */}
            <div className="absolute bottom-8 left-1/2 h-8 w-64 -translate-x-1/2 rounded-[50%] bg-black/60 blur-xl" />

            <DealtHand />
          </div>

          <span className="mt-14 text-[10px] uppercase tracking-[0.3em] text-secondary">
            Probability in Practice
          </span>
          <h1 className="neon-glow mt-4 font-display text-6xl font-light italic tracking-wing text-rare sm:text-7xl">
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
                {table.learn && (
                  <Link
                    href={table.learn}
                    className="-mt-3 mb-4 inline-block text-[10px] uppercase tracking-[0.3em] text-secondary underline underline-offset-4 transition-colors hover:text-rare"
                  >
                    Learn
                  </Link>
                )}
                <div className="rule-x" />
              </div>
            );
          })}
        </div>

        <SiteFooter variant="stack" poker />
      </div>
    </Wing>
  );
}

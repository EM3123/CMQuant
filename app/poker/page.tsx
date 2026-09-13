import Link from "next/link";
import { Wing } from "@/components/Wing";
import { SiteFooter } from "@/components/SiteFooter";
import { DealtHand } from "@/components/poker/DealtHand";
import { Wordmark } from "@/components/site/Wordmark";

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
          <Wordmark />
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

          <div className="relative flex w-full justify-center pb-10">
            {/* The table, and the light on it.
                Two earlier versions were wrong. The first painted an opaque
                dark ellipse ON TOP of a lit room, so the table came out darker
                than the floor and read as a hole - a table under a lamp is the
                brightest thing in a club, not the dimmest. The second drew a
                rim on it, and a hard rose arc across the header is the one
                thing a pool of light does not have.
                
                The third mistake was geometry: at h-56 the ellipse was taller
                than the row of cards, so it rose above them and the hand
                floated in the middle of a glow instead of resting on it. It
                sits low now, most of its height below the cards, so the near
                edge of the light is the near edge of the table. */}
            <div className="pointer-events-none absolute inset-x-0 -bottom-14 mx-auto h-40 w-full max-w-xl rounded-[50%] bg-[radial-gradient(58%_62%_at_50%_38%,rgba(255,61,129,0.17)_0%,rgba(139,92,246,0.12)_48%,transparent_78%)] shadow-[0_0_60px_-22px_rgba(255,61,129,0.5)]" />

            {/* Shadow the hand casts down onto it. */}
            <div className="pointer-events-none absolute bottom-2 left-1/2 h-7 w-60 -translate-x-1/2 rounded-[50%] bg-black/65 blur-xl" />

            <DealtHand />
          </div>

          <span className="mt-20 text-[10px] uppercase tracking-[0.3em] text-secondary">
            Probability in Practice
          </span>
          <h1 className="neon-glow mt-4 font-display text-6xl font-light italic tracking-wing text-rare sm:text-7xl">
            Poker Lab
          </h1>
          <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-secondary">
            Nothing here is played for money. The cards are here because
            probability sticks when there is a decision attached to it.
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

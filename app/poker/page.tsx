import Link from "next/link";
import { Wing } from "@/components/Wing";
import { SiteFooter } from "@/components/SiteFooter";
import { Wordmark } from "@/components/site/Wordmark";
import { BestCell } from "@/components/game/BestCell";
import { FIVE_CARD_HANDS } from "@/lib/poker/frequency";

/**
 * The poker index. Four games, and not much else.
 *
 * It briefly had three reference panels above the game list - a seat diagram,
 * a hand frequency table and a range matrix - and the games ended up as a thin
 * list at the bottom in the smallest type on the page. That is a documentation
 * page with the product as a footnote. This is a games site; the games go
 * first and nothing sits above them.
 *
 * The palette stays where design.md put it: matte black, smoke-red rules, deep
 * red for anything live, zero radius.
 */

const TABLES = [
  {
    code: "POT",
    name: "Pot Odds",
    line: "Break-even probability from a pot and a bet",
    href: "/g/pot-odds",
    storageKey: "cmquant:potodds:best",
    status: "OPEN",
  },
  {
    code: "OUT",
    name: "Outs",
    line: "Count the cards that still save the hand",
    href: "/g/outs",
    storageKey: "cmquant:outs:best",
    status: "OPEN",
  },
  {
    code: "CMB",
    name: "Combinatorics",
    line: "How many ways a hand can still be dealt",
    href: "/g/combinatorics",
    storageKey: "cmquant:combinatorics:best",
    status: "OPEN",
  },
  {
    code: "EQY",
    name: "Equity",
    line: "Run the hand out against a range",
    href: null,
    storageKey: null,
    status: "PHASE 2",
  },
];

export default function PokerPage() {
  return (
    <Wing wing="poker">
      <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-5 py-4">
        <nav className="flex shrink-0 items-center justify-between border-b border-hairline-strong pb-2.5">
          <Wordmark />
          <div className="flex items-center gap-5 text-[10px] uppercase tracking-[0.18em] text-secondary">
            <span className="text-accent-ink">Poker Lab</span>
            <Link href="/daily" className="transition-colors hover:text-primary">
              Daily
            </Link>
            <Link href="/comp" className="transition-colors hover:text-primary">
              Comp
            </Link>
          </div>
        </nav>

        <header className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 border-b border-hairline py-4">
          <h1 className="font-display text-2xl font-medium uppercase tracking-wing text-primary">
            Poker Lab
          </h1>
          <p className="max-w-xl text-[11px] leading-relaxed text-secondary">
            Nothing here is played for money. Every number is enumerated rather
            than sampled, and the hand ranking is checked against all{" "}
            <span className="tabular text-primary">
              {FIVE_CARD_HANDS.toLocaleString()}
            </span>{" "}
            five-card hands.
          </p>
        </header>

        <div className="border-b border-hairline">
          <div className="grid grid-cols-[2.4rem_1fr_3.6rem_4.2rem] items-baseline gap-x-3 border-b border-hairline px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-secondary">
            <span>ID</span>
            <span>Table</span>
            <span className="text-right">Best</span>
            <span className="text-right">Status</span>
          </div>

          {TABLES.map((t) => {
            const row = (
              <div
                className={`grid grid-cols-[2.4rem_1fr_3.6rem_4.2rem] items-baseline gap-x-3 border-b border-hairline px-4 py-5 text-sm last:border-b-0 ${
                  t.href ? "group hover:bg-accent/10" : "opacity-50"
                }`}
              >
                <span className="tabular text-muted">{t.code}</span>
                <span>
                  <span
                    className={
                      t.href
                        ? "text-primary transition-colors group-hover:text-accent-ink"
                        : "text-primary"
                    }
                  >
                    {t.name}
                  </span>
                  <span className="mt-0.5 block text-muted sm:ml-3 sm:mt-0 sm:inline">
                    {t.line}
                  </span>
                </span>
                <span className="tabular text-right text-primary">
                  {t.storageKey ? (
                    <BestCell storageKey={t.storageKey} />
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </span>
                <span
                  className={`text-right text-[9px] tracking-[0.14em] ${
                    t.href ? "text-data-pos" : "text-muted"
                  }`}
                >
                  {t.status}
                </span>
              </div>
            );

            return t.href ? (
              <Link key={t.code} href={t.href}>
                {row}
              </Link>
            ) : (
              <div key={t.code}>{row}</div>
            );
          })}
        </div>

        <SiteFooter variant="stack" poker />
      </div>
    </Wing>
  );
}

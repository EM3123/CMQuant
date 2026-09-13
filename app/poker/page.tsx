import Link from "next/link";
import { Wing } from "@/components/Wing";
import { SiteFooter } from "@/components/SiteFooter";
import { Wordmark } from "@/components/site/Wordmark";
import { RangeGrid } from "@/components/poker/RangeGrid";
import { BestCell } from "@/components/game/BestCell";

/**
 * Poker Lab, in the register of the software a poker player actually studies
 * with rather than the register of a casino.
 *
 * The previous version was a felt table under a lamp, a fanned hand, and a
 * glowing italic headline in a violet room. It looked like something you
 * gamble on, which is the one thing this wing must never look like - there is
 * no money in it and the spec forbids there ever being any.
 *
 * This is a solver index instead: a range matrix, mono headings, square cells,
 * a dense table with numeric columns. Everything on the page is either a
 * number or a link to something that produces one.
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
  // Rows are whole-row links, so no cell may contain a link of its own - an
  // anchor inside an anchor is invalid and browsers resolve it unpredictably.
  // The explainers are reachable from each game's intro screen instead.
  return (
    <Wing wing="poker">
      <div className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col px-5 py-4">
        <nav className="flex shrink-0 items-center justify-between border-b border-hairline pb-3">
          <Wordmark />
          <div className="flex items-center gap-5 text-[10px] uppercase tracking-[0.18em] text-secondary">
            <Link href="/daily" className="transition-colors hover:text-primary">
              Daily
            </Link>
            <Link href="/comp" className="transition-colors hover:text-primary">
              Comp
            </Link>
          </div>
        </nav>

        {/* Two columns, the way a solver's header is: the thing being analysed
            on one side, what you can do about it on the other. */}
        <header className="mt-12 grid gap-10 md:grid-cols-[minmax(0,1fr)_300px] md:items-start md:gap-14">
          <div>
            <span className="text-[10px] uppercase tracking-[0.3em] text-rare">
              Probability in practice
            </span>
            <h1 className="mt-4 font-display text-4xl font-medium uppercase tracking-wing text-primary sm:text-5xl">
              Poker Lab
            </h1>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-secondary">
              Nothing here is played for money. The cards are here because
              probability sticks when there is a decision attached to it.
            </p>

            <dl className="mt-10 grid max-w-md grid-cols-3 border-y border-hairline">
              <Figure label="Five-card hands" value="2,598,960" />
              <Figure label="Distinct values" value="7,462" />
              <Figure label="Starting hands" value="169" />
            </dl>
            <p className="mt-3 max-w-md text-[11px] leading-relaxed text-muted">
              Every number here is enumerated rather than sampled. The hand
              ranking is checked against all 2,598,960 five-card hands.
            </p>
          </div>

          <RangeGrid />
        </header>

        <div className="mt-14 flex-1">
          <div className="grid grid-cols-[2.6rem_1fr_4rem_4.5rem] items-baseline gap-x-3 border-b border-hairline pb-2 text-[10px] uppercase tracking-[0.18em] text-secondary">
            <span>ID</span>
            <span>Table</span>
            <span className="text-right">Best</span>
            <span className="text-right">Status</span>
          </div>

          {TABLES.map((t) => {
            const row = (
              <div
                className={`grid grid-cols-[2.6rem_1fr_4rem_4.5rem] items-baseline gap-x-3 border-b border-hairline py-3 text-xs ${
                  t.href ? "group hover:bg-white/[0.03]" : "opacity-55"
                }`}
              >
                <span className="tabular text-muted">{t.code}</span>
                <span>
                  <span
                    className={
                      t.href
                        ? "text-primary transition-colors group-hover:text-rare"
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
                  className={`text-right text-[10px] tracking-[0.14em] ${
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

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-3">
      <dd className="tabular text-lg text-primary">{value}</dd>
      <dt className="mt-1 text-[9px] uppercase tracking-[0.16em] text-secondary">
        {label}
      </dt>
    </div>
  );
}

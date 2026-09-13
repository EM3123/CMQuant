import Link from "next/link";
import { Wing } from "@/components/Wing";
import { SiteFooter } from "@/components/SiteFooter";
import { Wordmark } from "@/components/site/Wordmark";
import { RangeGrid } from "@/components/poker/RangeGrid";
import { TableGrid } from "@/components/poker/TableGrid";
import { BestCell } from "@/components/game/BestCell";
import { CATEGORY_NAMES } from "@/lib/poker/hand";
import {
  CATEGORY_COUNTS,
  CATEGORY_ORDER,
  FIVE_CARD_HANDS,
  DISTINCT_HAND_VALUES,
} from "@/lib/poker/frequency";

/**
 * The underground poker lab, laid out as telemetry rather than as a room.
 *
 * design.md, Realm 2: a top-down table grid, a dense range matrix, statistics
 * in tiny monospace. Absolute matte black, smoke-red rules, deep red for
 * anything live, zero radius, panels butting against each other and sharing
 * their borders.
 *
 * What is NOT here and will not be: VPIP, PFR and 3-bet frequency. The brief
 * asks for them, and they are statistics about tracked opponents. There are no
 * opponents on this site, no hand histories and no database, so any number
 * under those headings would be invented - the exact failure this wing exists
 * to avoid. The telemetry panel carries enumerated constants instead: the hand
 * frequency table that `verify-hand.ts` proves by walking all 2,598,960 hands.
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
      <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 py-3">
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

        {/* Three panels sharing their borders. No gutters, no cards, no
            shadows - density is the aesthetic here, per design.md. */}
        <div className="grid flex-1 grid-cols-1 divide-y divide-hairline border-b border-hairline lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)_minmax(0,1.15fr)] lg:divide-x lg:divide-y-0">
          <section className="p-4">
            <TableGrid />
          </section>

          <section className="p-4">
            <Telemetry />
          </section>

          <section className="p-4">
            <RangeGrid />
          </section>
        </div>

        <div className="border-b border-hairline">
          <div className="grid grid-cols-[2.4rem_1fr_3.6rem_4.2rem] items-baseline gap-x-3 border-b border-hairline px-4 py-2 text-[9px] uppercase tracking-[0.18em] text-secondary">
            <span>ID</span>
            <span>Table</span>
            <span className="text-right">Best</span>
            <span className="text-right">Status</span>
          </div>

          {TABLES.map((t) => {
            const row = (
              <div
                className={`grid grid-cols-[2.4rem_1fr_3.6rem_4.2rem] items-baseline gap-x-3 border-b border-hairline px-4 py-2.5 text-[11px] last:border-b-0 ${
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

/** Enumerated constants, in the shape a telemetry column takes. */
function Telemetry() {
  return (
    <div>
      <div className="flex items-baseline justify-between border-b border-hairline pb-1.5">
        <span className="text-[9px] uppercase tracking-[0.18em] text-secondary">
          Hand frequency
        </span>
        <span className="tabular text-[9px] text-muted">
          n={FIVE_CARD_HANDS.toLocaleString()}
        </span>
      </div>

      <table className="mt-2 w-full">
        <tbody>
          {CATEGORY_ORDER.map((cat) => {
            const count = CATEGORY_COUNTS[cat];
            const share = (count / FIVE_CARD_HANDS) * 100;
            return (
              <tr key={cat} className="border-b border-hairline">
                <td className="py-[3px] text-[10px] text-secondary">
                  {CATEGORY_NAMES[cat]}
                </td>
                <td className="tabular py-[3px] text-right text-[10px] text-primary">
                  {count.toLocaleString()}
                </td>
                <td className="tabular w-14 py-[3px] text-right text-[10px] text-muted">
                  {share < 0.01 ? share.toFixed(4) : share.toFixed(2)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <dl className="mt-3 space-y-1">
        <Stat
          label="Distinct hand values"
          value={DISTINCT_HAND_VALUES.toLocaleString()}
        />
        <Stat label="Starting combinations" value="1,326" />
        <Stat label="Starting hand classes" value="169" />
        <Stat label="Flops enumerated per hand" value="19,600" />
      </dl>
      <p className="mt-2.5 text-[9px] leading-relaxed text-muted">
        Counts proved by enumeration in the property tests, not quoted. No
        opponent statistics: this site tracks no players and stores no hands.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[10px] text-secondary">{label}</dt>
      <dd className="tabular text-[10px] text-primary">{value}</dd>
    </div>
  );
}

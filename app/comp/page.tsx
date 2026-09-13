import Link from "next/link";
import { Wing, Label } from "@/components/Wing";
import { SiteFooter } from "@/components/SiteFooter";
import { BestCell } from "@/components/game/BestCell";
import { Wordmark } from "@/components/site/Wordmark";
import { CodePanel } from "@/components/comp/CodePanel";
import { RampPlot } from "@/components/comp/RampPlot";
import { SystemOutput } from "@/components/comp/SystemOutput";

const DRILLS = [
  {
    id: "EQZ",
    name: "Equalize",
    skill: "Compare two expressions without computing either",
    href: "/g/equalize",
    storageKey: "cmquant:equalize:best",
    status: "LIVE",
  },
  {
    id: "FLS",
    name: "Flash",
    skill: "Sequential arithmetic, typed, against the clock",
    href: "/g/flash",
    storageKey: "cmquant:flash:best",
    status: "LIVE",
  },
  {
    id: "MTL",
    name: "Memory Tiles",
    skill: "Spatial recall, on a board that keeps growing",
    href: "/g/memory-tiles",
    storageKey: "cmquant:memorytiles:best",
    status: "LIVE",
  },
  {
    id: "APX",
    name: "Approx",
    skill: "Estimation, when precision is wasted effort",
    href: "/g/approx",
    storageKey: "cmquant:approx:best",
    status: "LIVE",
  },
  {
    id: "DMD",
    name: "Doomsday",
    skill: "Name the weekday for any date",
    href: "/g/doomsday",
    storageKey: "cmquant:doomsday:best",
    status: "LIVE",
  },
  {
    id: "DST",
    name: "Distribution",
    skill: "Read a distribution, name its statistics",
    href: null,
    storageKey: null,
    status: "PHASE 2",
  },
  {
    id: "SIG",
    name: "Signal",
    skill: "Pattern recognition against controlled noise",
    href: null,
    storageKey: null,
    status: "PHASE 2",
  },
];

/**
 * The quant matrix, per design.md Realm 1.
 *
 * Not a page with sections - a screen divided into panels that butt against
 * each other and share their borders. Code workspace top left, analytics top
 * right, execution log below, drill index filling the rest. Every panel holds
 * something true: the source is read off disk, the plot calls the same
 * difficulty functions the games call, and the log is measured during the
 * build.
 */
export default function CompPage() {
  return (
    <Wing wing="comp">
      <header className="flex shrink-0 items-center justify-between border-b border-hairline-strong px-3 py-2">
        <div className="flex items-baseline gap-4">
          <Wordmark />
          <Label>Realm 1 / Quant Matrix</Label>
        </div>
        <div className="flex items-center gap-5 text-[10px] uppercase tracking-[0.18em] text-secondary">
          <Link href="/daily" className="text-rare transition-colors hover:text-primary">
            Daily
          </Link>
          <Link href="/poker" className="transition-colors hover:text-primary">
            Poker Lab
          </Link>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Top band: source on the left, the one plot this product has on the
            right. They share the border between them. */}
        <div className="grid divide-y divide-hairline border-b border-hairline lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:divide-x lg:divide-y-0">
          <CodePanel file="lib/games/equalize.ts" from={226} to={252} />
          <RampPlot />
        </div>

        {/* Second band: the log, and the index it is talking about. */}
        <div className="grid divide-y divide-hairline lg:grid-cols-[minmax(0,1fr)_minmax(0,1.9fr)] lg:divide-x lg:divide-y-0">
          <SystemOutput />

          <div>
            <div className="flex items-baseline justify-between border-b border-hairline px-3 py-1.5">
              <Label>Drill index</Label>
              <Label>5 live / 7 total</Label>
            </div>

            {/* A grid rather than a table, because every live row has to be a
                single link and an anchor cannot wrap a table row. */}
            <div className="text-[11px]">
              <div className="grid grid-cols-[1fr_3.5rem_4.5rem] gap-x-3 border-b border-hairline px-3 py-1.5 text-[9px] uppercase tracking-[0.18em] text-secondary sm:grid-cols-[3rem_1fr_4.5rem_5rem]">
                <span className="hidden sm:block">ID</span>
                <span>Drill</span>
                <span className="text-right">Best</span>
                <span className="text-right">Status</span>
              </div>

              {DRILLS.map((drill) => {
                const row = (
                  <div
                    className={`grid grid-cols-[1fr_3.5rem_4.5rem] items-baseline gap-x-3 border-b border-hairline px-3 py-2 sm:grid-cols-[3rem_1fr_4.5rem_5rem] ${
                      drill.href ? "group hover:bg-accent/10" : "opacity-50"
                    }`}
                  >
                    <span className="tabular hidden text-muted sm:block">{drill.id}</span>
                    <span>
                      <span
                        className={
                          drill.href
                            ? "text-primary transition-colors group-hover:text-accent-ink"
                            : "text-primary"
                        }
                      >
                        {drill.name}
                      </span>
                      <span className="mt-0.5 block text-muted sm:ml-3 sm:mt-0 sm:inline">
                        {drill.skill}
                      </span>
                    </span>
                    <span className="tabular text-right text-primary">
                      {drill.storageKey ? (
                        <BestCell storageKey={drill.storageKey} />
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </span>
                    <span
                      className={`text-right text-[9px] tracking-[0.14em] ${
                        drill.status === "LIVE" ? "text-data-pos" : "text-muted"
                      }`}
                    >
                      {drill.status}
                    </span>
                  </div>
                );

                return drill.href ? (
                  <Link key={drill.id} href={drill.href} className="block">
                    {row}
                  </Link>
                ) : (
                  <div key={drill.id}>{row}</div>
                );
              })}

              <p className="px-3 py-2 text-[9px] text-muted">
                Bests are stored in this browser. There is no account.
              </p>
            </div>
          </div>
        </div>
      </div>

      <SiteFooter />
    </Wing>
  );
}

import Link from "next/link";
import { Wing, Label } from "@/components/Wing";
import { BestCell } from "@/components/game/BestCell";

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
    skill: "Spatial recall, scaling upward from 4×4",
    href: null,
    storageKey: null,
    status: "QUEUED",
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

export default function CompPage() {
  return (
    <Wing wing="comp">
      <header className="flex shrink-0 items-center justify-between border-b border-hairline px-4 py-2">
        <div className="flex items-baseline gap-4">
          <Link href="/" className="text-sm font-medium tracking-tight">
            CMQuant
          </Link>
          <Label>Comp / Computational Thinking</Label>
        </div>
        <Link
          href="/poker"
          className="text-[10px] uppercase tracking-[0.18em] text-secondary transition-colors hover:text-primary"
        >
          Poker Lab
        </Link>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-12">
          <h1 className="text-3xl font-medium tracking-tight">Computational Thinking</h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-secondary">
            Mental calculation, estimation and pattern recognition. Every drill
            runs for sixty seconds and comes out of a seed, so anyone holding that
            seed gets the questions you got, in the order you got them.
          </p>

          <div className="mt-10 flex items-center justify-between border-b border-hairline pb-1.5">
            <Label>Drill index</Label>
            <Label>4 live</Label>
          </div>

          {/* A grid rather than a table, because every live row has to be a
              single link and an anchor cannot wrap a table row. */}
          <div className="text-xs">
            <div className="grid grid-cols-[1fr_3.5rem_4.5rem] gap-x-3 border-b border-hairline py-2 text-secondary sm:grid-cols-[3.5rem_1fr_5rem_5.5rem]">
              {/* The ID column is the first thing to go on a narrow screen - it
                  is a label for the drill, and the name is right beside it. */}
              <span className="hidden sm:block">ID</span>
              <span>Drill</span>
              <span className="text-right">Best</span>
              <span className="text-right">Status</span>
            </div>

            {DRILLS.map((drill) => {
              const row = (
                <div
                  className={`grid grid-cols-[1fr_3.5rem_4.5rem] items-baseline gap-x-3 border-b border-hairline py-3 sm:grid-cols-[3.5rem_1fr_5rem_5.5rem] ${
                    drill.href ? "group hover:bg-white/[0.03]" : "opacity-60"
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
                  <span className="text-right text-primary">
                    {drill.storageKey ? (
                      <BestCell storageKey={drill.storageKey} />
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </span>
                  <span
                    className={`text-right ${
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
          </div>

          <p className="mt-8 text-[11px] leading-relaxed text-muted">
            Bests are stored in this browser only. Nothing is uploaded, and there
            is no account to make.
          </p>
        </div>
      </div>

      <footer className="flex shrink-0 items-center justify-between border-t border-hairline px-4 py-1.5 text-[10px] text-muted">
        <span>CM stands for Computational Mathematics.</span>
        <span>Not affiliated with or endorsed by Carnegie Mellon University.</span>
      </footer>
    </Wing>
  );
}

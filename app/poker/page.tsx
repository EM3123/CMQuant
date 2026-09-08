import { Wing, Panel, Label } from "@/components/Wing";

const TABLES = [
  {
    key: "P",
    name: "Pot Odds",
    line: "Break-even probability from a pot and a bet.",
    status: "Open",
  },
  {
    key: "O",
    name: "Outs",
    line: "Count the cards that still save the hand.",
    status: "Open",
  },
  {
    key: "E",
    name: "Equity",
    line: "Run the hand out, ten thousand times.",
    status: "Phase 2",
  },
  {
    key: "C",
    name: "Combinatorics",
    line: "How many ways can that range contain it.",
    status: "Phase 2",
  },
];

export default function PokerPage() {
  return (
    <Wing wing="poker">
      <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-6 py-14">
        <header className="spotlight text-center">
          <div className="spotlight-glow" />
          <Label>Probability in Practice</Label>
          <h1 className="mt-5 font-display text-6xl font-light tracking-wing text-rare">
            Poker Lab
          </h1>
          <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-secondary">
            No money changes hands here. The cards are a laboratory for
            probability, and the only thing you can lose is an argument about
            equity.
          </p>
        </header>

        <div className="mt-16 grid flex-1 grid-cols-1 gap-5 sm:grid-cols-2">
          {TABLES.map((t) => {
            const open = t.status === "Open";
            return (
              <Panel
                key={t.key}
                className="group relative overflow-hidden p-7 backdrop-blur-md transition-shadow duration-200"
              >
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <h2 className="font-display text-3xl font-light tracking-wing text-primary">
                      {t.name}
                    </h2>
                    <p className="mt-3 max-w-xs text-sm leading-relaxed text-secondary">
                      {t.line}
                    </p>
                  </div>

                  {/* Hotkey. Backlit rather than filled - the red is a light
                      source in this wing, not a paint. */}
                  <kbd
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control border border-accent/45 bg-accent/10 text-sm text-accent-ink shadow-spot"
                    data-numeric
                  >
                    {t.key}
                  </kbd>
                </div>

                <div className="mt-8 flex items-center justify-between">
                  <Label tone={open ? "rare" : "muted"}>{t.status}</Label>
                  <span className="text-xs tracking-wing text-muted" data-numeric>
                    {open ? "60s" : "—"}
                  </span>
                </div>
              </Panel>
            );
          })}
        </div>

        <footer className="mt-16 space-y-2 text-center text-[11px] leading-relaxed text-muted">
          <p>CM stands for Computational Mathematics.</p>
          <p>
            Simulated cards only. No wagering, no prizes, no currency of any
            kind.
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

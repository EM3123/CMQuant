import { Wing, Label } from "@/components/Wing";

const DRILLS = [
  { id: "EQZ", name: "Equalize", skill: "Comparison", best: 4820, status: "LIVE" },
  { id: "FLS", name: "Flash", skill: "Sequential arithmetic", best: 0, status: "QUEUED" },
  { id: "MTL", name: "Memory Tiles", skill: "Spatial recall", best: 0, status: "QUEUED" },
  { id: "APX", name: "Approx", skill: "Estimation", best: 0, status: "PHASE 2" },
  { id: "DST", name: "Distribution", skill: "Statistics", best: 0, status: "PHASE 2" },
  { id: "SIG", name: "Signal", skill: "Pattern recognition", best: 0, status: "PHASE 2" },
];

export default function CompPage() {
  return (
    <Wing wing="comp">
      {/* Top rail */}
      <header className="flex shrink-0 items-center justify-between border-b border-hairline px-4 py-2">
        <div className="flex items-baseline gap-4">
          <span className="text-sm font-medium tracking-tight">CMQuant</span>
          <Label>Comp / Computational Thinking</Label>
        </div>
        <div className="flex items-center gap-6" data-numeric>
          <Readout label="Session" value="00:41:12" />
          <Readout label="Best" value="4,820" />
          <Readout label="Streak" value="7" tone="pos" />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Drill index */}
        <section className="flex min-h-0 w-[420px] shrink-0 flex-col border-r border-hairline">
          <div className="flex shrink-0 items-center justify-between border-b border-hairline px-4 py-1.5">
            <Label>Drill index</Label>
            <Label>6 loaded</Label>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <table className="w-full border-collapse text-xs" data-numeric>
              <thead>
                <tr className="text-secondary">
                  <th className="border-b border-hairline px-4 py-1.5 text-left font-normal">ID</th>
                  <th className="border-b border-hairline py-1.5 text-left font-normal">Drill</th>
                  <th className="border-b border-hairline py-1.5 text-right font-normal">Best</th>
                  <th className="border-b border-hairline px-4 py-1.5 text-right font-normal">St</th>
                </tr>
              </thead>
              <tbody>
                {DRILLS.map((d) => (
                  <tr key={d.id} className="hover:bg-white/[0.03]">
                    <td className="border-b border-hairline px-4 py-2 text-muted">{d.id}</td>
                    <td className="border-b border-hairline py-2">
                      <span className="text-primary">{d.name}</span>
                      <span className="ml-2 text-muted">{d.skill}</span>
                    </td>
                    <td className="border-b border-hairline py-2 text-right">
                      {d.best ? d.best.toLocaleString() : <span className="text-muted">—</span>}
                    </td>
                    <td className="border-b border-hairline px-4 py-2 text-right">
                      <span className={d.status === "LIVE" ? "text-data-pos" : "text-muted"}>
                        {d.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Primary readout */}
        <section className="flex min-h-0 flex-1 flex-col items-center justify-center px-8">
          <Label>Equalize / difficulty 06</Label>
          <div className="mt-8 flex w-full max-w-3xl items-stretch">
            <ExprCell value="47 × 13" />
            <div className="flex w-16 shrink-0 items-center justify-center border-y border-hairline">
              <span className="text-muted text-xs">vs</span>
            </div>
            <ExprCell value="25% of 2460" />
          </div>
          <div className="mt-8 flex items-center gap-8" data-numeric>
            <Key hint="◀" label="Left" />
            <span className="text-6xl text-primary tabular">00:41</span>
            <Key hint="▶" label="Right" />
          </div>
        </section>

        {/* Log */}
        <aside className="flex min-h-0 w-[280px] shrink-0 flex-col border-l border-hairline">
          <div className="shrink-0 border-b border-hairline px-4 py-1.5">
            <Label>Run log</Label>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2 text-[11px] leading-relaxed" data-numeric>
            {[
              ["0.84s", "+186", true],
              ["1.20s", "+171", true],
              ["2.61s", "0", false],
              ["0.91s", "+180", true],
              ["1.44s", "+164", true],
              ["3.02s", "0", false],
              ["0.77s", "+192", true],
            ].map(([t, pts, ok], i) => (
              <div key={i} className="flex justify-between border-b border-hairline py-1">
                <span className="text-muted">{t as string}</span>
                <span className={ok ? "text-data-pos" : "text-data-neg"}>{pts as string}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* Status strip */}
      <footer className="flex shrink-0 items-center justify-between border-t border-hairline px-4 py-1.5 text-[10px] text-muted">
        <span>CM stands for Computational Mathematics.</span>
        <span data-numeric>seed iron-carbide-4821</span>
        <span>Not affiliated with or endorsed by Carnegie Mellon University.</span>
      </footer>
    </Wing>
  );
}

function Readout({ label, value, tone }: { label: string; value: string; tone?: "pos" }) {
  return (
    <div className="flex items-baseline gap-2">
      <Label>{label}</Label>
      <span className={`text-sm tabular ${tone === "pos" ? "text-data-pos" : "text-primary"}`}>
        {value}
      </span>
    </div>
  );
}

function ExprCell({ value }: { value: string }) {
  return (
    <div className="flex flex-1 basis-0 items-center justify-center border border-hairline px-6 py-14">
      {/* Never wrap. An expression that breaks across two lines stops being one
          glanceable quantity, which is the entire skill being trained. */}
      <span className="whitespace-nowrap text-[clamp(1.4rem,3.2vw,2.75rem)] text-primary tabular">
        {value}
      </span>
    </div>
  );
}

function Key({ hint, label }: { hint: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex h-11 w-11 items-center justify-center border border-hairline-strong text-secondary">
        {hint}
      </div>
      <Label>{label}</Label>
    </div>
  );
}

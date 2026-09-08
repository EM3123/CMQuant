import Link from "next/link";
import { Wing } from "@/components/Wing";
import { PotOddsGame } from "@/components/potodds/PotOddsGame";

export default function PotOddsPage() {
  return (
    <Wing wing="poker">
      <div className="flex min-h-dvh flex-col">
        <nav className="flex shrink-0 items-center justify-between px-5 py-3">
          <Link href="/" className="text-sm font-medium tracking-tight">
            CMQuant
          </Link>
          <Link
            href="/poker"
            className="text-[10px] uppercase tracking-[0.3em] text-secondary transition-colors hover:text-rare"
          >
            Poker Lab
          </Link>
        </nav>

        <PotOddsGame />

        <footer className="shrink-0 px-5 py-3 text-center text-[10px] leading-relaxed text-muted">
          Simulated cards only. Nothing can be wagered here and nothing can be cashed out.
        </footer>
      </div>
    </Wing>
  );
}

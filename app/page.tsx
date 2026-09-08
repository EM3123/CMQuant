import Link from "next/link";
import { Wing } from "@/components/Wing";
import { EqualizeGame } from "@/components/equalize/EqualizeGame";

/**
 * The landing page is the game. No wall, no interstitial, no signup between a
 * click and the first question - every second in that gap kills a share.
 */
export default function Home() {
  return (
    <Wing wing="comp">
      <nav className="flex shrink-0 items-center justify-between border-b border-hairline px-4 py-2">
        <span className="text-sm font-medium tracking-tight">CMQuant</span>
        <div className="flex items-center gap-5 text-[10px] uppercase tracking-[0.18em] text-secondary">
          <Link href="/daily" className="text-rare transition-colors hover:text-primary">
            Daily
          </Link>
          <Link href="/comp" className="transition-colors hover:text-primary">
            Comp
          </Link>
          <Link href="/poker" className="transition-colors hover:text-primary">
            Poker Lab
          </Link>
        </div>
      </nav>

      <EqualizeGame />

      <footer className="flex shrink-0 items-center justify-between border-t border-hairline px-4 py-1.5 text-[10px] text-muted">
        <span>CM stands for Computational Mathematics.</span>
        <span>Not affiliated with or endorsed by Carnegie Mellon University.</span>
      </footer>
    </Wing>
  );
}

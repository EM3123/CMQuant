import Link from "next/link";
import { Wing } from "@/components/Wing";
import { EqualizeGame } from "@/components/equalize/EqualizeGame";

export default function EqualizePage() {
  return (
    <Wing wing="comp">
      <nav className="flex shrink-0 items-center justify-between border-b border-hairline px-4 py-2">
        <Link href="/" className="text-sm font-medium tracking-tight">
          CMQuant
        </Link>
        <Link
          href="/comp"
          className="text-[10px] uppercase tracking-[0.18em] text-secondary transition-colors hover:text-primary"
        >
          Comp
        </Link>
      </nav>

      <EqualizeGame />

      <footer className="flex shrink-0 items-center justify-between border-t border-hairline px-4 py-1.5 text-[10px] text-muted">
        <span>CM stands for Computational Mathematics.</span>
        <span>Not affiliated with or endorsed by Carnegie Mellon University.</span>
      </footer>
    </Wing>
  );
}

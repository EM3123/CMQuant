import Link from "next/link";
import { Wing } from "@/components/Wing";
import { SiteFooter } from "@/components/SiteFooter";
import { ApproxGame } from "@/components/approx/ApproxGame";

export default function ApproxPage() {
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

      <ApproxGame />

      <SiteFooter />
    </Wing>
  );
}

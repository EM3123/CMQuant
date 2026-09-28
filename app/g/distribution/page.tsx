import Link from "next/link";
import { Wing } from "@/components/Wing";
import { SiteFooter } from "@/components/SiteFooter";
import { DistributionGame } from "@/components/distribution/DistributionGame";
import { Wordmark } from "@/components/site/Wordmark";

export default function DistributionPage() {
  return (
    <Wing wing="comp">
      <nav className="flex shrink-0 items-center justify-between border-b border-hairline px-4 py-2">
        <Wordmark />
        <Link
          href="/comp"
          className="text-[10px] uppercase tracking-[0.18em] text-secondary transition-colors hover:text-primary"
        >
          Comp
        </Link>
      </nav>

      <DistributionGame />

      <SiteFooter />
    </Wing>
  );
}

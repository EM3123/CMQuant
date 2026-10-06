import Link from "next/link";
import { Wing } from "@/components/Wing";
import { SiteFooter } from "@/components/SiteFooter";
import { MarketSizeGame } from "@/components/marketsize/MarketSizeGame";
import { Wordmark } from "@/components/site/Wordmark";

export default function MarketSizePage() {
  return (
    <Wing wing="consult">
      <nav className="flex shrink-0 items-center justify-between border-b border-hairline px-4 py-2">
        <Wordmark />
        <Link
          href="/consulting"
          className="text-[10px] uppercase tracking-[0.3em] text-secondary transition-colors hover:text-rare"
        >
          Consulting
        </Link>
      </nav>

      <MarketSizeGame />

      <SiteFooter />
    </Wing>
  );
}

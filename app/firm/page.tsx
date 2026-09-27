import type { Metadata } from "next";
import Link from "next/link";
import { Wing } from "@/components/Wing";
import { SiteFooter } from "@/components/SiteFooter";
import { Wordmark } from "@/components/site/Wordmark";
import { AccountLink } from "@/components/account/AccountLink";
import { FirmDashboard } from "@/components/firm/FirmDashboard";

export const metadata: Metadata = {
  title: "My Firm — CMQuant",
  description: "Your rank, level, XP, streaks, personal bests and dragon, in one place.",
};

/**
 * Everything about you, in one place: where you are on the ladder, how XP is
 * earned, what you have done, and the dragon. The level system was spread
 * across the results screen and the daily page, and a number you can only see
 * in passing is a number nobody understands.
 */
export default function FirmPage() {
  return (
    <Wing wing="comp" scroll>
      <nav className="flex shrink-0 items-center justify-between gap-3 border-b border-hairline px-4 py-2">
        <Wordmark />
        <div className="flex items-center gap-3 whitespace-nowrap text-[10px] uppercase tracking-[0.12em] text-secondary sm:gap-5 sm:tracking-[0.18em]">
          <span className="text-accent-ink max-sm:hidden">My Firm</span>
          <Link href="/daily" className="text-rare transition-colors hover:text-primary">
            Daily
          </Link>
          <Link href="/comp" className="transition-colors hover:text-primary">
            Comp
          </Link>
          <Link href="/poker" className="transition-colors hover:text-primary">
            <span className="sm:hidden">Poker</span>
            <span className="max-sm:hidden">Poker Lab</span>
          </Link>
          <AccountLink />
        </div>
      </nav>

      <FirmDashboard />

      <SiteFooter />
    </Wing>
  );
}

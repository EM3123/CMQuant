import type { Metadata } from "next";
import Link from "next/link";
import { Wing } from "@/components/Wing";
import { SiteFooter } from "@/components/SiteFooter";
import { Wordmark } from "@/components/site/Wordmark";
import { AccountPanel } from "@/components/account/AccountPanel";

export const metadata: Metadata = {
  title: "Account — CMQuant",
  description: "Sign in to save your runs and appear on the leaderboards.",
};

export default function AccountPage() {
  return (
    <Wing wing="comp">
      <nav className="flex shrink-0 items-center justify-between border-b border-hairline px-4 py-2">
        <Wordmark />
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

      <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col justify-center overflow-y-auto px-5 py-10">
        <AccountPanel />
      </div>

      <SiteFooter />
    </Wing>
  );
}

import Link from "next/link";
import { Wing } from "@/components/Wing";
import { SiteFooter } from "@/components/SiteFooter";
import { OutsGame } from "@/components/outs/OutsGame";
import { Wordmark } from "@/components/site/Wordmark";

export default function OutsPage() {
  return (
    <Wing wing="poker">
      <div className="flex min-h-dvh flex-col">
        <nav className="flex shrink-0 items-center justify-between px-5 py-3">
          <Wordmark />
          <Link
            href="/poker"
            className="text-[10px] uppercase tracking-[0.3em] text-secondary transition-colors hover:text-rare"
          >
            Poker Lab
          </Link>
        </nav>

        <OutsGame />

        <SiteFooter variant="stack" poker />
      </div>
    </Wing>
  );
}

import Link from "next/link";
import { Wing } from "@/components/Wing";
import { SiteFooter } from "@/components/SiteFooter";
import { PokerMinuteGame } from "@/components/pokerminute/PokerMinuteGame";
import { Wordmark } from "@/components/site/Wordmark";

// `scroll` rather than the fixed canvas every other game uses. The review
// under the results card is as long as the run was, so this page genuinely
// has to grow - and unlike a running round it has no status rail to keep on
// screen, because Poker Minute deliberately has nothing to put in one.
export default function PokerMinutePage() {
  return (
    <Wing wing="poker" scroll>
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

        <PokerMinuteGame />

        <SiteFooter variant="stack" poker />
      </div>
    </Wing>
  );
}

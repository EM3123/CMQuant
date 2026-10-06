import Link from "next/link";
import { Wing, Label } from "@/components/Wing";
import { SiteFooter } from "@/components/SiteFooter";
import { Wordmark } from "@/components/site/Wordmark";
import { BestCell } from "@/components/game/BestCell";
import { AccountLink } from "@/components/account/AccountLink";

/**
 * Realm 3. The case room.
 *
 * WHAT THIS WING IS FOR, AND THE LINE IT DOES NOT CROSS.
 *
 * Comp trains arithmetic you either can or cannot do. Poker Lab attaches a
 * probability to a decision. This wing is about structure: taking a question
 * too big to answer and breaking it into pieces small enough that each one is
 * either known or guessable, then not losing any of them.
 *
 * Which means it refuses the obvious version of itself. A market-sizing game
 * that asks "what is the US waste-management market worth" and grades the
 * answer against a figure off a consultancy press release is asking the
 * player to recall something, and grading them on the authority of a number
 * nobody here can defend. Everything in this wing states its premises on
 * screen and grades the arithmetic that follows from them - the same rule
 * that stops Poker Minute printing solver outputs it cannot compute.
 */

const CASES = [
  {
    id: "MKT",
    name: "Market Size",
    skill: "Chain the decomposition without dropping a line",
    href: "/g/market-size",
    storageKey: "cmquant:marketsize:best",
    status: "LIVE",
  },
  {
    id: "BRK",
    name: "Breakeven",
    skill: "Fixed cost, contribution, and the volume that clears it",
    href: null,
    storageKey: null,
    status: "PHASE 2",
  },
  {
    id: "SEG",
    name: "Segment",
    skill: "Where the profit actually sits inside a mix",
    href: null,
    storageKey: null,
    status: "PHASE 2",
  },
];

const LIVE = CASES.filter((c) => c.href).length;

export default function ConsultingPage() {
  return (
    <Wing wing="consult" scroll>
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-hairline-strong px-3 py-2">
        <div className="flex items-baseline gap-4">
          <Wordmark />
          <Label className="max-sm:hidden">Realm 3 / Case Room</Label>
        </div>
        <div className="flex items-center gap-3 whitespace-nowrap text-[10px] uppercase tracking-[0.12em] text-secondary sm:gap-5 sm:tracking-[0.18em]">
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
          <Link href="/firm" className="transition-colors hover:text-primary">
            <span className="sm:hidden">Firm</span>
            <span className="max-sm:hidden">My Firm</span>
          </Link>
          <AccountLink />
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl">
        <div className="flex items-baseline justify-between border-b border-hairline-strong px-3 pb-2 pt-8">
          <h1 className="font-display text-2xl font-medium uppercase tracking-wing text-primary">
            Consulting
          </h1>
          <Label>
            {LIVE} live / {CASES.length} total
          </Label>
        </div>

        <p className="px-3 pt-4 text-[13px] leading-relaxed text-secondary">
          Estimation under a clock. Every case states its premises on screen —
          nothing here asks you to recall a market figure, because a number this
          site cannot compute is a number it has no business grading you on.
          What it grades is the chain: four or five terms, multiplied out,
          with none dropped and the magnitude intact.
        </p>

        <div className="mt-6 text-sm">
          <div className="grid grid-cols-[1fr_3.5rem_4.5rem] gap-x-3 border-b border-hairline px-3 py-1.5 text-[9px] uppercase tracking-[0.18em] text-secondary sm:grid-cols-[3rem_1fr_4.5rem_5rem]">
            <span className="hidden sm:block">ID</span>
            <span>Case</span>
            <span className="text-right">Best</span>
            <span className="text-right">Status</span>
          </div>

          {CASES.map((item) => {
            const row = (
              <div
                className={`grid grid-cols-[1fr_3.5rem_4.5rem] items-baseline gap-x-3 border-b border-hairline px-3 py-5 sm:grid-cols-[3rem_1fr_4.5rem_5rem] ${
                  item.href ? "group hover:bg-accent/10" : "opacity-50"
                }`}
              >
                <span className="tabular hidden text-muted sm:block">{item.id}</span>
                <span>
                  <span
                    className={
                      item.href
                        ? "text-primary transition-colors group-hover:text-accent-ink"
                        : "text-primary"
                    }
                  >
                    {item.name}
                  </span>
                  <span className="mt-0.5 block text-muted sm:ml-3 sm:mt-0 sm:inline">
                    {item.skill}
                  </span>
                </span>
                <span className="tabular text-right text-primary">
                  {item.storageKey ? (
                    <BestCell storageKey={item.storageKey} />
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </span>
                <span
                  className={`text-right text-[9px] tracking-[0.14em] ${
                    item.status === "LIVE" ? "text-rare" : "text-muted"
                  }`}
                >
                  {item.status}
                </span>
              </div>
            );

            return item.href ? (
              <Link key={item.id} href={item.href} className="block">
                {row}
              </Link>
            ) : (
              <div key={item.id}>{row}</div>
            );
          })}

          <p className="px-3 py-2 text-[9px] text-muted">
            Bests are stored in this browser unless you are signed in.
          </p>
        </div>
      </div>

      <SiteFooter />
    </Wing>
  );
}

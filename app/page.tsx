import Link from "next/link";
import { Wing } from "@/components/Wing";
import { SiteFooter } from "@/components/SiteFooter";
import { Founder } from "@/components/site/Founder";
import { PlaySection } from "@/components/site/PlaySection";
import { ChallengeJump } from "@/components/site/ChallengeJump";
import { BestCell } from "@/components/game/BestCell";

/**
 * Three screens: who built it, a game you can play without deciding to, and
 * everything else that exists.
 *
 * The hero is for people arriving at the front door. Anyone arriving on a
 * challenge link never sees it - ChallengeJump hides it before first paint,
 * because a shared link that opens on an introduction is a link nobody plays.
 */

const GAMES = [
  {
    id: "EQZ",
    name: "Equalize",
    skill: "Compare two expressions without computing either",
    href: "/g/equalize",
    storageKey: "cmquant:equalize:best",
    wing: "Comp",
  },
  {
    id: "FLS",
    name: "Flash",
    skill: "Sequential arithmetic, typed, against the clock",
    href: "/g/flash",
    storageKey: "cmquant:flash:best",
    wing: "Comp",
  },
  {
    id: "APX",
    name: "Approx",
    skill: "Estimation, when precision is wasted effort",
    href: "/g/approx",
    storageKey: "cmquant:approx:best",
    wing: "Comp",
  },
  {
    id: "DMD",
    name: "Doomsday",
    skill: "Name the weekday for any date",
    href: "/g/doomsday",
    storageKey: "cmquant:doomsday:best",
    wing: "Comp",
  },
  {
    id: "MTL",
    name: "Memory Tiles",
    skill: "Spatial recall, on a board that keeps growing",
    href: "/g/memory-tiles",
    storageKey: "cmquant:memorytiles:best",
    wing: "Comp",
  },
  {
    id: "POT",
    name: "Pot Odds",
    skill: "Price a call before the clock runs out",
    href: "/g/pot-odds",
    storageKey: "cmquant:potodds:best",
    wing: "Poker Lab",
  },
  {
    id: "OUT",
    name: "Outs",
    skill: "Count the cards that still save the hand",
    href: "/g/outs",
    storageKey: "cmquant:outs:best",
    wing: "Poker Lab",
  },
];

export default function Home() {
  return (
    <Wing wing="comp" scroll>
      <ChallengeJump />

      <nav className="sticky top-0 z-30 flex shrink-0 items-center justify-between border-b border-hairline bg-surface/85 px-4 py-2 backdrop-blur-md">
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

      {/* ---------------------------------------------------------------- */}
      {/* 1. Who built it                                                   */}
      {/* ---------------------------------------------------------------- */}
      <section
        data-hero
        className="flex min-h-[calc(100dvh-2.5rem)] flex-col items-center justify-center px-6 py-16 text-center"
      >
        <span className="text-[10px] uppercase tracking-[0.3em] text-secondary">
          Computational Mathematics
        </span>
        <h1 className="mt-6 font-display text-6xl font-semibold tracking-tight sm:text-8xl">
          CMQuant
        </h1>
        <p className="mt-7 max-w-xl text-base leading-relaxed text-secondary">
          Sixty-second games for mental arithmetic, estimation and probability.
          Every run comes out of a seed, so you can hand the exact questions you
          played to somebody else and find out who is faster.
        </p>

        <div className="mt-16 flex items-start gap-12 sm:gap-20">
          <Founder
            name="Edmund Michalski"
            role="Runtime, design system, daily"
            linkedin="https://www.linkedin.com/in/edmund-michalski-72b972411/"
            photo="/team/edmund.jpg"
          />
          <Founder
            name="Cameron Jiang"
            role="Generators and verification"
            linkedin="https://www.linkedin.com/in/cameron-jiang-247b60391/"
            photo="/team/cameron.jpg"
          />
        </div>

        <a
          href="#play"
          className="mt-16 flex flex-col items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-secondary transition-colors hover:text-accent-ink"
        >
          Play now
          <span aria-hidden className="text-base">
            ↓
          </span>
        </a>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* 2. The game, right there                                          */}
      {/* ---------------------------------------------------------------- */}
      <section id="play" className="border-t border-hairline">
        <PlaySection />
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* 3. Everything else                                                */}
      {/* ---------------------------------------------------------------- */}
      <section id="games" className="border-t border-hairline px-4 py-20">
        <div className="mx-auto w-full max-w-3xl">
          <span className="text-[10px] uppercase tracking-[0.3em] text-secondary">
            Seven games
          </span>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight">
            The rest of it
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-secondary">
            Five in Comp for arithmetic and recall, two in Poker Lab where the
            same probability gets attached to a decision. Bests are stored in
            this browser and nowhere else.
          </p>

          <div className="mt-10 text-xs">
            <div className="grid grid-cols-[1fr_3.5rem_5rem] gap-x-3 border-b border-hairline py-2 text-secondary sm:grid-cols-[3.5rem_1fr_5rem_5.5rem]">
              <span className="hidden sm:block">ID</span>
              <span>Game</span>
              <span className="text-right">Best</span>
              <span className="text-right">Wing</span>
            </div>

            {GAMES.map((game) => (
              <Link key={game.id} href={game.href} className="block">
                <div className="group grid grid-cols-[1fr_3.5rem_5rem] items-baseline gap-x-3 border-b border-hairline py-3 hover:bg-white/[0.03] sm:grid-cols-[3.5rem_1fr_5rem_5.5rem]">
                  <span className="tabular hidden text-muted sm:block">{game.id}</span>
                  <span>
                    <span className="text-primary transition-colors group-hover:text-accent-ink">
                      {game.name}
                    </span>
                    <span className="mt-0.5 block text-muted sm:ml-3 sm:mt-0 sm:inline">
                      {game.skill}
                    </span>
                  </span>
                  <span className="text-right text-primary">
                    <BestCell storageKey={game.storageKey} />
                  </span>
                  <span
                    className={`text-right ${
                      game.wing === "Poker Lab" ? "text-rare" : "text-muted"
                    }`}
                  >
                    {game.wing}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/daily"
              className="border border-hairline-strong px-7 py-3 text-xs uppercase tracking-[0.18em] text-primary transition-colors hover:border-accent-ink hover:text-accent-ink"
            >
              Today&apos;s challenge
            </Link>
            <Link
              href="/poker"
              className="border border-hairline px-7 py-3 text-xs uppercase tracking-[0.18em] text-secondary transition-colors hover:border-rare hover:text-rare"
            >
              Poker Lab
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </Wing>
  );
}

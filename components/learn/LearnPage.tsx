import Link from "next/link";
import type { ReactNode } from "react";
import { Wing } from "@/components/Wing";
import { SiteFooter } from "@/components/SiteFooter";

/**
 * Shell for the explainer pages.
 *
 * These sit in the poker room rather than in a documentation ghetto, because
 * somebody arrives here after getting a question wrong and should not feel
 * like they left the game to do it.
 */
export function LearnPage({
  eyebrow,
  title,
  standfirst,
  playHref,
  playLabel,
  children,
}: {
  eyebrow: string;
  title: string;
  standfirst: string;
  playHref: string;
  playLabel: string;
  children: ReactNode;
}) {
  return (
    <Wing wing="poker">
      <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-6 py-10">
        <nav className="flex shrink-0 items-center justify-between">
          <Link href="/" className="text-sm font-medium tracking-tight">
            CMQuant
          </Link>
          <Link
            href="/poker"
            className="text-[10px] uppercase tracking-[0.3em] text-secondary transition-colors hover:text-rare"
          >
            Poker Lab
          </Link>
        </nav>

        <header className="mt-16 text-center">
          <span className="text-[10px] uppercase tracking-[0.3em] text-secondary">
            {eyebrow}
          </span>
          <h1 className="mt-4 font-display text-5xl font-light tracking-wing text-rare sm:text-6xl">
            {title}
          </h1>
          <p className="mx-auto mt-6 max-w-lg text-sm leading-relaxed text-secondary">
            {standfirst}
          </p>
        </header>

        <article className="mt-14 space-y-10 text-sm leading-relaxed text-secondary">
          {children}
        </article>

        <div className="mt-14 flex justify-center">
          <Link
            href={playHref}
            className="rounded-control border border-hairline-strong px-12 py-4 text-sm uppercase tracking-[0.3em] text-primary transition-colors hover:border-rare hover:text-rare"
          >
            {playLabel}
          </Link>
        </div>

        <SiteFooter variant="stack" poker />
      </div>
    </Wing>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="font-display text-2xl font-light tracking-wing text-primary">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** A worked line of arithmetic, set apart so it can be read as a step. */
export function Working({ children }: { children: ReactNode }) {
  return (
    <div className="tabular rounded-panel border border-hairline bg-surface-raised/60 px-5 py-4 text-base text-primary">
      {children}
    </div>
  );
}

/** A named error and its correction. Mirrors what the results screen shows. */
export function Mistake({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-l-2 border-accent pl-4">
      <p className="text-sm text-primary">{title}</p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-secondary">{children}</p>
    </div>
  );
}

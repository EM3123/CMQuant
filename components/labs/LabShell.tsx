import Link from "next/link";
import type { ReactNode } from "react";
import { Wing } from "@/components/Wing";
import { SiteFooter } from "@/components/SiteFooter";
import { Wordmark } from "@/components/site/Wordmark";

/**
 * The frame every lab shares: the case room's wing, a title that is the
 * learner's question rather than the formal name, and the model contract panel
 * the teaching document asks every lab to show.
 *
 * Labs are free. The teaching document's release rule is that the free tier
 * must be able to teach something complete, so nothing in this frame is gated.
 */
export function LabShell({
  eyebrow,
  title,
  standfirst,
  nav,
  children,
}: {
  eyebrow: string;
  title: string;
  standfirst: string;
  nav?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Wing wing="consult" scroll>
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-hairline px-4 py-2">
        <Wordmark />
        <div className="flex items-center gap-5 text-[10px] uppercase tracking-[0.16em] text-secondary">
          <Link href="/consulting" className="transition-colors hover:text-primary">
            Consulting
          </Link>
          <Link href="/daily" className="transition-colors hover:text-primary">
            Daily
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-10">
        <span className="text-[10px] uppercase tracking-[0.2em] text-secondary">{eyebrow}</span>
        <h1 className="mt-3 font-display text-2xl font-medium uppercase tracking-wing text-primary sm:text-3xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-secondary">{standfirst}</p>

        {nav && <div className="mt-8">{nav}</div>}

        <div className="mt-8 space-y-10">{children}</div>
      </main>

      <SiteFooter />
    </Wing>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-5 border-t border-hairline pt-8 text-sm leading-relaxed text-secondary">
      <h2 className="text-[11px] uppercase tracking-[0.2em] text-primary">{title}</h2>
      {children}
    </section>
  );
}

export function ContractPanel({ rows }: { rows: [string, string][] }) {
  return (
    <details className="border border-hairline text-[12px]">
      <summary className="cursor-pointer px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-secondary hover:text-primary">
        Model contract
      </summary>
      <dl className="grid gap-px border-t border-hairline bg-hairline sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex flex-col gap-1 bg-surface p-3">
            <dt className="text-[10px] uppercase tracking-[0.14em] text-secondary">{k}</dt>
            <dd className="leading-relaxed text-primary">{v}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

export function Figure({ children }: { children: ReactNode }) {
  return <div className="border border-hairline bg-surface-sunken p-3">{children}</div>;
}

export function Choice({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`w-full border px-4 py-3 text-left text-[13px] leading-snug transition-colors ${
        selected
          ? "border-accent-ink bg-accent/10 text-primary"
          : "border-hairline text-secondary hover:border-hairline-strong hover:text-primary"
      }`}
    >
      {children}
    </button>
  );
}

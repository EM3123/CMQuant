import Link from "next/link";
import type { ReactNode } from "react";
import { Wing } from "@/components/Wing";

/** Shared shell for the legal pages. Plain, readable, and not styled to look
 *  like it hopes you will skip it. */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <Wing wing="comp">
      <nav className="flex shrink-0 items-center justify-between border-b border-hairline px-4 py-2">
        <Link href="/" className="text-sm font-medium tracking-tight">
          CMQuant
        </Link>
        <div className="flex items-center gap-5 text-[10px] uppercase tracking-[0.18em] text-secondary">
          <Link href="/legal/privacy" className="transition-colors hover:text-primary">
            Privacy
          </Link>
          <Link href="/legal/terms" className="transition-colors hover:text-primary">
            Terms
          </Link>
        </div>
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <article className="mx-auto w-full max-w-2xl px-5 py-14">
          <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="tabular mt-2 text-[11px] text-muted">Last updated {updated}</p>
          <div className="legal-prose mt-10 space-y-6 text-sm leading-relaxed text-secondary">
            {children}
          </div>
        </article>
      </div>

      <footer className="flex shrink-0 items-center justify-between border-t border-hairline px-4 py-1.5 text-[10px] text-muted">
        <span>CM stands for Computational Mathematics.</span>
        <span>Not affiliated with or endorsed by Carnegie Mellon University.</span>
      </footer>
    </Wing>
  );
}

export function H2({ children }: { children: ReactNode }) {
  return <h2 className="pt-4 text-base font-medium text-primary">{children}</h2>;
}

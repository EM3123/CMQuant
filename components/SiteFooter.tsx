import Link from "next/link";

/**
 * One footer, used everywhere. It carries three things that are not optional:
 * what CM stands for, the university disclaimer, and the legal links.
 *
 * The "row" variant suits the workbench, where the footer is a status strip.
 * The "stack" variant suits the poker room, which is centred and has more to
 * say about not being a casino.
 */
export function SiteFooter({
  variant = "row",
  poker = false,
}: {
  variant?: "row" | "stack";
  poker?: boolean;
}) {
  const links = (
    <span className="inline-flex gap-3">
      <Link href="/legal/privacy" className="transition-colors hover:text-primary">
        Privacy
      </Link>
      <Link href="/legal/terms" className="transition-colors hover:text-primary">
        Terms
      </Link>
    </span>
  );

  if (variant === "stack") {
    return (
      <footer className="mt-16 space-y-2 text-center text-[11px] leading-relaxed text-muted">
        <p>CM stands for Computational Mathematics.</p>
        {poker && (
          <p>
            Simulated cards only. Nothing can be wagered here and nothing can be
            cashed out.
          </p>
        )}
        <p>
          CMQuant is a student-built project and is not affiliated with or
          endorsed by Carnegie Mellon University.
        </p>
        <p>{links}</p>
      </footer>
    );
  }

  return (
    <footer className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 border-t border-hairline px-4 py-1.5 text-[10px] text-muted">
      <span>CM stands for Computational Mathematics.</span>
      <span className="flex items-center gap-4">
        {links}
        <span className="hidden sm:inline">
          Not affiliated with or endorsed by Carnegie Mellon University.
        </span>
      </span>
    </footer>
  );
}

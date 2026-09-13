import Link from "next/link";
import { DragonMark } from "@/components/site/DragonMark";

/**
 * The wordmark. One component, so it cannot drift between the nav and the hero.
 *
 * It was set in the display serif, which was wrong for two reasons. A serif
 * masthead reads as a newspaper, and this is a terminal - the whole product is
 * numbers in a monospace face against a hairline grid. And it did not survive
 * standing next to the dragon: an ornate mark beside ornate type is two things
 * competing, where an ornate mark beside plain technical type is a pair.
 *
 * So it is the numeric face, uppercase, letterspaced. Same font as every digit
 * on the site, which is the point - the name looks like the thing it names.
 *
 * CM is Computational Mathematics and carries the accent; QUANT is the plain
 * one. That is the only ornament, and it is doing a job rather than decorating.
 *
 * The mark rides in front of it at nav size. It is deliberately NOT in the
 * hero: at 2.6rem the wordmark is already the biggest thing on the page, and a
 * dragon beside it would be two focal points arguing.
 */
export function Wordmark({
  size = "sm",
  href = "/",
}: {
  /** `sm` for navigation, `xl` for the front door. */
  size?: "sm" | "xl";
  /** Pass null to render the mark without wrapping it in a link. */
  href?: string | null;
}) {
  const text =
    size === "xl"
      ? "text-[2.6rem] leading-none tracking-[0.14em] sm:text-7xl"
      : "text-[13px] tracking-[0.2em]";

  const mark = (
    <span className="inline-flex items-center gap-2">
      {size === "sm" && (
        <DragonMark className="h-[18px] w-[18px] shrink-0 text-accent-ink" />
      )}
      <span className={`tabular font-medium ${text}`}>
        <span className="text-accent-ink">CM</span>
        <span className="text-primary">QUANT</span>
      </span>
    </span>
  );

  if (!href) return mark;

  return (
    <Link href={href} className="inline-block transition-opacity hover:opacity-80">
      {mark}
    </Link>
  );
}

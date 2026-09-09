import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * One of the two people who built this.
 *
 * The photo is checked on disk at build time rather than fetched. LinkedIn
 * sits behind auth and rotates its CDN URLs, so hotlinking a headshot from
 * there is a broken image waiting to happen. Drop a file into public/team/ and
 * it appears on the next deploy; until then the monogram stands in, and is
 * designed to look intended rather than missing.
 */
export function Founder({
  name,
  role,
  linkedin,
  photo,
}: {
  name: string;
  role: string;
  linkedin: string;
  /** Path under public/, e.g. "/team/edmund.jpg". */
  photo: string;
}) {
  const hasPhoto = existsSync(join(process.cwd(), "public", photo));
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("");

  return (
    <a
      href={linkedin}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col items-center gap-4 text-center"
    >
      <div className="relative">
        <div className="h-24 w-24 overflow-hidden border border-hairline-strong transition-colors group-hover:border-accent-ink sm:h-28 sm:w-28">
          {hasPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt={name}
              width={112}
              height={112}
              className="h-full w-full object-cover grayscale transition-all duration-300 group-hover:grayscale-0"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-surface-raised">
              <span className="tabular text-2xl text-secondary transition-colors group-hover:text-accent-ink">
                {initials}
              </span>
            </div>
          )}
        </div>
      </div>

      <div>
        <p className="text-sm text-primary transition-colors group-hover:text-accent-ink">
          {name}
        </p>
        <p className="mt-1 text-[11px] text-muted">{role}</p>
        <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-secondary underline underline-offset-4">
          LinkedIn
        </p>
      </div>
    </a>
  );
}

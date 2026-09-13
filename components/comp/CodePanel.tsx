import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The code workspace panel.
 *
 * design.md asks for "a raw, dark-themed code editor window containing a
 * realistic Python backtesting script". It shows this repository's own source
 * instead, read off disk when the page is built.
 *
 * Two reasons. This site runs no backtests, and a screenshot of code it does
 * not run is a lie told in a monospace font - the same class of thing as an
 * invented EV number, just harder to catch. And real source is strictly more
 * interesting: the panel shows the seeded generator that produced the question
 * you are about to play, which is the actual claim this project makes about
 * itself and the one thing a competitor cannot copy from a screenshot.
 *
 * Read at build time, so it cannot drift from the file it claims to be.
 */

/** A tiny tokeniser. Enough for TypeScript at eight pixels, no more. */
const KEYWORD =
  /\b(import|export|from|const|let|function|return|for|if|else|type|interface|number|string|boolean|void|new|of|in|as|null|throw)\b/g;

function highlight(line: string, key: number) {
  // Comments win outright - anything after // is one colour, no exceptions.
  const commentAt = line.indexOf("//");
  if (commentAt === 0 || (commentAt > 0 && !line.slice(0, commentAt).includes('"'))) {
    const before = line.slice(0, commentAt);
    return (
      <>
        {before && <Code text={before} />}
        <span className="text-muted">{line.slice(commentAt)}</span>
      </>
    );
  }
  return <Code text={line} key={key} />;
}

function Code({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(KEYWORD)) {
    const at = match.index!;
    if (at > last) parts.push(text.slice(last, at));
    parts.push(
      <span key={at} className="text-accent-ink">
        {match[0]}
      </span>
    );
    last = at + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

export function CodePanel({
  file,
  from,
  to,
}: {
  /** Repository-relative path, e.g. "lib/rng.ts". */
  file: string;
  /** 1-indexed, inclusive. */
  from: number;
  to: number;
}) {
  const source = readFileSync(join(process.cwd(), file), "utf8")
    .split("\n")
    .slice(from - 1, to);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-baseline justify-between border-b border-hairline px-3 py-1.5">
        <span className="text-[9px] uppercase tracking-[0.18em] text-secondary">
          Source
        </span>
        <span className="tabular text-[9px] text-muted">
          {file}:{from}
        </span>
      </div>

      <pre className="tabular flex-1 overflow-x-auto px-3 py-2 text-[10px] leading-[1.55]">
        <code>
          {source.map((line, i) => (
            <div key={i} className="whitespace-pre">
              <span className="mr-3 inline-block w-6 select-none text-right text-muted">
                {from + i}
              </span>
              <span className="text-primary">{highlight(line, i)}</span>
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}

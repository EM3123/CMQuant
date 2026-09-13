/**
 * The mark. A dragon head, filled, one colour, facing right.
 *
 * Not the engraved dragon from the wallpaper. That one is line art with a
 * ninety-six point body and whiskers, and at the twenty pixels a nav icon
 * actually gets it is a grey smudge. A mark is a different object from an
 * illustration: it has to survive being small, being one colour, and being
 * stamped on a favicon.
 *
 * So this is silhouette only. No line weight to disappear, no interior detail
 * except the eye, and the horn is exaggerated because at small sizes the horn
 * and the snout are the whole of the reading - take either away and it is a
 * bird.
 */
export function DragonMark({
  className = "",
  title,
  style,
}: {
  className?: string;
  /** Give it a title only where it is the sole link content. */
  title?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="currentColor"
      className={className}
      style={style}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title && <title>{title}</title>}
      <path
        fillRule="evenodd"
        d="M14 51 L9 42 L14 34 L0 26 L15 29 L4 12 L19 24 L27 18 L39 18 L51 25 L58 31 L52 35 L36 35 L50 42 L53 45 L45 53 L41 46 L26 48 Z
           M27 23 L34 25 L29 27 Z"
      />
    </svg>
  );
}

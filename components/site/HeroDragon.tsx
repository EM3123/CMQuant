/**
 * The dragon, on the front door, at the edge of visible.
 *
 * This is the artwork from `public/brand/dragon.png` - the chrome dragon with
 * candlesticks down its body, breathing fire at a collapsing chart. It sits
 * behind the wordmark at an opacity where you notice it on the second look and
 * never on the first, which is the only way a detailed illustration can share
 * a screen with type without eating it.
 *
 * Painted as a CSS background rather than an <img> on purpose. If the file is
 * not there yet the layer renders as nothing at all - no broken-image icon, no
 * gap, no console error - so the page is correct before the asset lands and
 * correct after.
 *
 * The mask matters as much as the opacity. Even at 8% a hard-edged rectangle
 * reads as a rectangle; feathering it into the background is what turns the
 * image into part of the room.
 */
export function HeroDragon() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <div
        className="absolute left-1/2 top-1/2 h-[128%] w-[128%] -translate-x-1/2 -translate-y-1/2 opacity-[0.085] mix-blend-screen sm:h-[112%] sm:w-[102%]"
        style={{
          backgroundImage: "url('/brand/dragon.png')",
          backgroundSize: "contain",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          maskImage:
            "radial-gradient(64% 58% at 50% 48%, #000 0%, #000 42%, transparent 88%)",
          WebkitMaskImage:
            "radial-gradient(64% 58% at 50% 48%, #000 0%, #000 42%, transparent 88%)",
        }}
      />
    </div>
  );
}

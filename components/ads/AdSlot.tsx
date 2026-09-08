import { ADS_ENABLED, AD_SLOTS, type AdSlotId } from "@/lib/ads";

/**
 * Renders nothing at all while ads are disabled, which is the current state.
 *
 * The space is reserved by width and height rather than left to the ad to
 * define, so switching ads on does not push content around after first paint.
 * A layout shift on a timed game is worse than an ad.
 */
export function AdSlot({ id, className = "" }: { id: AdSlotId; className?: string }) {
  if (!ADS_ENABLED) return null;

  const slot = AD_SLOTS[id];

  return (
    <div
      className={`mx-auto flex w-full items-center justify-center ${className}`}
      style={{ maxWidth: slot.width, aspectRatio: `${slot.width} / ${slot.height}` }}
      data-ad-slot={id}
    >
      {/* No network is wired up. Until one is, an enabled slot shows its own
          outline so layout can be checked without shipping a tracker. */}
      <div className="flex h-full w-full items-center justify-center border border-dashed border-hairline">
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted">
          Ad slot · {id}
        </span>
      </div>
    </div>
  );
}

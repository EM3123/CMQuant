/**
 * Ad configuration.
 *
 * Nothing here loads a network. The spec puts ads out of scope until traffic
 * exists, and that is still the right call - an ad script on a site with no
 * audience buys a consent banner, a slower first paint and a cheaper-looking
 * product in exchange for approximately nothing.
 *
 * What this file does buy is that turning ads on later is a configuration
 * change rather than a refactor: the slots already exist, already reserve
 * their space, and are already excluded from the places they must never
 * appear.
 *
 * See docs/ads.md before enabling any of it.
 */

/** Off unless the environment says otherwise. */
export const ADS_ENABLED = process.env.NEXT_PUBLIC_ADS_ENABLED === "true";

/**
 * Every slot the site is willing to have. A slot that is not on this list
 * cannot be created ad hoc, which is what stops ads from leaking into the
 * round itself.
 */
export type AdSlotId = "index-footer" | "results-below";

export const AD_SLOTS: Record<AdSlotId, { width: number; height: number; note: string }> = {
  "index-footer": {
    width: 728,
    height: 90,
    note: "Below the drill list on an index page. Never on a page that is mid-round.",
  },
  "results-below": {
    width: 336,
    height: 280,
    note: "Under the results card, below the share buttons, never inside the card itself - the card is the screenshot.",
  },
};

/**
 * Places an ad may never go, recorded here so the reasoning survives the
 * person who had it:
 *
 * - Anywhere on screen during a running round. The product's whole claim is
 *   an unbroken sixty seconds; an ad repaint mid-round breaks the rhythm the
 *   scoring depends on and would make the timer feel unfair.
 * - Inside the results card. The card is the screenshot that spreads the
 *   site. An ad in the frame is an ad in every group chat, and it makes the
 *   thing look cheap at exactly the moment it needs to look good.
 * - The landing page above the fold. The landing page has one job, which is
 *   to be playable before anyone decides to leave.
 */
export const FORBIDDEN = [
  "during a running round",
  "inside the results card",
  "above the fold on the landing page",
] as const;

# Ads

**Status: not running, and not recommended yet.**

The scaffolding exists (`lib/ads.ts`, `components/ads/AdSlot.tsx`) so that
turning ads on is a config change rather than a refactor. Nothing loads a
network. `NEXT_PUBLIC_ADS_ENABLED` is unset, and with it unset `AdSlot` renders
nothing at all.

## Why not now

The spec puts ads out of scope for v1 and says to revisit once traffic exists.
That is still right, and the reasons are worth writing down because they are
easy to forget when a dashboard shows a number:

An ad network on a site with no audience earns roughly nothing and costs four
real things. It adds third-party scripts, which slows the first paint on the
one page whose only job is to be playable immediately. It makes a consent
banner legally necessary where today none is. It makes the product look cheap
at the exact moment it is trying to spread by screenshot. And it removes the
cleanest thing you can currently say about the site, which is that it collects
nothing and talks to nobody.

Sell the room and the archive. That is what the spec says, and a subscription
from twenty people is worth more than display ads from two thousand.

## What turning them on actually costs

**Consent stops being optional.** Today CMQuant sets no cookies, loads no
third-party scripts and sends nothing anywhere, so there is no consent banner
and the privacy policy fits on one screen. An ad network reverses all of that.
Under GDPR and the ePrivacy rules, advertising storage requires opt-in consent
collected *before* the script loads, which means a real consent manager, not a
dismissible bar that loads the tracker anyway. Campus audiences include EU
citizens, so "we are only in Pittsburgh" is not an answer.

**Vercel Hobby stops being allowed.** Hobby is restricted to non-commercial
personal use. Running ads makes the site commercial, so enabling them puts the
project on Pro at $20 per developer seat per month — the same cost floor the
subscription would trigger. Ads therefore need to clear $40 a month before they
are worth anything at all.

**The poker wing is a policy risk.** Google AdSense restricts gambling and
gambling-related content, and the review is not always careful about the
distinction between a probability trainer and a poker site. A wing called Poker
Lab, full of card imagery, is the kind of thing that gets an account limited
rather than a page rejected. Before applying anywhere, assume the poker routes
will need to be excluded, and check whether excluding them leaves enough
inventory to bother.

**The privacy policy and terms both change.** `/legal/privacy` currently states
plainly that there are no cookies, no third parties and no tracking. All three
sentences become false on the day a tag ships, and the page has to change
before it, not after.

## Where slots may go

Two slots are defined, and both sit outside the game:

| Slot | Placement |
| --- | --- |
| `index-footer` | Below the drill list on `/comp` or `/poker` |
| `results-below` | Under the results card, beneath the share buttons |

Sizes are fixed in `AD_SLOTS` and the container reserves the space by aspect
ratio, so enabling ads does not shift content after first paint. A layout shift
on a timed game is worse than an ad.

## Where they may never go

Recorded in `lib/ads.ts` as well, so the reasoning outlives whoever had it.

**Never during a running round.** The product's entire claim is an unbroken
sixty seconds. An ad repainting mid-round breaks the rhythm the scoring depends
on, and would make a timer that is already punishing feel rigged.

**Never inside the results card.** That card is the screenshot that spreads the
site — it is the marketing budget. An ad in the frame is an ad in every group
chat it lands in.

**Never above the fold on the landing page.** The landing page has one job: be
playable before anybody decides to leave.

## If you do it anyway

Order of work, so nothing ships in a state that is quietly unlawful:

1. Consent manager first, with the ad script gated behind an explicit opt-in.
2. Rewrite `/legal/privacy` and `/legal/terms` in the same change.
3. Move to Vercel Pro.
4. Only then add the network script, and only to the two defined slots.
5. Measure the first paint on the landing page before and after. If it moves
   meaningfully, the ads are costing more players than they are earning
   pennies.

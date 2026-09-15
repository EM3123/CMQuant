# Cameron — ads, consent and the legal pages

Everything you need to pick this up. Read `docs/ads.md` after this; it carries
the reasoning, this carries the job.

## Access

Edmund has to do these two. Nothing below works until the first one is done.

1. **Collaborator on `EM3123/CMQuant`.** The repo is private.
2. **Vercel project invite.** Not needed to start — only to see deploys.

## Setup

```bash
git clone https://github.com/EM3123/CMQuant.git && cd CMQuant && npm install && npm run dev
```

No environment variables, no API keys, no `.env` file. Clone and run is the
whole setup. Read [`docs/CONTRIBUTING.md`](CONTRIBUTING.md) before your first
change — the short version is that generators must be pure and seeded, and
difficulty follows the question index and never the player.

Before you push anything:

```bash
npm run verify && npm run lint && npm run build
```

Every push to `main` deploys to production. There is no staging, so that
command is the staging environment.

## Where things stand today

- **Ads are off and load nothing.** `ADS_ENABLED` in `lib/ads.ts` reads
  `NEXT_PUBLIC_ADS_ENABLED`, which is unset everywhere. With it unset, `AdSlot`
  returns `null`.
- **No slot is mounted on any page.** `AdSlot` exists and is imported nowhere.
  Two slot ids are defined with fixed sizes; neither is placed yet.
- **The site currently collects nothing.** No accounts, no cookies, no
  analytics, no third-party scripts. `/legal/privacy` states all three in
  plain language.

To see the slots while you work, make a `.env.local`:

```
NEXT_PUBLIC_ADS_ENABLED=true
```

That renders a dashed outline at the right size in each slot. It still loads no
network. `.env*` is gitignored, so it cannot be committed by accident.

## The first question is not "how do I add AdSense"

It is **should this run ads at all yet**, and `docs/ads.md` argues no. The short
case: an ad network on a site with no audience earns roughly nothing and costs
four real things — a slower first paint on the one page whose job is to be
instantly playable, a legally required consent manager, a cheaper-looking
product at the moment it is trying to spread by screenshot, and the loss of the
cleanest claim the site can currently make, which is that it talks to nobody.

If you think that is wrong, the bar is arithmetic, not vibes. Ads have to clear
**$40 a month before they are worth anything**, because enabling them makes the
project commercial, which puts it on Vercel Pro at $20 per seat for two seats.
Add whatever a consent platform costs. Show that number being cleared and the
decision changes.

A written recommendation with real numbers is a completely acceptable outcome
here. "We should not do this yet, and here is what traffic would have to look
like first" is a finished piece of work.

## Constraints you cannot change without talking to Edmund

Three placement rules, recorded in `lib/ads.ts` so the reasoning outlives
whoever had it:

1. **Never during a running round.** The product's whole claim is an unbroken
   sixty seconds. An ad repainting mid-round breaks the rhythm the scoring
   depends on and makes a punishing timer feel rigged.
2. **Never inside the results card.** That card is the screenshot that spreads
   the site. An ad in the frame is an ad in every group chat it lands in.
3. **Never above the fold on the landing page.** That page has one job: be
   playable before anybody decides to leave.

And four legal or operational ones:

4. **Consent before the script loads.** Under GDPR and ePrivacy, advertising
   storage needs opt-in collected *before* the tag runs. That means a real
   consent manager, not a dismissible bar that loads the tracker anyway. A
   campus audience includes EU citizens, so "we are only in Pittsburgh" is not
   an answer.
5. **The privacy policy and terms change in the same PR as the tag**, not
   after. Three sentences on `/legal/privacy` become false the day a tag ships.
6. **Vercel Hobby to Pro before enabling.** Hobby is non-commercial personal
   use only.
7. **The poker wing is an AdSense policy risk.** Google restricts gambling and
   gambling-adjacent content, and review does not always distinguish a
   probability trainer from a poker site. Assume `/poker` and `/g/pot-odds`,
   `/g/outs`, `/g/combinatorics` may need excluding, then check whether what is
   left is enough inventory to bother with.

## Order of work, if it goes ahead

Nothing ships in a state that is quietly unlawful:

1. Consent manager, with the ad script gated behind an explicit opt-in.
2. Rewrite `/legal/privacy` and `/legal/terms` in the same change.
3. Move the project to Vercel Pro.
4. Only then the network script, and only into the two defined slots.
5. Measure landing-page first paint before and after. If it moves
   meaningfully, the ads are costing more players than they are earning
   pennies.

## The files

| Path | What it is |
| --- | --- |
| `docs/ads.md` | The reasoning. Read it. |
| `lib/ads.ts` | The enable flag, the two slot definitions, the forbidden list |
| `components/ads/AdSlot.tsx` | Renders nothing while disabled, reserves space when on |
| `app/legal/privacy/page.tsx` | The three claims a tag would falsify |
| `app/legal/terms/page.tsx` | Terms |

The two slots that exist:

| Slot | Size | Placement |
| --- | --- | --- |
| `index-footer` | 728×90 | Below the drill list on `/comp` or `/poker` |
| `results-below` | 336×280 | Under the results card, below the share buttons |

Sizes are fixed and the container reserves space by aspect ratio, so switching
ads on does not shift content after first paint. A layout shift on a timed game
is worse than an ad.

## Two things that look like bugs and are not

**`/legal/privacy` says the site loads no external fonts, and that is true.**
The site uses JetBrains Mono through `next/font/google`, which downloads the
font at build time and serves it from our own origin. No request reaches Google
at runtime. Do not "correct" that sentence.

**Browser storage is not a cookie.** Personal bests and the daily result live
in `localStorage`, never leave the device, and are not covered by the consent
rules that cookies are. The privacy page already draws that distinction
carefully. Keep it.

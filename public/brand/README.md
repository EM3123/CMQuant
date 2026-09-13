# Brand assets

## `dragon.png` — required by the landing page

The chrome dragon with candlesticks down its body, breathing fire at a
collapsing chart. Drop it here as `dragon.png` and the landing page picks it up
with no code change.

Until the file exists the hero renders without it. No broken image, no gap, no
error — `HeroDragon` paints it as a CSS background, and a missing background is
simply nothing.

**What it needs to be:**

- PNG, with a transparent background if you have one. On a solid dark rectangle
  the mask still feathers the edges, but transparency is cleaner.
- At least 1600px on the long edge. It renders very large and very faint, and a
  small source shows its pixels once it is blown up.
- Under about 600KB. It is decoration on the first screen anyone sees, so it
  must not be the reason the page is slow.

**Two things worth fixing in the source art.** The ticker text in the
illustration is garbled — it reads "BJIA", "NAEDAQ", "AUA -5%" — and there is a
generator watermark in the bottom right corner. Neither is legible at the
opacity the hero uses, but both are in the file, and the file is what gets
reused on a poster or a card later.

## What does not belong here

Anything from Carnegie Mellon. The wordmark, the seal, the Scottie Dog, the
tartan pattern and the athletic logos are university property. The colours are
not, and the palette uses them.

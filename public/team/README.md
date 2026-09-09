# Headshots

Drop two files here and they appear on the landing page at the next deploy:

    public/team/edmund.jpg
    public/team/cameron.jpg

Until then each person shows a monogram, which is a deliberate design rather
than a broken image.

The photos are checked on disk at build time in `components/site/Founder.tsx`,
so adding them requires a commit — which is the same push that deploys them.

## What to use

Square, at least 400×400. They render at 112px and are cropped with
`object-cover`, so anything close to square is fine and a tall portrait will
lose the top of your head.

They are shown in greyscale and come up to colour on hover, which keeps the
page monochrome until somebody looks at a person.

## Why they are not pulled from LinkedIn

LinkedIn sits behind authentication and rotates its CDN URLs. A hotlinked
headshot is a broken image on a schedule nobody controls, and scraping profile
pages is against their terms. Saving the file is the version that keeps working.

# attunr brand pictures

Made by `npm run brand` from the template `scripts/brand/brand.html`. Don't edit the pictures by hand: change the template, run the command, commit what it wrote. The app's own icons (`src/app/icon.png`, `apple-icon.png`, `favicon.ico`) come from the same run, so they always match. The command needs Playwright in the npx cache, as `npm run video` does.

The word is Outfit semibold (`src/app/_og/outfit-wordmark.ttf`, cut down to its letters) and the seven dots are one per scale degree, as in `src/components/Wordmark.tsx`. The dark ground is `#0b0b0b`.

## logo/

The word over its dots, cut to the content with a margin.

- `logo-on-dark.png`, `logo-on-light.png`: on a flat ground, for places that can't take transparency.
- `logo-light.png`, `logo-dark.png`: transparent. Light ink goes on dark grounds, dark ink on light ones.
- `logo-wide-light.png`, `logo-wide-dark.png`: the dots after the word, for a narrow strip (a header, an email footer).
- `logo-light.svg`, `logo-dark.svg`: the same as vectors. The word is text with the font embedded, so a tool that ignores embedded fonts (Figma, some mail clients) draws it in its own sans. Use the PNGs there.

## mark/

The square tile.

- `mark-1024.png`: square corners, for app stores (iOS cuts its own).
- `mark-512.png`, `mark-192.png`: rounded, for web manifests and anywhere a small square logo goes.
- `favicon-96.png`, `favicon.ico`, `favicon.svg`: the "a" tile for browser tabs.
- `mark.svg`: the tile as a vector, with the same font note as the logo SVGs.

## instagram/

- `profile.png`: 1080×1080. Instagram cuts it to a circle; the word and dots sit well inside it.
- `highlight.png`: 1080×1080, the "a" tile, for story highlight covers.
- `post.png`: 1080×1080, and `story.png`: 1080×1920. The wordmark with the site's line and address, for a post or a story that has no picture of its own. The words are the link preview's (`src/app/opengraph-image.tsx`); change them in both.

## youtube/

- `profile.png`: 800×800, the channel picture. YouTube cuts it to a circle, as Instagram does.
- `banner.png`: 2560×1440, the channel banner. TVs show all of it; phones and computers show only the middle 1546×423, so the words sit there and the rest is the dark ground.
- `watermark.png`: 150×150, the "a" tile, for the branding watermark YouTube puts in a corner of every video.
- `thumbnail.png`: 1280×720, the post picture in 16:9, for a video that has no thumbnail of its own.

## tiktok/

- `profile.png`: 1080×1080, the profile picture. TikTok cuts it to a circle.
- `cover.png`: 1080×1920, the story picture, for a video's cover. Everything sits in the middle, clear of the buttons on the right and the caption at the bottom.

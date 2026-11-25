# Face effects: rules

What it is and where things live: `README.md`. Keep it true in the same commit as a change.

- **Separate from the neck readers**: nothing here imports `neckFx`, and `neckFx` imports nothing from here. A page shows
  `FaceControls` and `FaceView` on their own, whichever neck reader is on. The only link is the video's CSS filter and
  transform, which `FaceView` copies.
- **`model/` stays pure and tested** (no React, no browser): `tsx --test src/features/faceFx/model/*.test.ts`.
- **It imports only** MediaPipe. Pages import it through `index.ts`.
- **It draws, never records**: a page's Export with overlay records the screen it draws on.
- Words: control labels, hints and the status line are interface copy (`design:ux-copy` with "Words about the app" in
  `teaching-voice`).
- Every change: these tests, `npx tsc --noEmit` (ignore `.next/`), eslint on the feature, and a look on both pages (riff
  Take panel and the content record page) with a face in the picture.

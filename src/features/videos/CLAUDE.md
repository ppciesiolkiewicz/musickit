# Videos: rules

What it is and where things live: `README.md`. Keep it true in the same commit as a change.

- `library.ts`, `ref.ts` and `recording.ts` stay pure (no React, no browser) and tested: `tsx --test src/features/videos/*.test.ts` (the cached tsx).
- Imports only shared `@/components` and the recorder's pure `clockTime`. The stage, the studio and the exercises import this feature; it imports none of them (its test reads the video configs through `@/features/teachers/video/model`).
- No camera or microphone prompt without a click (**Start camera**); the recorder lets go of the camera when it closes or a take stops.
- A recording lives in this browser only. Every place that adds one says so; never promise that a shared note plays it elsewhere.
- Every IndexedDB call fails soft (null, `[]`, false), as private windows refuse storage.
- A library entry is offered (palette, prompt) only when `published` names a format that is uploaded. Don't list a format that isn't.
- Words: `title` and `about` are teaching text (`teaching-voice`); the dialog and recorder are interface copy (`design:ux-copy` with "Words about the app").
- Every change: tests, `npx tsc --noEmit` (ignore `.next/`), eslint on the feature.

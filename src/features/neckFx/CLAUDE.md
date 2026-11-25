# Neck effects: rules

What it is and where things live: `README.md`. Keep it true in the same commit as a change.

- **`model/` stays pure and tested** (no React, no browser): `tsx --test src/features/neckFx/model/*.test.ts`.
- **It imports only** `@/lib/chordKit/shapeTools` (`OPEN_MIDI`), `@/features/sound` (`getAudioContext`), `@/features/tuner` (`detectPitch`) and `@/features/rhythm` (`createOnsetDetector`), plus js-aruco2 and MediaPipe. Pages import it through `index.ts`; nothing here imports a page's feature.
- **It draws and listens, never records**: no MediaRecorder here (a page's Export with overlay records the screen it draws on), and the stream it listens to belongs to the page (it never stops its tracks).
- **js-aruco2 loads two ways**: under Turbopack its `AR` is on the module's exports, under webpack on the global; `cv.js` is imported first for webpack. Keep both working.
- Words: control labels and the status line are interface copy (`design:ux-copy` with "Words about the app" in `teaching-voice`).
- Every change: these tests, `npx tsc --noEmit` (ignore `.next/`), eslint on the feature, and a look on both pages (riff Take panel and the content record page).

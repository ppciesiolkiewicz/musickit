# Videos: rules

Branded practice videos rendered from `videos/*.json` with the app's real stage widgets. Behaviour spec: `spec/video.md`. Design: `docs/superpowers/specs/2026-10-27-widget-videos-design.md`.

## Keep it separate
- `model/` is pure (no React, no DOM): it may import `@/features/stage` (subjects, rects), `@/features/theory` and `@/features/instruments/jam/clock`. The caller passes anything app-specific (`pluginIds`), so it never imports the creator or the studio app.
- The render page knows nothing about the script beyond `window.__VIDEO_JOB__` (in) and `window.__video` (out).

## Data
- A config is plain JSON; `parseVideoConfig` is the only way in and fails with `VideoConfigError` naming the bad field (`timeline[1].tune: …`). Never render a config that did not parse.
- Rects are fractions of the frame (0..1), one per layer per format.

## Every change
1. Pure logic in `model/` has tests: `tsx --test src/features/teachers/video/model/*.test.ts` (the cached tsx; `npx tsx` hangs here).
2. `npx tsc --noEmit` (ignore `.next/` lines) and lint.
3. Update `spec/video.md`.

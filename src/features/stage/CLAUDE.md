# Stage: rules

What goes in the teacher studio's 16:9 frame: widget subjects, layers, the palette search and the live widgets. Behaviour spec: `spec/studio.md`. Design: `docs/superpowers/specs/2026-10-19-teacher-studio-design.md`.

## Keep it separate
- May import `@/features/theory`, `@/features/sound`, `@/features/instruments` (public index), the creator's public `index.ts` (the pure model may import `@/features/creator/model/key` directly), `src/lib/chordKit`, `src/components/chordKit`, `@/lib/site` and shared `@/components`.
- Never the looper, the studio page, recording or the editor. Nothing here knows it is being recorded.

## Data
- A layer's `rect` is a **fraction of the frame** (0..1), never pixels. Recording and the editor replay this exact data at any size.
- A `Subject` is plain JSON: saved, recorded in the widget track, replayed. New kind = a case in `Subject`, `sanitiseSubject`, `subjectTitle`, `defaultRect`, the renderer, and a test.
- Key-aware subjects carry their own key. The Key widget's `setStageKey` re-keys them all (`withKey`); chord diagrams never change.
- Camera, screen, the Key widget, the logo and the site address exist at most once (`addSubject`, `sanitiseStage`).

## Renderer
- `StageWidget` turns a subject into a live widget. Keep it injectable (props in, callbacks out, no studio state), so the editor can be handed it to draw the widget track.

## Every change
1. Pure logic in `model/` has tests: `tsx --test src/features/stage/model/*.test.ts` (the cached tsx; `npx tsx` hangs here).
2. `npx tsc --noEmit` (ignore `.next/` lines) and lint.
3. Update `spec/studio.md`.

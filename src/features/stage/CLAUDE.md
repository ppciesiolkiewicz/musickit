# Stage: rules

What goes in the teacher studio's 16:9 frame: widget subjects, layers, the palette search and the live widgets. Behaviour spec: `spec/studio.md`. Design: `docs/superpowers/specs/2026-10-19-teacher-studio-design.md`.

## Keep it separate
- May import `@/features/theory`, `@/features/sound`, `@/features/instruments` (public index), the creator's public `index.ts` (the pure model may import `@/features/creator/model/key` directly), `src/lib/chordKit`, `src/components/chordKit`, `@/features/tuner` (public index), `@/lib/site` and shared `@/components`.
- Never the looper, the studio page, recording or the editor. Nothing here knows it is being recorded.

## Data
- A layer's `rect` is a **fraction of the frame** (0..1), never pixels. Recording and the editor replay this exact data at any size.
- A `Subject` is plain JSON: saved, recorded in the widget track, replayed. New kind = a case in `Subject`, `sanitiseSubject`, `subjectTitle`, `defaultRect`, the renderer, and a test.
- Key-aware subjects carry their own key and the parts of it pinned on the widget (`pinned`: tonic, scale). The Key & scale widget is the master: `setStageKey` moves every widget to it except what is pinned (`withMaster`). A change made on the widget pins what changed (`withOwnKey`); `followMaster` drops the pins. Chord diagrams never change.
- Names (`subjectName`, `subjectTitle`) never carry the master root, only the widget's scale (and a pinned root). The palette ticks a row by `subjectIdentity` (the subject without its key).
- Camera, screen, the Key & scale widget, the tuner, the logo and the site address exist at most once (`addSubject`, `sanitiseStage`).

## Renderer
- The palette's sections and their order are `PALETTE_GROUPS`, subsections a result's `sub`; `groupResults` puts results under them. A new widget is an entry in `entries` (search.ts) with a group, words to find it by and maybe a subsection.
- `StageWidget` turns a subject into a live widget. Keep it injectable (props in, callbacks out, no studio state), so the editor can be handed it to draw the widget track.

## Every change
1. Pure logic in `model/` has tests: `tsx --test src/features/stage/model/*.test.ts` (the cached tsx; `npx tsx` hangs here).
2. `npx tsc --noEmit` (ignore `.next/` lines) and lint.
3. Update `spec/studio.md`.

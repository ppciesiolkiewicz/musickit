# Learning components

The views and the guided player the AI practice plan (`src/features/plan`) draws from. The plan only parses and
migrates; the components, their props and their docs live here.

## Layers

0. `timeline/` pure model: events, degrees, repeats, derived time. No React, no sound.
1. `shapes/` six play-along shapes (`progression`, `two-scales`, `chord-steps`, `arpeggio-part`, `melody`, `solo-over`);
   `expandShape` turns a shape into a timeline.
2. `cues/` voicings, cues, tab and `chordCues`: what to show at each moment; `visibility.ts` (each note hidden, muted,
   normal or highlighted) and `placement.ts` (which box, maybe an octave down, a `placement` asks for). Pure.
3. `play-along/` `PlayAlong` (one clock, tab / notes / neck views), `schedule`, `solo`.
4. `basics/<name>/` the ten basics: `scale-neck`, `chord-shapes`, `staff`, `click-drone`, `backing-band`, `note-finder`,
   `interval-ears`, `arpeggio-neck`, `melody-singer`, `run-singer`. Each has `index.tsx` (the View) and `<name>.props.ts`.
   Shared: `choices.ts`, `arpeggio.ts`, `singer.tsx`.

`docs/` extracts each `@component` props file with the TypeScript compiler API into `docs.generated.json`
(`COMPONENT_DOCS`); a test fails when it is stale. Regenerate with `npm run docs:exercises`.

## Tests

`src/features/exercises/*/*.test.ts` and `*/*/*.test.ts` are in `npm test`.

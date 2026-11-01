# Learning components

The views and the guided player the AI practice plan (`src/features/plan`) draws from. The plan only parses and
migrates; the components, their props and their docs live here.

## Layers

0. `timeline/` pure model: events, degrees, repeats, derived time. No React, no sound.
1. `shapes/` six play-along shapes (`progression`, `two-scales`, `chord-steps`, `arpeggio-part`, `melody`, `solo-over`);
   `expandShape` turns a shape into a timeline.
2. `cues/` voicings, cues, tab and `chordCues`: what to show at each moment; `visibility.ts` (each note hidden, muted,
   normal or highlighted, from two layers: `enable`, the notes in play, and `highlight`, those of interest) and `placement.ts` (which box, maybe an octave down, a `placement` asks for). Pure.
3. `play-along/` `PlayAlong` (one clock, tab / notes / neck views), `schedule`, `solo`. Under single notes over bare
   chords it holds each chord (`withBackingSound`, the `under` prop: chords, drone, none). The neck view is the shared
   `ScaleNeck` with every place of the line at once (the playing chord's enabled notes normal, the highlighted ones
   ringed, the rest muted, the sounding ones lit); the notes view is the shared `SingingStaff`. Both label notes by the label setting and its "count from".
4. `basics/<name>/` the eleven basics: `scale-neck`, `chord-shapes`, `staff`, `click-drone`, `backing-band`, `note-finder`,
   `interval-ears`, `arpeggio-neck`, `melody-singer`, `run-singer` (both with a chord a bar under the tune, worked out
   in `features/theory/melodyChords.ts`; a run announces each new key in its held-Do bar), `strum-along` (a metronome and the chords as boxes,
   one per bar or beat, each holding beat boxes of its strumming pattern, the playing strum lit; its maths in `blocks.ts`). Each has `index.tsx` (the View) and `<name>.props.ts`.
   Shared: `choices.ts`, `arpeggio.ts`, `singer.tsx` (the two singers), `sing-along/` (their player: mute, play, stop and
   mic as icons, a loop set by two markers on a strip of the tune, its passes laid end to end on an endless staff or a
   piano roll that keeps the voice's line; `passes.ts` is the pure model). Three more are stubs with a placeholder view (`stub.tsx`), their
   props final: `finger-pattern`, `picking-drill`, `legato-trill`.

`docs/` extracts each `@component` props file with the TypeScript compiler API into `docs.generated.json`
(`COMPONENT_DOCS`); a test fails when it is stale. Regenerate with `npm run docs:exercises`.

## Tests

`src/features/exercises/*/*.test.ts` and `*/*/*.test.ts` are in `npm test`.

# Backing tracks: rules

Drums, bass and chords played from a chord progression (`/theory/backing`). Layout in `index.ts`.

## Layers (each depends only on the ones above it)
1. **model/** pure, no audio, no React, tested (`backing.test.ts`):
   - `numerals.ts` Roman numerals → chords with tonal. Case is the quality (`i` minor, `vii°`, `iiø7`); tonal's own `Progression.fromRomanNumerals` ignores case, so don't use it.
   - `progressions.ts` the curated list (numerals once, any key at run time; `"V7:2"` = two bars, `"ii7:0.5"` half a bar) and `layOut`.
   - `styles.ts` a style is DATA: drum lanes as step strings, bass and comp hits that name a ROLE (`R`, `3`, `5`, `A` approach…), never a note. `checkStyle` must stay clean for every style (tested).
   - The 4/4 rhythms (drum lanes, bass roles and swing) live in `@/features/instruments/model` `GROOVES` (`sequencer/grooves.ts`), shared with the PracticeBand's groove pick: a 4/4 style takes its drums and bass from `findGroove` and adds its own keys. Change a 4/4 rhythm there, not here. Only the Waltz (3/4) keeps its rhythm in `styles.ts`, as the band is 4/4 only.
   - `arrange.ts` progression + key + style → `NoteEvent`s in beats for one round: swing, bass roles, voice-led chords, fills, notes clipped to their chord. Deterministic.
   - `clock.ts` `TempoClock`: beats ↔ seconds; a tempo change applies from the first unscheduled beat.
   - `song.ts` `Song`: the arrangement repeating, a new one taking over on the next bar line (`restart` for a new progression).
   - `settings.ts` what is chosen and saved, `clampSettings` validates anything.
2. **audio/** `Band` only schedules: it asks `Song` for each window's notes, `TempoClock` for their times, and plays them on `PartVoice`s (`voices.ts`). Every change goes through `band.set(patch)`. Voices and the context are injected (`BandDeps`), so a test or another host can swap them.
3. **ui/** `BackingTrack` (the page: `useBand` with its save in localStorage `musickit.backing`) draws `BackingPlayer` (the player and the audio focus; Space plays and stops it through `useSpaceKey`, so on a page with several the player on screen takes it). A host that sets the band up itself (the plan's `backing-track` tool) calls `useBand({ initial, storageKey: null })` and draws `BackingPlayer` with its step's focus `group`; `useBand` stops the band on unmount.

## Adding things
- **A progression**: one entry in `PROGRESSIONS`; check its chords with `npm run -s theory -- fit <chords>` and that the test "every curated progression parses in every key" passes.
- **A style**: one entry in `STYLES` (lanes must be whole bars, `beatsPerBar` 3 or 4). A 4/4 style's drums and bass come from a groove in `GROOVES` (add one there first); a 3/4 one writes its own. No code changes.
- **A sound**: a new `PartVoice` in `voices.ts`; the band never knows how a part sounds.
- Sound quality: notes are scheduled, never time-stretched; sampled keys go through `scheduleNote` in `@/features/sound`.

## Imports
`@/features/sound` (public index), `@/features/instruments/model` (the drum machine), `@/components/ui`, `@/components/Icon`, `@tonaljs/tonal`. Nothing imports the backing feature's internals: use `index.ts`, or `model.ts` from pure code (no audio, no React).

Run `npx tsx --test src/features/backing/*/*.test.ts`, `npx tsc --noEmit` and lint before committing.

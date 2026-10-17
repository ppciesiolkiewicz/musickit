# Instruments: rules

Instruments shared by the looper and the pages: the Drone and the step sequencers (drum machine, bass synth). Layout in `index.ts`.

- **One sound, many hosts.** Sound and maths (`drone/drone.ts`, `sequencer/*.ts`, `jam/clock.ts`, `jam/rig.ts`) have no React and are re-exported by `model.ts`, the only entry the looper engine (`src/lib/looper`) may import. React pieces come from `index.ts`.
- **Controls own no audio and have no play button.** `DroneControls`, `PatternBar` and `StepGrid` take values and callbacks; the host adds its own parts through slots (`header`, `leading`, `trailing`). The looper starts and stops from its stage circle on the beat; a page (`Jam`) has its own play buttons. Layout follows the space given (container queries), so the same controls fit a page and a looper window.
- **Page host**: `Jam` (`/theory/drone`) is drone, drums and bass on one clock (`JamRig`, read through `useSyncExternalStore`); parts start and stop on the next beat; one big Play all / Stop all (Stop all while any part plays; Space toggles it outside text fields); a tempo change restarts the playing parts together. The bass plays a minor pentatonic in the drone's key (`Sequencer.key`, `bassRootMidi`: every key between E1 and D♯2). Saved in localStorage `musickit.jam` (the old `musickit.drone` is read when there is no jam save).
- Imports only `@/features/sound` and shared components (`Icon`, `controls`). Never the looper, chordKit or the creator.
- New instrument: sound in a no-React file with tests for its maths, exported from `model.ts`; controls that take values and callbacks, exported from `index.ts`; then host it in the looper (an action, saved state) and/or a page.
- Run the tests (`npx tsx --test src/features/instruments/*/*.test.ts src/lib/looper/*.test.ts`), `npx tsc --noEmit` and lint before every commit.

# In-tune instruments on Tone.js

2026-11-12. Status: approved in chat, to plan.

## Why

The singing tools play a note and judge the voice against exact A440 equal temperament. The app's samples (a 2009 Casio SA-10
soundfont rip in `public/instruments`) are not at that pitch: the piano is about +10.5 cents on every note, so a singer who
matches the piano reads sharp, and on the Pro accuracy (±8 cents) can never count as on the note. Several other Casio sounds
are named whole octaves (or a fifth) away from what they sound. The fix is samples that are measured, and played shifted back by
what they measure.

`/dev/pianos` (temporary) compared sample sets and players with `npm run pianos:measure`. Findings that decide this design:

- With a per-note tuning applied, every engine (our buffer player, Tone.js's Sampler, smplr) lands within about 1 cent; without
  it, every library is 5–40 cents off somewhere. The engine does not decide the pitch, the tuning does.
- Tone.js and our player give the same numbers on the same files.
- tonejs-instruments (CC-BY 3.0) is the best set we found; two of its files are on the wrong note (guitar-acoustic D#4 plays
  `Ds3`, guitar-nylon G5 plays `G3`), which the tuning corrects.

## Goals

- Every sampled sound the app plays is within about 1 cent of A440 equal temperament across G2–C6 (the singing range).
- Playback goes through one swappable backend; Tone.js is the one shipped. The user's choice: they like Tone.js most.
- The CREPE pitch model and the piano samples are preloaded, so the first note and the first mic reading are not waiting on a
  download. The user asked for this.
- The 24 MB Casio set leaves the repo.

## Non-goals

- Rewriting git history to drop the old samples from past commits. A separate, planned step once the open branches
  (`worktree-blocks-notes-plan-merge`, `worktree-onboarding-tours`) are merged; it changes every commit hash and needs a force-push.
- New instruments the app does not have today (violin, organ, …), though the dev page measured some.
- Velocity layers, pedal, round robin.

## Anti-goals

- A saved looper project, backing-band style or setting that names an instrument stops playing, or plays silence.
- A visitor on a phone pays megabytes before the page is usable: preloading happens after the page has loaded.
- Pitch "corrected" by a tuning that is wrong: a note whose measurement is unreliable (see the organ on the dev page: the
  detector reads it an octave up) must not be shifted by octaves on the strength of that reading.

## Constraints

- Instrument ids stay as they are (`PIANO`, `CELLO`, `SYNTH_ACCORDION`, …): looper projects, backing styles
  (`src/features/backing/model/styles.ts`), tests and keyboards refer to them.
- Runtime instruments (the sampler's, `registerRuntimeInstrument`, blob URLs, `strict` pads) keep working through the same path.
  (`tasks.txt` #91 may remove the sampler later; until then it is supported.)
- Three callers play samples today, each picking a sample and starting a buffer itself: `engine/player.ts` (live notes),
  `engine/scheduled.ts` (the backing band, scheduled ahead, must stay sample-accurate), `playback/offline.ts` (video renders,
  `OfflineAudioContext`).
- Tone.js loads a Sampler's files through its global context (`Tone.setContext`), whatever context the Sampler is given (found on
  the dev page). An offline render must not take the global context away from live playback.
- `npm run build` cannot fetch Google Fonts here; verify with dev, tsc and tests.

## Decided

- **Backend shape**, as on the dev page: `load(notes?)`, `play(midi, at, seconds, velocity)` plus release and stop for held
  notes, created with `(context, destination, { tuning? })`. `tuning` is optional: the cents each note measures, applied as minus
  that; without it the samples play as recorded.
- **Tone.js** is the shipped backend for live and scheduled notes. Our buffer player stays behind the same shape.
- **Samples come into the repo** under `public/instruments/<ID>/`, as mp3:
  - from tonejs-instruments: piano, sparse (one file every three semitones, G2–C6, about 2.5 MB), cello, flute, bassoon,
    electric guitar (in place of the Casio metal guitar), harmonium (in place of the accordion);
  - for e-piano, honky-tonk, synth brass, synth lead and pop lead: the FluidR3_GM General MIDI soundfont as gleitz renders it
    (CC BY 3.0; MusyngKite and FatBoy are CC BY-SA 3.0, whose share-alike we avoid), the notes needed cut out as plain mp3 files
    so Tone.js plays them like the rest. FluidR3 measures further off than MusyngKite as recorded; the tuning makes that up.
    *(Claude's call.)*
- **Tuning tables** are generated from the shipped files by the measuring script and committed beside the instrument config.
- **Synth accordion** has no replacement in any library: it plays the new accordion sound. *(Claude's call.)*
- **Attribution**: tonejs-instruments and FluidR3_GM are CC BY 3.0; the app credits both (where the app lists credits, or a
  new line in the site footer or about page).
- **Casio files** are deleted in an ordinary commit once nothing plays them.
- **The dev page** (`/dev/pianos`) and its dev dependencies (`smplr`, `node-web-audio-api`) are deleted when this ships; the
  README lists what to remove. `tone` moves to `dependencies`.

## Left to the builder

- Whether offline renders use our buffer player (simplest: no global Tone context involved) or a Tone offline context.
- Where the per-instrument tuning tables live (generated JSON or TS beside `instruments.ts`) and how the measuring script moves
  from the dev page to a lasting `scripts/` tool.
- How notes the detector cannot read reliably are handled: reviewed by ear and pinned, left uncorrected, or the sample replaced.
- Exactly which soundfont notes to cut (a sample every three semitones over each sound's range is the starting point).
- Preloading mechanics: what "after the page has loaded" hooks into, and cache headers for `public/instruments` and
  `public/models`.
- Envelope (attack, release) per instrument, matched to how the Casio ones felt.

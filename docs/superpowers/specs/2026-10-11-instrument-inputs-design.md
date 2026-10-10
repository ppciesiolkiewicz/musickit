# Instrument inputs: controllers + sound generators (design)

Date: 2026-10-11. Status: approved in conversation, awaiting spec review.

## Goal

In the looper, a playable input is one block made of two parts that are separate in the model:

- a **controller** (what you play): Piano, Scale Piano, Soundboard;
- a **sound generator** (what makes the sound): Piano (the built-in sampled catalogue) or Sampler (samples generated with ElevenLabs or dropped as files).

One input = one generator. Any controller works with any generator. The Sampler stops being its own page and becomes the generator of looper inputs. It is a personal tool: no cloud, no export.

Out of scope: hardware (device) inputs, sequencers, MIDI device → virtual controller mapping (later; the Piano keyboard keeps its current MIDI button), cloud persistence, export/import.

## Pairings

| Controller | Piano generator | Sampler generator |
|---|---|---|
| Piano | built-in instrument | one sample, pitched across the keys |
| Scale Piano | built-in instrument | one sample, pitched across the keys |
| Soundboard (N pads) | each pad plays a chosen note | each pad plays its own sample, unpitched |

Every controller emits note events (MIDI note number + velocity). Soundboard pad `i` (0-based) emits note `36 + i`.

## 1. Model and engine (`src/lib/looper`, imports nothing outside itself)

- New strip kind `instrument` replaces `extra` and `scalepiano`. Its state, saved in `musickit.looper.instruments` keyed by source id:
  ```ts
  type Controller = "piano" | "scalepiano" | "soundboard";
  type Generator =
    | { kind: "piano"; instrument: string; padNotes: number[] }          // padNotes: soundboard only
    | { kind: "sampler"; root: number; sample?: string; padSamples: (string | null)[] };
  interface InstrumentState {
    controller: Controller;
    root: number; scale: string; octave: number;   // Scale Piano settings (kept when switching away)
    pads: number;                                   // Soundboard pad count, 1–32, default 8
    generator: Generator;
  }
  ```
  `root` in the sampler generator is the MIDI note the sample sounds at (default 60, C4). Pad arrays are resized to `pads` by the clamp.
- `ScalePiano` (`scalePiano.ts`) is generalised into `InstrumentInput` (`instrument.ts`): state, injected voice, routed nodes (`out`, `toSpeakers`, `toRecord`), `noteOn/noteOff/allOff`, `set(patch)`. Pure logic in `instrumentModel.ts` (tested): `clampInstrument`, `padNote(i)`, resizing pads, switching controller or generator keeping what still applies, `migrateSaves`.
- Voice injection: `VoiceFactory` becomes `(ctx, destination, generator) => NoteVoice` and `NoteVoice` gains `setGenerator(g)`. The engine never touches samples or storage.
- Migration (once on load, pure and tested):
  - each `scalepiano` strip → `instrument {controller: "scalepiano"}` with the same strip id and source id, scale settings kept, generator `piano/<its instrument>` (a `user:` instrument falls back to `PIANO`);
  - the `extra` keyboard strip → `instrument {controller: "piano", generator: piano/PIANO}`, same strip id;
  - patch links, owned buses and rig flags are untouched because ids do not change.
  After migration `extra`, `getExternalSource`, `externalLabel` and `getKeyboardOut` are removed.
- Rigs: `setupKeyboardPiano` and `setupPianos` create instruments and keep their reverb buses. Add input offers Piano, Scale Piano, Soundboard; each new one gets the piano rig.
- Action `instrument.set {id, patch}` (apply, inverse, describe, validate, test) replaces the Scale Piano setter for every change of controller, generator, scale, pad count, pad note, pad sample, sample, root.
- `MAX_INPUTS` counts instruments as before.

## 2. Generators (app side)

All generators are `createPlayer` over an instrument definition; the sampler builds a runtime instrument (`registerRuntimeInstrument`) from the spec.

- Piano: `createPlayer({ instrumentId })`, built-in catalogue. On a Soundboard the voice maps pad note → `padNotes[i]` before the player.
- Sampler pitched: runtime instrument `{ urls: { [noteName(root)]: blobUrl } }`; the player tunes the other notes by playback rate.
- Sampler pads: runtime instrument `{ urls: { [noteName(36+i)]: blobUrl_i } }` with a new `strict: true` option on runtime instruments: a note with no exact sample is silent instead of pitched from a neighbour.
- `makeGeneratorVoice(ctx, dest, generator)` in `src/features/sampler/generatorVoice.ts`: loads blobs from the existing `SamplerStore` (IndexedDB `musickit-sampler`), creates and revokes object URLs, re-registers on `setGenerator`. Injected by `LooperApp` as `createVoice` (the single injection point). The pure spec → runtime-instrument mapping is tested.
- Root detection: `detectRoot(samples: Float32Array, sampleRate)` in `src/features/sampler/detectRoot.ts`: slide windows over the decoded sample, `detectPitch` from `features/tuner/pitch.ts` on each, median of the confident readings, `hzToNote` → MIDI note, or null. The sampler `CLAUDE.md` import rule is widened to allow `features/tuner/pitch`.
- `features/sampler` keeps `server/` (ElevenLabs route, guard, keys) and `store/`. The instruments part of `model/project.ts` is removed: the library is only samples (`SampleMeta` + audio).

## 3. UI

- Input block (`InputBundle`): header shows name, a controller icon and a generator chip ("Piano · Cello", "Sampler · Glass hit"). The edit (pencil) section has a controller picker and a generator picker. Buses, "Output goes to", effects and meter unchanged.
- Play window (`FloatingWindow`, opened from the block as today):
  - Piano → existing `Piano` keyboard given the engine voice (keeps its MIDI button);
  - Scale Piano → existing `ScalePiano`;
  - Soundboard → new `Soundboard` grid of N pads; click/touch plays; computer keys by `KeyboardEvent.code` in rows `1–0`, `Q–P`, `A–L`, `Z–M` (first N); pads light while sounding.
- Generator panel under the keyboard/pads:
  - Piano: instrument select; on a Soundboard a note select per pad.
  - Sampler pitched: sample select (library), root note select, **Detect**, ▶ preview.
  - Sampler pads: each pad shows its sample name and ▶; click opens the sample picker; dropping a file on a pad stores and assigns it.
  - Add sample: prompt + seconds + **Generate** (ElevenLabs via `/api/sampler/generate`), upload button, drop anywhere on the panel, keys / site-password popover (moved from `SamplerApp`). A new sample goes to the library and is assigned to the selected pad or instrument.
  - Library management (rename, delete) inside the sample picker.
- Removed: `/sampler` page, its nav link, `SamplerApp`, `SamplerSync`/`sync.ts`/`bundle.ts`. Instruments made on the old page are not migrated; their samples stay in the library.

## 4. Errors

- Generation fails → the route's fixed message inline (`role="alert"`), nothing assigned.
- File that does not decode → rejected on drop with a message, not stored.
- Sample missing from IndexedDB → that pad or instrument is silent with a warning dot; state kept so re-assigning fixes it.
- Detect finds no confident pitch → "No clear pitch", root unchanged.
- Malformed saves → `clampInstrument` repairs; unknown controller → piano; unknown generator → piano/PIANO.

## 5. Testing

- `instrumentModel.test.ts`: clamp/repair, pad notes, pad resizing, switching, migration of `scalepiano` and `extra` saves (same ids, patch unchanged).
- `actions.test.ts`: `instrument.set` apply / inverse / describe.
- `detectRoot.test.ts`: sines at known pitches, silence, noise.
- `generatorVoice.test.ts`: spec → runtime instrument mapping.
- Type check and lint clean; headless Chromium check that default rigs still sound after migration, a Soundboard pad plays a dropped WAV, a Sampler piano plays pitched. The live ElevenLabs call is not tested without a key; say so.

## 6. Stages (one plan, separate commits, branch `worktree-instrument-inputs`)

1. Model, migration, `instrument.set`. Behaviour identical: keyboard and Scale Pianos run through the new kind.
2. Generator voice (piano, sampler pitched/pads, strict runtime instruments) and `detectRoot`.
3. Soundboard controller, generator panel, Add input entries.
4. Generation/upload in the looper, remove `/sampler`, update `spec/looper.md`, `spec/sampler.md`, `spec/sound.md` and the looper/sampler `CLAUDE.md` rules.

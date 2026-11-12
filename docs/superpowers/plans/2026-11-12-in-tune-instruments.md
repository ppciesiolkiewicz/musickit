# In-tune Instruments on Tone.js Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every sampled sound plays within about 1 cent of A440, through Tone.js behind a swappable backend, from new in-repo samples; the Casio set goes.

**Architecture:** One backend shape (`SampleBackend`) in `src/features/sound/engine/backend.ts` with two implementations: our buffer player (extracted from today's player, scheduler and offline renderer) and Tone.js's `Sampler`. Each built-in instrument carries a tuning table, cents per sample file measured at its own pitch, applied as minus that. Samples are fetched once by a script into `public/instruments/<ID>/`, measured by a second script, and the results committed.

**Tech Stack:** Next.js 16 (read `node_modules/next/dist/docs/` before touching config), TypeScript, Web Audio, `tone` 15, `node-web-audio-api` (dev, for the measuring script), `node:test` via tsx.

**Spec:** `docs/superpowers/specs/2026-11-12-in-tune-instruments-design.md`

## Global Constraints

- Work in a git worktree (the user's request); `next dev --webpack` in worktrees; `npm install` there makes a real node_modules (see the memory notes on worktrees).
- Run tests with the cached tsx: `$(ls ~/.npm/_npx/*/node_modules/.bin/tsx | head -1) --test <files>`; `npx tsx` hangs here. tsc: `node_modules/.bin/tsc --noEmit 2>&1 | grep -v '^.next/'`.
- npm installs need the IPv4 preload (memory `npm-node-network-fix`) and the short-timeout flags from `~/.claude/CLAUDE.md`.
- Instrument ids stay: `PIANO`, `ACCORDION`, `BASSOON`, `CELLO`, `ELEC_PIANO`, `FLUTE`, `HONKY_TONK_PIANO`, `METAL_GUITAR`, `POP_LEAD`, `SYNTH_ACCORDION`, `SYNTH_BRASS`, `SYNTH_LEAD`. Labels may change.
- Runtime instruments (the sampler's: blob URLs, `strict`) keep working, on the buffer backend.
- Offline renders (`renderOffline`) use the buffer backend; nothing there touches Tone's global context.
- Sample sources: tonejs-instruments (CC BY 3.0) for piano, cello, flute, bassoon, guitar-electric (→ `METAL_GUITAR`), harmonium (→ `ACCORDION` and `SYNTH_ACCORDION`); gleitz FluidR3_GM (CC BY 3.0) for `ELEC_PIANO` (electric_piano_1), `HONKY_TONK_PIANO` (honkytonk_piano), `SYNTH_BRASS` (synth_brass_1), `SYNTH_LEAD` (lead_2_sawtooth), `POP_LEAD` (lead_1_square). Never MusyngKite or FatBoy (CC BY-SA).
- One sample every three semitones (C, D#, F#, A) over each source's range, piano included (its keyboards reach octave 0–6; the spec's 2.5 MB G2–C6 estimate becomes about 5 MB for A0–C8).
- A tuning value is never trusted past ±60 cents or when the sample's readings disagree by more than 5 cents: the measuring script stops on it unless the sample is pinned by hand.
- Any words a player reads (the credit line) are written with the `design:ux-copy` skill and "Words about the app" in `teaching-voice` (AGENTS.md).
- Verify on the dev server: a singing page with the mic on and the tuner page against the piano; report what was and wasn't checked.

## Review Focus

- A saved looper project or backing style naming `SYNTH_ACCORDION` or `METAL_GUITAR` plays the new sound, not silence (Task 4 test: every id resolves to a config with samples).
- A note pressed before its samples have loaded still sounds once they arrive, and a note let go before then stays silent (Task 3 test on the backend's `start` returning null before `load`, player keeps its `waiting` set).
- The backing band schedules ahead: a note whose instrument is not loaded returns false and starts the load, as `scheduleNote` does today (Task 3 test).
- A sampler pad (`strict`) with no sample at a note stays silent and is never repitched (Task 2 test).
- A visitor's first page is usable before preloading starts: preloading waits for the `load` event and idle time and only fills the HTTP cache (Task 6 test on `whenIdleAfterLoad`).

---

### Task 1: Tuning-aware sample choice

**Files:**
- Modify: `src/features/sound/engine/notes.ts`
- Test: `src/features/sound/engine/notes.test.ts`

**Interfaces:**
- Produces: `closestSample<T extends { midi: number }>(target: number, samples: readonly T[]): { sample: T; rate: number } | null` (ties now go to the higher sample, as Tone.js does); `pickSample(target, samples, strict?, tuning?: Tuning)` where `export type Tuning = Record<number, number>` (cents each sample file measures off its note, keyed by the sample's MIDI note) and the returned `rate` includes `2 ** (-(tuning?.[sample.midi] ?? 0) / 1200)`; `tunedCents(tuning: Tuning | undefined, sampleMidi: number): number` returns the shift in cents (minus the measured value, 0 when absent).

- [ ] **Step 1: Write the failing tests** in `notes.test.ts`:

```ts
test("a tie goes to the higher sample, as Tone.js picks", () => {
  assert.equal(closestSample(61, [{ midi: 60 }, { midi: 62 }])!.sample.midi, 62);
});
test("a tuning shifts the rate back by the sample's cents", () => {
  const m = pickSample(60, [{ midi: 60 }], false, { 60: 10 })!;
  assert.ok(Math.abs(m.rate - 2 ** (-10 / 1200)) < 1e-12);
  assert.ok(Math.abs(pickSample(62, [{ midi: 60 }], false, { 60: 10 })!.rate - 2 ** (2 / 12) * 2 ** (-10 / 1200)) < 1e-12);
  assert.equal(tunedCents(undefined, 60), 0);
  assert.equal(tunedCents({ 60: -4 }, 60), 4);
});
test("strict ignores no tuning: an exact sample still gets its correction", () => {
  assert.ok(Math.abs(pickSample(38, [{ midi: 38 }], true, { 38: 6 })!.rate - 2 ** (-6 / 1200)) < 1e-12);
});
```

- [ ] **Step 2: Run** `tsx --test src/features/sound/engine/notes.test.ts`. Expected: the three new tests FAIL (tie picks 60; `tunedCents` not exported).
- [ ] **Step 3: Implement** the tie rule (compare `<=` scanning so the higher wins on equal distance), the `tuning` parameter and `tunedCents` in `notes.ts`.
- [ ] **Step 4: Run** the same command. Expected: all pass, the existing three included.
- [ ] **Step 5: Commit** `feat(sound): sample choice takes a tuning; ties go up like Tone.js`.

### Task 2: The backend shape and the buffer backend

**Files:**
- Create: `src/features/sound/engine/backend.ts`, `src/features/sound/engine/backends/buffer.ts`, `src/features/sound/engine/backends/buffer.test.ts`
- Modify: `src/features/sound/engine/instruments.ts` (config gains `tuning?: Tuning`; `getInstrumentConfig` returns it), `src/features/sound/engine/player.ts`, `src/features/sound/engine/scheduled.ts`, `src/features/sound/playback/offline.ts`

**Interfaces:**
- Consumes: Task 1 `pickSample`, `Tuning`.
- Produces, in `backend.ts`:

```ts
export interface NoteRequest { midi: number; at: number; velocity: number; /** held this long, then released; omitted: until release() */ duration?: number }
export interface SoundingNote { /** fade over the instrument's release from `at` */ release(at: number): void; /** cut at `at` */ stop(at: number): void; onEnded(fn: () => void): void }
export interface SampleBackend {
  readonly id: "buffer" | "tone";
  isLoaded(instrumentId: string, midi: number): boolean;
  load(instrumentId: string): Promise<void>;
  /** null: no sample for it (a strict pad) or not loaded yet (call load) */
  start(instrumentId: string, note: NoteRequest, destination: AudioNode): SoundingNote | null;
}
```
- `createBufferBackend(ctx: BaseAudioContext): SampleBackend` in `backends/buffer.ts`, plus the pure `bufferEnvelope(config: { attack: number; release: number }, note: NoteRequest): { points: [time: number, gain: number][]; stopAt: number | null }` that both live and offline use (today's ramps from `player.ts`, `scheduled.ts`, `offline.ts`, one copy).

- [ ] **Step 1: Write the failing tests** in `buffer.test.ts` on `bufferEnvelope`: a held note `{ at: 1, velocity: 0.8 }` with `{ attack: 0, release: 0.3 }` ramps 0 → 0.8 by `1.01` and has `stopAt: null`; a note with `duration: 0.5` adds a hold at 0.8 at `1.5` and a ramp to `0.001` at `1.8`, `stopAt` `1.85`; velocity 0.02 floors at `0.8 * 0.05`. Copy the peak formula from `player.ts:50` (`0.8 * Math.max(0.05, Math.min(1, velocity / 0.8))`).
- [ ] **Step 2: Run** `tsx --test src/features/sound/engine/backends/buffer.test.ts`. Expected: FAIL, module missing.
- [ ] **Step 3: Implement** `backend.ts`, `bufferEnvelope`, `createBufferBackend` (sample bytes via `samples.ts` `loadSample`, choice via `pickSample(midi, instrumentSamples(id), config.strict, config.tuning)`, buffers per context), and make `player.ts` (keep its oscillator fallback, `waiting` set, `SHORTEST_NOTE` rule), `scheduled.ts` and `offline.ts` call it. Behaviour of all three is unchanged.
- [ ] **Step 4: Run** the new test, `tsx --test src/features/sound/engine/*.test.ts src/features/sampler/model/*.test.ts src/lib/looper/*.test.ts`, tsc and eslint on the changed files. Expected: all pass.
- [ ] **Step 5: Check by ear** on `next dev --webpack` (worktree): `/theory/chords` taps, a backing track on `/theory/backing`, a looper sampler pad. Same sound as before.
- [ ] **Step 6: Commit** `refactor(sound): one sample backend shape; buffer backend shared by player, scheduler and offline`.

### Task 3: The Tone.js backend

**Files:**
- Create: `src/features/sound/engine/backends/tone.ts`, `src/features/sound/engine/backends/choose.ts`, `src/features/sound/engine/backends/choose.test.ts`
- Modify: `package.json` (`tone` from devDependencies to dependencies), `player.ts`, `scheduled.ts` (ask `backendFor` instead of the buffer backend directly)

**Interfaces:**
- Consumes: Task 2 `SampleBackend`, `NoteRequest`, `SoundingNote`; Task 1 `tunedCents`, `closestSample`.
- Produces: `createToneBackend(ctx: AudioContext): SampleBackend` (one `Tone.Context` over the app's context set with `Tone.setContext` once; one `Tone.Sampler` per instrument and destination node, `attack`/`release` from the config, plays `hz(midi) * 2 ** (tunedCents(config.tuning, closestSample(midi, samples).sample.midi) / 1200)`; `release(at)` is `triggerRelease(thatHz, at)`); `backendFor(config: { strict: boolean; runtime: boolean }): "buffer" | "tone"` pure, in `choose.ts`, and `liveBackend(instrumentId: string): SampleBackend` there (built-ins → tone, strict or runtime → buffer).

- [ ] **Step 1: Write the failing tests** in `choose.test.ts`: `backendFor({ strict: false, runtime: false })` is `"tone"`; `{ strict: true, runtime: true }` and `{ strict: false, runtime: true }` are `"buffer"`.
- [ ] **Step 2: Run** `tsx --test src/features/sound/engine/backends/choose.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `choose.ts` and `tone.ts`; `getInstrumentConfig` reports `runtime: true` for runtime instruments; move `tone` to dependencies. `scheduleNote` keeps returning false (and starting the load) when `isLoaded` is false.
- [ ] **Step 4: Run** the test, the Task 2 test set, tsc, eslint. Expected: pass.
- [ ] **Step 5: Check by ear** as in Task 2 Step 5, and on `/dev/pianos` the measured table for `piano/own:casio` still matches what the tuner page reads from the app's piano (Casio still in place here).
- [ ] **Step 6: Commit** `feat(sound): Tone.js plays the built-in instruments`.

### Task 4: New samples in the repo

**Files:**
- Create: `scripts/fetch-samples.mts`, `src/features/sound/engine/samples.generated.json`, `src/features/sound/engine/instruments.test.ts`, the files under `public/instruments/<ID>/`
- Modify: `src/features/sound/engine/instruments.ts` (urls and baseUrl from `samples.generated.json`; labels: `METAL_GUITAR` "Electric Guitar", `ACCORDION` "Harmonium", `SYNTH_ACCORDION` keeps its id and plays the harmonium samples)

**Interfaces:**
- Produces: `samples.generated.json` shaped `{ "<ID>": { "baseUrl": "/instruments/<ID>/", "urls": { "C4": "C4.mp3", … }, "source": "tonejs-instruments/<name>" | "FluidR3_GM/<name>" } }`; `scripts/fetch-samples.mts` with a `SOURCES` table (the Global Constraints mapping) that downloads tonejs-instruments mp3s directly and cuts FluidR3 notes out of `https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/<name>-mp3.js` (base64 per note), keeping C, D#, F#, A over each source's range.

- [ ] **Step 1: Write the failing test** in `instruments.test.ts`: for every id in the Global Constraints list, `getInstrumentConfig(id)` has at least 4 samples, every sample file exists under `public/` (`fs.existsSync`), and no url points into the old Casio names (`/pianoC4\.wav|\.wav$/` absent).
- [ ] **Step 2: Run** `tsx --test src/features/sound/engine/instruments.test.ts`. Expected: FAIL (wav urls).
- [ ] **Step 3: Write `fetch-samples.mts`, run it**, wire `instruments.ts` to the JSON. Delete the old Casio files under `public/instruments/*/*.wav` and `*.sfz` in this commit.
- [ ] **Step 4: Run** the test, tsc, and `du -sh public/instruments`. Expected: pass; size printed in the commit body.
- [ ] **Step 5: Commit** `feat(sound): tonejs-instruments and FluidR3 samples replace the Casio set` with the sources and licences in the body.

### Task 5: Measured tuning, committed

**Files:**
- Create: `scripts/measure-samples.mts`, `src/features/sound/engine/tuning.generated.json`, `src/features/sound/engine/tuning.test.ts`
- Modify: `instruments.ts` (each built-in's `tuning` from the JSON; a hand-written `TUNING_PINS: Record<string, Record<number, number>>` that overrides a sample's value), `package.json` (`"samples:measure": "tsx scripts/measure-samples.mts"`)

**Interfaces:**
- Consumes: `detectPitch` (`src/features/tuner/pitch.ts`), `samples.generated.json`; the decoding set-up from `scripts/measure-pianos.mts` (node-web-audio-api globals, the afconvert fallback that deletes its temp folder, the `cjs()` import helper).
- Produces: `tuning.generated.json` shaped `{ "<ID>": { "<sampleMidi>": cents } }` with one decimal; the script reads each sample at its own pitch (rate 1) at 0.2, 0.4 and 0.6 s, takes the median, and exits non-zero listing every sample whose readings spread more than 5 cents or whose median is past ±60, unless `TUNING_PINS` covers it.

- [ ] **Step 1: Write the failing test** in `tuning.test.ts`: every sample of every built-in has a tuning value (pinned or measured); every value is within ±60.
- [ ] **Step 2: Run** `tsx --test src/features/sound/engine/tuning.test.ts`. Expected: FAIL (no JSON yet).
- [ ] **Step 3: Write and run** `npm run samples:measure`. Listen to each sample it refuses (on `/dev/pianos` or by file) and either pin it with the value heard against the exact tone, or drop that sample from `SOURCES` and refetch.
- [ ] **Step 4: Run** the test, the Task 1–4 tests, tsc. Expected: pass. Then on `/dev/pianos` add the app's own `PIANO` as a backend row, `npm run pianos:measure -- piano/` and check corrected worst ≤ ±1 cent.
- [ ] **Step 5: Commit** `feat(sound): every built-in sample plays at its measured pitch`.

### Task 6: Preload the pitch model and the piano

**Files:**
- Create: `src/features/sound/engine/preload.ts`, `src/features/sound/engine/preload.test.ts`, `src/components/SoundPreload.tsx`
- Modify: the root layout (mount `SoundPreload` once), `next.config.*` (cache headers: `/instruments/:path*` and `/models/:path*` → `public, max-age=604800, stale-while-revalidate=86400`; read the Next 16 docs on `headers()` first)

**Interfaces:**
- Produces: `whenIdleAfterLoad(win: Pick<Window, "addEventListener" | "requestIdleCallback" | "setTimeout"> & { document: { readyState: string } }, run: () => void): void` (waits for `load` when not complete, then `requestIdleCallback` with a 2 s timeout, or `setTimeout(run, 1500)` without it); `warmCaches(urls: string[]): Promise<void>` (plain `fetch`, no decoding, no AudioContext); the URL list is the piano's sample urls plus `/models/crepe/model.json` and its weight shards (read from `model.json`'s `weightsManifest`), and `import("@tensorflow/tfjs")` to fetch its chunk.

- [ ] **Step 1: Write the failing tests** in `preload.test.ts` with a fake window: not loaded → nothing runs until `load` fires, then `requestIdleCallback` is called with `{ timeout: 2000 }`; already complete and no `requestIdleCallback` → `setTimeout(run, 1500)`.
- [ ] **Step 2: Run** `tsx --test src/features/sound/engine/preload.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `preload.ts`, `SoundPreload` (client, renders nothing, runs once per page load), the layout mount and the headers.
- [ ] **Step 4: Run** the test, tsc, eslint; on the dev server open `/` with the network panel: the piano mp3s and crepe shards load after `load`, and a later `/theory/singing` mic start shows them from cache.
- [ ] **Step 5: Commit** `feat(sound): preload the pitch model and the piano after the page loads`.

### Task 7: Credit, clean-up, docs

**Files:**
- Modify: the site footer or about page (credit line), `package.json` (drop `smplr`; keep `node-web-audio-api` for `samples:measure`; drop `pianos:measure`), `src/features/devtools/registry.ts`, `src/features/devtools/README.md`, `src/features/sound/index.ts` header comment
- Delete: `src/app/dev/pianos/`, `src/features/devtools/pianos/`, `scripts/measure-pianos.mts`

- [ ] **Step 1: Write the credit line** with `design:ux-copy` + `teaching-voice` "Words about the app": names tonejs-instruments (nbrosowsky) and the Fluid R3 GM soundfont, CC BY 3.0, with links. Report the string.
- [ ] **Step 2: Delete** the dev page and its pieces as listed; update the sound module's header comment (backends, tuning, the two scripts) and the devtools README.
- [ ] **Step 3: Run** the whole `npm test` file list with the cached tsx, tsc, eslint on changed files. Expected: pass except the 3 known failures in `teachers/studio/notes.test.ts` (memory `notes-tests-failing-on-main`).
- [ ] **Step 4: Check on the dev server:** `/tuner` reads the app's piano (a tap on a keyboard page) within ±2 cents; `/theory/singing` with the mic: matching the piano lands on the note at Pro (±8); a backing track and a saved looper project play.
- [ ] **Step 5: Commit** `chore(sound): credit the samples; remove the instrument tuning dev page`.

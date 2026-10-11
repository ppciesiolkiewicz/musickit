# Instrument Inputs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the looper's keyboard and Scale Piano strips into one `instrument` input kind (controller + sound generator), add a Soundboard controller and a Sampler generator fed by ElevenLabs or dropped files, and retire the `/sampler` page.

**Architecture:** The looper engine (`src/lib/looper`, imports nothing outside itself) owns the saved state (`instrumentModel.ts`, pure) and the routed nodes (`instrument.ts`). It tells an injected voice what to play through a plain `VoiceSpec` (built-in instrument, one pitched sample, or one sample per pad). The app injects `makeGeneratorVoice` from `features/sampler`, which turns a spec into a sample player over a runtime instrument built from the IndexedDB sample library. The UI is looper components plus a few sampler components that know only about samples.

**Tech Stack:** Next.js 16 (App Router, read `node_modules/next/dist/docs/` before touching routing), React 19, TypeScript, Web Audio, IndexedDB, `node:test` via `npx tsx --test`.

**Spec:** `docs/superpowers/specs/2026-10-11-instrument-inputs-design.md` (section 7 records main's later changes: shared controls, themes, the instrument header in the strip, and the `VoiceSpec` correction)

**Base:** branch `worktree-instrument-inputs` rebased on main `520121e`. Line references below were taken before that rebase: locate code by the quoted snippets, not by line numbers. `LooperApp` now renders `InputsMini` only in Canvas (`widgetMode`) and `FreeBoard` has no `resetSignal` prop.

## Global Constraints

- `src/lib/looper/*` imports nothing outside `src/lib/looper` (no `@/…`, no React).
- `features/sampler` imports only `@/features/sound`, `@/features/tuner/pitch` (pure) and shared components. It never imports the looper. Looper UI may import the public index `@/features/sampler` (rule widened in Task 13).
- Every user-driven state change goes through `engine.do(action)`. New control = new action (apply, inverse, describe, validate, test).
- localStorage reads and writes are wrapped in try/catch, validated on load, and old saves keep loading.
- Spec section 7 applies: buttons use `src/components/controls.ts` (`ibtn` 32 px toolbars, `sbtn` 28 px panels, `tbtn` 24 px dense rows, `btnSm` small text button); any slider is `@/components/Slider`; colours are Tailwind theme scales or `var(--color-…)`, never hex. Check new UI in at least the Dark and Light themes.
- Buttons, selects and sliders are not tabbable (`tabIndex={-1}` on pads; `NoControlFocus` handles the rest); text and number fields take focus. Toggles use `aria-pressed`; errors use `role="alert"`. Icons via the shared `Icon` (no emoji, no new dependency).
- Keyboard handling uses `KeyboardEvent.code` and ignores events while typing in INPUT/SELECT/TEXTAREA/contentEditable.
- Soundboard pad `i` (0-based) emits MIDI note `36 + i`. Pads: 1–32, default 8. Sampler root default 60 (C4).
- Keys never reach the browser bundle; provider errors are never forwarded (unchanged server code).
- Commits end with:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: 8f914b0e-a6e3-44b1-a0af-379ebfbc23d7
  ```
  Work stays on branch `worktree-instrument-inputs` in `.claude/worktrees/instrument-inputs`. Do not push to `main` (merging is decided at the end).
- Before each commit: `npm test` passes, `npx tsc --noEmit` is clean, `npm run lint` is clean.

## Review Focus

1. **An old project whose Scale Piano used a sampler instrument (`user:…`)** → it opens playing the built-in Piano, not silence or an oscillator. Test: Task 1 `migrateSaves` case.
2. **A sample deleted from the library while an instrument or pad still points at it** → that instrument or pad is silent (no triangle-wave beep) and shows a warning dot. Tests: Task 6 `pickSample` strict cases, Task 7 `runtimeFor` with a missing url.
3. **Lowering the pad count, then undoing** → the pads that were cut off come back with their notes and samples. Test: Task 3 inverse of `{ pads }`.
4. **Typing in a text field (prompt, sample name) while the Soundboard window is open** → no pad sounds. Test: Task 13 headless check types into the prompt field and asserts no sample started.
5. **Loading a project twice** → migration runs once; a second load changes nothing, and new projects are never "migrated". Test: Task 1 idempotence case.

---

## File map

Create:
- `src/lib/looper/instrumentModel.ts` (+ `.test.ts`): types, defaults, `clampInstrument`, `withGenerator`, `soundingNote`, `voiceSpec`, `migrateSaves`, pad keys.
- `src/lib/looper/instrument.ts` (+ `.test.ts`): `InstrumentInput`, `NoteVoice`, `VoiceFactory`. Replaces `scalePiano.ts`.
- `src/components/looper/InstrumentPanel.tsx`: the play window (controller + generator panel). Replaces `ScalePianoPanel.tsx`.
- `src/components/looper/GeneratorPanel.tsx`: generator settings in the play window (sound, pad count, pad notes, sample, root, Detect, pad samples, adding samples).
- `src/components/looper/InstrumentEdit.tsx`: the controller and generator pickers behind the strip's pencil (spec section 7).
- `src/components/looper/Soundboard.tsx`: the pad grid.
- `src/components/looper/instrumentView.ts`: controller icons, generator chip text, missing-sample check.
- `src/features/sampler/model/sound.ts` (+ `.test.ts`): `SoundSpec`, `runtimeFor`, `sampleIds`.
- `src/features/sampler/model/detectRoot.ts` (+ `.test.ts`).
- `src/features/sampler/sampleUrls.ts`: object-url cache per sample id.
- `src/features/sampler/generatorVoice.ts`: `makeGeneratorVoice`.
- `src/features/sampler/library.ts`: shared sample library store + `useSampleLibrary`, `previewSample`, `detectSampleRoot`.
- `src/features/sampler/SamplePicker.tsx`, `src/features/sampler/AddSample.tsx`, `src/features/sampler/settings.ts`.

Modify: `src/lib/looper/{engine,mixer,actions,actions.test,patch,patch.test,script}.ts`, `src/features/sound/{engine/runtime,engine/instruments,engine/player,engine/notes,engine/notes.test,keyboard/Piano,keyboard/ScalePiano}.ts(x)`, `src/components/looper/{LooperApp,Mixer,InputsMini,FreeBoard}.tsx`, `src/components/PageShell.tsx`, `src/features/sampler/{index,model/project,model/types,model/project.test}.ts`, specs and CLAUDE.md files.

Delete: `src/lib/looper/scalePiano.ts`, `src/lib/looper/scalePiano.test.ts`, `src/components/looper/ScalePianoPanel.tsx`, `src/app/sampler/page.tsx`, `src/features/sampler/{SamplerApp.tsx,SamplerSync.tsx,sync.ts,bundle.ts,useSampler.ts}`.

---

## Stage 1: model, migration, `instrument.set` (behaviour identical)

### Task 1: Instrument model (pure)

**Files:**
- Create: `src/lib/looper/instrumentModel.ts`
- Test: `src/lib/looper/instrumentModel.test.ts`

**Interfaces:**
- Produces:
  - `type Controller = "piano" | "scalepiano" | "soundboard"`, `CONTROLLERS: Controller[]`, `CONTROLLER_NAMES: Record<Controller, string>`
  - `type Generator = { kind: "piano"; instrument: string; padNotes: number[] } | { kind: "sampler"; root: number; sample?: string; padSamples: (string | null)[] }`
  - `interface InstrumentState { controller; root; scale; octave; pads; generator }`
  - `type VoiceSpec = { kind: "piano"; instrument: string } | { kind: "pitched"; sample: string | null; root: number } | { kind: "pads"; samples: (string | null)[] }`
  - `PAD_BASE = 36`, `MIN_PADS = 1`, `MAX_PADS = 32`, `DEFAULT_PADS = 8`, `PAD_KEYS: string[]`
  - `defaultGenerator(kind, pads): Generator`, `DEFAULT_INSTRUMENT_STATE`, `clampInstrument(raw: unknown): InstrumentState`, `withGenerator(s, kind): InstrumentState`, `soundingNote(s, midi): number | null`, `voiceSpec(s): VoiceSpec`, `padIndexOf(code, pads): number | null`, `migrateSaves(o): { inputs: Record<string, unknown>[]; instruments: Record<string, InstrumentState> } | null`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/looper/instrumentModel.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { PAD_BASE, clampInstrument, migrateSaves, padIndexOf, soundingNote, voiceSpec, withGenerator } from "./instrumentModel";

test("malformed state is repaired; unknown controller and generator fall back to the piano", () => {
  const s = clampInstrument({ controller: "harp", root: 14, scale: "", octave: 99, pads: 0, generator: { kind: "theremin" } });
  assert.equal(s.controller, "piano");
  assert.equal(s.root, 2);
  assert.equal(s.scale, "major");
  assert.equal(s.octave, 6);
  assert.equal(s.pads, 1);
  assert.deepEqual(s.generator, { kind: "piano", instrument: "PIANO", padNotes: [60] });
  assert.deepEqual(clampInstrument(undefined).generator, { kind: "piano", instrument: "PIANO", padNotes: [60, 61, 62, 63, 64, 65, 66, 67] });
});

test("pad arrays follow the pad count, keeping what fits", () => {
  const s = clampInstrument({ pads: 3, generator: { kind: "sampler", root: 200, sample: "a", padSamples: ["x", 5, null, "y", "z"] } });
  assert.deepEqual(s.generator, { kind: "sampler", root: 60, sample: "a", padSamples: ["x", null, null] });
  const grown = clampInstrument({ ...s, pads: 5 });
  assert.deepEqual(grown.generator.kind === "sampler" && grown.generator.padSamples, ["x", null, null, null, null]);
  assert.equal(clampInstrument({ pads: 99 }).pads, 32);
});

test("switching the generator starts a fresh one; switching the controller keeps everything", () => {
  const s = clampInstrument({ controller: "scalepiano", root: 5, generator: { kind: "piano", instrument: "CELLO" } });
  assert.equal(withGenerator(s, "piano"), s);
  const sam = withGenerator(s, "sampler");
  assert.deepEqual(sam.generator, { kind: "sampler", root: 60, padSamples: Array(8).fill(null) });
  assert.equal(sam.root, 5);
  const board = clampInstrument({ ...s, controller: "soundboard" });
  assert.equal(board.root, 5);
  assert.deepEqual(board.generator, s.generator);
});

test("the note that sounds: keys pass through, pads map on a piano and stay pad notes on a sampler", () => {
  const keys = clampInstrument({ controller: "scalepiano" });
  assert.equal(soundingNote(keys, 61), 61);
  const board = clampInstrument({ controller: "soundboard", pads: 2, generator: { kind: "piano", instrument: "PIANO", padNotes: [48, 72] } });
  assert.equal(soundingNote(board, PAD_BASE), 48);
  assert.equal(soundingNote(board, PAD_BASE + 1), 72);
  assert.equal(soundingNote(board, PAD_BASE + 2), null);
  assert.equal(soundingNote(board, PAD_BASE - 1), null);
  const pads = withGenerator(board, "sampler");
  assert.equal(soundingNote(pads, PAD_BASE + 1), PAD_BASE + 1);
});

test("what the voice plays", () => {
  assert.deepEqual(voiceSpec(clampInstrument({ generator: { kind: "piano", instrument: "FLUTE" } })), { kind: "piano", instrument: "FLUTE" });
  assert.deepEqual(voiceSpec(clampInstrument({ controller: "piano", generator: { kind: "sampler", root: 57, sample: "s1" } })), { kind: "pitched", sample: "s1", root: 57 });
  assert.deepEqual(voiceSpec(clampInstrument({ controller: "scalepiano", generator: { kind: "sampler" } })), { kind: "pitched", sample: null, root: 60 });
  assert.deepEqual(voiceSpec(clampInstrument({ controller: "soundboard", pads: 2, generator: { kind: "sampler", padSamples: ["a", null] } })), { kind: "pads", samples: ["a", null] });
});

test("pad keys: number row, then Q, A and Z rows, only up to the pad count", () => {
  assert.equal(padIndexOf("Digit1", 8), 0);
  assert.equal(padIndexOf("Digit0", 10), 9);
  assert.equal(padIndexOf("KeyQ", 11), 10);
  assert.equal(padIndexOf("KeyQ", 8), null);
  assert.equal(padIndexOf("KeyM", 32), null); // the 36th key is past 32 pads
  assert.equal(padIndexOf("Space", 32), null);
});

test("old saves: Scale Pianos and the keyboard become instruments with the same strip ids", () => {
  const inputs = [
    { id: 0, kind: "device", name: "Guitar", deviceId: "d", mode: "left", volume: 1 },
    { id: 3, kind: "extra", name: "Piano", deviceId: "", mode: "stereo", volume: 0.7 },
    { id: 4, kind: "scalepiano", sourceId: "p2", name: "Piano C major", deviceId: "", mode: "stereo", volume: 1 },
    { id: 5, kind: "scalepiano", sourceId: "p1", name: "Old", deviceId: "", mode: "stereo", volume: 1 },
  ];
  const scalePianos = { p2: { root: 2, scale: "dorian", octave: 4, instrument: "CELLO" }, p1: { instrument: "user:abc" } };
  const m = migrateSaves({ inputs, scalePianos, instruments: null })!;
  assert.deepEqual(m.inputs.map((s) => [s.id, s.kind, s.sourceId]), [[0, "device", undefined], [3, "instrument", "p3"], [4, "instrument", "p2"], [5, "instrument", "p1"]]);
  assert.equal(m.inputs[1].volume, 0.7);
  assert.equal(m.instruments.p3.controller, "piano");
  assert.deepEqual([m.instruments.p2.controller, m.instruments.p2.root, m.instruments.p2.scale, m.instruments.p2.octave], ["scalepiano", 2, "dorian", 4]);
  assert.deepEqual(m.instruments.p2.generator, { kind: "piano", instrument: "CELLO", padNotes: [60, 61, 62, 63, 64, 65, 66, 67] });
  // a sampler instrument from the old page is gone: the built-in piano plays instead
  assert.equal(m.instruments.p1.generator.kind === "piano" && m.instruments.p1.generator.instrument, "PIANO");
});

test("migration runs once: migrated or new saves are left alone", () => {
  const first = migrateSaves({ inputs: [{ id: 1, kind: "extra", name: "Piano" }], scalePianos: null, instruments: null })!;
  assert.equal(migrateSaves({ inputs: first.inputs, scalePianos: null, instruments: first.instruments }), null);
  assert.equal(migrateSaves({ inputs: [{ id: 0, kind: "device", name: "G" }], scalePianos: null, instruments: null }), null);
  assert.equal(migrateSaves({ inputs: null, scalePianos: null, instruments: null }), null);
  assert.equal(migrateSaves({ inputs: "junk", scalePianos: null, instruments: null }), null);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx tsx --test src/lib/looper/instrumentModel.test.ts`
Expected: FAIL, cannot find module `./instrumentModel`.

- [ ] **Step 3: Implement**

```ts
// src/lib/looper/instrumentModel.ts
/**
 * Instrument inputs: a controller (what you play: Piano, Scale Piano, Soundboard) and a sound generator (what makes the sound:
 * the built-in sampled Piano catalogue, or the Sampler). Pure: the saved state and its repair, which note sounds, what the
 * injected voice must play, and the move from the old `extra` and `scalepiano` strips. Imports nothing outside src/lib/looper.
 */

export type Controller = "piano" | "scalepiano" | "soundboard";
export const CONTROLLERS: Controller[] = ["piano", "scalepiano", "soundboard"];
export const CONTROLLER_NAMES: Record<Controller, string> = { piano: "Piano", scalepiano: "Scale Piano", soundboard: "Soundboard" };

export type Generator =
  /** an instrument id of the app's sound engine; `padNotes[i]` is the note pad i plays on a Soundboard */
  | { kind: "piano"; instrument: string; padNotes: number[] }
  /** `root` is the MIDI note `sample` sounds at; `padSamples[i]` is the sample of pad i (a sample id of the app's library) */
  | { kind: "sampler"; root: number; sample?: string; padSamples: (string | null)[] };

export interface InstrumentState {
  controller: Controller;
  /** Scale Piano settings, kept while another controller is chosen: key (0 = C), scale id, octave of the bottom row */
  root: number;
  scale: string;
  octave: number;
  /** Soundboard pad count */
  pads: number;
  generator: Generator;
}

/** What the injected voice plays: a built-in instrument, one sample tuned across the keys, or one sample per pad (unpitched). */
export type VoiceSpec =
  | { kind: "piano"; instrument: string }
  | { kind: "pitched"; sample: string | null; root: number }
  | { kind: "pads"; samples: (string | null)[] };

/** Soundboard pad i plays MIDI note PAD_BASE + i */
export const PAD_BASE = 36;
export const MIN_PADS = 1;
export const MAX_PADS = 32;
export const DEFAULT_PADS = 8;
const DEFAULT_INSTRUMENT = "PIANO";
const MAX_ID = 64;

/** The computer keys of the pads, in pad order: number row, then the Q, A and Z rows. */
export const PAD_KEYS: string[] = [
  ..."1234567890".split("").map((d) => `Digit${d}`),
  ..."QWERTYUIOPASDFGHJKLZXCVBNM".split("").map((c) => `Key${c}`),
];

const int = (v: unknown, lo: number, hi: number, fallback: number) => (Number.isInteger(v) ? Math.max(lo, Math.min(hi, v as number)) : fallback);
const shortId = (v: unknown): string | undefined => (typeof v === "string" && v && v.length <= MAX_ID ? v : undefined);
const isNote = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 127;
const isSample = (v: unknown): v is string | null => v === null || shortId(v) !== undefined;
const resize = <T>(a: unknown, n: number, fill: (i: number) => T, ok: (v: unknown) => v is T): T[] =>
  Array.from({ length: n }, (_, i) => (Array.isArray(a) && ok(a[i]) ? a[i] : fill(i)));
const defaultPadNote = (i: number) => 60 + i;

export function defaultGenerator(kind: Generator["kind"], pads: number): Generator {
  return kind === "sampler"
    ? { kind, root: 60, padSamples: Array.from({ length: pads }, () => null) }
    : { kind, instrument: DEFAULT_INSTRUMENT, padNotes: Array.from({ length: pads }, (_, i) => defaultPadNote(i)) };
}

function clampGenerator(raw: unknown, pads: number): Generator {
  const g = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  if (g.kind === "sampler") {
    const sample = shortId(g.sample);
    return { kind: "sampler", root: isNote(g.root) ? g.root : 60, ...(sample ? { sample } : {}), padSamples: resize(g.padSamples, pads, () => null, isSample) };
  }
  if (g.kind === "piano") return { kind: "piano", instrument: shortId(g.instrument) ?? DEFAULT_INSTRUMENT, padNotes: resize(g.padNotes, pads, defaultPadNote, isNote) };
  return defaultGenerator("piano", pads);
}

/** Repairs anything saved or asked for: unknown controller → piano, unknown generator → piano/PIANO, pad arrays sized to `pads`. */
export function clampInstrument(raw: unknown): InstrumentState {
  const s = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const controller = CONTROLLERS.includes(s.controller as Controller) ? (s.controller as Controller) : "piano";
  const root = Number.isInteger(s.root) ? (((s.root as number) % 12) + 12) % 12 : 0;
  const scale = typeof s.scale === "string" && s.scale ? s.scale : "major";
  const pads = int(s.pads, MIN_PADS, MAX_PADS, DEFAULT_PADS);
  return { controller, root, scale, octave: int(s.octave, 0, 6, 3), pads, generator: clampGenerator(s.generator, pads) };
}

export const DEFAULT_INSTRUMENT_STATE: InstrumentState = clampInstrument({});

/** Another generator kind starts fresh (nothing of a piano applies to a sampler); the same kind is kept as it is. */
export const withGenerator = (s: InstrumentState, kind: Generator["kind"]): InstrumentState =>
  s.generator.kind === kind ? s : { ...s, generator: defaultGenerator(kind, s.pads) };

/** The note the voice gets for a played note: keys pass through; a Soundboard pad plays its note on a piano, or stays a pad note for the sampler. null = no such pad. */
export function soundingNote(s: InstrumentState, midi: number): number | null {
  if (s.controller !== "soundboard") return midi;
  const i = midi - PAD_BASE;
  if (!Number.isInteger(i) || i < 0 || i >= s.pads) return null;
  return s.generator.kind === "piano" ? s.generator.padNotes[i] : midi;
}

export function voiceSpec(s: InstrumentState): VoiceSpec {
  const g = s.generator;
  if (g.kind === "piano") return { kind: "piano", instrument: g.instrument };
  return s.controller === "soundboard" ? { kind: "pads", samples: [...g.padSamples] } : { kind: "pitched", sample: g.sample ?? null, root: g.root };
}

/** The pad a computer key plays, or null. */
export function padIndexOf(code: string, pads: number): number | null {
  const i = PAD_KEYS.indexOf(code);
  return i >= 0 && i < pads ? i : null;
}

function fromScalePiano(raw: unknown): InstrumentState {
  const sp = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  // instruments made on the old sampler page (`user:…`) are gone
  const instrument = typeof sp.instrument === "string" && sp.instrument && !sp.instrument.startsWith("user:") ? sp.instrument : DEFAULT_INSTRUMENT;
  return clampInstrument({ controller: "scalepiano", root: sp.root, scale: sp.scale, octave: sp.octave, generator: { kind: "piano", instrument } });
}

/**
 * Old saves had a keyboard strip (`extra`, no source id) and Scale Piano strips (`scalepiano`, settings in `musickit.looper.scalePianos`).
 * They become `instrument` strips with the same strip ids (so patch links and buses still match); the keyboard gets a new source id.
 * Returns null when there is nothing to move, so it runs once.
 */
export function migrateSaves(o: { inputs: unknown; scalePianos: unknown; instruments: unknown }): { inputs: Record<string, unknown>[]; instruments: Record<string, InstrumentState> } | null {
  if (!Array.isArray(o.inputs)) return null;
  const inputs = o.inputs.filter((s): s is Record<string, unknown> => !!s && typeof s === "object");
  if (!inputs.some((s) => s.kind === "scalepiano" || s.kind === "extra")) return null;
  const old = (o.scalePianos && typeof o.scalePianos === "object" ? o.scalePianos : {}) as Record<string, unknown>;
  const instruments: Record<string, InstrumentState> = {};
  if (o.instruments && typeof o.instruments === "object") for (const [k, v] of Object.entries(o.instruments)) instruments[k] = clampInstrument(v);
  const taken = [...Object.keys(old), ...Object.keys(instruments), ...inputs.map((s) => String(s.sourceId ?? ""))];
  let n = Math.max(0, ...taken.map((k) => Number(k.replace(/\D/g, "")) || 0));
  const out = inputs.map((s) => {
    if (s.kind === "scalepiano" && typeof s.sourceId === "string") {
      instruments[s.sourceId] = fromScalePiano(old[s.sourceId]);
      return { ...s, kind: "instrument" };
    }
    if (s.kind === "extra") {
      const sourceId = `p${++n}`;
      instruments[sourceId] = clampInstrument({ controller: "piano" });
      return { ...s, kind: "instrument", sourceId };
    }
    return s;
  });
  return { inputs: out, instruments };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsx --test src/lib/looper/instrumentModel.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/looper/instrumentModel.ts src/lib/looper/instrumentModel.test.ts
git commit -m "Looper: instrument model (controller + generator), repair and migration"
```

### Task 2: `InstrumentInput` replaces `ScalePiano`

**Files:**
- Create: `src/lib/looper/instrument.ts`, `src/lib/looper/instrument.test.ts`
- Delete: `src/lib/looper/scalePiano.ts`, `src/lib/looper/scalePiano.test.ts` (in Task 4, when the engine stops importing it; keep both until then)

**Interfaces:**
- Consumes: `clampInstrument`, `soundingNote`, `voiceSpec`, `DEFAULT_INSTRUMENT_STATE`, `InstrumentState`, `VoiceSpec` (Task 1).
- Produces:
  - `interface NoteVoice { noteOn(midi: number, velocity?: number): void; noteOff(midi: number): void; allOff(): void; setSound?(spec: VoiceSpec): void; preload?(): Promise<void>; dispose?(): void }`
  - `type VoiceFactory = (ctx: AudioContext, destination: AudioNode, spec: VoiceSpec) => NoteVoice`
  - `class InstrumentInput { readonly id; state; out; toSpeakers; toRecord; attach(ctx); load(s: unknown); set(patch: Partial<InstrumentState>); serialize(); noteOn(midi, velocity?); noteOff(midi); allOff(); dispose() }`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/looper/instrument.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { InstrumentInput, type NoteVoice } from "./instrument";
import { PAD_BASE, type VoiceSpec } from "./instrumentModel";

const fakeCtx = () => ({ createGain: () => ({ gain: { value: 1 }, connect() {}, disconnect() {} }) }) as unknown as AudioContext;

function recorder() {
  const log: string[] = [];
  const specs: VoiceSpec[] = [];
  let made: VoiceSpec | null = null;
  const voice: NoteVoice = {
    noteOn: (m) => log.push(`on ${m}`),
    noteOff: (m) => log.push(`off ${m}`),
    allOff: () => log.push("all off"),
    setSound: (s) => specs.push(s),
    preload: () => Promise.resolve(),
    dispose: () => log.push("dispose"),
  };
  return { log, specs, made: () => made, factory: (_c: AudioContext, _d: AudioNode, s: VoiceSpec) => ((made = s), voice) };
}

test("the voice is made with the sound, and told again only when the sound changes", () => {
  const r = recorder();
  const p = new InstrumentInput("p1", () => undefined, r.factory);
  p.load({ controller: "scalepiano", generator: { kind: "piano", instrument: "FLUTE" } });
  p.attach(fakeCtx());
  assert.deepEqual(r.made(), { kind: "piano", instrument: "FLUTE" });
  p.set({ root: 2 });
  assert.deepEqual(r.specs, []);
  p.set({ generator: { kind: "piano", instrument: "CELLO", padNotes: [] } });
  assert.deepEqual(r.specs, [{ kind: "piano", instrument: "CELLO" }]);
  assert.equal(p.serialize().generator.kind === "piano" && p.serialize().generator.padNotes.length, 8);
});

test("a Soundboard on a piano plays each pad's note; pads past the count are silent", () => {
  const r = recorder();
  const p = new InstrumentInput("p1", () => undefined, r.factory);
  p.load({ controller: "soundboard", pads: 2, generator: { kind: "piano", instrument: "PIANO", padNotes: [50, 70] } });
  p.attach(fakeCtx());
  p.noteOn(PAD_BASE + 1, 0.5);
  p.noteOff(PAD_BASE + 1);
  p.noteOn(PAD_BASE + 5);
  assert.deepEqual(r.log, ["on 70", "off 70"]);
});

test("changes stop held notes and are reported; dispose lets go of the voice", () => {
  const r = recorder();
  let changes = 0;
  const p = new InstrumentInput("p1", () => changes++, r.factory);
  p.attach(fakeCtx());
  p.set({ octave: 4 });
  assert.equal(changes, 1);
  assert.ok(r.log.includes("all off"));
  p.dispose();
  assert.equal(r.log.at(-1), "dispose");
  assert.equal(p.out, null);
});

test("without a voice it is silent and does not throw", () => {
  const p = new InstrumentInput("p1", () => undefined);
  p.attach(fakeCtx());
  p.noteOn(60);
  p.set({ controller: "soundboard" });
  assert.equal(p.state.controller, "soundboard");
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx tsx --test src/lib/looper/instrument.test.ts`
Expected: FAIL, cannot find module `./instrument`.

- [ ] **Step 3: Implement**

```ts
// src/lib/looper/instrument.ts
/**
 * An instrument input: the looper's side of a played instrument (controller + sound generator, see instrumentModel.ts).
 * The keys and pads live in the UI and the sound in the app; the app injects the sound as a `VoiceFactory` and is told what to
 * play as a `VoiceSpec`, so the engine never touches samples or storage. Here are only the saved state and the routed nodes
 * (heard on master unless patched, recorded through its strip). Imports nothing outside src/lib/looper.
 */
import { DEFAULT_INSTRUMENT_STATE, clampInstrument, soundingNote, voiceSpec, type InstrumentState, type VoiceSpec } from "./instrumentModel";

/** Something that can sound notes into a node. The app injects one (its sample player) so the looper uses the same sounds as everything else. */
export interface NoteVoice {
  noteOn(midi: number, velocity?: number): void;
  noteOff(midi: number): void;
  allOff(): void;
  /** switch what it plays */
  setSound?(spec: VoiceSpec): void;
  preload?(): Promise<void>;
  /** let go of anything it registered */
  dispose?(): void;
}
export type VoiceFactory = (ctx: AudioContext, destination: AudioNode, spec: VoiceSpec) => NoteVoice;

export class InstrumentInput {
  state: InstrumentState = DEFAULT_INSTRUMENT_STATE;
  out: GainNode | null = null;
  toSpeakers: GainNode | null = null;
  toRecord: GainNode | null = null;
  private voice: NoteVoice | null = null;
  /** the spec the voice has, as JSON */
  private sound = "";

  /** `makeVoice` supplies the sound; without one the instrument is silent */
  constructor(readonly id: string, private onChange: () => void, private makeVoice?: VoiceFactory) {}

  attach(ctx: AudioContext) {
    this.voice?.allOff();
    this.voice?.dispose?.();
    this.out = ctx.createGain();
    this.out.gain.value = 0.4;
    this.toSpeakers = ctx.createGain();
    this.toRecord = ctx.createGain();
    this.out.connect(this.toSpeakers);
    this.out.connect(this.toRecord);
    const spec = voiceSpec(this.state);
    this.voice = this.makeVoice?.(ctx, this.out, spec) ?? null;
    this.sound = JSON.stringify(spec);
    void this.voice?.preload?.().catch(() => undefined);
  }

  load(s: unknown) {
    this.state = clampInstrument(s);
    this.applySound();
  }

  private applySound() {
    if (!this.voice) return;
    const spec = voiceSpec(this.state);
    const key = JSON.stringify(spec);
    if (key === this.sound) return;
    this.sound = key;
    this.voice.setSound?.(spec);
    void this.voice.preload?.().catch(() => undefined);
  }

  serialize(): InstrumentState {
    return clampInstrument(this.state);
  }

  set(patch: Partial<InstrumentState>) {
    this.allOff();
    this.state = clampInstrument({ ...this.state, ...patch });
    this.applySound();
    this.onChange();
  }

  /** Start a note (a key's MIDI note, or PAD_BASE + pad). Playing the same note again retriggers it. */
  noteOn(midi: number, velocity = 0.8) {
    const n = soundingNote(this.state, midi);
    if (n !== null) this.voice?.noteOn(n, velocity);
  }

  noteOff(midi: number) {
    const n = soundingNote(this.state, midi);
    if (n !== null) this.voice?.noteOff(n);
  }

  allOff() {
    this.voice?.allOff();
  }

  dispose() {
    this.allOff();
    this.voice?.dispose?.();
    try {
      [this.out, this.toSpeakers, this.toRecord].forEach((n) => n?.disconnect());
    } catch {
      /* already disconnected */
    }
    this.voice = null;
    this.out = this.toSpeakers = this.toRecord = null;
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx tsx --test src/lib/looper/instrument.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/looper/instrument.ts src/lib/looper/instrument.test.ts
git commit -m "Looper: InstrumentInput, the routed nodes and injected voice of an instrument"
```

### Task 3: Action `instrument.set`

**Files:**
- Modify: `src/lib/looper/actions.ts`, `src/lib/looper/script.ts`
- Test: `src/lib/looper/actions.test.ts`

**Interfaces:**
- Consumes: `InstrumentState`, `clampInstrument` (Task 1).
- Produces:
  - `LooperAction` member `{ type: "instrument.set"; id: string; patch: InstrumentPatch }` with `export type InstrumentPatch = Partial<InstrumentState>`
  - `ActionState.instruments: ({ id: string; name: string } & InstrumentState)[]`
  - `ActionTarget.setInstrument(id: string, patch: InstrumentPatch): void`
  - `InputSpec.kind` narrows to `"device"` (the keyboard is an instrument now).

- [ ] **Step 1: Write the failing tests**

In `src/lib/looper/actions.test.ts`:
1. Add `import { clampInstrument } from "./instrumentModel";` and add `type InstrumentPatch` to the import from `./actions`.
2. In `fake()`, add to `s` (after `sequencers`):
```ts
    instruments: [{ id: "p1", name: "Piano C", ...clampInstrument({ controller: "scalepiano", generator: { kind: "piano", instrument: "CELLO" } }) }],
```
3. In `t` (after `setSequencerStep`), add:
```ts
    setInstrument: (id, p: InstrumentPatch) => { const i = s.instruments.find((x) => x.id === id)!; Object.assign(i, clampInstrument({ ...i, ...p })); },
```
4. Append tests:
```ts
test("instrument.set changes an instrument and undo puts it back", () => {
  const { s, t } = fake();
  const a: LooperAction = { type: "instrument.set", id: "p1", patch: { root: 7, generator: { kind: "sampler", root: 60, sample: "x", padSamples: [] } } };
  const inv = inverseOf(a, s)!;
  assert.ok(applyAction(t, a));
  assert.equal(s.instruments[0].root, 7);
  assert.equal(s.instruments[0].generator.kind, "sampler");
  applyAction(t, inv);
  assert.equal(s.instruments[0].root, 0);
  assert.deepEqual(s.instruments[0].generator, { kind: "piano", instrument: "CELLO", padNotes: [60, 61, 62, 63, 64, 65, 66, 67] });
  assert.equal(describeAction(a, s), "Change Piano C (root, generator)");
});

test("undoing a smaller pad count brings the cut pads back", () => {
  const { s, t } = fake();
  applyAction(t, { type: "instrument.set", id: "p1", patch: { controller: "soundboard", generator: { kind: "piano", instrument: "CELLO", padNotes: [40, 41, 42, 43, 44, 45, 46, 47] } } });
  const shrink: LooperAction = { type: "instrument.set", id: "p1", patch: { pads: 2 } };
  const inv = inverseOf(shrink, s)!;
  applyAction(t, shrink);
  assert.deepEqual(s.instruments[0].generator.kind === "piano" && s.instruments[0].generator.padNotes, [40, 41]);
  applyAction(t, inv);
  assert.equal(s.instruments[0].pads, 8);
  assert.deepEqual(s.instruments[0].generator.kind === "piano" && s.instruments[0].generator.padNotes, [40, 41, 42, 43, 44, 45, 46, 47]);
});

test("instrument.set is refused for a missing instrument and validated", () => {
  const { t } = fake();
  assert.equal(applyAction(t, { type: "instrument.set", id: "nope", patch: { root: 1 } }), null);
  assert.ok(isAction({ type: "instrument.set", id: "p1", patch: { pads: 4, generator: { kind: "sampler" } } }));
  assert.ok(!isAction({ type: "instrument.set", id: "p1", patch: {} }));
  assert.ok(!isAction({ type: "instrument.set", id: "p1", patch: { colour: "red" } }));
  assert.ok(!isAction({ type: "instrument.set", id: "p1", patch: { generator: { kind: "theremin" } } }));
  assert.ok(!isAction({ type: "input.add", spec: { kind: "extra" } }));
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx tsx --test src/lib/looper/actions.test.ts`
Expected: FAIL (type errors are not checked by tsx; expect assertion failures: `applyAction` returns undefined for the unknown type, `isAction` returns false).

- [ ] **Step 3: Implement in `src/lib/looper/actions.ts`**

1. Imports: add `import type { InstrumentState } from "./instrumentModel";`
2. In `LooperAction`, after the `input.set` member:
```ts
  /** change an instrument input: controller, generator, scale settings, pad count; only the fields given change (a generator is replaced whole) */
  | { type: "instrument.set"; id: string; patch: InstrumentPatch }
```
3. Change the `InputSpec` doc and kind:
```ts
/** A hardware input. (Instruments come with the engine's `addInstrumentWithRig`, sequencer strips with `sequencer.add`.) */
export interface InputSpec {
  kind: "device";
```
4. After `export type InputPatch = …` add:
```ts
export type InstrumentPatch = Partial<InstrumentState>;
```
5. In `ActionState`, after `sequencers`:
```ts
  instruments: ({ id: string; name: string } & InstrumentState)[];
```
6. In `ActionTarget`, after `setInput`:
```ts
  setInstrument(id: string, patch: InstrumentPatch): void;
```
7. In `applyAction`, after the `input.set` case:
```ts
    case "instrument.set": if (!t.getSnapshot().instruments.some((i) => i.id === a.id)) return null; t.setInstrument(a.id, a.patch); return a;
```
8. In `inverseOf`, change the `input.remove` guard to `if (!i || i.kind !== "device") return null;`, the restored spec to `spec: { kind: "device", name: i.name, deviceId: i.deviceId, mode: i.mode, pair: i.pair }`, and after the `input.set` case add:
```ts
    case "instrument.set": {
      const i = s.instruments.find((x) => x.id === a.id);
      if (!i) return null;
      const before: Record<string, unknown> = {};
      (Object.keys(a.patch) as (keyof InstrumentPatch)[]).forEach((k) => { before[k] = JSON.parse(JSON.stringify(i[k])); });
      // a pad count resizes the generator's pad arrays: the old ones come back with it
      if ("pads" in a.patch) before.generator = JSON.parse(JSON.stringify(i.generator));
      return { type: a.type, id: a.id, patch: before as InstrumentPatch };
    }
```
9. In `describeAction`, after `input.set`:
```ts
    case "instrument.set": return `Change ${s?.instruments.find((i) => i.id === a.id)?.name ?? "instrument"} (${Object.keys(a.patch).join(", ")})`;
```
10. Near `INPUT_KEYS` add:
```ts
const INSTRUMENT_KEYS: Record<string, (v: unknown) => boolean> = {
  controller: isStr, root: isNum, scale: isStr, octave: isNum, pads: isNum,
  generator: (v) => typeof v === "object" && v !== null && ["piano", "sampler"].includes((v as { kind?: unknown }).kind as string),
};
```
11. In `isAction`: change `input.add` to `… && (a.spec as { kind?: unknown }).kind === "device";` and add `case "instrument.set": return isStr(a.id) && validPatch(a.patch, INSTRUMENT_KEYS);`

In `src/lib/looper/script.ts`, change the `input.add` doc to `"Add a hardware input. kind \"device\" is a microphone or audio interface (mode left/right/stereo/sum picks the channel). Give it an id you can refer to."`, the `input.remove` doc to `"Remove a device input."`, and add after the `input.set` entry:
```ts
  { type: "instrument.set", doc: "Change an instrument input (its id is in the mix's instruments). controller: piano, scalepiano or soundboard; root (key, 0 = C), scale, octave; pads (1-32); generator {kind:\"piano\", instrument} or {kind:\"sampler\", root, sample, padSamples}.", example: { type: "instrument.set", id: "p1", patch: { root: 2, scale: "dorian" } } },
```
(If `buildPrompt` lists parts of the state, look at it and add `instruments` (id, name, controller, generator kind) next to the sequencers it lists.)

- [ ] **Step 4: Run to verify**

Run: `npx tsx --test src/lib/looper/actions.test.ts src/lib/looper/script.test.ts`
Expected: PASS. (`tsc` will fail until Task 4 because the engine does not implement `setInstrument` yet; that is expected and fixed there.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/looper/actions.ts src/lib/looper/actions.test.ts src/lib/looper/script.ts
git commit -m "Looper: instrument.set action (apply, undo, describe, validate)"
```

### Task 4: Engine, mixer and patch run instruments; migration on load

**Files:**
- Modify: `src/lib/looper/engine.ts`, `src/lib/looper/mixer.ts`, `src/lib/looper/patch.ts`, `src/lib/looper/patch.test.ts`
- Delete: `src/lib/looper/scalePiano.ts`, `src/lib/looper/scalePiano.test.ts`

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces (engine public API used by the UI):
  - `LooperOptions` without `getExternalSource` / `externalLabel`; `createVoice?: VoiceFactory` (new signature).
  - `LooperSnapshot.instruments: (InstrumentState & { id: string; name: string; stripId: number })[]` (replaces `scalePianos`); `extraLabel` removed.
  - `engine.addInstrumentNow(start?: Partial<InstrumentState> & { name?: string }): number | null`
  - `engine.addInstrumentWithRig(controller: Controller): number | null`
  - `engine.getInstrument(id: string): InstrumentInput | undefined`
  - `engine.setInstrument(id: string, patch: InstrumentPatch): void` (action target)
  - Re-exports from engine: `export type { VoiceFactory, NoteVoice } from "./instrument"; export type { InstrumentState, Controller, Generator, VoiceSpec } from "./instrumentModel";`
  - Mixer: `InputKind = "device" | "sequencer" | "instrument"`, option `getInstrumentSource`, method `instrumentIds()`.
  - Storage: `musickit.looper.instruments` (by source id) replaces `musickit.looper.scalePianos`.

- [ ] **Step 1: Update the patch test first (failing)**

In `src/lib/looper/patch.test.ts` line ~118, change `{ id: 1, kind: "scalepiano" }` to `{ id: 1, kind: "instrument", sourceId: "p1" }`. Leave the assertions (input 1 still becomes a `piano` node).

Run: `npx tsx --test src/lib/looper/patch.test.ts`
Expected: FAIL (the `in:1` node becomes `input` because `defaultPatch` still checks `scalepiano`).

- [ ] **Step 2: `patch.ts`**

```ts
export function defaultPatch(opts: { inputs: { id: number; kind: "device" | "sequencer" | "instrument"; sourceId?: string }[]; groups: string[]; sequencers: { id: string; group: string | null }[] }): Patch {
```
and `add(\`in:${inp.id}\`, inp.kind === "instrument" ? "piano" : "input", 20 + i * 90, 40);`

Run the patch test again: PASS.

- [ ] **Step 3: `mixer.ts`**

- `export type InputKind = "device" | "sequencer" | "instrument";`
- `defaultMonitor`: delete the `extra` line and its comment (instruments are heard through `toSpeakers` or the patch, like Scale Pianos were).
- `MixerOptions`: delete `getExtraSource` and `extraLabel`; replace `getScalePianoSource` with
```ts
  /** the node an instrument feeds the recorder through, by instrument id; offers "instrument" strips */
  getInstrumentSource?: (sourceId: string) => AudioNode | null | undefined;
```
- Delete the field `extraNode`, the method `hasExtra()`, and in `attach` the line `if (this.opts.getExtraSource) this.extraNode = …`. Fix any caller of `hasExtra` the compiler reports (none expected outside the engine).
- `sourceFor`:
```ts
    return kind === "sequencer" ? !!this.opts.getSequencerSource : kind === "instrument" ? !!this.opts.getInstrumentSource : false;
```
- `restore` filter: `.filter((s) => (s.kind === "device" || (this.sourceFor(s.kind) && typeof s.sourceId === "string")) && ["left", "right", "stereo", "sum"].includes(s.mode))`
- `build`: delete the `extra` line; the source line becomes
```ts
    if ((r.info.kind === "sequencer" || r.info.kind === "instrument") && r.info.sourceId) {
      r.src = (r.info.kind === "sequencer" ? this.opts.getSequencerSource : this.opts.getInstrumentSource)?.(r.info.sourceId) ?? null;
```
- `addNow` guard: `if (spec.kind !== "device" && (!this.sourceFor(spec.kind) || !spec.sourceId)) return none;`
- `add` doc: "Returns its id, or null when full."
- `remove`: `if (r.pre) r.src?.disconnect(r.pre);`
- Rename `scalePianoIds()` to `instrumentIds()` filtering `kind === "instrument"`; doc "ids of the instruments that have a strip".

- [ ] **Step 4: `engine.ts`**

1. Imports: replace the `./scalePiano` import with
```ts
import { InstrumentInput, type VoiceFactory } from "./instrument";
import { CONTROLLER_NAMES, migrateSaves, type Controller, type InstrumentState } from "./instrumentModel";
import type { InstrumentPatch } from "./actions";
```
(merge `InstrumentPatch` into the existing `./actions` import if there is one) and replace the two re-export lines with
```ts
export type { VoiceFactory, NoteVoice } from "./instrument";
export type { InstrumentState, Controller, Generator, VoiceSpec } from "./instrumentModel";
```
2. `LooperOptions`: delete `getExternalSource` and `externalLabel` (and fix the `getContext` doc: "Use this AudioContext instead of creating one (the app's shared one, so its instruments play into the looper)."). `createVoice` doc: "Makes the sound of an instrument input (the app passes its sample player and sampler); instruments are silent without it."
3. `LooperSnapshot`: delete `extraLabel` and `scalePianos`; add
```ts
  /** every instrument input: its settings, name and strip id */
  instruments: (InstrumentState & { id: string; name: string; stripId: number })[];
```
4. Fields: replace `scalePianos`/`spCounter` with
```ts
  /** the instrument inputs (a controller and a sound generator each), by id */
  private instruments = new Map<string, InstrumentInput>();
  private instCounter = 0;
```
5. Constructor `InputMixer` options: delete `getExtraSource`/`extraLabel`, replace `getScalePianoSource` with `getInstrumentSource: (id) => this.instruments.get(id)?.toRecord,` and in `onRemoved`: `if (info.kind === "instrument" && info.sourceId) this.disposeInstrument(info.sourceId);`
6. `buildSnapshot`: replace the `scalePianos` and `extraLabel` lines with
```ts
      instruments: this.mixer.list().filter((i) => i.kind === "instrument" && i.sourceId && this.instruments.has(i.sourceId)).map((i) => ({ ...this.instruments.get(i.sourceId!)!.serialize(), id: i.sourceId!, name: i.name, stripId: i.id })),
```
7. `init()`: call `this.migrateInstruments();` right before `this.mixer.restore();` and replace `this.restoreScalePianos();` with `this.restoreInstruments();`.
8. `setupPianos()`: 
```ts
    const have = this.mixer.list().filter((i) => i.kind === "instrument" && i.sourceId && this.instruments.get(i.sourceId)?.state.controller === "scalepiano").map((i) => i.id);
    const ids = have.length ? have : PIANO_STARTS.map((st) => this.addInstrumentNow({ controller: "scalepiano", ...st })).filter((id): id is number => id !== null);
```
9. `syncPatch`: `add(id, i.kind === "instrument" ? "piano" : "input");`
10. `syncPatchAudio`:
```ts
    // an instrument that is patched is heard only through the patch: its direct route to the master closes
    this.mixer.list().forEach((i) => {
      if (i.kind === "instrument" && i.sourceId) {
        const inst = this.instruments.get(i.sourceId);
        if (inst?.toSpeakers) inst.toSpeakers.gain.value = patched.has(i.id) ? 0 : 1;
      }
    });
```
11. Replace the whole `/* scale pianos */` section (from `private spKey` through `addScalePianoNow`), `disposeScalePiano`, `getScalePiano` and `setScalePiano` with:
```ts
  /* ------------------------------------------------------------------ instruments */

  private instKey = "musickit.looper.instruments";

  /** Old projects had a keyboard strip (`extra`) and Scale Piano strips: they become instruments with the same strip ids, once (`migrateSaves`). */
  private migrateInstruments() {
    try {
      const read = (k: string) => JSON.parse(window.localStorage.getItem(k) ?? "null");
      const done = migrateSaves({ inputs: read("musickit.looper.inputs"), scalePianos: read("musickit.looper.scalePianos"), instruments: read(this.instKey) });
      if (!done) return;
      window.localStorage.setItem("musickit.looper.inputs", JSON.stringify(done.inputs));
      window.localStorage.setItem(this.instKey, JSON.stringify(done.instruments));
      window.localStorage.removeItem("musickit.looper.scalePianos");
    } catch {
      /* a corrupt save loads as well as it can */
    }
  }

  private attachInstrument(p: InstrumentInput) {
    if (!this.ctx || !this.master) return;
    p.attach(this.ctx);
    p.toSpeakers?.connect(this.master);
  }

  private makeInstrument(id: string, state?: unknown): InstrumentInput {
    const p = new InstrumentInput(id, () => {
      this.saveInstruments();
      this.emit();
    }, this.options.createVoice);
    p.load(state);
    this.instruments.set(id, p);
    this.attachInstrument(p);
    return p;
  }

  private restoreInstruments() {
    let saved: Record<string, unknown> = {};
    try {
      saved = JSON.parse(window.localStorage.getItem(this.instKey) ?? "{}") ?? {};
    } catch {
      /* ignore a corrupt save */
    }
    for (const id of this.mixer.instrumentIds()) {
      if (this.instruments.has(id)) continue;
      this.makeInstrument(id, saved[id]);
      this.instCounter = Math.max(this.instCounter, Number(id.replace(/\D/g, "")) || 0);
    }
    this.emit();
  }

  private saveInstruments() {
    try {
      const data: Record<string, InstrumentState> = {};
      this.instruments.forEach((p, id) => (data[id] = p.serialize()));
      window.localStorage.setItem(this.instKey, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }

  /** Add an instrument with its strip at once, with these starting settings. Named after its controller ("Piano", "Scale Piano 2"). Returns the strip id. */
  addInstrumentNow(start: Partial<InstrumentState> & { name?: string } = {}): number | null {
    const { name, ...state } = start;
    const id = `p${++this.instCounter}`;
    const inst = this.makeInstrument(id, state);
    const c = inst.state.controller;
    const n = this.mixer.list().filter((i) => i.kind === "instrument" && i.sourceId && this.instruments.get(i.sourceId)?.state.controller === c).length;
    const made = this.mixer.addNow({ kind: "instrument", name: name ?? (n === 0 ? CONTROLLER_NAMES[c] : `${CONTROLLER_NAMES[c]} ${n + 1}`), sourceId: id }).id;
    if (made === null) {
      this.disposeInstrument(id);
      return null;
    }
    this.saveInstruments();
    this.syncPatch();
    return made;
  }

  /** Add an instrument from the Add dialog with the piano buses. */
  addInstrumentWithRig(controller: Controller): number | null {
    const id = this.addInstrumentNow({ controller });
    if (id !== null) this.addPianoRig([id]);
    return id;
  }

  private disposeInstrument(id: string) {
    this.instruments.get(id)?.dispose();
    this.instruments.delete(id);
    this.saveInstruments();
    this.emit();
  }

  getInstrument(id: string): InstrumentInput | undefined {
    return this.instruments.get(id);
  }

  setInstrument(id: string, patch: InstrumentPatch) {
    this.instruments.get(id)?.set(patch);
  }
```
Keep `addBus`, `legacyRig`, `addVocalRig`, `addPianoRig` (they sat inside the old section) unchanged.
12. Audio attach (around the old line 1128): `this.instruments.forEach((p) => this.attachInstrument(p));`
13. `setupKeyboardPiano()`:
```ts
    const have = this.mixer.list().find((i) => i.kind === "instrument" && i.sourceId && this.instruments.get(i.sourceId)?.state.controller === "piano");
    const id = have?.id ?? this.addInstrumentNow({ controller: "piano", name: "Piano" });
```
Update its doc: "The default keyboard piano, once (flag `musickit.looper.keysRigDone`): a Piano instrument (on-screen and MIDI keyboard) with the piano buses …".
14. Delete `addScalePianoWithRig`. In `addInputWithRig`'s doc drop "the keyboard and a Scale Piano".
15. `addInput`: `const name = spec.name?.slice(0, 40) || "Input";`
16. `removeInput`: `if (i && i.kind === "device") {` and doc "Remove a device input. (Instrument and sequencer strips go with their own remove.)".
17. `dispose()`: `this.instruments.forEach((p) => p.dispose());`
18. Search the file for `scalePiano`, `ScalePiano`, `"extra"`, `extraLabel`, `getExternalSource`, `externalLabel` and `scalepiano`: nothing may remain.

- [ ] **Step 5: Delete the old Scale Piano files**

```bash
git rm src/lib/looper/scalePiano.ts src/lib/looper/scalePiano.test.ts
```

- [ ] **Step 6: Run the looper tests and the type check on the engine**

Run: `npx tsx --test src/lib/looper/*.test.ts`
Expected: PASS.
Run: `npx tsc --noEmit 2>&1 | grep 'src/lib/looper' ; echo done`
Expected: no errors under `src/lib/looper` (errors in `src/components/looper` are fixed in Task 5).

- [ ] **Step 7: Commit**

```bash
git add -A src/lib/looper
git commit -m "Looper engine: one instrument input kind replaces the keyboard and Scale Piano strips; saves migrate on load"
```

### Task 5: UI runs instruments (behaviour identical)

**Files:**
- Create: `src/components/looper/InstrumentPanel.tsx`, `src/components/looper/GeneratorPanel.tsx`, `src/components/looper/instrumentView.ts`
- Delete: `src/components/looper/ScalePianoPanel.tsx`
- Modify: `src/features/sound/keyboard/Piano.tsx`, `src/features/sound/keyboard/ScalePiano.tsx`, `src/components/looper/LooperApp.tsx`, `src/components/looper/Mixer.tsx`, `src/components/looper/InputsMini.tsx`, `src/components/looper/FreeBoard.tsx`

**Interfaces:**
- Consumes: engine API of Task 4, `InstrumentPatch` (Task 3).
- Produces:
  - `Piano` props `{ destination?: () => AudioNode; voice?: ScaleVoice }`: with a voice it plays the voice (keys, mouse and MIDI) and hides its own Sound picker.
  - `ScalePiano` prop `hideSound?: boolean`.
  - `instrumentView.ts`: `CONTROLLER_ICON: Record<Controller, IconName>`, `generatorChip(inst: Inst, names?: Record<string, string>): string`, `type Inst = LooperSnapshot["instruments"][number]`.
  - `InstrumentPanel({ engine, snap, id })`, `GeneratorPanel({ inst, set })` (extended in Tasks 10–12).
  - `InputStrip` props: `keyboardOpen`/`onToggleKeyboard` removed; `pianoOpen`/`onTogglePiano` now open any instrument's play window; new optional `inst?: Inst`.

- [ ] **Step 1: `Piano.tsx` takes a voice**

```tsx
import { noteToMidi } from "../engine/notes";
import type { ScaleVoice } from "./ScalePiano";
…
/** `destination` is where its sound goes (the app's output by default). With `voice` (the looper's instrument) it plays that instead and has no Sound picker. */
export default function Piano({ destination, voice }: { destination?: () => AudioNode; voice?: ScaleVoice } = {}) {
```
Replace the three callbacks and the preload effect:
```tsx
  const playNote = useCallback((n: string) => {
    if (!voice) return player.noteOn(n);
    const m = noteToMidi(n);
    if (m !== null) voice.noteOn(m);
  }, [player, voice]);
  const stopNote = useCallback((n: string) => {
    if (!voice) return player.noteOff(n);
    const m = noteToMidi(n);
    if (m !== null) voice.noteOff(m);
  }, [player, voice]);
  const stopAllNotes = useCallback(() => (voice ?? player).allOff(), [player, voice]);

  useEffect(() => {
    if (!voice) void player.preload().catch(() => undefined);
  }, [player, voice]);
```
Wrap the instrument `<select>` and the divider before it in `{!voice && (<>…</>)}`.

- [ ] **Step 2: `ScalePiano.tsx` can hide its Sound picker**

Add to `ScalePianoProps`: `/** the owner shows the sound elsewhere (the looper's generator panel) */ hideSound?: boolean;`, destructure it, and wrap the Sound `<select>` in `{!hideSound && (…)}`.

- [ ] **Step 3: `instrumentView.ts`**

```ts
// src/components/looper/instrumentView.ts
import { allInstrumentOptions } from "@/features/sound";
import type { IconName } from "../Icon";
import type { LooperSnapshot } from "@/lib/looper/engine";
import type { Controller } from "@/lib/looper/instrumentModel";

export type Inst = LooperSnapshot["instruments"][number];

export const CONTROLLER_ICON: Record<Controller, IconName> = { piano: "piano", scalepiano: "music", soundboard: "layout-dashboard" };

/** "Piano · Cello", "Sampler · Glass hit", "Sampler · 5 pads". `names` maps sample ids to names. */
export function generatorChip(inst: Inst, names: Record<string, string> = {}): string {
  const g = inst.generator;
  if (g.kind === "piano") return `Piano · ${allInstrumentOptions().find((o) => o.value === g.instrument)?.label ?? g.instrument}`;
  if (inst.controller === "soundboard") {
    const n = g.padSamples.filter(Boolean).length;
    return `Sampler · ${n} pad${n === 1 ? "" : "s"}`;
  }
  return `Sampler · ${g.sample ? names[g.sample] ?? "missing sample" : "no sample"}`;
}
```

- [ ] **Step 4: `GeneratorPanel.tsx` (piano generator only for now)**

```tsx
// src/components/looper/GeneratorPanel.tsx
"use client";

import { useInstrumentOptions } from "@/features/sound";
import type { InstrumentPatch } from "@/lib/looper/actions";
import type { Inst } from "./instrumentView";

export const field = "h-7 rounded-md border border-slate-700 bg-slate-900 px-1.5 text-xs text-slate-100";

/** Under the keys or pads: what makes the sound. */
export default function GeneratorPanel({ inst, set }: { inst: Inst; set: (p: InstrumentPatch) => void }) {
  const options = useInstrumentOptions();
  const g = inst.generator;
  return (
    <div className="flex flex-col gap-1.5 border-t border-slate-800 px-2 py-2 text-xs text-slate-400">
      {g.kind === "piano" && (
        <div className="flex flex-wrap items-center gap-1.5">
          <select className={field} value={g.instrument} aria-label="Sound" title="Sound" onChange={(e) => { set({ generator: { ...g, instrument: e.target.value } }); e.target.blur(); }}>
            {!options.some((o) => o.value === g.instrument) && <option value={g.instrument}>{g.instrument}</option>}
            {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: `InstrumentPanel.tsx`; delete `ScalePianoPanel.tsx`**

```tsx
// src/components/looper/InstrumentPanel.tsx
"use client";

import { Piano, ScalePiano } from "@/features/sound";
import type { InstrumentPatch } from "@/lib/looper/actions";
import type { LooperEngine, LooperSnapshot } from "@/lib/looper/engine";
import GeneratorPanel from "./GeneratorPanel";

/** An instrument's play window: its controller (keyboard, scale keys or pads) playing the routed voice, then its sound generator. */
export default function InstrumentPanel({ engine, snap, id }: { engine: LooperEngine; snap: LooperSnapshot; id: string }) {
  const inst = snap.instruments.find((x) => x.id === id);
  const voice = engine.getInstrument(id);
  if (!inst || !voice) return null;
  const set = (patch: InstrumentPatch) => engine.do({ type: "instrument.set", id, patch });
  return (
    <div className="flex flex-col">
      {inst.controller === "piano" && <div className="p-2"><Piano voice={voice} /></div>}
      {inst.controller === "scalepiano" && (
        <ScalePiano state={inst} hideSound voice={voice} onChange={(p) => set(Object.fromEntries(Object.entries(p).filter(([k]) => k !== "instrument")) as InstrumentPatch)} />
      )}
      <GeneratorPanel inst={inst} set={set} />
    </div>
  );
}
```
Run `git rm src/components/looper/ScalePianoPanel.tsx`.

- [ ] **Step 6: `Mixer.tsx`**

1. `InputStrip`: remove `keyboardOpen` and `onToggleKeyboard` from props and type; add `inst?: Inst` (import `Inst`, `CONTROLLER_ICON`, `generatorChip` from `./instrumentView`).
2. Icon: `<Icon name={isDevice ? "mic" : inp.kind === "sequencer" ? "drum" : inst ? CONTROLLER_ICON[inst.controller] : "piano"} size={18} />`
3. After the name `<input>` add: `{inst && <span className="max-w-[9rem] truncate rounded-md border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-400" title="Sound generator">{generatorChip(inst)}</span>}`
4. Replace the Scale Piano and keyboard buttons with one:
```tsx
        {inp.kind === "instrument" && <button type="button" className={`${ibtn} ${pianoOpen ? "!border-sky-400 !text-sky-200" : ""}`} aria-pressed={pianoOpen} onClick={onTogglePiano} title={pianoOpen ? `Close ${inp.name}` : `Play ${inp.name}`} aria-label={pianoOpen ? `Close ${inp.name}` : `Play ${inp.name}`}><Icon name="keyboard" /></button>}
```
5. Remove button: `inp.kind === "device" ? engine.do({ type: "input.remove", id: inp.id }) : m.remove(inp.id)` (keep the sequencer branch first).
6. Every `<InputStrip …>` call (in `Mixer`, `InputList` twice): drop `keyboardOpen`/`onToggleKeyboard`, add `inst={snap.instruments.find((q) => q.id === inp.sourceId)}`. Drop `keyboardOpen`/`onToggleKeyboard` from the `Mixer` and `InputList` props.
7. `AddInputModal`: drop the `hasExtra` prop. Replace the keyboard card's button with
```tsx
          <button type="button" onClick={() => { engine.addInstrumentWithRig("piano"); onClose(); }} className="flex flex-col gap-1 rounded-xl border border-slate-700 bg-slate-900 p-4 text-left hover:border-sky-400">
            <Icon name="piano" size={28} className="text-sky-300" />
            <span className="text-sm font-medium text-slate-100">Piano</span>
            <span className="text-xs text-slate-400">The on-screen piano and your MIDI keyboard, with the piano buses (dry, room, hall, dreamy).</span>
          </button>
```
(keep the card's inner markup style as it was; the title line was the one between the icon and the description). The Scale Piano card calls `engine.addInstrumentWithRig("scalepiano")`.

- [ ] **Step 7: `InputsMini.tsx` and `FreeBoard.tsx`**

- `InputsMini`: drop `keyboardOpen`/`onToggleKeyboard` props. `kindIcon` becomes a lookup that takes the instrument: in `Row`, compute `const inst = snap.instruments.find((q) => q.id === inp.sourceId);` and use `inp.kind === "device" ? "mic" : inst ? CONTROLLER_ICON[inst.controller] : "piano"`. The row props become `keyOpen={inp.kind === "instrument" && !!inp.sourceId && openPianos.includes(inp.sourceId)} onKeys={inp.kind === "instrument" && inp.sourceId ? () => onTogglePiano(inp.sourceId!) : undefined}`. Update its doc comment ("devices and instruments; not the sequencers").
- `FreeBoard`: drop `keyboardOpen`/`onToggleKeyboard` props; the `InputStrip` call drops them and adds `inst={snap.instruments.find((q) => q.id === inp.sourceId)}`. The widget title icon: `title(inp.kind === "instrument" ? "piano" : "mic", inp.name)`.

- [ ] **Step 8: `LooperApp.tsx`**

1. Delete `keyboardOut`, `getKeyboardOut` and its comment, the `Piano` import, the `ScalePianoPanel` import; import `InstrumentPanel`.
2. Engine construction:
```tsx
    return new LooperEngine({
      getContext: getAudioContext,
      // the sample player for now; the sampler's voice replaces it in a later step
      createVoice: (_ctx, dest, spec) => {
        const p = createPlayer({ instrumentId: spec.kind === "piano" ? spec.instrument : "PIANO", destination: () => dest });
        return { noteOn: (m, v) => p.noteOn(m, v), noteOff: (m) => p.noteOff(m), allOff: () => p.allOff(), setSound: (s) => s.kind === "piano" && p.setInstrument(s.instrument), preload: () => p.preload() };
      },
    });
```
3. Delete `keyboardOpen` state, the Keyboard `FloatingWindow`, and every `keyboardOpen`/`onToggleKeyboard` prop passed to `Mixer`, `InputsMini`, `FreeBoard`. `AddInputModal` loses `hasExtra`.
4. Instrument windows:
```tsx
      {openPianos.filter((id) => snap.instruments.some((q) => q.id === id)).map((id) => (
        <FloatingWindow key={id} title={snap.instruments.find((q) => q.id === id)?.name ?? "Instrument"} storageKey={`musickit.looper.instrumentWindow.${id}`} fit onClose={() => togglePiano(id)}>
          <InstrumentPanel engine={engine} snap={snap} id={id} />
        </FloatingWindow>
      ))}
```
5. `PROJECT_KEYS`: add `"instruments"` (keep `"scalePianos"` so leftovers clear). Window cleanup regex: `/^musickit\.looper\.(scalePianoWindow|sequencerWindow|instrumentWindow)\./`.

- [ ] **Step 9: Type check, lint, tests**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: all clean / PASS. Fix every reference the compiler finds to `scalePianos`, `extraLabel`, `getScalePiano`, `setScalePiano`, `addScalePianoWithRig`, `"extra"`, `"scalepiano"`.

- [ ] **Step 10: Browser check (old project migrates, sounds the same)**

Start `npm run dev` (background). Write `$SCRATCH/check1.mjs` (scratchpad dir) with Playwright from the cached browsers (`npx -y -p playwright@1.49.1 node $SCRATCH/check1.mjs`):
```js
import { chromium } from "playwright";
const b = await chromium.launch({ args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", "--autoplay-policy=no-user-gesture-required"] });
const page = await b.newPage();
await page.addInitScript(() => {
  window.__starts = [];
  const s = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (...a) { window.__starts.push({ dur: this.buffer?.duration ?? 0, rate: this.playbackRate.value }); return s.apply(this, a); };
  window.__osc = 0;
  const o = OscillatorNode.prototype.start;
  OscillatorNode.prototype.start = function (...a) { window.__osc++; return o.apply(this, a); };
});
await page.goto("http://localhost:3000/looper");
// an old project: keyboard strip 3 and a Scale Piano strip 4, both with flags set so no defaults are added
await page.evaluate(() => {
  localStorage.clear();
  localStorage.setItem("musickit.looper.inputs", JSON.stringify([{ id: 3, kind: "extra", name: "Piano", deviceId: "", mode: "stereo", volume: 1 }, { id: 4, kind: "scalepiano", sourceId: "p1", name: "Piano C major", deviceId: "", mode: "stereo", volume: 1 }]));
  localStorage.setItem("musickit.looper.scalePianos", JSON.stringify({ p1: { root: 0, scale: "major", octave: 3, instrument: "PIANO" } }));
  for (const k of ["rigDone3", "keysRigDone", "pianoRigDone2", "seqRigDone"]) localStorage.setItem(`musickit.looper.${k}`, "1");
});
await page.reload();
await page.getByText("Start the looper").click();
await page.keyboard.press("Escape"); // the devices dialog
await page.getByRole("button", { name: "Play Piano C major" }).first().click();
await page.keyboard.down("KeyZ"); await page.waitForTimeout(800); await page.keyboard.up("KeyZ");
await page.getByRole("button", { name: "Play Piano", exact: true }).first().click();
await page.keyboard.down("KeyX"); await page.waitForTimeout(800); await page.keyboard.up("KeyX");
const r = await page.evaluate(() => ({ starts: window.__starts.length, osc: window.__osc, saved: JSON.parse(localStorage.getItem("musickit.looper.inputs")).map((s) => [s.id, s.kind]), old: localStorage.getItem("musickit.looper.scalePianos") }));
console.log(JSON.stringify(r));
await b.close();
```
Expected: `starts >= 2`, `osc === 0`, `saved` is `[[3,"instrument"],[4,"instrument"]]`, `old` is `null`. If both windows grab the same key, close the first window before opening the second. Then clear storage, reload, start, and confirm a new project shows the default Piano and "Piano C major" strips with their buses.

- [ ] **Step 11: Commit**

```bash
git add -A src
git commit -m "Looper UI: keyboard and Scale Pianos are instrument inputs with one play window"
```

---

## Stage 2: generator voice, strict runtime instruments, root detection

### Task 6: Strict and hidden runtime instruments

**Files:**
- Modify: `src/features/sound/engine/notes.ts`, `src/features/sound/engine/notes.test.ts`, `src/features/sound/engine/runtime.ts`, `src/features/sound/engine/instruments.ts`, `src/features/sound/engine/player.ts`

**Interfaces:**
- Produces: `pickSample<T extends { midi: number }>(target: number, samples: readonly T[], strict?: boolean): { sample: T; rate: number } | null`; `RuntimeInstrument.strict?: boolean`, `RuntimeInstrument.hidden?: boolean`; `getInstrumentConfig(id)` returns `strict: boolean`.

- [ ] **Step 1: Failing test** (append to `notes.test.ts`, add `pickSample` to its import)

```ts
test("strict: only a sample at exactly the note plays, untuned", () => {
  const samples = [{ midi: 36 }, { midi: 38 }];
  assert.deepEqual(pickSample(38, samples, true), { sample: { midi: 38 }, rate: 1 });
  assert.equal(pickSample(37, samples, true), null);
  assert.equal(pickSample(60, [], true), null);
  assert.equal(pickSample(37, samples)!.sample.midi, 36);
});
```

- [ ] **Step 2: Run**: `npx tsx --test src/features/sound/engine/notes.test.ts` → FAIL (`pickSample` is not a function).

- [ ] **Step 3: Implement**

`notes.ts`, after `closestSample`:
```ts
/** The sample a note plays: the closest one tuned to it, or with `strict` only a sample recorded at exactly that note (untuned). */
export function pickSample<T extends { midi: number }>(target: number, samples: readonly T[], strict = false): { sample: T; rate: number } | null {
  if (!strict) return closestSample(target, samples);
  const s = samples.find((x) => x.midi === target);
  return s ? { sample: s, rate: 1 } : null;
}
```
`runtime.ts`, in `RuntimeInstrument`:
```ts
  /** a note with no sample of its own is silent instead of tuned from a neighbour (pads); with no samples at all it is silent too */
  strict?: boolean;
  /** not offered in instrument pickers (a looper instrument's own sound) */
  hidden?: boolean;
```
and `runtimeInstrumentOptions` filters: `[...registry.entries()].filter(([, i]) => !i.hidden).map(…)`.
`instruments.ts` `getInstrumentConfig`: return type adds `strict: boolean`, value `strict: (config as { strict?: boolean }).strict === true`.
`player.ts` `noteOn`:
```ts
      const config = getInstrumentConfig(instrumentId);
      const match = config ? pickSample(midi, instrumentSamples(instrumentId), config.strict) : null;
      if (config?.strict && !match) return; // a pad without a sample, or a sampler with none, stays silent
      if (!config || !match) return start(midi, velocity, null, 1, 0, 0.15);
```
(import `pickSample` instead of `closestSample`.)

- [ ] **Step 4: Run**: `npm test` → PASS; `npx tsc --noEmit` clean.

- [ ] **Step 5: Commit**

```bash
git add src/features/sound
git commit -m "Sound: strict runtime instruments (exact-note samples, silent otherwise) and hidden ones"
```

### Task 7: Sampler generator voice

**Files:**
- Create: `src/features/sampler/model/sound.ts`, `src/features/sampler/model/sound.test.ts`, `src/features/sampler/sampleUrls.ts`, `src/features/sampler/generatorVoice.ts`
- Modify: `src/features/sampler/sync.ts` (use `sampleUrls.ts`; deleted in Task 9), `src/features/sampler/useSampler.ts` (import `forgetSample` from `./sampleUrls`), `src/features/sampler/index.ts`, `src/components/looper/LooperApp.tsx`

**Interfaces:**
- Consumes: `strict`/`hidden` (Task 6); `VoiceSpec` shape (Task 1), copied as `SoundSpec`.
- Produces: `SoundSpec`, `PAD_BASE`, `sampleIds(spec): string[]`, `runtimeFor(spec, urlOf): RuntimeInstrument`; `urlFor(store, id): Promise<string | null>`, `forgetSample(id)`; `makeGeneratorVoice(destination: AudioNode, spec: SoundSpec, store?: SamplerStore): GeneratorVoice` exported from `@/features/sampler`.

- [ ] **Step 1: Failing test**

```ts
// src/features/sampler/model/sound.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { runtimeFor, sampleIds } from "./sound";

const urls: Record<string, string> = { a: "blob:a", b: "blob:b" };
const urlOf = (id: string) => urls[id] ?? null;

test("one sample tuned across the keys, keyed by its root note", () => {
  assert.deepEqual(runtimeFor({ kind: "pitched", sample: "a", root: 57 }, urlOf), { label: "Sampler", urls: { A3: "blob:a" }, baseUrl: "", attack: 0, release: 0.3, hidden: true });
});

test("no sample, or a missing one, is silent (strict with no samples)", () => {
  for (const sample of [null, "gone"]) assert.deepEqual(runtimeFor({ kind: "pitched", sample, root: 60 }, urlOf), { label: "Sampler", urls: {}, baseUrl: "", strict: true, hidden: true });
});

test("pads: one exact note per pad from C2, empty and missing pads left out", () => {
  const r = runtimeFor({ kind: "pads", samples: ["a", null, "gone", "b"] }, urlOf);
  assert.deepEqual(r.urls, { C2: "blob:a", "D#2": "blob:b" });
  assert.equal(r.strict, true);
  assert.equal(r.hidden, true);
});

test("the samples a spec needs, once each", () => {
  assert.deepEqual(sampleIds({ kind: "pads", samples: ["a", null, "a", "b"] }), ["a", "b"]);
  assert.deepEqual(sampleIds({ kind: "pitched", sample: null, root: 60 }), []);
  assert.deepEqual(sampleIds({ kind: "piano", instrument: "PIANO" }), []);
});
```

- [ ] **Step 2: Run**: `npx tsx --test src/features/sampler/model/sound.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement**

```ts
// src/features/sampler/model/sound.ts
import { midiToName } from "@/features/sound/engine/notes";
import type { RuntimeInstrument } from "@/features/sound/engine/runtime";

/** What a looper instrument asks its voice to play. The same shape as the looper's `VoiceSpec` (the sampler does not import the looper). */
export type SoundSpec =
  | { kind: "piano"; instrument: string }
  | { kind: "pitched"; sample: string | null; root: number }
  | { kind: "pads"; samples: (string | null)[] };

/** pad i plays note PAD_BASE + i (C2 upward), as in the looper */
export const PAD_BASE = 36;

export const sampleIds = (spec: SoundSpec): string[] =>
  spec.kind === "pitched" ? (spec.sample ? [spec.sample] : []) : spec.kind === "pads" ? [...new Set(spec.samples.filter((s): s is string => !!s))] : [];

/** The runtime instrument for a sampler spec. `urlOf` gives a sample's playable url, or nothing when it is missing (then that note is silent). */
export function runtimeFor(spec: Exclude<SoundSpec, { kind: "piano" }>, urlOf: (id: string) => string | null | undefined): RuntimeInstrument {
  if (spec.kind === "pitched") {
    const url = spec.sample ? urlOf(spec.sample) : null;
    return url
      ? { label: "Sampler", urls: { [midiToName(spec.root)]: url }, baseUrl: "", attack: 0, release: 0.3, hidden: true }
      : { label: "Sampler", urls: {}, baseUrl: "", strict: true, hidden: true };
  }
  const urls: Record<string, string> = {};
  spec.samples.forEach((id, i) => {
    const url = id ? urlOf(id) : null;
    if (url) urls[midiToName(PAD_BASE + i)] = url;
  });
  return { label: "Sampler pads", urls, baseUrl: "", attack: 0, release: 1.5, strict: true, hidden: true };
}
```
(The pads test checks only `urls`, `strict`, `hidden`; release 1.5 lets a hit ring after the key is let go.)

```ts
// src/features/sampler/sampleUrls.ts
import type { SamplerStore } from "./store/types";

/** One object url per sample id, made from the stored audio when first needed and revoked when the sample is deleted. */
const urls = new Map<string, string>();

export async function urlFor(store: SamplerStore, sampleId: string): Promise<string | null> {
  const hit = urls.get(sampleId);
  if (hit) return hit;
  const blob = await store.getAudio(sampleId);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urls.set(sampleId, url);
  return url;
}

export function forgetSample(sampleId: string) {
  const url = urls.get(sampleId);
  if (url) URL.revokeObjectURL(url);
  urls.delete(sampleId);
}
```
In `sync.ts` delete its own `urls`, `urlFor`, `forgetSample` and import `urlFor` from `./sampleUrls`; in `useSampler.ts` import `forgetSample` from `./sampleUrls`.

```ts
// src/features/sampler/generatorVoice.ts
import { createPlayer, registerRuntimeInstrument, unregisterRuntimeInstrument } from "@/features/sound";
import { runtimeFor, sampleIds, type SoundSpec } from "./model/sound";
import { urlFor } from "./sampleUrls";
import { getStore } from "./store/idb";
import type { SamplerStore } from "./store/types";

export interface GeneratorVoice {
  noteOn(midi: number, velocity?: number): void;
  noteOff(midi: number): void;
  allOff(): void;
  setSound(spec: SoundSpec): void;
  preload(): Promise<void>;
  dispose(): void;
}

let count = 0;

/**
 * The looper's injected voice: a sample player into `destination` whose sound follows the spec. A piano spec plays a built-in
 * instrument; a sampler spec gets a hidden runtime instrument of its own, built from the library's audio (silent until it loads,
 * and for any sample that is missing).
 */
export function makeGeneratorVoice(destination: AudioNode, spec: SoundSpec, store: SamplerStore = getStore()): GeneratorVoice {
  const rid = `sampler:voice${++count}`;
  const player = createPlayer({ destination: () => destination });
  let token = 0;
  let ready: Promise<void> = Promise.resolve();
  const setSound = (s: SoundSpec) => {
    const mine = ++token;
    if (s.kind === "piano") {
      player.setInstrument(s.instrument);
      ready = Promise.resolve();
      return;
    }
    registerRuntimeInstrument(rid, runtimeFor(s, () => null));
    player.setInstrument(rid);
    ready = (async () => {
      const found = new Map<string, string | null>();
      for (const id of sampleIds(s)) found.set(id, await urlFor(store, id).catch(() => null));
      if (mine === token) registerRuntimeInstrument(rid, runtimeFor(s, (id) => found.get(id)));
    })();
  };
  setSound(spec);
  return {
    noteOn: (m, v) => player.noteOn(m, v),
    noteOff: (m) => player.noteOff(m),
    allOff: () => player.allOff(),
    setSound,
    preload: async () => {
      await ready;
      await player.preload();
    },
    dispose: () => {
      token++;
      player.allOff();
      unregisterRuntimeInstrument(rid);
    },
  };
}
```
`index.ts`: add `export { makeGeneratorVoice, type GeneratorVoice } from "./generatorVoice";` and `export type { SoundSpec } from "./model/sound";`.

`LooperApp.tsx`: import `makeGeneratorVoice` from `@/features/sampler`, drop `createPlayer` from the sound import if unused, and
```tsx
    return new LooperEngine({ getContext: getAudioContext, createVoice: (_ctx, dest, spec) => makeGeneratorVoice(dest, spec) });
```

- [ ] **Step 4: Run**: `npm test && npx tsc --noEmit && npm run lint` → PASS / clean.

- [ ] **Step 5: Commit**

```bash
git add -A src/features/sampler src/components/looper/LooperApp.tsx
git commit -m "Sampler: generator voice for looper instruments (built-in piano, pitched sample, pads)"
```

### Task 8: Root detection

**Files:**
- Create: `src/features/sampler/model/detectRoot.ts`, `src/features/sampler/model/detectRoot.test.ts`

**Interfaces:**
- Consumes: `detectPitch`, `hzToNote` from `@/features/tuner/pitch`.
- Produces: `detectRoot(samples: Float32Array, sampleRate: number): number | null` (a MIDI note).

- [ ] **Step 1: Failing test**

```ts
// src/features/sampler/model/detectRoot.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { detectRoot } from "./detectRoot";

const SR = 44100;
const sine = (hz: number, seconds = 1) => Float32Array.from({ length: Math.floor(SR * seconds) }, (_, i) => 0.5 * Math.sin((2 * Math.PI * hz * i) / SR));

test("sines land on their notes", () => {
  assert.equal(detectRoot(sine(440), SR), 69);
  assert.equal(detectRoot(sine(261.63), SR), 60);
  assert.equal(detectRoot(sine(110), SR), 45);
  assert.equal(detectRoot(sine(452), SR), 69); // 47 cents sharp still rounds to A4
});

test("silence, noise and a too-short sound give no root", () => {
  assert.equal(detectRoot(new Float32Array(SR), SR), null);
  let seed = 1;
  const noise = Float32Array.from({ length: SR }, () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5));
  assert.equal(detectRoot(noise, SR), null);
  assert.equal(detectRoot(sine(440, 0.05), SR), null);
});
```

- [ ] **Step 2: Run**: `npx tsx --test src/features/sampler/model/detectRoot.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement**

```ts
// src/features/sampler/model/detectRoot.ts
import { detectPitch, hzToNote } from "@/features/tuner/pitch";

const WINDOW = 2048;
const HOP = 1024;
/** only the start matters: the attack and the body of the sound */
const MAX_SECONDS = 4;

/**
 * The note a sample sounds at, as a MIDI note: pitch of many short windows (YIN, the tuner's), then the median of the windows that
 * found one. null when fewer than half the windows (or fewer than 3) are clearly pitched: silence, noise, a click.
 */
export function detectRoot(samples: Float32Array, sampleRate: number): number | null {
  const end = Math.min(samples.length, Math.floor(sampleRate * MAX_SECONDS));
  const hz: number[] = [];
  let windows = 0;
  for (let at = 0; at + WINDOW <= end; at += HOP) {
    windows++;
    const p = detectPitch(samples.subarray(at, at + WINDOW), sampleRate, { minHz: 50, maxHz: 1500 });
    if (p) hz.push(p.freq);
  }
  if (hz.length < Math.max(3, windows / 2)) return null;
  hz.sort((a, b) => a - b);
  return hzToNote(hz[Math.floor(hz.length / 2)]).midi;
}
```

- [ ] **Step 4: Run**: `npx tsx --test src/features/sampler/model/detectRoot.test.ts` → PASS. If the noise case finds a pitch, raise the bar to `windows * 0.75` and re-run; record the change in the commit message.

- [ ] **Step 5: Commit**

```bash
git add src/features/sampler/model/detectRoot.ts src/features/sampler/model/detectRoot.test.ts
git commit -m "Sampler: detect the root note of a sample (median of YIN windows)"
```

---

## Stage 3: the library in the looper, Soundboard, generator panel

### Task 9: Sample library store; retire the `/sampler` page

**Files:**
- Create: `src/features/sampler/library.ts`
- Modify: `src/features/sampler/model/project.ts`, `src/features/sampler/model/types.ts`, `src/features/sampler/model/project.test.ts`, `src/features/sampler/index.ts`, `src/components/PageShell.tsx`
- Delete: `src/app/sampler/page.tsx`, `src/features/sampler/{SamplerApp.tsx,SamplerSync.tsx,sync.ts,bundle.ts,useSampler.ts}`

**Interfaces:**
- Produces (from `@/features/sampler`): `useSampleLibrary(): { samples: SampleMeta[]; ready: boolean; error: string | null }`, `sampleLibrary` with `addAudio(blob, name, source, prompt?): Promise<SampleMeta>`, `addFile(file: File): Promise<SampleMeta>` (throws a showable `Error` when it does not decode), `remove(id)`, `rename(id, name)`, `clearError()`; `previewSample(id): Promise<void>`, `detectSampleRoot(id): Promise<number | null>`; `type SampleMeta`.

- [ ] **Step 1: Shrink the model; update its test first**

`model/types.ts`: delete `SamplerInstrument` and `INSTRUMENT_PREFIX`; `SamplerProject` becomes
```ts
/** Everything the sampler remembers apart from the audio itself (stored per sample id). Old saves may still carry `instruments`: they are ignored. */
export interface SamplerProject {
  version: 1;
  samples: SampleMeta[];
}
```
`model/project.test.ts`: replace the file with
```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { addSample, emptyProject, removeSample, renameSample, sanitiseProject, uniqueId } from "./project";
import type { SampleMeta } from "./types";

const sample = (id: string): SampleMeta => ({ id, name: id, source: "upload", mime: "audio/wav", bytes: 1, createdAt: 1 });

test("samples are added, renamed and removed", () => {
  let p = addSample(addSample(emptyProject(), sample("a")), sample("b"));
  p = renameSample(p, "a", "  Kick  ");
  assert.equal(p.samples[0].name, "Kick");
  assert.equal(renameSample(p, "a", "   ").samples[0].name, "Kick");
  assert.deepEqual(removeSample(p, "a").samples.map((s) => s.id), ["b"]);
});

test("sanitise drops junk and duplicates and ignores old instruments", () => {
  const p = sanitiseProject({ samples: [sample("a"), sample("a"), { id: 5 }, null, { ...sample("b"), source: "weird", name: "" }], instruments: [{ id: "i1", pads: { C3: "a" } }] });
  assert.deepEqual(p.samples.map((s) => [s.id, s.source, s.name]), [["a", "upload", "a"], ["b", "upload", "Sample"]]);
  assert.deepEqual(Object.keys(p), ["version", "samples"]);
  assert.deepEqual(sanitiseProject("nope"), emptyProject());
});

test("uniqueId skips taken ids", () => {
  const first = uniqueId("s", [], () => 0.5);
  const rolls = [0.5, 0.25];
  let n = 0;
  assert.equal(uniqueId("s", [first], () => rolls[n++]), uniqueId("s", [], () => 0.25));
});
```
Run: `npx tsx --test src/features/sampler/model/project.test.ts` → FAIL (`instruments` still returned).

`model/project.ts`: keep `emptyProject` (now `{ version: 1, samples: [] }`), `clean`, `num`, `uniqueId`, `addSample`, `renameSample`; `sanitiseProject` returns `{ version: 1, samples }` (delete the instruments loop); `removeSample` becomes `({ ...p, samples: p.samples.filter((s) => s.id !== id) })`. Delete `addInstrument`, `removeInstrument`, `patchInstrument`, `renameInstrument`, `setEnvelope`, `setPad`, `clearPad`, `movePad`, `nextFreeNote`, `SHARPS`, `NOTE_RANGE`, `guessNote`, `engineId`, and the `noteToMidi` and `INSTRUMENT_PREFIX` imports.
Run again → PASS.

- [ ] **Step 2: `library.ts`**

```ts
// src/features/sampler/library.ts
"use client";

import { useSyncExternalStore } from "react";
import { getAudioContext, getOutputBus } from "@/features/sound";
import { detectRoot } from "./model/detectRoot";
import * as P from "./model/project";
import type { SampleMeta, SampleSource } from "./model/types";
import { forgetSample } from "./sampleUrls";
import { getStore } from "./store/idb";

/** The sample library: one per browser (IndexedDB), shared by every panel on the page. */
interface LibraryState { samples: SampleMeta[]; ready: boolean; error: string | null }

let project = P.emptyProject();
let state: LibraryState = { samples: [], ready: false, error: null };
const listeners = new Set<() => void>();
const SERVER: LibraryState = { samples: [], ready: false, error: null };

const emit = (patch: Partial<LibraryState> = {}) => {
  state = { ...state, samples: project.samples, ...patch };
  listeners.forEach((l) => l());
};

let loading: Promise<void> | null = null;
const load = () =>
  (loading ??= getStore()
    .loadProject()
    .then((raw) => {
      project = P.sanitiseProject(raw);
      emit({ ready: true });
    })
    .catch(() => emit({ ready: true, error: "Could not open saved samples." })));

const commit = (next: typeof project) => {
  project = next;
  emit();
  getStore().saveProject(next).catch(() => emit({ error: "Could not save." }));
};

const decode = async (blob: Blob): Promise<AudioBuffer> => getAudioContext().decodeAudioData(await blob.arrayBuffer());

export const sampleLibrary = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    void load();
    return () => {
      listeners.delete(fn);
    };
  },
  get: () => state,
  async addAudio(blob: Blob, name: string, source: SampleSource, prompt?: string): Promise<SampleMeta> {
    await load();
    const id = P.uniqueId("s", project.samples.map((s) => s.id));
    const meta: SampleMeta = { id, name: name.replace(/\.[^.]+$/, "").slice(0, 60) || "Sample", source, prompt, mime: blob.type || "audio/mpeg", bytes: blob.size, createdAt: Date.now() };
    await getStore().putAudio(id, blob);
    commit(P.addSample(project, meta));
    return meta;
  },
  /** A dropped or uploaded file. Throws a message to show when the browser cannot play it; then nothing is stored. */
  async addFile(file: File): Promise<SampleMeta> {
    try {
      await decode(file);
    } catch {
      throw new Error(`${file.name} is not audio this browser can play.`);
    }
    return sampleLibrary.addAudio(file, file.name, "upload");
  },
  async remove(id: string) {
    commit(P.removeSample(project, id));
    forgetSample(id);
    await getStore().deleteAudio(id);
  },
  rename: (id: string, name: string) => commit(P.renameSample(project, id, name)),
  clearError: () => emit({ error: null }),
};

export function useSampleLibrary(): LibraryState {
  return useSyncExternalStore(sampleLibrary.subscribe, sampleLibrary.get, () => SERVER);
}

/** Play a stored sample once on the app's output. */
export async function previewSample(id: string): Promise<void> {
  const blob = await getStore().getAudio(id);
  if (!blob) return;
  const ctx = getAudioContext();
  if (ctx.state === "suspended") await ctx.resume();
  const src = ctx.createBufferSource();
  src.buffer = await decode(blob);
  src.connect(getOutputBus());
  src.start();
}

/** The note a stored sample sounds at (see detectRoot), or null. */
export async function detectSampleRoot(id: string): Promise<number | null> {
  const blob = await getStore().getAudio(id);
  if (!blob) return null;
  const buf = await decode(blob);
  return detectRoot(buf.getChannelData(0), buf.sampleRate);
}
```

- [ ] **Step 3: Remove the page and the old pieces**

```bash
git rm src/app/sampler/page.tsx src/features/sampler/SamplerApp.tsx src/features/sampler/SamplerSync.tsx src/features/sampler/sync.ts src/features/sampler/bundle.ts src/features/sampler/useSampler.ts
```
`PageShell.tsx`: delete the `SamplerSync` import and `<SamplerSync />`. (There is no `/sampler` nav link to remove; confirm with `grep -rn '"/sampler"' src` → no output.)
`index.ts`:
```ts
/**
 * The sampler: a library of samples, uploaded or generated by a provider (ElevenLabs), that the looper's instruments play.
 *
 *   model/    the library, the instrument sound specs and root detection: pure and tested
 *   server/   provider list, request checks, key choice, rate limit and the ElevenLabs call: server only apart from providers.ts
 *   store/    where the library and audio persist (IndexedDB; the interface allows a cloud store later)
 *
 * Imports only the sound feature, the tuner's pitch maths and the shared components. Never the looper, the creator or the guitar tools.
 */
export { makeGeneratorVoice, type GeneratorVoice } from "./generatorVoice";
export { detectSampleRoot, previewSample, sampleLibrary, useSampleLibrary } from "./library";
export type { SoundSpec } from "./model/sound";
export type { SampleMeta } from "./model/types";
```

- [ ] **Step 4: Run**: `npm test && npx tsc --noEmit && npm run lint` → PASS / clean. Also `npm run build` once: no `/sampler` route, the API route still builds.

- [ ] **Step 5: Commit**

```bash
git add -A src
git commit -m "Sampler: shared sample library store; the /sampler page and its instruments are retired"
```

### Task 10: Soundboard, controller and generator pickers, Add input

**Files:**
- Create: `src/components/looper/Soundboard.tsx`
- Modify: `src/components/looper/GeneratorPanel.tsx`, `src/components/looper/InstrumentPanel.tsx`, `src/components/looper/Mixer.tsx` (AddInputModal)

**Interfaces:**
- Consumes: `PAD_BASE`, `PAD_KEYS`, `padIndexOf`, `CONTROLLERS`, `CONTROLLER_NAMES`, `MIN_PADS`, `MAX_PADS`, `withGenerator` (Task 1); `midiToName`, `type ScaleVoice` from `@/features/sound`.
- Produces: `Soundboard({ pads, voice, labels, warn, selected, onSelect })` where `labels: (string | null)[]`, `warn: boolean[]`, `selected: number`, `onSelect(i)`; `GeneratorPanel({ inst, set, selected, onSelect })`.

- [ ] **Step 1: `Soundboard.tsx`**

```tsx
// src/components/looper/Soundboard.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ScaleVoice } from "@/features/sound";
import { PAD_BASE, PAD_KEYS, padIndexOf } from "@/lib/looper/instrumentModel";

const typing = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA" || el.isContentEditable);
};
const keyLabel = (code: string) => code.replace(/^Key|^Digit/, "");

/** A grid of pads, clicked or played from the computer keys (number row, then Q, A and Z rows). Pad i plays note PAD_BASE + i. */
export default function Soundboard({ pads, voice, labels, warn, selected, onSelect }: { pads: number; voice: ScaleVoice; labels: (string | null)[]; warn: boolean[]; selected: number; onSelect: (i: number) => void }) {
  const [down, setDown] = useState<ReadonlySet<number>>(new Set());
  const held = useRef(new Map<string, number>());

  const press = useCallback((tag: string, i: number) => {
    if (held.current.has(tag)) return;
    held.current.set(tag, i);
    voice.noteOn(PAD_BASE + i);
    setDown(new Set(held.current.values()));
  }, [voice]);
  const release = useCallback((tag: string) => {
    const i = held.current.get(tag);
    if (i === undefined) return;
    held.current.delete(tag);
    voice.noteOff(PAD_BASE + i);
    setDown(new Set(held.current.values()));
  }, [voice]);
  const releaseAll = useCallback(() => {
    held.current.clear();
    voice.allOff();
    setDown(new Set());
  }, [voice]);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return;
      const i = padIndexOf(e.code, pads);
      if (i === null) return;
      e.preventDefault();
      press(e.code, i);
    };
    const onUp = (e: KeyboardEvent) => release(e.code);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", releaseAll);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", releaseAll);
      releaseAll();
    };
  }, [pads, press, release, releaseAll]);

  return (
    <div className="grid w-[34rem] max-w-full grid-cols-4 gap-1.5 p-2 sm:grid-cols-8" role="group" aria-label="Pads">
      {Array.from({ length: pads }, (_, i) => {
        const on = down.has(i);
        return (
          <button
            key={i}
            type="button"
            tabIndex={-1}
            aria-pressed={selected === i}
            aria-label={`Pad ${i + 1}${labels[i] ? `: ${labels[i]}` : ""}, key ${keyLabel(PAD_KEYS[i])}`}
            onPointerDown={(e) => { e.preventDefault(); onSelect(i); press(`p${i}`, i); }}
            onPointerUp={() => release(`p${i}`)}
            onPointerLeave={() => release(`p${i}`)}
            onPointerCancel={() => release(`p${i}`)}
            className={`relative flex h-14 select-none flex-col items-start justify-between rounded-lg border p-1.5 text-left leading-none transition-colors ${on ? "border-amber-300 bg-amber-400 text-slate-900" : selected === i ? "border-sky-400 bg-sky-500/10 text-slate-100" : "border-slate-700 bg-slate-900 text-slate-200"}`}
          >
            <span className="text-[10px] opacity-70">{keyLabel(PAD_KEYS[i])}</span>
            <span className="w-full truncate text-[10px]">{labels[i] ?? ""}</span>
            {warn[i] && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-amber-400" title="Sample missing: choose another" />}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: `GeneratorPanel.tsx` gains the pickers, pad count and pad notes**

Replace the file with:
```tsx
"use client";

import { midiToName, useInstrumentOptions } from "@/features/sound";
import type { InstrumentPatch } from "@/lib/looper/actions";
import { CONTROLLERS, CONTROLLER_NAMES, MAX_PADS, MIN_PADS, withGenerator, type Controller } from "@/lib/looper/instrumentModel";
import type { Inst } from "./instrumentView";

export const field = "h-7 rounded-md border border-slate-700 bg-slate-900 px-1.5 text-xs text-slate-100";
/** C2 to C7 */
export const NOTE_CHOICES = Array.from({ length: 61 }, (_, i) => 36 + i);

/** Under the keys or pads: what you play, what makes the sound, and its settings. */
export default function GeneratorPanel({ inst, set, selected, onSelect }: { inst: Inst; set: (p: InstrumentPatch) => void; selected: number; onSelect: (i: number) => void }) {
  const options = useInstrumentOptions();
  const g = inst.generator;
  return (
    <div className="flex flex-col gap-1.5 border-t border-slate-800 px-2 py-2 text-xs text-slate-400">
      <div className="flex flex-wrap items-center gap-1.5">
        <select className={field} value={inst.controller} aria-label="Controller" title="What you play" onChange={(e) => { set({ controller: e.target.value as Controller }); e.target.blur(); }}>
          {CONTROLLERS.map((c) => <option key={c} value={c}>{CONTROLLER_NAMES[c]}</option>)}
        </select>
        <select className={field} value={g.kind} aria-label="Sound generator" title="What makes the sound" onChange={(e) => { set({ generator: withGenerator(inst, e.target.value as "piano" | "sampler").generator }); e.target.blur(); }}>
          <option value="piano">Piano</option>
          <option value="sampler">Sampler</option>
        </select>
        {inst.controller === "soundboard" && (
          <label className="flex items-center gap-1">Pads
            <input type="number" className={`${field} w-14`} min={MIN_PADS} max={MAX_PADS} value={inst.pads} onChange={(e) => e.target.value && set({ pads: Number(e.target.value) })} />
          </label>
        )}
        {g.kind === "piano" && (
          <select className={field} value={g.instrument} aria-label="Sound" title="Sound" onChange={(e) => { set({ generator: { ...g, instrument: e.target.value } }); e.target.blur(); }}>
            {!options.some((o) => o.value === g.instrument) && <option value={g.instrument}>{g.instrument}</option>}
            {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}
      </div>
      {g.kind === "piano" && inst.controller === "soundboard" && (
        <div className="grid grid-cols-4 gap-1 sm:grid-cols-8">
          {g.padNotes.map((n, i) => (
            <select key={i} className={`${field} ${selected === i ? "!border-sky-400" : ""}`} value={n} aria-label={`Pad ${i + 1} note`} onFocus={() => onSelect(i)} onChange={(e) => { set({ generator: { ...g, padNotes: g.padNotes.map((x, j) => (j === i ? Number(e.target.value) : x)) } }); e.target.blur(); }}>
              {NOTE_CHOICES.map((m) => <option key={m} value={m}>{midiToName(m)}</option>)}
            </select>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2b: Move the two pickers into the strip (spec section 7)**

Remove the Controller and Sound generator `<select>`s from `GeneratorPanel` (keep the pad count, the Sound select and the pad notes there). Create `src/components/looper/InstrumentEdit.tsx`:
```tsx
"use client";

import type { LooperEngine } from "@/lib/looper/engine";
import { CONTROLLERS, CONTROLLER_NAMES, withGenerator, type Controller } from "@/lib/looper/instrumentModel";
import { field } from "./GeneratorPanel";
import type { Inst } from "./instrumentView";

/** Behind an instrument strip's pencil: what you play and what makes the sound. */
export default function InstrumentEdit({ engine, inst }: { engine: LooperEngine; inst: Inst }) {
  const set = (patch: Parameters<LooperEngine["setInstrument"]>[1]) => engine.do({ type: "instrument.set", id: inst.id, patch });
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
      <label className="flex items-center gap-1">Play with
        <select className={field} value={inst.controller} aria-label="Controller" onChange={(e) => { set({ controller: e.target.value as Controller }); e.target.blur(); }}>
          {CONTROLLERS.map((c) => <option key={c} value={c}>{CONTROLLER_NAMES[c]}</option>)}
        </select>
      </label>
      <label className="flex items-center gap-1">Sound
        <select className={field} value={inst.generator.kind} aria-label="Sound generator" onChange={(e) => { set({ generator: withGenerator(inst, e.target.value as "piano" | "sampler").generator }); e.target.blur(); }}>
          <option value="piano">Piano</option>
          <option value="sampler">Sampler</option>
        </select>
      </label>
    </div>
  );
}
```
In `InputStrip` (Mixer.tsx), for instruments add a pencil after the play button, folding with `useFold(\`in:${inp.id}:instrument\`, false)` from `./fold`:
```tsx
        {inst && <button type="button" className={ibtn} aria-pressed={editOpen} onClick={toggleEdit} title={editOpen ? "Done" : "Controller and sound"} aria-label={editOpen ? `Done editing ${inp.name}` : `Edit ${inp.name}`}><Icon name="pencil" /></button>}
```
and under the strip's top row: `{inst && editOpen && <InstrumentEdit engine={engine} inst={inst} />}`. (`useFold` is a hook: call it unconditionally at the top of `InputStrip`.)

- [ ] **Step 3: `InstrumentPanel.tsx` shows the Soundboard and holds the selected pad**

```tsx
"use client";

import { useState } from "react";
import { Piano, ScalePiano, midiToName } from "@/features/sound";
import type { InstrumentPatch } from "@/lib/looper/actions";
import type { LooperEngine, LooperSnapshot } from "@/lib/looper/engine";
import GeneratorPanel from "./GeneratorPanel";
import Soundboard from "./Soundboard";

/** An instrument's play window: its controller (keyboard, scale keys or pads) playing the routed voice, then its sound generator. */
export default function InstrumentPanel({ engine, snap, id }: { engine: LooperEngine; snap: LooperSnapshot; id: string }) {
  const [selected, setSelected] = useState(0);
  const inst = snap.instruments.find((x) => x.id === id);
  const voice = engine.getInstrument(id);
  if (!inst || !voice) return null;
  const set = (patch: InstrumentPatch) => engine.do({ type: "instrument.set", id, patch });
  const g = inst.generator;
  const pad = Math.min(selected, inst.pads - 1);
  return (
    <div className="flex flex-col">
      {inst.controller === "piano" && <div className="p-2"><Piano voice={voice} /></div>}
      {inst.controller === "scalepiano" && (
        <ScalePiano state={inst} hideSound voice={voice} onChange={(p) => set(Object.fromEntries(Object.entries(p).filter(([k]) => k !== "instrument")) as InstrumentPatch)} />
      )}
      {inst.controller === "soundboard" && (
        <Soundboard pads={inst.pads} voice={voice} selected={pad} onSelect={setSelected}
          labels={g.kind === "piano" ? g.padNotes.map((n) => midiToName(n)) : g.padSamples.map(() => null)}
          warn={Array.from({ length: inst.pads }, () => false)} />
      )}
      <GeneratorPanel inst={inst} set={set} selected={pad} onSelect={setSelected} />
    </div>
  );
}
```
(Task 11 fills sampler pad labels and warnings.)

- [ ] **Step 4: Add input offers a Soundboard**

In `AddInputModal`, after the Scale Piano card:
```tsx
          <button type="button" onClick={() => { engine.addInstrumentWithRig("soundboard"); onClose(); }} className="flex flex-col gap-1 rounded-xl border border-slate-700 bg-slate-900 p-4 text-left hover:border-sky-400">
            <Icon name="layout-dashboard" size={28} className="text-sky-300" />
            <span className="text-sm font-medium text-slate-100">Soundboard</span>
            <span className="text-xs text-slate-400">Pads played by click or by the number and letter keys. Each pad plays a note or its own sample. Comes with the piano buses.</span>
          </button>
```
If the card grid has a fixed column count that now overflows, add a column (`sm:grid-cols-…`) so the cards stay in rows at 13-inch width and stack on a phone.

- [ ] **Step 5: Run**: `npm test && npx tsc --noEmit && npm run lint` → PASS / clean. Manually in `npm run dev`: add a Soundboard, open it, press `1` and `2` (two pads light and sound piano notes C4/C#4), change pad 1's note, change the pad count to 12 (`Q` and `W` now play), switch the controller to Scale Piano and back (pad notes kept), undo with Ctrl+Z.

- [ ] **Step 6: Commit**

```bash
git add -A src/components/looper
git commit -m "Looper: Soundboard controller, controller/generator pickers, pad notes"
```

### Task 11: Sampler generator settings (sample, root, Detect, pads)

**Files:**
- Create: `src/features/sampler/SamplePicker.tsx`
- Modify: `src/features/sampler/index.ts`, `src/components/looper/GeneratorPanel.tsx`, `src/components/looper/InstrumentPanel.tsx`, `src/components/looper/instrumentView.ts`, `src/components/looper/Mixer.tsx`

**Interfaces:**
- Consumes: `useSampleLibrary`, `sampleLibrary`, `previewSample`, `detectSampleRoot` (Task 9).
- Produces: `SamplePicker({ value, onChange, label, compact? })` exported from `@/features/sampler`; `missingIn(inst: Inst, have: Set<string>): boolean[]` and `instrumentMissing(inst, have): boolean` in `instrumentView.ts`.

- [ ] **Step 1: `SamplePicker.tsx`**

```tsx
// src/features/sampler/SamplePicker.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { previewSample, sampleLibrary, useSampleLibrary } from "./library";

const small = "grid h-6 w-6 shrink-0 place-items-center rounded-md border border-slate-700 text-slate-300 hover:border-slate-500";

/**
 * Choose a sample from the library. The button shows the chosen one (a warning dot when it is no longer in the library); the list
 * plays, renames and deletes samples too. `null` = none.
 */
export default function SamplePicker({ value, onChange, label, compact = false }: { value: string | null; onChange: (id: string | null) => void; label: string; compact?: boolean }) {
  const lib = useSampleLibrary();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);
  const current = lib.samples.find((s) => s.id === value);
  const missing = lib.ready && !!value && !current;
  return (
    <div ref={box} className="relative flex min-w-0 items-center gap-1">
      <button type="button" className={`flex h-7 min-w-0 flex-1 items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-1.5 text-left text-xs text-slate-100 hover:border-slate-500 ${compact ? "max-w-[7rem]" : "max-w-[14rem]"}`} aria-label={label} aria-expanded={open} title={missing ? "Sample missing: choose another" : label} onClick={() => setOpen(!open)}>
        {missing && <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" />}
        <span className="truncate">{current?.name ?? (missing ? "missing" : "Choose sample")}</span>
      </button>
      {current && !compact && <button type="button" className={small} title="Play the sample" aria-label={`Play ${current.name}`} onClick={() => void previewSample(current.id)}><Icon name="play" size={12} /></button>}
      {open && (
        <ul className="absolute left-0 top-full z-30 mt-1 flex max-h-72 w-64 flex-col gap-0.5 overflow-auto rounded-lg border border-slate-700 bg-slate-950 p-1 shadow-xl" role="listbox" aria-label={label}>
          <li><button type="button" className="w-full rounded px-2 py-1 text-left text-xs text-slate-400 hover:bg-slate-800" onClick={() => { onChange(null); setOpen(false); }}>None</button></li>
          {lib.samples.length === 0 && <li className="px-2 py-1 text-xs text-slate-500">No samples yet. Generate one or drop a file.</li>}
          {lib.samples.map((s) => (
            <li key={s.id} className={`flex items-center gap-1 rounded px-1 ${s.id === value ? "bg-sky-500/10" : ""}`} role="option" aria-selected={s.id === value}>
              <button type="button" className={small} title="Play" aria-label={`Play ${s.name}`} onClick={() => void previewSample(s.id)}><Icon name="play" size={11} /></button>
              <input className="min-w-0 flex-1 bg-transparent text-xs text-slate-100 outline-none focus-visible:underline" value={s.name} aria-label="Sample name" title={s.prompt ?? s.name} onChange={(e) => sampleLibrary.rename(s.id, e.target.value)} />
              <button type="button" className={small} title="Use this sample" aria-label={`Use ${s.name}`} onClick={() => { onChange(s.id); setOpen(false); }}><Icon name="check" size={11} /></button>
              <button type="button" className={`${small} hover:!border-rose-400`} title="Delete from the library" aria-label={`Delete ${s.name}`} onClick={() => { if (window.confirm(`Delete ${s.name}? Instruments using it go silent.`)) void sampleLibrary.remove(s.id); }}><Icon name="trash" size={11} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```
Export it: `export { default as SamplePicker } from "./SamplePicker";` in `index.ts`.

- [ ] **Step 2: `instrumentView.ts` missing-sample helpers**

```ts
/** Which pads (Soundboard) point at a sample the library no longer has. */
export function missingIn(inst: Inst, have: Set<string>): boolean[] {
  const g = inst.generator;
  return g.kind === "sampler" ? g.padSamples.map((s) => !!s && !have.has(s)) : Array.from({ length: inst.pads }, () => false);
}

/** True when what this instrument plays needs a sample the library no longer has. */
export function instrumentMissing(inst: Inst, have: Set<string>): boolean {
  const g = inst.generator;
  if (g.kind !== "sampler") return false;
  return inst.controller === "soundboard" ? missingIn(inst, have).some(Boolean) : !!g.sample && !have.has(g.sample);
}
```

- [ ] **Step 3: `GeneratorPanel.tsx` sampler section**

Add imports `useState`, `Icon from "../Icon"`, `{ SamplePicker, detectSampleRoot, sampleLibrary } from "@/features/sampler"`. After the piano pad-notes block, add:
```tsx
      {g.kind === "sampler" && inst.controller !== "soundboard" && (
        <div className="flex flex-wrap items-center gap-1.5">
          <SamplePicker label="Sample" value={g.sample ?? null} onChange={(id) => set({ generator: { ...g, sample: id ?? undefined } })} />
          <select className={field} value={g.root} aria-label="Root note" title="The note the sample sounds at" onChange={(e) => { set({ generator: { ...g, root: Number(e.target.value) } }); e.target.blur(); }}>
            {NOTE_CHOICES.map((m) => <option key={m} value={m}>{midiToName(m)}</option>)}
          </select>
          <button type="button" className={`${field} inline-flex items-center gap-1`} disabled={!g.sample} title="Find the note the sample sounds at" onClick={() => void detect()}>
            <Icon name="activity" size={12} />Detect
          </button>
        </div>
      )}
      {g.kind === "sampler" && inst.controller === "soundboard" && (
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
          {g.padSamples.map((sid, i) => (
            <div key={i}
              className={`flex items-center gap-1 rounded-md border p-1 ${selected === i ? "border-sky-400" : "border-slate-800"}`}
              onPointerDown={() => onSelect(i)}
              onDragOver={(e) => { if (Array.from(e.dataTransfer.types).includes("Files")) e.preventDefault(); }}
              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); const f = e.dataTransfer.files[0]; if (f) void dropOnPad(i, f); }}>
              <span className="w-5 text-center text-[10px] text-slate-500">{i + 1}</span>
              <SamplePicker compact label={`Pad ${i + 1} sample`} value={sid} onChange={(id) => set({ generator: { ...g, padSamples: g.padSamples.map((x, j) => (j === i ? id : x)) } })} />
            </div>
          ))}
        </div>
      )}
      {msg && <p role="alert" className="text-xs text-rose-300">{msg}</p>}
```
and inside the component, before `return`:
```tsx
  const [msg, setMsg] = useState<string | null>(null);
  const detect = async () => {
    if (g.kind !== "sampler" || !g.sample) return;
    setMsg(null);
    const root = await detectSampleRoot(g.sample).catch(() => null);
    if (root === null) setMsg("No clear pitch.");
    else set({ generator: { ...g, root } });
  };
  const dropOnPad = async (i: number, file: File) => {
    if (g.kind !== "sampler") return;
    setMsg(null);
    try {
      const meta = await sampleLibrary.addFile(file);
      set({ generator: { ...g, padSamples: g.padSamples.map((x, j) => (j === i ? meta.id : x)) } });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not add the file.");
    }
  };
```
(Hooks go above any early return; there is none in this component.)

- [ ] **Step 4: Labels and warnings in the Soundboard and the strip chip**

`InstrumentPanel.tsx`: `const lib = useSampleLibrary();` (import from `@/features/sampler`), `const have = new Set(lib.samples.map((s) => s.id));`, `const names = Object.fromEntries(lib.samples.map((s) => [s.id, s.name]));` and pass to `Soundboard`:
```tsx
          labels={g.kind === "piano" ? g.padNotes.map((n) => midiToName(n)) : g.padSamples.map((s) => (s ? names[s] ?? "missing" : null))}
          warn={lib.ready ? missingIn(inst, have) : Array.from({ length: inst.pads }, () => false)}
```
(no warnings while the library loads). Call the hooks before the early `return null`.
`Mixer.tsx` `InputStrip`: `const lib = useSampleLibrary();` and the chip becomes
```tsx
        {inst && (() => {
          const have = new Set(lib.samples.map((s) => s.id));
          const names = Object.fromEntries(lib.samples.map((s) => [s.id, s.name]));
          return (
            <span className="flex max-w-[9rem] items-center gap-1 truncate rounded-md border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-400" title="Sound generator">
              {lib.ready && instrumentMissing(inst, have) && <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" title="A sample is missing" />}
              <span className="truncate">{generatorChip(inst, names)}</span>
            </span>
          );
        })()}
```

- [ ] **Step 5: Run**: `npm test && npx tsc --noEmit && npm run lint` → PASS / clean. Manually: on a Soundboard with the Sampler generator, drop a WAV on pad 1 (it appears in the pad and plays on `1`); on a Piano with the Sampler generator, pick that sample, press Detect, play keys (pitched); delete the sample from the picker (warning dots appear, pads silent, no beep).

- [ ] **Step 6: Commit**

```bash
git add -A src
git commit -m "Looper: sampler generator settings (sample, root, Detect, pad samples, drop on a pad)"
```

### Task 12: Add samples from the looper (Generate, upload, drop, keys)

**Files:**
- Create: `src/features/sampler/settings.ts`, `src/features/sampler/AddSample.tsx`
- Modify: `src/features/sampler/index.ts`, `src/components/looper/GeneratorPanel.tsx`

**Interfaces:**
- Consumes: `fetchCapabilities`, `generateSample` (`client.ts`, unchanged), `sampleLibrary` (Task 9).
- Produces: `AddSample({ onAdded }: { onAdded: (meta: SampleMeta) => void })` exported from `@/features/sampler`; `readSettings()`, `writeSettings(s)`, `type Settings` in `settings.ts`.

- [ ] **Step 1: `settings.ts`** (the key settings from the old page, same storage key so saved passwords survive)

```ts
// src/features/sampler/settings.ts
const KEY = "musickit.sampler.settings";

export interface Settings {
  sitePassword: string;
  /** a person's own key for each provider, by provider id */
  ownKeys: Record<string, string>;
  /** keep own keys in this browser */
  remember: boolean;
}

export function readSettings(): Settings {
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) ?? "null");
    if (v && typeof v === "object") {
      const keys: Record<string, string> = {};
      if (v.ownKeys && typeof v.ownKeys === "object") for (const [k, x] of Object.entries(v.ownKeys)) keys[k] = String(x);
      else if (v.ownKey) keys.elevenlabs = String(v.ownKey);
      return { sitePassword: String(v.sitePassword ?? v.accessCode ?? ""), ownKeys: keys, remember: Boolean(v.remember) };
    }
  } catch {
    /* ignore */
  }
  return { sitePassword: "", ownKeys: {}, remember: false };
}

/** Own keys are written only when the person asked to remember them. */
export function writeSettings(s: Settings) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s.remember ? s : { ...s, ownKeys: {} }));
  } catch {
    /* ignore */
  }
}
```

- [ ] **Step 2: `AddSample.tsx`**

```tsx
// src/features/sampler/AddSample.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { fetchCapabilities, generateSample } from "./client";
import { sampleLibrary } from "./library";
import type { SampleMeta } from "./model/types";
import type { Capabilities } from "./server/providers";
import { readSettings, writeSettings, type Settings } from "./settings";

const btn = "inline-flex h-7 items-center justify-center gap-1 rounded-md border border-slate-700 px-2 text-xs text-slate-200 hover:border-slate-500 disabled:opacity-40";
const field = "h-7 rounded-md border border-slate-700 bg-slate-900 px-2 text-xs text-slate-100";

/**
 * Add a sample to the library: generate it from a description (ElevenLabs, with the site's key and password or a person's own key),
 * upload files, or drop them anywhere on `children`. Each new sample goes to `onAdded`. Failures show inline and add nothing.
 */
export default function AddSample({ onAdded, children }: { onAdded: (meta: SampleMeta) => void; children?: React.ReactNode }) {
  const [caps, setCaps] = useState<Capabilities | null>(null);
  const [settings, setSettings] = useState<Settings>({ sitePassword: "", ownKeys: {}, remember: false });
  const [showKeys, setShowKeys] = useState(false);
  const [providerId, setProviderId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [seconds, setSeconds] = useState(2);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSettings(readSettings());
    void fetchCapabilities().then(setCaps);
  }, []);

  const save = (next: Settings) => {
    setSettings(next);
    writeSettings(next);
  };
  const provider = caps?.providers.find((p) => p.id === providerId) ?? caps?.providers[0];
  const ownKey = (provider && settings.ownKeys[provider.id]) || "";
  const canGenerate = !!provider && (!!ownKey.trim() || (!!provider.server && !!settings.sitePassword.trim()));

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    setMessage(null);
    for (const f of Array.from(files)) {
      try {
        onAdded(await sampleLibrary.addFile(f));
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Could not add the file.");
      }
    }
  };

  const onGenerate = async () => {
    if (!provider || !prompt.trim() || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const blob = await generateSample({ provider: provider.id, prompt, seconds, sitePassword: settings.sitePassword, ownKey });
      onAdded(await sampleLibrary.addAudio(blob, prompt.slice(0, 40), "elevenlabs", prompt));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`flex flex-col gap-1.5 rounded-lg ${over ? "outline outline-2 outline-dashed outline-sky-400" : ""}`}
      onDragOver={(e) => {
        if (!Array.from(e.dataTransfer.types).includes("Files")) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        void onFiles(e.dataTransfer.files);
      }}
    >
      {children}
      <div className="flex flex-wrap items-center gap-1">
        <input className={`${field} min-w-0 flex-1`} value={prompt} maxLength={300} placeholder="Describe a sound: glass hit, soft pad in C" aria-label="Describe a sound" onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void onGenerate()} />
        <input className={`${field} w-14`} type="number" min={provider?.minSeconds ?? 0.5} max={provider?.maxSeconds ?? 22} step={0.5} value={seconds} aria-label="Seconds" title="Seconds" onChange={(e) => setSeconds(Number(e.target.value))} />
        <button type="button" className={btn} disabled={!canGenerate || busy || !prompt.trim()} title={canGenerate ? `Generate with ${provider?.label}` : "Needs a key: open the key settings"} aria-label="Generate" onClick={() => void onGenerate()}>
          <Icon name="sparkles" size={13} />{busy ? "…" : ""}
        </button>
        <button type="button" className={btn} title="Upload audio files, or drop them here" aria-label="Upload audio files" onClick={() => fileRef.current?.click()}>
          <Icon name="upload" size={13} />
        </button>
        <button type="button" className={btn} aria-pressed={showKeys} title="Keys and access" aria-label="Keys and access" onClick={() => setShowKeys(!showKeys)}>
          <Icon name="key-round" size={13} />
        </button>
        <input ref={fileRef} type="file" accept="audio/*" multiple hidden onChange={(e) => { void onFiles(e.target.files); e.target.value = ""; }} />
      </div>
      {showKeys && (
        <div className="grid gap-1 rounded-md border border-slate-800 p-2 text-xs text-slate-400">
          {caps && caps.providers.length > 1 && (
            <label className="flex items-center gap-2">Provider
              <select className={`${field} flex-1`} value={provider?.id ?? ""} onChange={(e) => setProviderId(e.target.value)}>
                {caps.providers.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </label>
          )}
          <label className="flex items-center gap-2">Site password
            <input className={`${field} flex-1`} type="password" autoComplete="off" value={settings.sitePassword} placeholder={provider?.server ? `unlocks this site's ${provider.label} key` : "this site holds no key for this provider"} disabled={!provider?.server} onChange={(e) => save({ ...settings, sitePassword: e.target.value })} />
          </label>
          <label className="flex items-center gap-2">Your {provider?.label ?? "provider"} key
            <input className={`${field} flex-1`} type="password" autoComplete="off" value={ownKey} onChange={(e) => provider && save({ ...settings, ownKeys: { ...settings.ownKeys, [provider.id]: e.target.value } })} />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={settings.remember} onChange={(e) => save({ ...settings, remember: e.target.checked })} />
            Remember my keys in this browser
          </label>
        </div>
      )}
      {message && <p role="alert" className="text-xs text-rose-300">{message}</p>}
    </div>
  );
}
```
Export: `export { default as AddSample } from "./AddSample";` in `index.ts`.

- [ ] **Step 2b: Wire it into `GeneratorPanel.tsx`**

Move the two sampler blocks from Task 11 (the `g.kind === "sampler" && inst.controller !== "soundboard"` row and the `g.kind === "sampler" && inst.controller === "soundboard"` grid) inside one `AddSample`, so a drop anywhere on the sampler settings adds and assigns. The result:
```tsx
      {g.kind === "sampler" && (
        <AddSample onAdded={(meta) => set({ generator: inst.controller === "soundboard" ? { ...g, padSamples: g.padSamples.map((x, j) => (j === selected ? meta.id : x)) } : { ...g, sample: meta.id } })}>
          {inst.controller !== "soundboard" && (
            <div className="flex flex-wrap items-center gap-1.5">{/* SamplePicker, root select, Detect: exactly as in Task 11 Step 3 */}</div>
          )}
          {inst.controller === "soundboard" && (
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">{/* the pad cells: exactly as in Task 11 Step 3 */}</div>
          )}
        </AddSample>
      )}
      {msg && <p role="alert" className="text-xs text-rose-300">{msg}</p>}
```
The inner `g.kind === "sampler"` checks become redundant inside the wrapper; drop them.
Import `AddSample` from `@/features/sampler`. The pad cells keep their own `onDrop` with `stopPropagation`, so a drop on a pad goes to that pad and a drop elsewhere to the selected pad.

- [ ] **Step 3: Run**: `npm test && npx tsc --noEmit && npm run lint` → PASS / clean. Manually: with no key, Generate is disabled and its title says a key is needed; with a bad own key, the route's fixed message shows under the row and nothing is assigned; upload two files on a Soundboard with pad 3 selected: both land on pad 3 in turn (last one wins). The live ElevenLabs call cannot be checked without a key: say so in the report.

- [ ] **Step 4: Commit**

```bash
git add -A src/features/sampler src/components/looper/GeneratorPanel.tsx
git commit -m "Looper: add samples (generate with ElevenLabs, upload, drop) from an instrument's sampler"
```

---

## Stage 4: docs, rules, final check

### Task 13: Specs, rules and the end-to-end browser check

**Files:**
- Modify: `spec/looper.md`, `spec/sampler.md`, `spec/sound.md`, `spec/looper-actions.md`, `src/lib/looper/CLAUDE.md`, `src/features/sampler/CLAUDE.md`; any other spec mentioning `/sampler` (`grep -rn "/sampler\|Sampler page" spec README.md`).

- [ ] **Step 1: `spec/looper.md`**

- Intro (line 3): the app hands the engine a shared `AudioContext` and the instruments' voice (`createVoice`), no extra source node.
- Inputs paragraph (line 43): strips are audio devices, instruments or sequencers; the defaults are the guitar, the vocal, a Piano instrument with the piano buses and one Scale Piano instrument with theirs; Add input offers Piano, Scale Piano and Soundboard, each with the piano buses.
- Replace the "Scale Piano" section with "Instruments": one input = a controller (Piano: on-screen and MIDI keyboard; Scale Piano: as before; Soundboard: 1–32 pads, keys `1–0`, `Q–P`, `A–L`, `Z–M`, pad i = note 36+i) and a sound generator (Piano: the built-in sampled instruments, each pad a chosen note on a Soundboard; Sampler: one sample tuned across the keys with its root note and Detect, or one sample per pad, unpitched). Samples are generated (ElevenLabs), uploaded or dropped, and live in the browser's sample library (IndexedDB `musickit-sampler`). A missing sample is silent with a warning dot. Changes are `instrument.set` actions. Saved in `musickit.looper.instruments`; old `extra` and `scalepiano` strips (and `musickit.looper.scalePianos`) are migrated once on load with the same strip ids; old sampler-page instruments fall back to the Piano.
- Line 153 (Inputs widget): "devices and instruments", "for each instrument, a button that brings its play window on screen".
- Line 187 (New project): `instruments` instead of `scalePianos`, "the instrument windows".
- Line 215: "one Scale Piano instrument (C major)… More instruments can be added any time (Add: Piano, Scale Piano, Soundboard). An instrument that is patched is heard only through the patch."

- [ ] **Step 2: `spec/sampler.md`** (rewrite)

```markdown
# Sampler

The sound generator of looper instruments (see `spec/looper.md`, Instruments). There is no page of its own any more.

## Library
- **Sample**: audio blob plus `SampleMeta` (name, source `upload` | `elevenlabs`, prompt). One library per browser: IndexedDB `musickit-sampler`, stores `project` (the sample list) and `audio` (blobs by sample id). Old saves' instruments are ignored.
- Added from an instrument's sampler settings: Generate (prompt + seconds), upload, or drop files there or on a pad. A file the browser cannot decode is refused with a message and not stored. A new sample is assigned to the selected pad (Soundboard) or as the instrument's sample.
- The sample picker plays, renames and deletes samples. Deleting a sample leaves instruments pointing at it silent, with a warning dot, until another is chosen.

## Playing
- `makeGeneratorVoice` (injected by `LooperApp`) turns an instrument's sound spec into a sample player: a hidden runtime instrument per instrument. Pitched: the sample on its root note, other notes tuned by playback rate. Pads: one sample per pad note, `strict` (no tuning from a neighbour; empty pads are silent).
- **Detect** finds the root: YIN over short windows of the first 4 s, median of the pitched windows, nearest note; "No clear pitch" when fewer than half the windows are pitched.

## Sources
| Source | Status |
|---|---|
| Upload / drop | works |
| ElevenLabs sound generation | works with the site's key + site password, or a person's own key |
| Splice | not built: no public API known, and its samples are licensed |
| Login with a provider account | not built: the option is a person's own API key |

The ElevenLabs endpoint, header and 0.5–22 s duration limits are written from memory and not yet tested against the live service.

## Keys and abuse
(keep the existing section unchanged)

## Not built
Export/import and cloud persistence across devices (`SamplerStore` is the seam).
```

- [ ] **Step 3: `spec/sound.md`**: under runtime instruments, document `strict` (exact-note samples only, silent otherwise) and `hidden` (left out of pickers); note the sampler no longer registers `user:` instruments for pickers.

- [ ] **Step 4: `spec/looper-actions.md`**: line 11 becomes "Inputs: `input.add|remove|set` (hardware `device`; set: name, volume, muted, solo, monitor, mode). Instruments: `instrument.set {id, patch}` (controller, root, scale, octave, pads, generator; a generator is replaced whole; undo of a pad count also restores the pad arrays)." Add an `instrument.set` line to the JSON example.

- [ ] **Step 5: `src/lib/looper/CLAUDE.md`**

- Definitions, Inputs: "software (instruments: a controller — Piano, Scale Piano, Soundboard — and a sound generator — Piano or Sampler)".
- Keep it separate: "The app injects what the engine needs through options: `getContext` (shared AudioContext) and `createVoice` (an instrument's sound, told what to play as a `VoiceSpec`; the engine never touches samples or storage). Instruments are heard on master through `toSpeakers` unless patched." Delete the `getExternalSource` / `getKeyboardOut` / `defaultMonitor` keyboard sentences. Looper UI "may use generic shared pieces (`Modal`, `FloatingWindow`, `Piano`, `ScalePiano`) and the public index of `@/features/sound` and `@/features/sampler`, but nothing from chordKit".
- Patch bullet: "a patched instrument's `toSpeakers` is closed too"; `setupKeyboardPiano` = "a Piano instrument with the piano buses"; `setupPianos` = "one Scale Piano instrument".
- Replace the Scale Piano bullet: "Instruments: `instrumentModel.ts` (pure, tested: state, repair, `soundingNote`, `voiceSpec`, `migrateSaves`, pad keys) and `instrument.ts` (routed nodes and the injected voice). The keyboards are the shared `Piano`/`ScalePiano` of `src/features/sound/keyboard` given the instrument as voice; the Soundboard is `Soundboard.tsx`; the play window is `InstrumentPanel` with `GeneratorPanel`. Keep key codes (`KeyboardEvent.code`)."
- Not yet actions: drop "restoring scale pianos"; add "removing an instrument".
- Storage: replace `musickit.looper.scalePianos`, `scalePianoWindow.<id>`, `musickit.looper.keyboard`, `keyboardWindow` with `musickit.looper.instruments`, `musickit.looper.instrumentWindow.<id>` (keep `musickit.looper.keyboard` only if something still reads it: `grep -rn 'looper.keyboard' src`).
- Max inputs: "sequencer and instrument strips count. Add input offers Piano, Scale Piano and Soundboard, each with the piano buses (`addInstrumentWithRig`); the default Piano comes once (`setupKeyboardPiano`)."
- UI: "Each instrument's play window opens from its strip in the mixer (or the Inputs widget)."
- Every iteration step 5: "Commit with the required trailers; push to `main` only when the work is merged there".

- [ ] **Step 6: `src/features/sampler/CLAUDE.md`**

```markdown
# Sampler: rules

The sample library and the sound generator of looper instruments. Behaviour spec: `spec/sampler.md`.

- Imports only `@/features/sound`, `@/features/tuner/pitch` (pure maths) and shared components. Never the looper, creator or guitar tools: the looper imports this feature's public index, never the other way. `SoundSpec` mirrors the looper's `VoiceSpec` by shape.
- Keys never reach the browser. The app's provider key (`ELEVENLABS_API_KEY`) is read only in `src/app/api/sampler/generate/route.ts`, and only used when `SAMPLER_SITE_PASSWORD` is also set and sent. A person's own key travels in the `x-provider-key` header, is forwarded and never stored or logged by the server.
- Never forward a provider's error body to the client (`server/elevenlabs.ts` maps statuses to fixed messages).
- Samples and audio persist through `SamplerStore` (`store/types.ts`). IndexedDB today; a cloud store means a new implementation of the same interface. The library (`library.ts`) is one shared store per page.
- New provider: add it to `PROVIDERS`, a `server/<name>.ts` with an injectable `fetch`, a case in the route, a test.
- Model code (`model/`) is pure and tested. Run the tests and the type check before every commit.
```

- [ ] **Step 7: End-to-end browser check**

With `npm run dev` running, write `$SCRATCH/check2.mjs` (same launch and `addInitScript` counters as Task 5 Step 10) that, from a cleared project:
1. Starts the looper, closes the devices dialog, asserts strips "Piano" and "Piano C major" exist (default rigs after the change).
2. Adds a Soundboard (Add → Input → Soundboard; use the visible labels), opens it ("Play Soundboard"), sets the generator to Sampler, then drops a generated WAV on pad 1:
```js
const wav = (hz, seconds, sr = 44100) => { const n = Math.floor(sr * seconds); const b = new ArrayBuffer(44 + n * 2); const v = new DataView(b); const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0))); w(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, n * 2, true); for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.round(0.4 * 32767 * Math.sin((2 * Math.PI * hz * i) / sr)), true); return [...new Uint8Array(b)]; };
const bytes = wav(440, 0.5);
const dt = await page.evaluateHandle((b) => { const d = new DataTransfer(); d.items.add(new File([new Uint8Array(b)], "beep.wav", { type: "audio/wav" })); return d; }, bytes);
const pad = page.getByRole("button", { name: "Pad 1 sample" }).locator("xpath=ancestor::div[1]");
await pad.dispatchEvent("dragover", { dataTransfer: dt });
await pad.dispatchEvent("drop", { dataTransfer: dt });
await page.waitForTimeout(1000);
await page.evaluate(() => (window.__starts = [], window.__osc = 0));
await page.keyboard.down("Digit1"); await page.waitForTimeout(300); await page.keyboard.up("Digit1");
await page.keyboard.down("Digit2"); await page.waitForTimeout(300); await page.keyboard.up("Digit2"); // empty pad: silent
```
   Expect exactly one start with `dur ≈ 0.5` and `rate === 1`, and `__osc === 0`.
3. Types `hello 1` into "Describe a sound" and asserts no new start (Review Focus 4).
4. Opens "Piano", switches the generator to Sampler, picks "beep" in the Sample picker, sets the root to A4 (or presses Detect and asserts the select shows A4), presses `KeyZ` (C3 on the Piano keyboard's default octave): expect one start with `rate ≈ 2 ** ((48 - 69) / 12)`.
5. Deletes "beep" from the picker (accept the confirm dialog via `page.on("dialog", d => d.accept())`), presses `Digit1` on the Soundboard: no start, no oscillator, and a warning dot is visible (`[title="Sample missing: choose another"]`).
6. Reloads: the Soundboard, its pads and generator are still there (`musickit.looper.instruments` saved).
Print the results and compare against the expectations; fix and re-run until they hold.

- [ ] **Step 8: Final verification**

Run: `npm test && npx tsc --noEmit && npm run lint && npm run build`
Expected: all PASS / clean. `git status` is clean after the commit below.

- [ ] **Step 9: Commit**

```bash
git add -A spec src/lib/looper/CLAUDE.md src/features/sampler/CLAUDE.md
git commit -m "Docs: instruments (controllers + generators), the sampler as a generator, rules updated"
```

Report what was verified in the browser (headless Chromium with fake devices: migration, default rigs, Soundboard pads from a dropped WAV, pitched sampler, missing sample) and what was not (real MIDI keyboards, the live ElevenLabs call, real audio interfaces).

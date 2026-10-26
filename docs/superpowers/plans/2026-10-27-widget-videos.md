# Widget Videos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One command turns a JSON config (a run of melodies, each played N times, with the logo and site address) into a branded MP4 per format (16:9, 9:16), drawn from the app's real widgets.

**Architecture:** A pure model (`src/features/teachers/video/model`) parses the config and turns it into a score: segments of countdown + tune passes, a state for any moment, and the notes and clicks to hear. A hidden page (`/teachers/video/render`) draws the stage layers at the format's pixel size, with two new stage widgets (Melody, Countdown) reading the moment from a context. A node script drives that page in headless Chrome under a fake clock (an init script that owns `performance.now` and `requestAnimationFrame`), screenshots every frame, fetches an offline-rendered WAV from the page, and pipes both into ffmpeg.

**Tech Stack:** Next.js 16 / React 19 (read `node_modules/next/dist/docs/` before touching routes or metadata), TypeScript, Web Audio `OfflineAudioContext`, Playwright 1.62 from the npx cache, ffmpeg at `/opt/homebrew/bin/ffmpeg`, `node:test` via the cached tsx.

**Spec:** `docs/superpowers/specs/2026-10-27-widget-videos-design.md`

## Global Constraints

- Work in the worktree `/Users/pio/projects/musickit/.claude/worktrees/video-export`, branch `worktree-video-export`. No heredocs or chained git commands in Bash there; one git command per call.
- Dev server in this worktree: `npx next dev --webpack -p 3100` (Turbopack fails on the symlinked `node_modules`).
- Tests: `~/.npm/_npx/69f9afb961c37556/node_modules/.bin/tsx --test <files>` (find it with `ls ~/.npm/_npx/*/node_modules/.bin/tsx`; `npx tsx` hangs). Type check: `npx tsc --noEmit 2>&1 | grep -v '^.next/'` must print nothing. Lint: `npx eslint <changed files>`.
- Formats: `16x9` = 1920×1080, `9x16` = 1080×1920. 30 fps. H.264 `yuv420p` + AAC.
- The stage's own rect rules stay unchanged (16:9 `FRAME_ASPECT` snapping; `logo`/`url` pinned by `sanitiseStage`). Videos validate rects themselves.
- `melody` and `countdown` are stage subjects but are **not** in the teacher studio's palette (`entries` in `search.ts`).
- The teacher studio and the Melodies page must behave exactly as before.
- The piano plays every pass; the metronome click is heard on every beat (accent on beat 1); a 4-beat countdown before every tune; repeats of a tune follow straight on.
- One voice per config, required: one of `soprano | mezzo | alto | tenor | baritone | bass`.
- Configs live in `videos/*.json`; output goes to `out/videos/<name>-<format>.mp4` (`/out/` is already git-ignored).
- A bad config fails loudly with the path of the bad field (`timeline[1].tune: …`), never renders.
- Code style: match the surrounding files (JSDoc one-liners on exports, short comments that say why, `KeyboardEvent.code` not relevant here).

## Review Focus

- A config with a 9:16 layout whose melody rect is narrow: the staff must still fit its `beats` across without notes clipped at the rect edge (Task 5 checks a 9:16 frame by eye at the countdown, mid-tune, and the tune change).
- Long videos (5+ min): audio and picture stay together to the last frame (Task 7: last frame's bar position vs. the last click in the WAV, and frame count = `ceil(durationMs / 1000 * 30)`).
- The same config rendered twice gives byte-identical frames (Task 7 determinism check on frames 0, 45 and the last).
- A tune that ends on a long note right before the next countdown: the piano's last note must stop before the next tune's first note, not smear into it (Task 3 test: every step's `at + hold` ≤ the next segment's play start).
- A config whose layer ids in `layers` and in a format's rects don't match (missing, or an extra rect): an error naming the id, not a missing widget (Task 2 tests).

---

### Task 1: Melody and Countdown subjects on the stage

**Files:**
- Modify: `src/features/stage/model/subject.ts` (the `Subject` union, `subjectName`/`subjectTitle`, `sanitiseSubject`)
- Modify: `src/features/stage/model/layers.ts` (`defaultRect`)
- Modify: `src/features/stage/render/StageWidget.tsx` (`WIDTH`; cases render `null` for now, Task 4 fills them)
- Create: `src/features/stage/model/subject.test.ts`
- Modify: `package.json` `test` script only if `src/features/stage/model/*.test.ts` is not already covered (it is; leave it)
- Modify: `spec/studio.md` (one paragraph: the two kinds exist for videos, not in the palette)

**Interfaces:**
- Produces:
  - `Subject` gains `| { kind: "melody"; beats?: number }` (beats across a following staff; absent = the staff's default 10) and `| { kind: "countdown" }`.
  - `MELODY_BEATS = { min: 2, max: 16 }` exported from `subject.ts`.
  - `sanitiseSubject({kind:"melody", beats}, ids)` keeps `beats` only when an integer in `[2, 16]`, else drops the field; `{kind:"countdown"}` passes as is.
  - `subjectTitle`: `"Melody"` and `"Countdown"`.

- [ ] **Step 1: Write the failing tests** in `subject.test.ts`:

```ts
test("a melody keeps a whole number of beats across from 2 to 16", () => {
  assert.deepEqual(sanitiseSubject({ kind: "melody", beats: 6 }, []), { kind: "melody", beats: 6 });
  assert.deepEqual(sanitiseSubject({ kind: "melody", beats: 1 }, []), { kind: "melody" });
  assert.deepEqual(sanitiseSubject({ kind: "melody", beats: 6.5 }, []), { kind: "melody" });
  assert.deepEqual(sanitiseSubject({ kind: "melody" }, []), { kind: "melody" });
});
test("a countdown is a subject", () => assert.deepEqual(sanitiseSubject({ kind: "countdown" }, []), { kind: "countdown" }));
test("names", () => {
  assert.equal(subjectTitle({ kind: "melody", beats: 6 }), "Melody");
  assert.equal(subjectTitle({ kind: "countdown" }), "Countdown");
});
test("neither is offered by the studio's palette", () => {
  const kinds = paletteCatalog([]).flatMap((r) => (r.action.type === "add" ? [r.action.subject.kind] : []));
  assert.ok(!kinds.includes("melody") && !kinds.includes("countdown"));
});
```
(Check `paletteCatalog`'s real signature in `search.ts` and call it the way `search.test.ts` does.)

- [ ] **Step 2: Run** `tsx --test src/features/stage/model/subject.test.ts` → FAIL (unknown kinds return `null`).
- [ ] **Step 3: Implement** the union cases, `sanitiseSubject` cases, titles, `defaultRect` (melody: `{ x: 0.05, y: 0.25, w: 0.9, h: 0.5 }`, countdown: `{ x: 0.3, y: 0.05, w: 0.4, h: 0.18 }`), `WIDTH` (`melody: 1200, countdown: 600`), and `case "melody": case "countdown": return null;` in `StageWidget` for now. TypeScript's exhaustive switches elsewhere (`subjectName`, `subjectIdentity`, `isControl`…) tell you what else needs a case.
- [ ] **Step 4: Run** all stage tests `tsx --test src/features/stage/model/*.test.ts` → PASS; tsc clean.
- [ ] **Step 5: Update `spec/studio.md`**, then commit: `git add src/features/stage spec/studio.md`, then `git commit -m "Stage: melody and countdown subjects, for widget videos; not in the palette"`.

---

### Task 2: Video config: parse and validate

**Files:**
- Create: `src/features/teachers/video/model/config.ts`
- Create: `src/features/teachers/video/model/config.test.ts`
- Create: `src/features/teachers/video/CLAUDE.md` (rules: pure model with tests; never imports the studio app; the render page knows nothing about the script beyond `window.__VIDEO_JOB__` / `window.__video`; spec in `spec/video.md`)
- Modify: `package.json` `test` script: append `src/features/teachers/video/model/*.test.ts`

**Interfaces:**
- Consumes: `sanitiseSubject`, `type Subject`, `type FrameRect` from `@/features/stage`; `VOICES`, `buildLadder`, `type Voice` from `@/features/theory/singing`; `STAGES`, `parseTune` from `@/features/theory/singingMelodies`; `MIN_BPM`, `MAX_BPM` from `@/features/instruments`; `Note.chroma` from `@tonaljs/tonal`.
- Produces:

```ts
export type FormatId = "16x9" | "9x16";
export const FORMATS: Record<FormatId, { width: number; height: number }>; // 1920×1080, 1080×1920
export const FPS = 30;
export interface VideoTune { tune: string; label?: string; times: number; caption: string }
export interface VideoConfig {
  name: string;               // [a-z0-9-]+, used in the output file name
  tonicPc: number;            // from "key": "C" | "F#" | "Bb" …
  scale: string;              // a singing scale slug buildLadder accepts, e.g. "major-ionian"
  bpm: number;
  voice: Voice;
  layers: { id: string; subject: Subject }[];          // in paint order (array order of the config's "layers" object)
  formats: Partial<Record<FormatId, Record<string, FrameRect>>>; // layer id → rect, per format named
  timeline: VideoTune[];
}
export class VideoConfigError extends Error {}         // message starts with the field path
export function parseVideoConfig(raw: unknown, pluginIds: string[]): VideoConfig;
```

Rules the tests pin: `name` required, matches `/^[a-z0-9-]+$/`; `key` parses with `Note.chroma` (C → 0, "F#" → 6, "Bb" → 10); `scale` must give a ladder (`buildLadder(scale, tonicPc, VOICES[voice]) !== null`); `bpm` an integer in `[MIN_BPM, MAX_BPM]`; `voice` in `VOICES`; at least one format, only known ids; each format has a rect for **every** layer id and no others, each rect with `x, y ≥ 0`, `w, h > 0`, `x + w ≤ 1`, `y + h ≤ 1`; each layer's subject passes `sanitiseSubject` (null → error); exactly one `melody` layer; `timeline` non-empty; `tune` a notation string (must `parseTune` and fill whole bars of 4 beats) or a positive integer book number, resolved to its notation through `STAGES.flatMap((s) => s.tunes)[n - 1]` (out of range → error); `times` integer `[1, 16]`; `caption` default `"Get ready"`; `label` kept as given, or `"book <n>"` when the tune was a number.

- [ ] **Step 1: Write the failing tests:** a valid fixture (the spec's example, with the two tunes as `"1 2 3 2 | 1w"` and book number `1`) parses to the expected `VideoConfig`; then one test per rule above asserting `assert.throws(() => parseVideoConfig(bad, []), /^timeline\[1\]\.tune: /)` and the like, including: `voice` missing → `/^voice: /`; a layer id with no rect in `9x16` → `/^formats\.9x16\.logo: missing/`; an extra rect → `/^formats\.16x9\.title: no such layer/`; two melody layers → `/^layers: one melody/`; `"key": "H"` → `/^key: /`; book number 9999 → `/^timeline\[0\]\.tune: no book tune 9999/`; a tune of 3 beats → `/whole bars/`.
- [ ] **Step 2: Run** → FAIL (module missing).
- [ ] **Step 3: Implement** `parseVideoConfig` in `config.ts`. Path-prefixed messages via a small `fail(path, msg)` helper.
- [ ] **Step 4: Run** → PASS; tsc clean.
- [ ] **Step 5: Commit** `src/features/teachers/video package.json` — "Videos: config file parsed and checked, failing on the field that's wrong".

---

### Task 3: The score: segments, the moment, the sound

**Files:**
- Modify: `src/features/theory/singing.ts` (extract `tuneLadderFor`), `src/components/theory/singing/SingingApp.tsx:105-108` (use it)
- Modify: `src/features/theory/singing.test.ts` (test for `tuneLadderFor`)
- Create: `src/features/teachers/video/model/score.ts`, `score.test.ts`

**Interfaces:**
- Consumes: `VideoConfig`, `FPS` (Task 2); `buildLadder`, `withNotesUnder`, `clefFor`, `VOICES`, `type Ladder` (`singing.ts`); `parseTune`, `placeTune`, `type PlacedNote` (`singingMelodies.ts`); `BEATS_PER_BAR` (`singingMelody.ts`); `type Step` from `@/features/sound`.
- Produces:

```ts
// singing.ts — the seven-note ladder the book's tunes are written in, as SingingApp builds it today
export function tuneLadderFor(ladder: Ladder, tonicPc: number, range: Range): Ladder;

// score.ts
export const COUNTDOWN_BEATS = 4;
/** the soundtrack runs this long past the last beat so the final note rings out */
export const TAIL_MS = 1000;
export interface Segment { caption: string; label?: string; notes: PlacedNote[]; tuneBeats: number; times: number; startBeat: number /* its countdown's first beat */ }
export interface Score { beatMs: number; ladder: Ladder; clef: Clef; segments: Segment[]; totalBeats: number; durationMs: number }
export type Moment =
  | { phase: "countdown"; segment: number; left: number /* 4,3,2,1 */ }
  | { phase: "play"; segment: number; beats: number /* beats since this tune's first beat 1, across its passes */ }
  | { phase: "end"; segment: number /* the last */ };
export interface Click { at: number; accent: boolean } // ms
export function buildScore(c: VideoConfig): Score;
export function momentAt(s: Score, ms: number): Moment;
export function soundOf(s: Score): { piano: Step[]; clicks: Click[] };
export const frameCount = (s: Score): number => Math.ceil((s.durationMs / 1000) * FPS);
```

Values the tests pin: `beatMs = 60000 / bpm`; segment `startBeat` = sum of earlier `COUNTDOWN_BEATS + tuneBeats * times`; `totalBeats` = that sum over all; `durationMs = totalBeats * beatMs + TAIL_MS`; piano steps at `(startBeat + 4 + pass * tuneBeats + note.at) * beatMs`, hold `note.beats * beatMs * 0.9`, note = `PlacedNote.midi`; a click on every beat `0 … totalBeats - 1`, accent when `beat % 4 === 0`; `momentAt` maps `ms < 0` to the first countdown with `left: 4` and `ms ≥ totalBeats * beatMs` to `end`.

- [ ] **Step 1: Write the failing tests.** `tuneLadderFor` on a pentatonic gives the 7-note major/minor ladder SingingApp used. For `score.ts`, with bpm 60 (1 beat = 1000 ms) and two 2-bar tunes × 2 passes: `segments[1].startBeat === 20`, `totalBeats === 40`, `durationMs === 41000`; `momentAt(s, 0)` → countdown left 4; `momentAt(s, 3999)` → countdown left 1; `momentAt(s, 4000)` → play beats 0; `momentAt(s, 13500)` → play beats 9.5 (second pass); `momentAt(s, 20000)` → countdown segment 1 left 4; `momentAt(s, 40000)` → end. `soundOf`: 40 clicks with accents at 0, 4000, 8000…; first piano step at 4000 ms; and the Review Focus check: every piano step's `at + hold` ≤ the next segment's play start.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** `tuneLadderFor` (move the expression out of `SingingApp`'s `useMemo` unchanged) and `score.ts`. `buildScore` places each tune with `placeTune(parseTune(t.tune), tuneLadderFor(buildLadder(scale, tonicPc, range)!, tonicPc, range), range)` and `clef = clefFor(range)`, the same as the Melodies page.
- [ ] **Step 4: Run** score + singing tests → PASS; tsc clean. Open `/theory/singing`, Melodies tab, play a tune: unchanged.
- [ ] **Step 5: Commit** — "Videos: the score (countdown and passes per tune, the moment at any time, the notes and clicks); the tune ladder shared with the Melodies page".

---

### Task 4: Melody and Countdown widgets, driven by a timeline context

**Files:**
- Modify: `src/components/theory/singing/MelodyStaff.tsx` (optional `followBeats` prop, default `FOLLOW_BEATS`)
- Create: `src/features/stage/render/TimelineContext.ts`, `MelodyWidget.tsx`, `CountdownWidget.tsx`
- Modify: `src/features/stage/render/StageWidget.tsx` (the two cases), `src/features/stage/index.ts` (export the context)

**Interfaces:**
- Consumes: `MelodyStaff` props as they are (`notes`, `ladder`, `clef`, `live`, `pitch`, `playFrom`, `beatMs`, `gridBeats`, `tapped`, `onNote`, `follow`), plus the new `followBeats?: number`.
- Produces:

```ts
// TimelineContext.ts — what a host playing a timeline tells the widgets that follow it; null outside one (the studio)
export interface StageTimeline {
  melody: { notes: PlacedNote[]; ladder: Ladder; clef: Clef; beatMs: number } | null;
  /** beats since the melody's beat 1 (0 while it waits to start), read every animation frame */
  gridBeats: () => number | null;
  countdown: { caption: string; left: number } | null;
}
export const TimelineContext: React.Context<StageTimeline | null>;
```

- `MelodyWidget({ beats })`: with no context or `melody: null`, renders nothing. Otherwise `<MelodyStaff … live follow followBeats={beats ?? 10} pitch={a ref holding null} playFrom={null} tapped={null} onNote={() => {}} />`, keyed by the notes so a new tune starts clean.
- `CountdownWidget()`: with no context or `countdown: null`, renders nothing; else the caption over a large number (`left`), on the same dark pill style as `BrandWidget` (`rounded-xl bg-slate-950/80`).
- `MelodyStaff` with `followBeats` absent is byte-for-byte the same as today; `beatW = follow ? Math.max(MIN_BEAT, room / (followBeats ?? FOLLOW_BEATS)) : …`.

- [ ] **Step 1: Implement** the prop, the context, the two widgets and the `StageWidget` cases. (No component test harness exists in this repo; the checks are tsc, lint and the page in Task 5.)
- [ ] **Step 2: Run** tsc and lint on the changed files → clean; stage tests still PASS.
- [ ] **Step 3: Check** the Melodies page full-screen view (`/theory/singing`, open a tune full screen): still 10 beats across, unchanged.
- [ ] **Step 4: Commit** — "Stage: Melody and Countdown widgets that follow a timeline; the staff's beats across can be set".

---

### Task 5: The render page

**Files:**
- Create: `src/app/teachers/video/render/page.tsx` (server component: `metadata` with `robots: { index: false, follow: false }`; renders `<VideoRender />`)
- Create: `src/features/teachers/video/VideoRender.tsx` (client), `src/features/teachers/video/index.ts`
- Create: `videos/c-major-first-steps.json` (the example config: C major, alto, 80 bpm, book tunes 1–3 × 4, layers melody/countdown/logo/url, rects for both formats)

**Interfaces:**
- Consumes: Tasks 2–4; `StageWidget`, `TimelineContext` from `@/features/stage`; `PLUGINS` from `@/features/creator` (for `pluginIds`); `renderOffline` (Task 6, wired in that task).
- Produces — the contract with the script (Task 7):

```ts
declare global {
  interface Window {
    /** set by the render script before the page loads */
    __VIDEO_JOB__?: { config: unknown; format: FormatId };
    /** set by the page */
    __video?:
      | { state: "loading" }
      | { state: "error"; message: string }
      | { state: "ready"; durationMs: number; frames: number; fps: number; audio: () => Promise<string /* base64 WAV */> };
  }
}
```

- The page parses the job (`parseVideoConfig(job.config, PLUGINS.map((p) => p.id))`; errors → `state: "error"` with the message), builds the score, preloads the piano (`preloadInstrument("PIANO")`) and waits for `document.fonts.ready`, then sets `state: "ready"`.
- It draws a `fixed inset-0` frame exactly `FORMATS[format]` pixels, `app-bg`, above anything the root layout renders (check `src/app/layout.tsx` for chrome and cover it), with each layer absolutely placed at its rect × frame size, in config order, through `StageWidget` (`stageKey = { tonicPc, family: 0, mode: 0 }`, `onSubjectChange`/`onStageKey` no-ops).
- Time: the page keeps `t0 = performance.now()` from when it became ready and, in its own `requestAnimationFrame` loop, sets the moment `momentAt(score, performance.now() - t0)` into `TimelineContext` (melody = the moment's segment's notes; countdown while `phase === "countdown"`; `gridBeats` returns `moment.beats` in play, `0` in a countdown, null at the end). The page sets no timers of its own.
- Without a job (opened by hand) it shows a one-line "No video job" message.

- [ ] **Step 1: Implement** page, component, index and the example config.
- [ ] **Step 2: Check by eye:** start the dev server; a throwaway Playwright script in the scratchpad (not committed) sets `__VIDEO_JOB__` with `addInitScript` from `videos/c-major-first-steps.json`, opens `http://localhost:3100/teachers/video/render` at each format's viewport and screenshots at real time 1 s, 6 s and just after the first tune change. Look at 16:9 and 9:16: countdown with caption and the first tune standing still; the bar running with the click count; tune change cuts to the next tune's countdown; logo and address placed; nothing else on screen (no nav, no scrollbars, no hover toolbars). Check the 9:16 melody fits its beats without clipped notes (Review Focus).
- [ ] **Step 3: tsc + lint** → clean. `curl -s http://localhost:3100/teachers/video/render | grep -c noindex` → ≥ 1; `src/app/sitemap.ts` doesn't list it.
- [ ] **Step 4: Commit** — "Videos: a hidden page that draws a config's layers at a format's size, following the score".

---

### Task 6: Offline soundtrack

**Files:**
- Create: `src/features/sound/playback/offline.ts`; export from `src/features/sound/index.ts`
- Create: `src/features/teachers/video/model/wav.ts`, `wav.test.ts`
- Modify: `src/features/teachers/video/VideoRender.tsx` (`audio()` in the ready state)
- Modify: `spec/sound.md` (one line on `renderOffline`)

**Interfaces:**
- Consumes: `instrumentSamples`, `loadSample` (`samples.ts`; buffers decoded by the live context are valid in an `OfflineAudioContext` of the same document), `pickSample` (`notes.ts`), `getInstrumentConfig` (`instruments.ts`), `type Step`; `soundOf`, `Score` (Task 3).
- Produces:

```ts
// offline.ts
export interface OfflineClick { at: number; accent: boolean }
/** Timed notes (and metronome clicks) rendered off the clock to a stereo buffer, sounding as the live player does. */
export function renderOffline(o: { steps: Step[]; clicks?: OfflineClick[]; durationMs: number; instrumentId?: string; sampleRate?: number /* 48000 */ }): Promise<AudioBuffer>;
// wav.ts
/** 16-bit PCM WAV of the given channels, samples clipped to [-1, 1]. */
export function encodeWav(channels: Float32Array[], sampleRate: number): Uint8Array;
```

- Note sound = `player.ts`'s `start`/`release` envelope (gain 0 → peak `0.8 * clamp(velocity / 0.8, 0.05, 1)` over `attack || 0.01`, release ramp to 0.001 over the instrument's `release`, source stop `+0.05`), default velocity 0.8, sample chosen with `pickSample(midi, instrumentSamples(id), config.strict)`. Click = `RhythmGame.tsx`'s `click` (1760 Hz accent at 0.5, 1175 Hz at 0.32, 2 ms attack, exponential to 0.0001 by 50 ms).
- `audio()` = `encodeWav([buf.getChannelData(0), buf.getChannelData(1)], 48000)` of `renderOffline({ steps: sound.piano, clicks: sound.clicks, durationMs: score.durationMs })` where `sound = soundOf(score)`, base64-encoded.

- [ ] **Step 1: Write the failing `wav.test.ts`:** for 2 channels × 3 samples at 48000: length `44 + 12`; bytes 0–3 `"RIFF"`, 8–11 `"WAVE"`; channels field 2, sample rate 48000, bits 16; data size 12; a sample of `2` encodes as `32767`, `-2` as `-32768`, and samples are interleaved L R L R.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** `encodeWav` → PASS.
- [ ] **Step 4: Implement** `renderOffline` and `audio()`. Check in the page (DevTools): `atob((await __video.audio()).slice(0, 8))` starts with `RIFF`; save one and listen: piano on the beats, clicks, countdown accents.
- [ ] **Step 5: tsc + lint**, commit — "Sound: notes and clicks rendered offline; videos hand their soundtrack over as a WAV".

---

### Task 7: The render command

**Files:**
- Create: `scripts/video/clock.js` (the init script), `scripts/video/render.mjs`
- Modify: `package.json` scripts: `"video": "node scripts/video/render.mjs"`
- Create: `spec/video.md` (how to write a config, every field, the command, where files land, what fails and why)

**Interfaces:**
- Consumes: the `window.__VIDEO_JOB__` / `window.__video` contract (Task 5).
- Produces: `npm run video -- <file-or-dir>… [--base http://localhost:3100] [--out out/videos] [--only 9x16]` → `out/videos/<name>-<format>.mp4`, one line per file written, non-zero exit with the config path and message on any error (other configs still render; exit code reflects any failure).

`clock.js` (exact behaviour; the page's and the staff's motion all read these):

```js
let now = 0, next = 0;
const queue = new Map();
performance.now = () => now;
window.requestAnimationFrame = (cb) => (queue.set(++next, cb), next);
window.cancelAnimationFrame = (id) => queue.delete(id);
window.__clock = {
  step(ms) {
    now += ms;
    const due = [...queue.values()];
    queue.clear();
    due.forEach((cb) => cb(now));
  },
};
```

`render.mjs`:
- Playwright: `import(pathToFileURL(<first match of ~/.npm/_npx/*/node_modules/playwright/index.mjs>))`, overridable with `PLAYWRIGHT_PATH`; Chromium launched headless with `--autoplay-policy=no-user-gesture-required`.
- Per config × format: new context with `viewport = FORMATS[format]`, `deviceScaleFactor: 1`; `addInitScript` clock.js, then `addInitScript` setting `__VIDEO_JOB__`; `goto(base + "/teachers/video/render")`; wait for `__video.state !== "loading"` (60 s), error → report and skip.
- Audio: `__video.audio()` → write `out/videos/.tmp/<name>-<format>.wav`.
- ffmpeg: `spawn("/opt/homebrew/bin/ffmpeg", ["-y", "-f", "image2pipe", "-framerate", "30", "-i", "-", "-i", wav, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-c:a", "aac", "-b:a", "192k", "-shortest", out])`.
- Frames: for `i` in `0 … frames - 1`: `page.evaluate(async (ms) => { __clock.step(ms); await new Promise((r) => setTimeout(r, 0)); await new Promise((r) => setTimeout(r, 0)); }, i === 0 ? 0 : 1000 / 30)`, then `page.screenshot({ type: "png" })` written to ffmpeg's stdin, awaiting `drain` when `write` returns false. Print progress every 5 % on one line.
- Delete the temp WAV after a successful mux.

- [ ] **Step 1: Implement** clock.js, render.mjs, the npm script.
- [ ] **Step 2: Run** `npm run video -- videos/c-major-first-steps.json` with the dev server up → two MP4s. `ffprobe` each: 1920×1080 / 1080×1920, 30 fps, `nb_frames` = `frames`, audio present, durations equal within one frame.
- [ ] **Step 3: Determinism (Review Focus):** render the 9:16 twice with a debug flag `--frames 0,45,<last>` that saves those PNGs instead of encoding; `shasum` matches across runs. If not, find what reads the real clock (React's scheduler, a CSS transition) and fix it in the page or the init script, not in shared widgets.
- [ ] **Step 4: Sync (Review Focus):** make a 5-minute config (book tunes 1–12 × 4 at 80 bpm, kept in `videos/`); in the last 10 seconds of the MP4 the bar crosses each beat line on its click (scrub in QuickTime frame by frame at two beats).
- [ ] **Step 5: Bad config:** a copy with `"voice": "tenor2"` → the command exits non-zero, printing `<path>: voice: …`, and writes no MP4.
- [ ] **Step 6: Write `spec/video.md`**, commit — "Videos: npm run video renders configs to MP4s, frame by frame under a stepped clock".

---

## Self-review notes

- Spec coverage: config → MP4 unattended (T7), stage layers + video-only rect check (T1, T2), formats (T2, T5, T7), Melody widget not in palette (T1, T4), beats across (T1, T4), timeline of tunes × times with notation/book numbers (T2, T3), countdown + caption (T1, T3, T4, T5), piano every pass + click (T3, T6), one voice per config (T2, T3), runs locally with configs in `videos/` and output in `out/videos` (T5, T7), fails loudly (T2, T7), no chrome in frame (T5), sync and determinism (T7).
- Later work kept open: the timeline is an array of entries with a `tune` field; a future `{ clip: … }` or `{ card: … }` entry is a new case in `parseVideoConfig` and `buildScore`, nothing else assumes every entry is a tune beyond those two.

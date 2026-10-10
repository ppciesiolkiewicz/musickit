# Looper transport, timeline and Canvas view

Date: 2026-10-10. Scope: `src/lib/looper/`, `src/components/looper/`, `spec/looper.md`, `src/lib/looper/CLAUDE.md`.

## Problem

1. **Metronome button lies.** Its icon follows `metroManual` ("pressed by hand"), not whether the clock runs. When a loop or sequencer started the clock the button shows ▶ while everything plays.
2. **Metronome button changes meaning.** When something else runs, `toggleMetronome()` only flips `audible` (a mute), duplicating the bell button.
3. **No single transport.** "Is it running" is derived in several places (`gridActive()`, `othersRunning()`, `metroManual`, `playing`, which only means something once a loop exists). Each control guesses differently.
4. **Looping header Play/Stop** is disabled without a loop, so it cannot start the metronome or the sequencers, and it does not stop sequencers.
5. **"No loop yet"** shows even when sequencers can be played. The progress line has no bars.
6. **Growing takes are invisible.** A free later take is rounded up to 1, 2, 4, 8 or 16 loops only at the end; nothing shows the length growing while recording.
7. **Three views** (Fixed, Widgets, Widgets with wires) where two are wanted.

## Goals

- One transport. One Play/Stop that always works: Play starts the clock and every armed loop and sequencer; Stop stops everything, clock included.
- The metronome bar button and the Looping header button are the same control and can never disagree.
- The bell is the only way to mute the click.
- The Looping header describes what exists; the timeline is divided into bars and grows live while a take records.
- Views: Fixed layout and Canvas (the former "Widgets with wires"). "Widgets" is removed.

## Non-goals

- No change to loop length rules (`lengthMultiple`, `quantiseLength`), recorder chunking or frame maths.
- No change to routing, the patch or effects.
- Shorter loops (1/2, 1/4) stay unimplemented.

## 1. Transport (engine)

### `src/lib/looper/transport.ts` (new, pure, tested)

No Web Audio, no React. Imports only from `frames.ts`.

```ts
export type TransportState = "stopped" | "countIn" | "running" | "stopping";

export class Transport {
  state: TransportState;      // starts "stopped"
  anchor: number;             // AudioContext time of beat 1 of the grid
  stopAt: number | null;      // when "stopping" ends
  period: number;             // seconds per beat (from bpm)
  beatsPerBar: number;

  /** Start the grid. Count-in bars > 0 put beat 1 in the future (state "countIn"), else "running" at now + lead.
   *  Called while "stopping": cancels the stop, keeps the anchor, state back to "running". No-op while countIn/running. */
  play(now: number, countInBars: number): number /* anchor */;

  /** Stop on the next quantise line (bar, beat) or right away when quantise is "off". State "stopping" until stopAt.
   *  Called while "countIn": stops at once. No-op while stopped/stopping. */
  stop(now: number, quantise: Quantise): number /* stopAt */;

  /** Advance time-driven transitions: countIn → running at anchor, stopping → stopped at stopAt. Returns true if state changed. */
  tick(now: number): boolean;

  /** True for countIn, running and stopping: the grid exists and clicks are scheduled. */
  get active(): boolean;

  /** Re-anchor the running grid (first take on a free grid, loop off the grid). */
  moveAnchor(anchor: number): void;

  /** The next beat or bar line after now + margin. The only place "next line" is computed. */
  next(now: number, unit: "beat" | "bar", margin?: number): number;
}
```

### Engine changes (`engine.ts`)

- The engine owns one `Transport`. It replaces `gridAnchor`, `metroManual`, `gridActive()`, `othersRunning()` and the transport meaning of `playing`.
- A single `syncTransport(restart?)` replaces `syncMetronome`: metronome runs iff `transport.active` (`metronome.start(transport.anchor)` / `metronome.stop()`); loops and sequencers follow their armed flag while the transport is running and are stopped otherwise.
- `transport.tick` is driven by the metronome scheduler interval (already 25 ms); a state change emits a snapshot.
- **Armed** = existing `ChannelInfo.active` for loops and `SequencerState.playing` for sequencers (field names kept for save compatibility; meaning becomes "armed"). Stopping the transport never clears armed flags, so Play brings back the same set.
- Tempo/beats per bar lock rule unchanged: locked while a loop exists or a take runs. A tempo change while the transport runs keeps the anchor (as `Metronome.set` does today).

### Behaviour

| Control | Transport stopped | Transport active |
|---|---|---|
| Main Play/Stop (metronome bar, Looping header) | `transport.play`: count-in, then clock + every armed loop and sequencer start on beat 1 | `transport.stop`: everything stops on the next quantise line, clock too |
| Bell | mute/unmute click | mute/unmute click |
| Group ▶/■ | arm/disarm group items; arming starts the transport | items join/leave on the next beat |
| Loop / sequencer ▶/■ | arm/disarm; arming starts the transport | joins/leaves on the next beat |
| Record, first take | starts the transport with count-in (as today) | starts on the next bar/beat line, no count-in (as today) |
| Record, later take | starts the transport (no count-in, starts on the loop boundary) | as today |

Rules:
- Disarming the last item leaves the transport running (a metronome). Only the main Stop stops the clock.
- Clearing every loop leaves the transport as it is.
- Play while "stopping" cancels the stop.
- Loops restart from their top on Play: `loopStart = transport.anchor` (loops on the grid stay phase-locked as today).
- A take in progress when Stop is pressed: Stop first ends the take as `stopRecording()` would (quantised), then stops the transport.

### Snapshot

```ts
transport: { state: TransportState; armed: number }  // armed = armed loops with audio + armed sequencers
```
`metronome.running`, `metronome.manual` and `playing` are removed from the snapshot; every UI that read them (group boxes, loop rings, metronome bar, header) reads `transport.state` plus the item's armed flag.

### Actions (`actions.ts`)

- New: `transport.play`, `transport.stop` (apply, inverse = the other one, describe, validate, test).
- Removed: `metronome.toggle`, `playback.set`. Saved macros and history containing them are mapped on load: `metronome.toggle` → `transport.play` / `transport.stop` by current state at replay; `playback.set {on}` → `transport.play` / `transport.stop`.
- `spec/looper-actions.md` updated.

## 2. Looping header and timeline

### Header row (`loopControls` in `LooperApp.tsx`)

- `▶/■`: same transport control as the metronome bar (renders from `snap.transport.state`; enabled whenever the engine is ready).
- `🗑 Clear every loop` stays.
- Label (short):
  - nothing playable (no loop, no sequencer), stopped: `Record or start a sequencer`
  - playable, stopped: `2 bars · 4.80 s` (loops) or `1 bar` (sequencers only)
  - count-in: `count-in`
  - running: `bar 2 / 4`
  - recording: `● rec · bar 3`
- "No loop yet" is removed.

### `<Timeline>` (new, `src/components/looper/Timeline.tsx`, replaces `LoopBar`)

- Cycle = the longest armed thing: the longest loop in bars, or 1 bar for sequencers only or the bare clock. Loop lengths are 1, 2, 4, 8 or 16 times the first, so the longest is a whole multiple of the others.
- Drawn as bar segments with beat ticks. Current bar lit; a playhead sweeps it. Count-in: hollow segments.
- Reads position with `requestAnimationFrame` from `engine.getTimeline()`, like `getBeat`.

### Growing takes

- While a free take records past the current cycle end the timeline extends live to the next allowed length (first take: next bar, or beat when quantising to beats; later take: next of 1, 2, 4, 8, 16 loops). New segments get a recording fill, showing the length the loop will have if stopped now.
- Planned takes show their full target at once and fill as they record.
- On stop the engine rounds as today (`lengthMultiple`, `quantiseLength`); only the display is new.

### Pure maths (`frames.ts`, tested)

```ts
cycleBars(loopBars: number[], fallback = 1): number
timelinePosition(now, anchor, period, beatsPerBar, cycleBars): { bar: number; beat: number; fraction: number; countIn: boolean }
liveTakeBars(recordedFrames, unitFrames, loopFrames | 0, plannedBars | null): number  // bars the take would have if stopped now
```

### Engine API

```ts
getTimeline(): { state: TransportState; cycleBars: number; bar: number; beat: number; fraction: number;
                 take: { startBar: number; liveBars: number; targetBars: number | null } | null } | null
```

## 3. Views

- `View = "fixed" | "canvas"`. Menu: Fixed layout, Canvas (`git-merge` icon, hint "Drag widgets; connections drawn as wires"). Default `"canvas"`.
- Load migration: saved `"widgets"` or `"lines"` → `"canvas"` (alongside the existing `widgetMode` migration).
- Delete: the `WidgetBoard` branch in `LooperApp` and `mixLayout`; the Switches widget; `ConnectionLayer`'s `mode` prop and its "colors" mode (always wires); `AddFab`'s `wires` / `wiresOnly` gating.
- `musickit.looper.widgets2` is no longer written (old key left alone; `newProject` clearing unchanged).
- Text: every "Widgets with wires" / "Widgets" view mention → "Canvas" in UI, `CLAUDE.md`, `spec/looper.md`.
- Kept: `EffectWidgets`, `FreeBoard`, `src/features/widgets` (Canvas uses them).

## 4. Rules and docs

`src/lib/looper/CLAUDE.md` and `spec/looper.md`:
- Replace "No start button" and "the metronome button never starts a loop or sequencer" / "if anything else is running the button only silences the click" with: one transport; Play starts the clock and every armed loop and sequencer; Stop stops everything on the next line; the bell is the only mute; item and group buttons arm, and arming starts the transport.
- Document `transport.ts`, the timeline maths, the new actions and the view rename.

## Testing

- `transport.test.ts`: play from stopped (with and without count-in), tick countIn → running, stop quantised to bar/beat/off, stop during count-in, play while stopping cancels, next-line maths.
- `frames.test.ts`: `cycleBars`, `timelinePosition` (count-in negative bars, wrap at cycle end), `liveTakeBars` (first take by bar/beat, later take 1→2→4→8→16, planned).
- `actions.test.ts`: `transport.play` / `transport.stop` apply and inverse; legacy `metronome.toggle` / `playback.set` mapping.
- Full looper suite, `npx tsc --noEmit`, `npm run lint`.
- Browser (Chromium, fake media devices): Play with an empty project ticks; Stop silences all and both buttons flip; group ▶ from stopped starts the transport; timeline grows during a free later take. Real interfaces and MIDI not verifiable here.

## Delivery

Branch `worktree-transport` in `.claude/worktrees/transport`, based on `origin/main` (345c7ab). Finish with a branch ready for merge or PR (the person chooses), instead of the usual push to `main`.

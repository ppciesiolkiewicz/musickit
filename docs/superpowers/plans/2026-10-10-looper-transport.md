# Looper Transport Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One transport (Play/Stop) that owns the clock, so the metronome button and the Looping header can never disagree; a bar-divided timeline that grows while recording; and two views (Fixed, Canvas).

**Architecture:** A pure `Transport` state machine (`transport.ts`) becomes the only owner of the beat grid. The engine replaces `gridAnchor`, `metroManual`, `gridActive()`, `othersRunning()` and `playing` with it, and one `syncTransport()` makes metronome, loops and sequencers follow `transport.state` plus each item's armed flag. UI reads `snap.transport`.

**Base:** `origin/main` 8cae3a4 (tuner commit), clean: no uncommitted work from the main checkout.

**Tech Stack:** TypeScript, React 19 / Next.js, Web Audio, `node:test` via `npx tsx --test`.

**Spec:** `docs/superpowers/specs/2026-10-10-looper-transport-design.md`

## Global Constraints

- `src/lib/looper/*` imports nothing outside `src/lib/looper` (no React, no `@/lib/audio`).
- Every user-driven state change goes through `engine.do(action)`.
- Do not change `frames.ts` frame maths, recorder chunking, `lengthMultiple` or `quantiseLength`.
- localStorage reads/writes wrapped in try/catch; old saves keep loading.
- Short UI labels; `Icon` component; icon buttons carry `title` + `aria-label`; toggles use `aria-pressed`.
- Test command: `npx tsx --test src/lib/looper/*.test.ts src/lib/chordKit/chordKit.test.ts` (all pass).
- Also clean: `npx tsc --noEmit` and `npm run lint`.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Work on branch `worktree-transport` in `.claude/worktrees/transport`. Do not push to `main`.

## Deviations from the spec (decided while planning)

- Actions: one `transport.set { on }` instead of `transport.play` / `transport.stop` (one action with a boolean inverts cleanly, same shape as the existing `playback.set`). Legacy `playback.set` and `metronome.toggle` stay valid action types and are applied as transport actions, so saved macros and scripts keep working without a load-time rewrite.
- `liveTakeBars` is not added: the existing, tested `takeStatus()` already computes the doubling total (`totalBars`) the timeline needs.
- Stop pressed during a take: the take is ended as `stopRecording()` would, and the transport stops after the take finishes (`stopAfterTake`), so a take never loses its tail.

## Review Focus

1. **Play pressed twice quickly / during count-in** → no second count-in, no double clicks. Test: `transport.test.ts` "play is a no-op while counting in or running".
2. **Stop then Play before the stop line** → playback continues, nothing restarts. Test: "play while stopping cancels the stop and keeps the anchor".
3. **Stop with quantise off** → immediate silence. Test: "stop with quantise off stops now".
4. **Tempo change while running with no loop** → grid keeps its beat 1; display keeps working. Test: `transport.test.ts` "setTiming keeps the anchor".
5. **Count-in display** → timeline shows count-in, never negative bar numbers. Test: `frames.test.ts` "timelinePosition during the count-in".

---

## File map

| File | Change | Responsibility |
|---|---|---|
| `src/lib/looper/transport.ts` | create | Pure transport state machine and grid maths |
| `src/lib/looper/transport.test.ts` | create | Its tests |
| `src/lib/looper/frames.ts` | modify | `cycleBars`, `timelinePosition` |
| `src/lib/looper/frames.test.ts` | modify | Their tests |
| `src/lib/looper/metronome.ts` | modify | `stopAt(t)`: no clicks at or after `t` |
| `src/lib/looper/engine.ts` | modify | Own a `Transport`; `setTransport`; `syncTransport`; snapshot `transport`; `getTimeline` |
| `src/lib/looper/actions.ts` | modify | `transport.set`; legacy aliases; `ActionState.transport` |
| `src/lib/looper/actions.test.ts` | modify | Fake target + new tests |
| `src/lib/looper/script.ts`, `script.test.ts` | modify | Document `transport.set` |
| `src/components/looper/MetronomeBar.tsx` | modify | Play/Stop from `snap.transport` |
| `src/components/looper/Timeline.tsx` | create | Bar-segment timeline |
| `src/components/looper/LooperApp.tsx` | modify | Header row, Timeline, views |
| `src/components/looper/LoopStage.tsx` | modify | Group/loop/sequencer "sounding" vs "armed" |
| `src/components/looper/ViewMenu.tsx` | modify | Fixed + Canvas |
| `src/components/looper/ConnectionLayer.tsx` | modify | Drop `mode` |
| `src/components/looper/AddFab.tsx` | modify | Drop `wires` gating |
| `src/lib/looper/CLAUDE.md`, `spec/looper.md`, `spec/looper-actions.md` | modify | Rules and docs |

---

### Task 1: Transport state machine

**Files:**
- Create: `src/lib/looper/transport.ts`
- Test: `src/lib/looper/transport.test.ts`

**Interfaces:**
- Consumes: `Quantise` from `./frames`.
- Produces:
  ```ts
  export type TransportState = "stopped" | "countIn" | "running" | "stopping";
  export class Transport {
    state: TransportState; anchor: number; stopAt: number | null; period: number; beatsPerBar: number;
    get active(): boolean;          // countIn | running | stopping
    get going(): boolean;           // countIn | running (the button shows Stop)
    setTiming(period: number, beatsPerBar: number): void;
    play(now: number, countInBars: number): number;          // returns anchor
    stop(now: number, quantise: Quantise): number;           // returns stopAt
    tick(now: number): boolean;                              // true when state changed
    moveAnchor(anchor: number): void;
    next(now: number, unit: "beat" | "bar", margin?: number): number;
  }
  export const TRANSPORT_LEAD = 0.05;
  ```

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/looper/transport.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Transport, TRANSPORT_LEAD } from "./transport";

const make = () => {
  const t = new Transport();
  t.setTiming(0.5, 4); // 120 bpm, 4/4: a bar is 2 s
  return t;
};

describe("transport", () => {
  it("starts stopped", () => {
    const t = make();
    assert.equal(t.state, "stopped");
    assert.equal(t.active, false);
    assert.equal(t.going, false);
  });

  it("plays at once without a count-in", () => {
    const t = make();
    const a = t.play(10, 0);
    assert.equal(a, 10 + TRANSPORT_LEAD);
    assert.equal(t.state, "running");
    assert.equal(t.going, true);
  });

  it("counts in whole bars, then runs at the anchor", () => {
    const t = make();
    const a = t.play(10, 1);
    assert.equal(a, 10 + TRANSPORT_LEAD + 2);
    assert.equal(t.state, "countIn");
    assert.equal(t.tick(11), false);
    assert.equal(t.tick(a), true);
    assert.equal(t.state, "running");
  });

  it("play is a no-op while counting in or running", () => {
    const t = make();
    const a = t.play(10, 1);
    assert.equal(t.play(10.5, 1), a);
    t.tick(a);
    assert.equal(t.play(13, 1), a);
    assert.equal(t.state, "running");
  });

  it("stops on the next bar line", () => {
    const t = make();
    const a = t.play(0, 0); // anchor 0.05
    const at = t.stop(1, "bar");
    assert.equal(at, a + 2);
    assert.equal(t.state, "stopping");
    assert.equal(t.going, false);
    assert.equal(t.active, true);
    assert.equal(t.tick(at - 0.01), false);
    assert.equal(t.tick(at), true);
    assert.equal(t.state, "stopped");
    assert.equal(t.stopAt, null);
  });

  it("stops on the next beat line", () => {
    const t = make();
    const a = t.play(0, 0);
    assert.equal(t.stop(1.2, "beat"), a + 1.5);
  });

  it("stop with quantise off stops now", () => {
    const t = make();
    t.play(0, 0);
    assert.equal(t.stop(3, "off"), 3);
    assert.equal(t.state, "stopped");
  });

  it("stop during the count-in stops now", () => {
    const t = make();
    t.play(0, 1);
    assert.equal(t.stop(0.5, "bar"), 0.5);
    assert.equal(t.state, "stopped");
  });

  it("stop is a no-op when stopped or already stopping", () => {
    const t = make();
    assert.equal(t.stop(1, "bar"), 1);
    assert.equal(t.state, "stopped");
    t.play(0, 0);
    const at = t.stop(1, "bar");
    assert.equal(t.stop(1.5, "bar"), at);
  });

  it("play while stopping cancels the stop and keeps the anchor", () => {
    const t = make();
    const a = t.play(0, 0);
    t.stop(1, "bar");
    assert.equal(t.play(1.5, 1), a);
    assert.equal(t.state, "running");
    assert.equal(t.stopAt, null);
  });

  it("finds the next beat and bar line after a margin", () => {
    const t = make();
    const a = t.play(0, 0); // 0.05
    assert.equal(t.next(0.6, "beat"), a + 1);
    assert.equal(t.next(0.53, "beat", 0.03), a + 1);
    assert.equal(t.next(0.6, "bar"), a + 2);
  });

  it("setTiming keeps the anchor", () => {
    const t = make();
    const a = t.play(0, 0);
    t.setTiming(0.4, 3);
    assert.equal(t.anchor, a);
    assert.equal(t.next(0.1, "bar"), a + 1.2);
  });

  it("moveAnchor re-anchors a running grid", () => {
    const t = make();
    t.play(0, 0);
    t.moveAnchor(5);
    assert.equal(t.anchor, 5);
    assert.equal(t.next(5.1, "beat"), 5.5);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx tsx --test src/lib/looper/transport.test.ts`
Expected: FAIL, cannot find module `./transport`.

- [ ] **Step 3: Implement**

```ts
// src/lib/looper/transport.ts
import { nextBoundary, type Quantise } from "./frames";

/**
 * The looper's transport: the one owner of the beat grid. Play starts it (with a count-in when asked), Stop ends it on the next line.
 * Pure: no Web Audio. The engine makes the metronome, loops and sequencers follow `state` and `anchor`.
 */

export type TransportState = "stopped" | "countIn" | "running" | "stopping";

/** seconds between pressing Play and beat 1 when there is no count-in */
export const TRANSPORT_LEAD = 0.05;

export class Transport {
  state: TransportState = "stopped";
  /** AudioContext time of beat 1 of the grid */
  anchor = 0;
  /** when a "stopping" transport becomes "stopped" */
  stopAt: number | null = null;
  period = 0.6;
  beatsPerBar = 4;

  /** the grid exists and clicks are scheduled */
  get active() {
    return this.state !== "stopped";
  }

  /** heading to play: the transport button shows Stop */
  get going() {
    return this.state === "countIn" || this.state === "running";
  }

  /** New tempo or bar length; the anchor stays, so beat 1 does not move. */
  setTiming(period: number, beatsPerBar: number) {
    if (period > 0) this.period = period;
    if (beatsPerBar >= 1) this.beatsPerBar = Math.round(beatsPerBar);
  }

  /** Start the grid. Returns the anchor (beat 1). While stopping it cancels the stop; while counting in or running it changes nothing. */
  play(now: number, countInBars: number): number {
    if (this.state === "stopping") {
      this.state = now < this.anchor ? "countIn" : "running";
      this.stopAt = null;
      return this.anchor;
    }
    if (this.going) return this.anchor;
    const countIn = Math.max(0, Math.round(countInBars)) * this.beatsPerBar * this.period;
    this.anchor = now + TRANSPORT_LEAD + countIn;
    this.stopAt = null;
    this.state = countIn > 0 ? "countIn" : "running";
    return this.anchor;
  }

  /** Stop on the next line (bar or beat), or now when quantise is off or during the count-in. Returns when it stops. */
  stop(now: number, quantise: Quantise): number {
    if (this.state === "stopped") return now;
    if (this.state === "stopping") return this.stopAt ?? now;
    if (this.state === "countIn" || quantise === "off") {
      this.state = "stopped";
      this.stopAt = null;
      return now;
    }
    this.stopAt = this.next(now, quantise);
    this.state = "stopping";
    return this.stopAt;
  }

  /** Move on with time: countIn becomes running at the anchor, stopping becomes stopped at stopAt. */
  tick(now: number): boolean {
    if (this.state === "countIn" && now >= this.anchor) {
      this.state = "running";
      return true;
    }
    if (this.state === "stopping" && this.stopAt !== null && now >= this.stopAt) {
      this.state = "stopped";
      this.stopAt = null;
      return true;
    }
    return false;
  }

  moveAnchor(anchor: number) {
    this.anchor = anchor;
  }

  /** The next beat or bar line at least `margin` seconds after now. */
  next(now: number, unit: "beat" | "bar", margin = 0): number {
    const step = unit === "bar" ? this.period * this.beatsPerBar : this.period;
    return nextBoundary(now, this.anchor, step, margin);
  }
}
```

Note: `nextBoundary` returns `loopStart + max(0, ceil(...)) * length`; at `now` exactly on a line with margin 0 it returns that line. The "stops on the next bar line" test uses `now = 1`, `anchor = 0.05`, giving `0.05 + 1*2 = 2.05`. Check each `next` expectation against this formula before moving on; if a float comparison fails, compare with `Math.abs(x - y) < 1e-9`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx tsx --test src/lib/looper/transport.test.ts`
Expected: PASS (13 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/looper/transport.ts src/lib/looper/transport.test.ts
git commit -m "Looper transport: one owner of the beat grid (pure, tested)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Timeline maths

**Files:**
- Modify: `src/lib/looper/frames.ts` (append after `takeStatus`)
- Test: `src/lib/looper/frames.test.ts` (append a `describe`)

**Interfaces:**
- Produces:
  ```ts
  export function cycleBars(loopBars: number[]): number; // longest whole-bar loop, min 1
  export interface TimelinePos { bar: number; beat: number; fraction: number; countIn: boolean }
  export function timelinePosition(now: number, anchor: number, period: number, beatsPerBar: number, cycle: number): TimelinePos;
  ```
  `bar` 0-based inside the cycle, `beat` 0-based in the bar, `fraction` 0..1 through the whole cycle. During the count-in (`now < anchor`): `countIn: true`, `bar` = count-in bars left minus 1 (0 = last count-in bar), `beat` counts in the bar, `fraction` 0.

- [ ] **Step 1: Write the failing tests**

```ts
// append to src/lib/looper/frames.test.ts (add cycleBars, timelinePosition to the import from "./frames")
describe("timeline", () => {
  it("cycle is the longest loop in bars, at least one", () => {
    assert.equal(cycleBars([]), 1);
    assert.equal(cycleBars([2, 4, 1]), 4);
    assert.equal(cycleBars([0.4]), 1);
    assert.equal(cycleBars([2.01]), 2);
  });
  it("timelinePosition walks bars and beats and wraps at the cycle end", () => {
    // 120 bpm, 4/4: beat 0.5 s, bar 2 s, cycle of 2 bars = 4 s
    assert.deepEqual(timelinePosition(10, 10, 0.5, 4, 2), { bar: 0, beat: 0, fraction: 0, countIn: false });
    assert.deepEqual(timelinePosition(12.75, 10, 0.5, 4, 2), { bar: 1, beat: 1, fraction: 0.6875, countIn: false });
    assert.deepEqual(timelinePosition(14, 10, 0.5, 4, 2), { bar: 0, beat: 0, fraction: 0, countIn: false });
  });
  it("timelinePosition during the count-in", () => {
    // anchor 10, one count-in bar from 8 to 10
    const p = timelinePosition(8.6, 10, 0.5, 4, 2);
    assert.equal(p.countIn, true);
    assert.equal(p.bar, 0);
    assert.equal(p.beat, 1);
    assert.equal(p.fraction, 0);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx tsx --test src/lib/looper/frames.test.ts`
Expected: FAIL, `cycleBars is not a function` (or a TS import error).

- [ ] **Step 3: Implement**

```ts
// append to src/lib/looper/frames.ts

/** The timeline's length in bars: the longest loop (rounded to whole bars), never less than one bar. */
export function cycleBars(loopBars: number[]): number {
  return loopBars.reduce((m, b) => Math.max(m, Math.round(b)), 1);
}

export interface TimelinePos {
  /** bar inside the cycle (0-based); during the count-in, count-in bars left minus one */
  bar: number;
  /** beat in the bar, 0-based */
  beat: number;
  /** 0..1 through the whole cycle (0 during the count-in) */
  fraction: number;
  countIn: boolean;
}

/** Where on the timeline the time falls: bar, beat and how far through the cycle. Before the anchor it is the count-in. */
export function timelinePosition(now: number, anchor: number, period: number, beatsPerBar: number, cycle: number): TimelinePos {
  const barSec = period * beatsPerBar;
  const { beat } = beatInBar(now, anchor, period, beatsPerBar);
  if (now < anchor) return { bar: Math.max(0, Math.ceil((anchor - now) / barSec - 1e-9) - 1), beat, fraction: 0, countIn: true };
  const len = barSec * Math.max(1, cycle);
  const x = loopOffset(now, anchor, len);
  return { bar: Math.floor(x / barSec + 1e-9), beat, fraction: x / len, countIn: false };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx tsx --test src/lib/looper/frames.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/looper/frames.ts src/lib/looper/frames.test.ts
git commit -m "Timeline maths: cycle in bars and position in it

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Transport in the engine and actions

The engine is not unit tested (Web Audio). This task is gated by the action tests, `tsc`, lint and the browser check in Task 7.

**Files:**
- Modify: `src/lib/looper/metronome.ts`
- Modify: `src/lib/looper/engine.ts`
- Modify: `src/lib/looper/actions.ts`, `src/lib/looper/actions.test.ts`
- Modify: `src/lib/looper/script.ts`, `src/lib/looper/script.test.ts`
- Modify: `spec/looper-actions.md`

**Interfaces:**
- Consumes: `Transport`, `TransportState` (Task 1); `cycleBars`, `timelinePosition` (Task 2).
- Produces:
  - `LooperSnapshot.transport: { state: TransportState; armed: number }`; removes `playing`, `metronome.running`, `metronome.manual`.
  - `engine.setTransport(on: boolean): void`.
  - `engine.getTimeline(): Timeline | null` where
    ```ts
    export interface Timeline { state: TransportState; cycle: number; bar: number; beat: number; fraction: number; countIn: boolean;
      take: { bar: number; totalBars: number; planned: boolean } | null }
    ```
  - Action `{ type: "transport.set"; on: boolean }`; `ActionTarget.setTransport(on)` replaces `setPlaying` and `toggleMetronome`.
  - `ActionState.transport: { state: TransportState }` replaces `playing`.

- [ ] **Step 1: Write the failing action tests**

In `src/lib/looper/actions.test.ts`:
1. In `fake()`, replace `playing: false,` with `transport: { state: "stopped" as TransportState },` and import `type TransportState` from `./transport`.
2. Replace `setPlaying: (on) => { s.playing = on; },` with `setTransport: (on) => { s.transport.state = on ? "running" : "stopped"; },` and delete any `toggleMetronome` entry in the fake.
3. In the "every action round-trips" list, replace `{ type: "playback.set", on: true },` with `{ type: "transport.set", on: true },` and keep `{ type: "metronome.toggle" },` and add `{ type: "playback.set", on: true },` (legacy).
4. In the history and macro tests, replace each `{ type: "playback.set", on: X }` with `{ type: "transport.set", on: X }` and each `s.playing` assertion: `assert.equal(s.playing, false)` → `assert.equal(s.transport.state, "stopped")`; `assert.equal(s.playing, true)` → `assert.equal(s.transport.state, "running")`.
5. Append:

```ts
test("transport.set plays and stops, and undoes to where it was", () => {
  const { s, t } = fake();
  const h = new ActionHistory(t);
  h.do({ type: "transport.set", on: true });
  assert.equal(s.transport.state, "running");
  h.undo();
  assert.equal(s.transport.state, "stopped");
  assert.equal(describeAction({ type: "transport.set", on: true }), "Play");
  assert.equal(describeAction({ type: "transport.set", on: false }), "Stop");
});

test("legacy playback.set and metronome.toggle drive the transport", () => {
  const { s, t } = fake();
  applyAction(t, { type: "playback.set", on: true });
  assert.equal(s.transport.state, "running");
  applyAction(t, { type: "metronome.toggle" });
  assert.equal(s.transport.state, "stopped");
  applyAction(t, { type: "metronome.toggle" });
  assert.equal(s.transport.state, "running");
  assert.equal(isAction({ type: "transport.set", on: true }), true);
  assert.equal(isAction({ type: "transport.set" }), false);
});
```

In `src/lib/looper/script.test.ts` line 23, change `{ type: "playback.set", on: true }` to `{ type: "transport.set", on: true }`.

- [ ] **Step 2: Run to verify failure**

Run: `npx tsx --test src/lib/looper/actions.test.ts src/lib/looper/script.test.ts`
Expected: FAIL (unknown action `transport.set`, `setTransport` not in `ActionTarget`).

- [ ] **Step 3: Implement the actions**

In `src/lib/looper/actions.ts`:
- Union: add `| { type: "transport.set"; on: boolean }` next to `playback.set`; mark the two legacy ones with a comment `/** legacy: applied as transport.set */`.
- `ActionState` (line ~128): replace `playing: boolean;` with `transport: { state: TransportState };` (import `type TransportState` from `./transport`).
- `ActionTarget`: replace `setPlaying(on: boolean): void;` with `setTransport(on: boolean): void;` and delete `toggleMetronome(): void;`.
- `applyAction`:
  ```ts
  case "transport.set": case "playback.set": t.setTransport(a.on); return a;
  case "metronome.toggle": { const st = t.getSnapshot().transport.state; t.setTransport(!(st === "countIn" || st === "running")); return a; }
  ```
- `inverseOf`:
  ```ts
  case "transport.set": case "playback.set": { const st = s.transport.state; return { type: "transport.set", on: st === "countIn" || st === "running" }; }
  case "metronome.toggle": return { type: a.type };
  ```
- `describeAction`: `case "transport.set": case "playback.set": return a.on ? "Play" : "Stop";` and `case "metronome.toggle": return "Play/Stop";`
- validator: `case "transport.set": case "playback.set": return isBool(a.on);`
- Update the header comment list of globals if it mentions `playback.set`.

In `src/lib/looper/script.ts`: replace the `metronome.toggle` and `playback.set` doc entries with one:
```ts
{ type: "transport.set", doc: "Play (the clock and every armed loop and sequencer) or stop everything.", example: { type: "transport.set", on: true } },
```

In `spec/looper-actions.md` line 15: `- Globals: \`master.volume\`, \`metronome.set\`, \`transport.set\` (legacy \`playback.set\` and \`metronome.toggle\` still play/stop), and \`batch\` (a list of actions as one step).`

- [ ] **Step 4: Run action tests**

Run: `npx tsx --test src/lib/looper/actions.test.ts src/lib/looper/script.test.ts`
Expected: PASS. (`tsc` still fails on the engine until Step 6.)

- [ ] **Step 5: Metronome stops on a line**

In `src/lib/looper/metronome.ts` add a field and method, and gate `schedule()`:

```ts
  /** no click at or after this time (a stopping transport); null = no limit */
  private until: number | null = null;

  /** Click up to time `t` (exclusive), then stop. */
  stopAt(t: number) {
    this.until = t;
  }
```
- In `start()`: set `this.until = null;` before scheduling.
- In `stop()`: set `this.until = null;`.
- In `schedule()` loop, before clicking: `if (this.until !== null && t >= this.until - 1e-6) { this.stop(); return; }`.

- [ ] **Step 6: Engine owns the transport**

In `src/lib/looper/engine.ts`:

a) Imports: `import { Transport, type TransportState } from "./transport";` and add `cycleBars, timelinePosition` to the `./frames` import. Re-export: `export type { TransportState } from "./transport";`.

b) Fields: delete `private playing = true;`, `private gridAnchor = 0;`, `private metroManual = false;`. Add:
```ts
  /** the one owner of the beat grid: Play/Stop, count-in, anchor */
  private transport = new Transport();
  /** Stop was pressed during a take: stop the transport when the take is done */
  private stopAfterTake = false;
  private transportTimer: ReturnType<typeof setInterval> | null = null;
```
Replace every remaining `this.gridAnchor` read with `this.transport.anchor`, and every write `this.gridAnchor = x` with `this.transport.moveAnchor(x)`.

c) Snapshot type: `metronome: MetronomeSettings & { locked: boolean };`, delete `playing: boolean;`, add
```ts
  /** the transport: stopped, counting in, running or stopping on the next line; and how many loops and sequencers are armed */
  transport: { state: TransportState; armed: number };
```
`buildSnapshot`: `metronome: { ...this.metronome.settings, locked: this.loopLength !== null || this.capture !== null },`, delete `playing: this.playing,`, add
```ts
      transport: { state: this.transport.state, armed: this.runtimes.filter((r) => r.buffer && r.info.active).length + [...this.sequencers.values()].filter((q) => q.state.playing).length },
```

d) Timing follows the metronome. In `setMetronome` after `this.metronome.set(next);`: `this.transport.setTiming(this.metronome.period, this.metronome.settings.beatsPerBar);`. Also call that same line right after `this.metronome.restore();` (line ~335).

e) Ticker. In `enable()`, right after `this.metronome.attach(ctx, this.mainOut);` (line ~943):
```ts
    this.transport.setTiming(this.metronome.period, this.metronome.settings.beatsPerBar);
    if (!this.transportTimer) this.transportTimer = setInterval(() => {
      if (!this.ctx || !this.transport.tick(this.ctx.currentTime)) return;
      // a stop line was reached: drop the finished sources so the next Play starts clean
      if (this.transport.state === "stopped") this.syncTransport();
      this.emit();
    }, 40);
```
In `dispose()`: `if (this.transportTimer) clearInterval(this.transportTimer); this.transportTimer = null;`.

f) Replace `gridActive()`, `othersRunning()`, `toggleMetronome()` and `syncMetronome()` (lines ~816-848) with:

```ts
  /** The Play/Stop button. Play starts the clock (with the count-in) and every armed loop and sequencer on beat 1. Stop ends everything on the next line. */
  setTransport(on: boolean) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (on) {
      this.stopAfterTake = false;
      if (this.transport.going) return;
      this.startTransport(this.metronome.settings.countInBars);
    } else {
      if (this.capture) {
        // finish the take first (quantised as usual); the transport stops when it is done
        this.stopAfterTake = true;
        this.stopRecording();
        if (this.capture) {
          this.emit();
          return;
        }
      }
      if (!this.transport.going) return;
      const at = this.transport.stop(now, this.metronome.settings.quantise);
      if (this.transport.state === "stopped") this.syncTransport();
      else {
        this.metronome.stopAt(at);
        this.runtimes.forEach((r) => {
          try {
            r.source?.stop(at);
          } catch {
            /* already stopped */
          }
        });
        this.sequencers.forEach((q) => q.running && q.stopAt(at));
      }
    }
    this.emit();
  }

  /** Start the transport for something that was just armed (a loop, a sequencer, a group). No count-in. Returns false when it was already going. */
  private ensureTransport() {
    if (!this.ctx || this.transport.going) return false;
    this.startTransport(0);
    return true;
  }

  /** Play from stopped (fresh grid, everything armed from its top), or carry on when a stop was pending. */
  private startTransport(countInBars: number) {
    if (!this.ctx) return;
    if (this.transport.state === "stopping") {
      this.transport.play(this.ctx.currentTime, countInBars);
      this.resumeAfterStop();
      this.syncTransport();
      return;
    }
    this.transport.play(this.ctx.currentTime, countInBars);
    this.syncTransport(true);
  }

  /**
   * Play pressed before the stop line: undo the scheduled stops. A buffer source's stop() cannot be cancelled,
   * so armed loops re-join at their current phase (a 20 ms seam); the metronome and sequencers just drop their stop time.
   */
  private resumeAfterStop() {
    this.metronome.start(this.transport.anchor);
    this.runtimes.forEach((r) => {
      if (r.buffer && r.info.active && r.source) this.startChannel(r, null);
    });
    this.sequencers.forEach((q) => q.stopping && q.cancelStop());
  }

  /**
   * Make the clock, the loops and the sequencers follow the transport and their armed flags.
   * `restart`: the grid just (re)started at transport.anchor, so everything armed starts from its top there.
   */
  private syncTransport(restart = false) {
    const t = this.transport;
    if (t.state === "stopped") {
      this.metronome.stop();
      this.runtimes.forEach((r) => this.stopSource(r));
      this.sequencers.forEach((q) => q.running && q.stop());
      return;
    }
    if (t.state === "stopping") return; // everything already stops at t.stopAt
    if (restart || !this.metronome.running) this.metronome.start(t.anchor);
    this.syncLoops(restart);
    this.syncSequencer(restart);
  }

  /** Armed loops play, disarmed ones stop, on the next beat; after a restart they start from their top at the anchor. */
  private syncLoops(restart: boolean) {
    if (!this.ctx || !this.loopLength) return;
    if (restart) this.loopStart = this.transport.anchor;
    const when = this.beatBoundary();
    this.runtimes.forEach((r) => {
      if (!r.buffer) return;
      if (r.info.active) {
        if (restart) {
          r.origin = this.transport.anchor;
          this.startChannel(r, this.transport.anchor);
        } else if (!r.source) this.startChannel(r, null, when);
      } else if (r.source) {
        try {
          r.source.stop(when);
        } catch {
          /* already stopped */
        }
        r.source = null;
      }
    });
  }
```

`syncSequencer(restart)` stays as it is (it already reads the grid anchor, now `this.transport.anchor`). Change its `if (q.state.playing)` branch guard to also require the transport going: `if (q.state.playing && this.transport.going)`, and the stop branch to `else if (q.running && !q.stopping)`.

`beatBoundary()` becomes:
```ts
  private beatBoundary(): number {
    return this.ctx ? this.transport.next(this.ctx.currentTime, "beat", 0.03) : 0;
  }
```

g) Arming. Rewrite `setSequencerPlaying` and `setLoopActive`:

```ts
  setSequencerPlaying(id: string, on: boolean) {
    const q = this.sequencers.get(id);
    if (!q || !this.ctx) return;
    q.setPlaying(on);
    if (on && this.ensureTransport()) return this.emit();
    this.syncSequencer();
    this.emit();
  }

  setLoopActive(id: number, on: boolean) {
    const rt = this.runtimes[id];
    if (!rt || !this.ctx || !rt.buffer) return;
    rt.info.active = on;
    if (on && this.ensureTransport()) return this.emit();
    if (this.transport.going) this.syncLoops(false);
    this.emit();
  }
```
`setGroupActive` stays as it is (it calls the two above).

h) Delete `setPlaying(on)` entirely. In `clear(id)`: delete the `this.playing = true;` line and replace `this.syncMetronome();` with `this.syncTransport();`.

i) Recording (`record`, line ~1806 onwards):
- First take, grid branch: replace `if (this.gridActive() && unit > 0)` with `if (this.transport.going && unit > 0)`. In that branch use `anchor = this.transport.anchor`.
- Nothing-running branch: replace the anchor computation with
  ```ts
        anchor = this.transport.play(this.ctx.currentTime, m.countInBars);
        startFrame = Math.round(anchor * sr) + comp;
  ```
- Replace `const fresh = anchor !== this.gridAnchor || !this.gridActive();` with `const fresh = !wasGoing;` where `const wasGoing = this.transport.going;` is captured at the top of the first-take block (before `play`).
- Replace `this.gridAnchor = anchor;` with nothing (play already set it; the grid branch did not move it). Replace `this.syncMetronome(fresh);` with `this.syncTransport(fresh);`.
- Later take: before computing `when`, add `this.ensureTransport();` (a later take while stopped starts the transport, no count-in). Replace its `this.syncMetronome();` with `this.syncTransport();`.
- `cancelCapture()`: replace `this.syncMetronome();` with `this.syncTransport();` and add `this.afterTake();`.

j) `finish(cap, endFrame)`:
- Empty-take early return: replace `this.syncMetronome();` with `this.syncTransport(); this.afterTake();`.
- First take: delete `this.playing = true;`. Replace `if (!this.loopOnGrid) this.gridAnchor = this.loopStart;` with `if (!this.loopOnGrid) this.transport.moveAnchor(this.loopStart);`.
- Replace `if (this.playing) this.startChannel(...)` with `if (this.transport.going) this.startChannel(rt, firstTake && !this.loopOnGrid ? this.loopStart : null);`.
- Replace the final `this.syncMetronome(firstTake);` with `this.syncTransport(firstTake && !this.loopOnGrid); this.afterTake();`.

  (On the grid the first take's loop already plays in phase from `cap.at`; only an off-grid first take moves the anchor and needs the restart. This matches today's behaviour for sequencers, which re-join the moved grid.)

Add:
```ts
  /** A take ended: honour a Stop pressed while it ran. */
  private afterTake() {
    if (!this.stopAfterTake) return;
    this.stopAfterTake = false;
    this.setTransport(false);
  }
```

k) Positions: `getPosition()` and `getChannelPosition()` replace `!this.playing` with `!this.transport.going && this.transport.state !== "stopping"` → simpler: `this.transport.state === "stopped" || this.transport.state === "countIn"` returns null. Write it as:
```ts
    if (!this.ctx || !this.loopLength || !(this.transport.state === "running" || this.transport.state === "stopping")) return null;
```
(and the equivalent in `getChannelPosition`, keeping its `rt.info.active` check).

l) `getTimeline()` next to `getPosition()`:
```ts
  /** The header timeline: transport state, the cycle in bars, where in it we are, and the take that is growing it. Null before the engine starts. */
  getTimeline(): Timeline | null {
    if (!this.ctx) return null;
    const m = this.metronome.settings;
    const period = this.metronome.period;
    const barSec = period * m.beatsPerBar;
    const loopBars = this.runtimes.filter((r) => r.buffer && r.info.active).map((r) => r.buffer!.duration / barSec);
    const cap = this.capture;
    const st = cap ? this.getTakeStatus(cap.channel) : null;
    const take = st && st.phase !== "armed" ? { bar: st.bar, totalBars: st.totalBars, planned: cap!.endFrame !== null && !cap!.stopping } : null;
    const cycle = Math.max(cycleBars(loopBars), take?.totalBars ?? 1);
    const pos = this.transport.active ? timelinePosition(this.ctx.currentTime, this.transport.anchor, period, m.beatsPerBar, cycle) : { bar: 0, beat: 0, fraction: 0, countIn: false };
    return { state: this.transport.state, cycle, ...pos, take };
  }
```
Export the `Timeline` interface (shape in Interfaces above) from `engine.ts`.

Note: a later take grows from the loop length, so `takeStatus` totalBars (minBars = loop bars, doubled as it grows) is already in bars of the timeline; `cycle` takes the larger of the two.

m) Search and fix leftovers: `grep -n "syncMetronome\|gridActive\|othersRunning\|metroManual\|this.playing\|gridAnchor" src/lib/looper/engine.ts` must print nothing.

- [ ] **Step 7: Type check and tests**

Run: `npx tsc --noEmit` — fix every error in `src/lib/looper` (UI errors in `src/components/looper` about `snap.playing`, `m.manual`, `metronome.toggle`, `playback.set` are expected and fixed in Task 4; note them).
Run: `npx tsx --test src/lib/looper/*.test.ts src/lib/chordKit/chordKit.test.ts`
Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/looper spec/looper-actions.md
git commit -m "Engine: one transport owns the grid; transport.set replaces metronome.toggle and playback.set

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Transport controls in the UI

**Files:**
- Modify: `src/components/looper/MetronomeBar.tsx:31-37`
- Modify: `src/components/looper/LooperApp.tsx` (`loopControls`, `loopBars`)
- Modify: `src/components/looper/LoopStage.tsx` (group running, sequencer ring)

**Interfaces:**
- Consumes: `snap.transport`, action `transport.set` (Task 3).
- Produces: `TransportButton` exported from `MetronomeBar.tsx`:
  ```ts
  export function TransportButton({ engine, snap, ready, className }: { engine: LooperEngine; snap: LooperSnapshot; ready: boolean; className?: string }): JSX.Element
  ```

- [ ] **Step 1: TransportButton**

In `MetronomeBar.tsx` add and use it in place of the old metronome play button (delete `const running = m.running;`):

```tsx
/** Play/Stop for everything: the clock and every armed loop and sequencer. Shown in the metronome bar and the Looping header. */
export function TransportButton({ engine, snap, ready, className = "" }: { engine: LooperEngine; snap: LooperSnapshot; ready: boolean; className?: string }) {
  const st = snap.transport.state;
  const going = st === "countIn" || st === "running";
  const label = going ? "Stop everything" : st === "stopping" ? "Stopping on the next line: play to carry on" : "Play";
  return (
    <button type="button" className={`grid h-9 w-9 place-items-center rounded-lg border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 disabled:opacity-40 ${going ? "border-sky-400 bg-sky-500/20 text-sky-100" : st === "stopping" ? "border-amber-400/60 text-amber-200" : "border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500"} ${className}`} aria-pressed={going} onClick={() => engine.do({ type: "transport.set", on: !going })} disabled={!ready} title={label} aria-label={label}>
      <Icon name={going ? "square" : "play"} fill />
    </button>
  );
}
```
In `MetronomeBar` render `<TransportButton engine={engine} snap={snap} ready={ready} />` where the old button was. Update the popover footnote text to: `The click runs while the transport plays and is never recorded.` plus the existing locked/count-in sentence (change "before the metronome starts on its own" to "before Play").

- [ ] **Step 2: Looping header**

In `LooperApp.tsx` replace the playback button inside `loopControls` with `<TransportButton engine={engine} snap={snap} ready={ready} />` (import it from `./MetronomeBar`). Replace the label `<span>` with `<span className="text-xs text-slate-400 tabular-nums">{headerLabel(snap)}</span>` and replace `loopBars` with:

```ts
/** What the Looping header says: what exists when stopped, where we are when running. The live bar number is drawn by the Timeline. */
function headerLabel(snap: LooperSnapshot): string {
  const st = snap.transport.state;
  if (snap.channels.some((c) => c.state === "recording")) return "● rec";
  if (st === "countIn") return "count-in";
  const hasLoop = snap.loopSeconds !== null;
  if (!hasLoop && snap.sequencers.length === 0) return "Record or start a sequencer";
  if (!hasLoop) return "1 bar";
  const bars = (snap.loopSeconds! * snap.metronome.bpm) / 60 / snap.metronome.beatsPerBar;
  const whole = Math.round(bars) >= 1 && Math.abs(bars - Math.round(bars)) < 0.02;
  return `${whole ? `${Math.round(bars)} bar${Math.round(bars) === 1 ? "" : "s"} · ` : ""}${snap.loopSeconds!.toFixed(2)} s`;
}
```

- [ ] **Step 3: Stage shows sounding vs armed**

In `LoopStage.tsx` line ~115, the GroupBox `running` prop: replace `c.active && snap.playing` with `c.active && (snap.transport.state === "running" || snap.transport.state === "stopping")`, and `q.playing` with `q.running`.

Sequencer circle (line ~244-256): keep `q.playing` for the button's `aria-pressed`, icon and title (it is the armed switch). For the ring colour use the sound: `const ring = q.running ? "#34d399" : colour;` and the ring opacity `q.running ? 1 : q.playing ? 0.6 : 0.3`; the inner fill `q.running ? \`${ring}22\` : "none"`. Change titles: `q.playing ? "Disarm (stops on the next beat)" : "Arm (starts the transport if stopped)"` — keep them short: `q.playing ? "Stop on the next beat" : "Play"`.

Loop circles already use `getChannelPosition` (null when not sounding) and `ch.active` for the button; no change.

- [ ] **Step 4: Type check, lint, tests**

Run: `npx tsc --noEmit && npm run lint && npx tsx --test src/lib/looper/*.test.ts src/lib/chordKit/chordKit.test.ts`
Expected: clean, all PASS. `grep -rn "snap.playing\|m.manual\|metronome.toggle\|playback.set" src/components` prints nothing.

- [ ] **Step 5: Commit**

```bash
git add src/components/looper
git commit -m "One Play/Stop in the metronome bar and the Looping header; stage shows sounding vs armed

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Bar timeline

**Files:**
- Create: `src/components/looper/Timeline.tsx`
- Modify: `src/components/looper/LooperApp.tsx` (replace `LoopBar` and its use; drop `getPosition` memo if unused)

**Interfaces:**
- Consumes: `engine.getTimeline(): Timeline | null` (Task 3).
- Produces: `export default function Timeline({ engine, beatsPerBar }: { engine: LooperEngine; beatsPerBar: number })`.

- [ ] **Step 1: Write the component**

```tsx
// src/components/looper/Timeline.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import type { LooperEngine } from "@/lib/looper/engine";

/**
 * The Looping header's timeline: one segment per bar of the cycle (the longest loop, or one bar), beat ticks inside,
 * the current bar lit and a playhead. A take that grows the loop adds segments live, filled red; a count-in shows hollow.
 */
export default function Timeline({ engine, beatsPerBar }: { engine: LooperEngine; beatsPerBar: number }) {
  const [shape, setShape] = useState({ cycle: 1, take: 0, countIn: false });
  const head = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const segs = useRef<(HTMLDivElement | null)[]>([]) as { current: (HTMLDivElement | null)[] };

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const t = engine.getTimeline();
      const cycle = t?.cycle ?? 1;
      const take = t?.take?.totalBars ?? 0;
      const countIn = t?.countIn ?? false;
      setShape((s) => (s.cycle === cycle && s.take === take && s.countIn === countIn ? s : { cycle, take, countIn }));
      const live = t && (t.state === "running" || t.state === "stopping");
      if (head.current) {
        head.current.style.left = `${(live ? t.fraction : 0) * 100}%`;
        head.current.style.opacity = live ? "1" : "0";
      }
      segs.current.forEach((el, i) => {
        if (el) el.style.opacity = live && i === t.bar ? "1" : t?.take && i < t.take.bar ? "0.85" : "0.35";
      });
      if (label.current) label.current.textContent = t?.take ? `bar ${t.take.bar} / ${t.take.totalBars}` : live ? `bar ${t.bar + 1} / ${cycle}` : t?.countIn ? `count-in ${t.beat + 1}` : "";
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [engine]);

  const recording = shape.take > 0;
  return (
    <div className="flex min-w-[8rem] flex-1 items-center gap-2">
      <div className="relative flex h-3 flex-1 gap-0.5" role="img" aria-label="Position in the loop, by bars">
        {Array.from({ length: shape.cycle }, (_, i) => (
          <div key={i} ref={(el) => { segs.current[i] = el; }} className={`relative flex-1 overflow-hidden rounded-sm ${shape.countIn ? "border border-sky-400/60 bg-transparent" : recording ? "bg-rose-500" : "bg-sky-400"}`} style={{ opacity: 0.35 }}>
            {Array.from({ length: beatsPerBar - 1 }, (_, b) => (
              <span key={b} className="absolute top-0 h-full w-px bg-slate-950/50" style={{ left: `${((b + 1) / beatsPerBar) * 100}%` }} />
            ))}
          </div>
        ))}
        <div ref={head} className="pointer-events-none absolute -top-0.5 h-4 w-0.5 rounded bg-white" style={{ left: 0, opacity: 0 }} />
      </div>
      <span ref={label} className="w-20 shrink-0 text-right text-[11px] tabular-nums text-slate-400" aria-live="off" />
    </div>
  );
}
```

- [ ] **Step 2: Use it**

In `LooperApp.tsx`: replace `<LoopBar getPosition={getPosition} />` with `<Timeline engine={engine} beatsPerBar={snap.metronome.beatsPerBar} />`; delete the `LoopBar` function; import `Timeline from "./Timeline"`. If `getPosition` is still passed to `LoopStage` keep the memo, otherwise delete it (LoopStage declares but does not use `getPosition`; remove the prop from both).

- [ ] **Step 3: Type check, lint, tests**

Run: `npx tsc --noEmit && npm run lint && npx tsx --test src/lib/looper/*.test.ts src/lib/chordKit/chordKit.test.ts`
Expected: clean, all PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/looper
git commit -m "Looping header timeline: bars, beat ticks, playhead, grows during a take

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Fixed and Canvas views only

**Files:**
- Modify: `src/components/looper/ViewMenu.tsx`
- Modify: `src/components/looper/LooperApp.tsx` (view state, migration, `WidgetBoard` branch, `mixLayout`, imports)
- Modify: `src/components/looper/ConnectionLayer.tsx` (drop `mode`)
- Modify: `src/components/looper/AddFab.tsx` (drop `wires`)

**Interfaces:**
- Produces: `export type View = "fixed" | "canvas";` and `export function toView(raw: unknown): View` in `ViewMenu.tsx`.

- [ ] **Step 1: ViewMenu**

```ts
export type View = "fixed" | "canvas";

/** Saved views from before Canvas: "widgets" and "lines" both open as the canvas. */
export function toView(raw: unknown): View {
  return raw === "fixed" ? "fixed" : "canvas";
}

const VIEWS: { id: View; label: string; hint: string; icon: "rows-3" | "git-merge" }[] = [
  { id: "fixed", label: "Fixed layout", hint: "Everything in its place", icon: "rows-3" },
  { id: "canvas", label: "Canvas", hint: "Drag widgets; connections drawn as wires", icon: "git-merge" },
];
```
`const current = VIEWS.find((v) => v.id === view) ?? VIEWS[1];` stays valid.

- [ ] **Step 2: LooperApp**

- `const [storedView, setView] = useStored<string>("musickit.looper.view", "canvas"); const view = toView(storedView);` and `const widgetMode = view === "canvas";` (import `toView`).
- Keep the old `widgetMode === "false"` migration effect.
- Replace the three-way render with:
  ```tsx
      {view === "canvas" ? (
        <FreeBoard ... unchanged props ... />
      ) : mixer(false)}
  ```
- `ConnectionLayer` line: `{widgetMode && ready && <ConnectionLayer engine={engine} snap={snap} wrapper={pageRef} />}`.
- `AddFab` line: drop `wires={view === "lines"}`.
- Delete `mixLayout`, the `WidgetBoard` import, `usePinned`/`PinTitle`/`PinBody` imports and `pinned` if now unused, `InputList`/`SequencerList`/`Buses`/`NodeBody`/`patchName`/`DefaultLayout` imports if now unused (let `tsc`/lint tell you).

- [ ] **Step 3: ConnectionLayer and AddFab**

- `ConnectionLayer.tsx:47`: remove `mode` from props and type; replace `{mode === "lines" && (` at line ~269 with the inner content unconditionally (remove the condition and its closing `)}`).
- `AddFab.tsx`: remove the `wires` prop, `wiresOnly` and any `disabled`/title using it; update the comment at line ~39 to "Canvas".
- `AddFab.tsx` Tuner item (added on main in 8cae3a4): its hint `{wires ? "wire a guitar through it" : "wire it in Widgets with wires"}` becomes the plain string `"wire a guitar through it"`.
- `mixLayout` (deleted with the Widgets branch) also placed `tuner:` widgets, and the Widgets branch rendered `TunerWidget` per tuner node. Nothing to move: Canvas already renders tuner cards through `FreeBoard` → `NodeBody` → `TunerWidget`. Keep the `TunerWidget` / `setPitchDetector` / `detectPitch` imports in `LooperApp.tsx` only if still used (`setPitchDetector` wiring stays).

- [ ] **Step 4: Text**

Run: `grep -rn "Widgets with wires\|widgets view\|Widgets view" src spec` and change each to "Canvas" (e.g. the Stage help `InfoTip` in `LoopStage.tsx`: "Effect widgets: the round + button, or the dashboard button on an effect.").

- [ ] **Step 5: Type check, lint, tests**

Run: `npx tsc --noEmit && npm run lint && npx tsx --test src/lib/looper/*.test.ts src/lib/chordKit/chordKit.test.ts`
Expected: clean, all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/looper spec
git commit -m "Views: Fixed and Canvas; the colour-only Widgets view is gone

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Rules, spec and browser check

**Files:**
- Modify: `src/lib/looper/CLAUDE.md`
- Modify: `spec/looper.md`

- [ ] **Step 1: CLAUDE.md**

In "Metronome and quantising", replace the bullets "The metronome runs whenever anything runs…", "The click runs whenever a take is recording…" and the last bullet "The metronome can run on its own (`toggleMetronome`)…" with:

```md
- **Transport** (`transport.ts`, pure, tested) is the one owner of the beat grid: `stopped`, `countIn`, `running`, `stopping`. Play (`transport.set`, the button in the metronome bar and the Looping header) starts the clock with the count-in and every armed loop and sequencer on beat 1; Stop ends everything on the next line (quantise setting; at once when off or during the count-in). Stop during a take ends the take first, then stops. The bell is the only way to silence the click.
- **Armed**: a loop's `active` and a sequencer's `playing` mean armed. Arming while stopped starts the transport (no count-in); disarming the last item keeps the clock running. Stopping never clears armed flags. The engine's `syncTransport()` makes metronome, loops and sequencers follow the transport; never start them around it.
```
In "UI", change "No "start" button, no explanatory walls of text." to "One Play/Stop (the transport), no explanatory walls of text.".
In the Patch section, change "views: fixed, widgets with coloured connectors, widgets with wires; the last is the freeform `FreeBoard`" to "views: Fixed and Canvas (the freeform `FreeBoard`)". In "Actions, history, macros, widgets", replace the sentence about widget views supplying Looping, Inputs, Sequencers, Buses widgets with "Canvas uses the shared board in `src/features/widgets` (maths in `board.ts`, tested) through `FreeBoard`."

- [ ] **Step 2: spec/looper.md**

Find the metronome / playback / views sections (`grep -n "metronome\|Play\|view\|Widgets" spec/looper.md`) and rewrite them to match the CLAUDE.md bullets above, plus the timeline: "The Looping header shows Play/Stop, Clear, a short label (what exists, count-in, or ● rec) and the timeline: one segment per bar of the longest armed loop (one bar without loops), beat ticks, the current bar lit and a playhead; a take adds segments as it grows (red), a count-in shows hollow." Note `musickit.looper.view` values: `fixed` | `canvas` (old `widgets`/`lines` open as `canvas`); `musickit.looper.widgets2` no longer used.

- [ ] **Step 3: Browser check**

Run `npm run dev` in the worktree (background), open `/looper` in Chromium with `--use-fake-device-for-media-stream --use-fake-ui-for-media-stream`, click the page once to start the engine, then verify and note each:
1. Empty project (New project): Play → count-in then clicks; both Play buttons show Stop; Stop → clicks end on the next bar and both buttons flip to Play.
2. A group ▶ while stopped → transport starts, its sequencers sound; group ■ → that group stops, clock keeps ticking; main Stop → silence.
3. Record a first take on Loop 1, stop it → loop plays, header label shows bars and seconds, timeline has that many segments.
4. Free take on Loop 2 recorded past one cycle → timeline segments double live in red; on stop the loop is 2× and the timeline keeps 2× segments.
5. Bell mutes the click without stopping anything.
6. View menu lists Fixed layout and Canvas only; a saved `musickit.looper.view = "widgets"` opens Canvas.
Real audio interfaces and MIDI cannot be verified here; say so in the summary.

- [ ] **Step 4: Full checks**

Run: `npx tsx --test src/lib/looper/*.test.ts src/lib/chordKit/chordKit.test.ts && npx tsc --noEmit && npm run lint`
Expected: all PASS, clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/looper/CLAUDE.md spec/looper.md
git commit -m "Docs: transport rules, timeline, Fixed and Canvas views

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

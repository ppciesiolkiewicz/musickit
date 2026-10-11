# Open Chords, Simplest-Chord Picking and Chord Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add open chords and power chords to the chord library, make every "best shape for this chord" pick prefer open chords and then the first barre, stop "Chords in key" from showing 7th/shell voicings for triads, and add a search box to the Chords explorer.

**Architecture:** Open chords live in a new `openShapes.ts` list with a fixed root fret (`at`). They are merged with the movable shapes only in `ALL_SHAPES` and are guarded everywhere by `fitsRoot`. `RICH_SHAPES` stays movable-only, so progressions and CAGED box code are untouched. Picking order is one shared `shapeTier` function. Search is a pure parser (`chordSearch.ts`, tonal) and a small results component in the Shapes tab.

**Tech Stack:** Next 16 (client components only, no new Next APIs), React 19, TypeScript, `@tonaljs/tonal`, node:test via tsx.

**Spec:** `docs/superpowers/specs/2026-10-11-theory-course-design.md`, section 3 (part 1 of 7 in its build order).

## Global Constraints

- Test runner: `npx tsx` hangs here. Use the cached binary: `TSX=~/.npm/_npx/69f9afb961c37556/node_modules/.bin/tsx` (find it with `ls ~/.npm/_npx/*/node_modules/.bin/tsx` if that path is gone). Run `$TSX --test src/lib/chordKit/*.test.ts`.
- Type check: `npx tsc --noEmit 2>&1 | grep -v '^.next/'` must print nothing (stale `.next/` errors are known and ignored).
- `npm test` globs `src/lib/chordKit/*.test.ts`, so new test files there are picked up automatically.
- Match the surrounding code style: compact one-line shape literals, short JSDoc comments, Tailwind slate/sky classes.
- Do not stage the unrelated working-tree changes (`.gitignore`, `src/features/widgets/*`, `.claude/`). Stage only the files named in each task.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. An open chord must never show up for the wrong root (e.g. open C offered for D♭). Every consumer goes through `fitsRoot`. A test asserts that `shapesForTones` and `keyEntries` never return an open shape whose root differs. This is in Task 2 and Task 3.
2. Movable-only consumers (progressions `pickShape`, CAGED `boxChords`, the ProgressionsTab list) must not receive open shapes. A test asserts that `RICH_SHAPES` has no `at`. This is in Task 1.
3. Search input variety: lowercase (`am7`), spaces (`Bb maj7`), unicode accidentals (`F♯m`, `B♭`), a bare quality with no root (`dim`) and plain words (`funk`, `bossa`, `b`). Tests for these are in Task 4.
4. A chord with no open voicing (F, Bdim) still gets a sensible first pick: the lowest barre for F, any triad for Bdim. This is in Task 2.
5. ShapeCard on an open chord must not offer the root-fret stepper. Moving it would turn "open C" into a wrong chord. This is checked manually in Task 3.

---

### Task 1: Open-chord and power-chord data

**Files:**
- Modify: `src/lib/chordKit/shapes.ts` (the `ShapeFamily` type, the `Shape` interface, two power-chord entries)
- Create: `src/lib/chordKit/openShapes.ts`
- Modify: `src/lib/chordKit/shapeTools.ts` (`rootFretFor`, new `fitsRoot`, `OPEN_RICH`, `ALL_SHAPES`, names, families)
- Modify: `src/lib/chordKit/chordKit.test.ts:18-20` (shape count 90 → 92)
- Test: `src/lib/chordKit/openShapes.test.ts`

**Interfaces:**
- Produces:
  - `Shape.at?: number` is the fixed root fret of an open chord.
  - `Shape.stage?: 1 | 2` is the course stage.
  - `ShapeFamily` gains `"power"`.
  - `OPEN_SHAPES: Shape[]`.
  - `OPEN_RICH: RichShape[]` (ids start at 1000).
  - `ALL_SHAPES: RichShape[]` (movable first, then open).
  - `fitsRoot(sh: Shape, rootPc: number): boolean`.
  - `openRootPc(sh: Shape): number | null`.
  - `rootFretFor` returns `sh.at` for open shapes.

- [ ] **Step 1: Write the failing test**

Create `src/lib/chordKit/openShapes.test.ts`:

```ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { OPEN_SHAPES } from "./openShapes";
import { SHAPES, type Shape } from "./shapes";
import { ALL_SHAPES, OPEN_RICH, RICH_SHAPES, ROOT_INDEX, fitsRoot, openRootPc, rootFretFor, shapeSemitones } from "./shapeTools";

const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const label = (s: Shape) => `${NAMES[openRootPc(s) ?? 0]}${s.suf}`;

describe("open chords", () => {
  it("are the chords the course teaches, by name", () => {
    const names = OPEN_SHAPES.map((s) => label(s)).sort();
    assert.deepEqual(names, ["A", "A7", "Am", "Am7", "Asus2", "B7", "C", "C7", "Cadd9", "D", "D7", "Dm", "Dsus2", "Dsus4", "E", "E7", "Em", "Em7", "Esus4", "Fmaj7", "G", "G7"].sort());
  });
  it("stage 1 is the eight first chords", () => {
    assert.deepEqual(OPEN_SHAPES.filter((s) => s.stage === 1).map((s) => label(s)).sort(), ["A", "Am", "C", "D", "Dm", "E", "Em", "G"]);
  });
  it("each fingering sounds its expected intervals, root offset 0, no fret below 0", () => {
    for (const s of OPEN_SHAPES) {
      assert.equal(s.f[ROOT_INDEX[s.rs]], 0, label(s));
      assert.ok(s.at !== undefined && s.f.every((v) => v === null || s.at! + v >= 0), label(s));
      const got = [...new Set(shapeSemitones(s).filter((v): v is number => v !== null))].sort((a, b) => a - b);
      assert.deepEqual(got, [...s.exp].sort((a, b) => a - b), label(s));
      assert.ok(s.tags.includes("open"), label(s));
    }
  });
  it("are easy, carry ids from 1000, and only fit their own root", () => {
    OPEN_RICH.forEach((s, i) => {
      assert.equal(s.diff, "easy");
      assert.equal(s.id, 1000 + i);
      const pc = openRootPc(s)!;
      for (let r = 0; r < 12; r++) assert.equal(fitsRoot(s, r), r === pc);
      assert.equal(rootFretFor(s, pc), s.at);
    });
  });
  it("RICH_SHAPES stays movable-only; ALL_SHAPES has both", () => {
    assert.ok(RICH_SHAPES.every((s) => s.at === undefined));
    assert.equal(ALL_SHAPES.length, RICH_SHAPES.length + OPEN_RICH.length);
    assert.ok(RICH_SHAPES.every((s) => [0, 5, 11].every((pc) => fitsRoot(s, pc))));
  });
  it("adds 6th- and 5th-string power chords", () => {
    const p = SHAPES.filter((s) => s.suf === "5");
    assert.deepEqual(p.map((s) => s.rs).sort(), [5, 6]);
    p.forEach((s) => { assert.equal(s.fam, "power"); assert.deepEqual(s.exp, [0, 7]); });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `$TSX --test src/lib/chordKit/openShapes.test.ts`
Expected: FAIL with `Cannot find module './openShapes'`.

- [ ] **Step 3: Extend the `Shape` type and add power chords in `shapes.ts`**

Replace the `ShapeFamily` line and the `Shape` interface:

```ts
export type ShapeFamily = "major" | "minor" | "dominant" | "altered" | "sus" | "power";
export type RootString = 6 | 5 | 4 | 3 | 1;

export interface Shape {
  rs: RootString;
  suf: string;
  v?: string;
  fam: ShapeFamily;
  ext: string;
  f: (number | null)[];
  tags: string[];
  exp: number[];
  n?: Record<number, string>;
  note?: string;
  /** open chords only: the fixed fret of the root, so the shape is one chord and does not move */
  at?: number;
  /** open chords only: the course stage that teaches it */
  stage?: 1 | 2;
}
```

Append these two entries at the end of the `SHAPES` array (before the closing `];`):

```ts

  // power chords: root and 5th (plus the octave), no 3rd
  {rs:6,suf:'5',fam:'power',ext:'triad',f:[0,2,2,N,N,N],tags:['rock','compact'],exp:[0,7],note:'Root, 5th and octave: the rock rhythm chord.'},
  {rs:5,suf:'5',fam:'power',ext:'triad',f:[N,0,2,2,N,N],tags:['rock','compact'],exp:[0,7]},
```

- [ ] **Step 4: Create `src/lib/chordKit/openShapes.ts`**

```ts
import type { Shape } from "./shapes";

const N = null;

/**
 * Open-position chords: each is one chord, not a movable shape.
 * `f` holds offsets from the root fret like every other shape, and `at` is that root fret, so `at + f` is the real fret (0 = open string).
 * `stage` is the course stage that teaches the chord.
 */
export const OPEN_SHAPES: Shape[] = [
  // ---------- stage 1: the first eight chords ----------
  {rs:6,suf:'m',   fam:'minor',   ext:'triad',at:0,stage:1,f:[0,2,2,0,0,0],      tags:['open','pop','rock'],exp:[0,3,7],note:'Usually the very first chord: two fingers.'},
  {rs:5,suf:'m',   fam:'minor',   ext:'triad',at:0,stage:1,f:[N,0,2,2,1,0],      tags:['open','pop','rock'],exp:[0,3,7]},
  {rs:5,suf:'',    fam:'major',   ext:'triad',at:3,stage:1,f:[N,0,-1,-3,-2,-3],  tags:['open','pop','rock'],exp:[0,4,7]},
  {rs:4,suf:'',    fam:'major',   ext:'triad',at:0,stage:1,f:[N,N,0,2,3,2],      tags:['open','pop','rock'],exp:[0,4,7]},
  {rs:6,suf:'',    fam:'major',   ext:'triad',at:3,stage:1,f:[0,-1,-3,-3,-3,0],  tags:['open','pop','rock'],exp:[0,4,7]},
  {rs:6,suf:'',    fam:'major',   ext:'triad',at:0,stage:1,f:[0,2,2,1,0,0],      tags:['open','pop','rock'],exp:[0,4,7]},
  {rs:5,suf:'',    fam:'major',   ext:'triad',at:0,stage:1,f:[N,0,2,2,2,0],      tags:['open','pop','rock'],exp:[0,4,7]},
  {rs:4,suf:'m',   fam:'minor',   ext:'triad',at:0,stage:1,f:[N,N,0,2,3,1],      tags:['open','pop','rock'],exp:[0,3,7]},

  // ---------- stage 2: more open chords ----------
  {rs:4,suf:'maj7',fam:'major',   ext:'7',    at:3,stage:2,f:[N,N,0,-1,-2,-3],   tags:['open','pop'],exp:[0,4,7,11],note:'The easy F: no barre needed.'},
  {rs:5,suf:'7',   fam:'dominant',ext:'7',    at:2,stage:2,f:[N,0,-1,0,-2,0],    tags:['open','blues','rock'],exp:[0,4,7,10],note:'The V7 that pulls back to E minor.'},
  {rs:6,suf:'7',   fam:'dominant',ext:'7',    at:0,stage:2,f:[0,2,0,1,0,0],      tags:['open','blues','rock'],exp:[0,4,7,10]},
  {rs:5,suf:'7',   fam:'dominant',ext:'7',    at:0,stage:2,f:[N,0,2,0,2,0],      tags:['open','blues','rock'],exp:[0,4,7,10]},
  {rs:4,suf:'7',   fam:'dominant',ext:'7',    at:0,stage:2,f:[N,N,0,2,1,2],      tags:['open','blues','rock'],exp:[0,4,7,10]},
  {rs:5,suf:'7',   fam:'dominant',ext:'7',    at:3,stage:2,f:[N,0,-1,0,-2,-3],   tags:['open','blues'],exp:[0,4,10]},
  {rs:6,suf:'7',   fam:'dominant',ext:'7',    at:3,stage:2,f:[0,-1,-3,-3,-3,-2], tags:['open','blues'],exp:[0,4,7,10]},
  {rs:6,suf:'m7',  fam:'minor',   ext:'7',    at:0,stage:2,f:[0,2,2,0,3,0],      tags:['open','pop'],exp:[0,3,7,10]},
  {rs:5,suf:'m7',  fam:'minor',   ext:'7',    at:0,stage:2,f:[N,0,2,0,1,0],      tags:['open','pop'],exp:[0,3,7,10]},
  {rs:5,suf:'add9',fam:'major',   ext:'9',    at:3,stage:2,f:[N,0,-1,-3,0,0],    tags:['open','pop'],exp:[0,2,4,7],n:{2:'9'}},
  {rs:5,suf:'sus2',fam:'sus',     ext:'triad',at:0,stage:2,f:[N,0,2,2,0,0],      tags:['open','pop','sus'],exp:[0,2,7],n:{2:'2'}},
  {rs:4,suf:'sus2',fam:'sus',     ext:'triad',at:0,stage:2,f:[N,N,0,2,3,0],      tags:['open','pop','sus'],exp:[0,2,7],n:{2:'2'}},
  {rs:4,suf:'sus4',fam:'sus',     ext:'triad',at:0,stage:2,f:[N,N,0,2,3,3],      tags:['open','pop','sus'],exp:[0,5,7],n:{5:'4'}},
  {rs:6,suf:'sus4',fam:'sus',     ext:'triad',at:0,stage:2,f:[0,2,2,2,0,0],      tags:['open','pop','sus'],exp:[0,5,7],n:{5:'4'}},
];
```

The order is Em, Am, C, D, G, E, A, Dm, which is also the suggested learning order. The Stage 1 article will render this list in this order.

- [ ] **Step 5: Wire the open shapes into `shapeTools.ts`**

Change the import at the top of the file:

```ts
import { SHAPES, type RootString, type Shape } from "./shapes";
import { OPEN_SHAPES } from "./openShapes";
```

Replace the `RICH_SHAPES` line:

```ts
/** Movable shapes only. Code that slides a shape to any root (progressions, CAGED boxes) uses this list. */
export const RICH_SHAPES: RichShape[] = SHAPES.map((s, id) => ({ ...s, id, diff: shapeDifficulty(s), fit: modesFitting(s.exp) }));

/** Open-position chords: always easy, ids from 1000 so they never collide with movable ids. */
export const OPEN_RICH: RichShape[] = OPEN_SHAPES.map((s, i) => ({ ...s, id: 1000 + i, diff: "easy", fit: modesFitting(s.exp) }));

/** Every shape: movable first, then open chords. Anything that asks "which shapes play this chord" uses this list with `fitsRoot`. */
export const ALL_SHAPES: RichShape[] = [...RICH_SHAPES, ...OPEN_RICH];
```

Because `OPEN_NOTE` and `ROOT_INDEX` are declared below `RICH_SHAPES`, put these two functions directly after `rootFretFor`, and change `rootFretFor` itself:

```ts
/** Fret where the root note sits, shifted up an octave until the whole shape is playable (frets >= 1). Open chords stay where they are. */
export function rootFretFor(sh: Shape, rootPc: number): number {
  if (sh.at !== undefined) return sh.at;
  const ri = ROOT_INDEX[sh.rs];
  let r = (rootPc - OPEN_NOTE[ri] + 12) % 12;
  const minOff = Math.min(...sh.f.filter((v): v is number => v !== null));
  while (r + minOff < 1) r += 12;
  return r;
}

/** The root pitch class of an open chord, or null for a movable shape. */
export const openRootPc = (sh: Shape): number | null => (sh.at === undefined ? null : (OPEN_NOTE[ROOT_INDEX[sh.rs]] + sh.at) % 12);

/** Can this shape play a chord on `rootPc`? Movable shapes always can; an open chord only on its own root. */
export const fitsRoot = (sh: Shape, rootPc: number): boolean => sh.at === undefined || openRootPc(sh) === rootPc;
```

Add names to `FULL_NAME` (append to the object):

```ts
  "5": "Power chord", add9: "Major add 9",
```

Add to `VARIANT` (append to the object):

```ts
  "5": "root and 5th only, no 3rd, so it is neither major nor minor", add9: "major triad with an added 9th (no 7th)",
```

Replace `FAMILY_ORDER` and `FAMILY_LABEL`:

```ts
export const FAMILY_ORDER = ["major", "minor", "dominant", "altered", "sus", "power"] as const;
export const FAMILY_LABEL: Record<(typeof FAMILY_ORDER)[number], string> = {
  major: "Major", minor: "Minor", dominant: "Dominant", altered: "Diminished and augmented", sus: "Suspended", power: "Power chords",
};
```

- [ ] **Step 6: Update the shape-count assertion**

In `src/lib/chordKit/chordKit.test.ts`, inside `it("has 90 shapes and a sensible difficulty mix"`:

```ts
  it("has 92 shapes and a sensible difficulty mix", () => {
    assert.equal(SHAPES.length, 92);
```

- [ ] **Step 7: Run tests and type check**

Run: `$TSX --test src/lib/chordKit/*.test.ts`
Expected: all pass, including the new `open chords` suite.

Run: `npx tsc --noEmit 2>&1 | grep -v '^.next/'`
Expected: no output.

- [ ] **Step 8: Commit**

```bash
git add src/lib/chordKit/shapes.ts src/lib/chordKit/openShapes.ts src/lib/chordKit/openShapes.test.ts src/lib/chordKit/shapeTools.ts src/lib/chordKit/chordKit.test.ts
git commit -m "Chords: open chords (stage 1 and 2) and power chords in the shape library

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Pick the simplest chord first; triads stay triads

**Files:**
- Modify: `src/lib/chordKit/chordShapes.ts` (`shapeTier`, `shapesForChord`, `shapesForTones`)
- Modify: `src/components/chordKit/CagedExplorer.tsx:111` (pass every difficulty and `{ fit: "triad" }`, so the hard-rated 1st-fret F barre is allowed)
- Modify: `src/components/chordKit/ChordShapeCarousel.tsx` (help text only)
- Test: `src/lib/chordKit/openShapes.test.ts` (append a suite)

**Interfaces:**
- Consumes: `ALL_SHAPES` and `fitsRoot` from Task 1.
- Produces:
  - `shapeTier(sh: RichShape): 0 | 1 | 2`. 0 = open, 1 = first barre (E-shape or A-shape major or minor triad), 2 = the rest.
  - `shapesForChord(ctx, degree, difficulties?, opts?: { fit?: "mode" | "triad" })`. The default `"mode"` keeps today's set of shapes but sorts by exact, then tier, then difficulty, then fret, then id.
  - `shapesForTones` includes open chords and sorts by full, then score, then tier, then exact, and so on.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/chordKit/openShapes.test.ts`:

```ts
import { shapesForChord, shapesForTones, shapeTier } from "./chordShapes";
import { makeKeyContext } from "@/features/theory/theory";

const pickName = (ctx: ReturnType<typeof makeKeyContext>, d: number) => {
  const p = shapesForChord(ctx, d, ["easy", "medium", "hard"], { fit: "triad" })[0];
  return { tier: shapeTier(p.shape), fret: p.fret, suf: p.shape.suf, v: p.shape.v, open: p.shape.at !== undefined, rs: p.shape.rs };
};

describe("picking the simplest shape", () => {
  const C = makeKeyContext(0, 0, 0); // C major
  it("C major triads: open C Dm Em G Am, F as the 1st-fret E-shape barre", () => {
    [0, 1, 2, 4, 5].forEach((d) => assert.equal(pickName(C, d).open, true, `degree ${d}`));
    const f = pickName(C, 3);
    assert.deepEqual([f.tier, f.rs, f.fret, f.suf], [1, 6, 1, ""]);
  });
  it("triad fit never offers 7ths, shells or added notes", () => {
    for (let d = 0; d < 7; d++) {
      const third = C.chords[d];
      shapesForChord(C, d, ["easy", "medium", "hard"], { fit: "triad" }).forEach((c) => {
        assert.ok(c.shape.exp.length === 3, `${third.triadName} got ${c.shape.suf} ${c.shape.v ?? ""}`);
      });
    }
  });
  it("Bdim (no open voicing) still gets a pick", () => {
    assert.ok(shapesForChord(C, 6, ["easy", "medium", "hard"], { fit: "triad" }).length > 0);
  });
  it("default mode fit keeps exact shapes ahead and puts open chords first among them", () => {
    const list = shapesForChord(C, 0);
    assert.equal(list[0].shape.at, 3); // open C
    const firstInexact = list.findIndex((c) => !c.exact);
    if (firstInexact >= 0) assert.ok(list.slice(firstInexact).every((c) => !c.exact));
  });
  it("shapesForTones: open chord first, never an open chord on the wrong root", () => {
    assert.equal(shapesForTones(0, [0, 4, 7])[0].choice.shape.at, 3);
    for (let pc = 0; pc < 12; pc++) for (const semis of [[0, 4, 7], [0, 3, 7], [0, 4, 7, 10]])
      shapesForTones(pc, semis, ["easy", "medium", "hard"]).forEach(({ choice }) => assert.ok(fitsRoot(choice.shape, pc)));
  });
  it("tiers: open 0, E/A-shape triad barre 1, others 2", () => {
    assert.equal(shapeTier(OPEN_RICH[0]), 0);
    assert.equal(shapeTier(RICH_SHAPES.find((s) => s.rs === 6 && s.suf === "" && !s.v)!), 1);
    assert.equal(shapeTier(RICH_SHAPES.find((s) => s.rs === 4 && s.suf === "")!), 2);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `$TSX --test src/lib/chordKit/openShapes.test.ts`
Expected: FAIL because `shapeTier` is not exported.

- [ ] **Step 3: Implement in `chordShapes.ts`**

Change the import line:

```ts
import { ALL_SHAPES, fitsRoot, intervalLabel, rootFretFor, shapeSemitones, type Difficulty, type RichShape } from "./shapeTools";
```

Add this after `DIFF_RANK`:

```ts
/** How basic a shape is: 0 open chord, 1 first barre (E- or A-shape major/minor triad), 2 everything else. */
export function shapeTier(sh: RichShape): 0 | 1 | 2 {
  if (sh.at !== undefined) return 0;
  if ((sh.rs === 6 || sh.rs === 5) && sh.ext === "triad" && !sh.v && sh.tags.includes("barre") && (sh.fam === "major" || sh.fam === "minor")) return 1;
  return 2;
}
```

Add the shared tier comparator right after `shapeTier`. Within tier 1 the lowest barre wins even when it is harder: the 1st-fret E-shape F is marked hard but is the F everyone learns first.

```ts
/** Simpler tier first; inside the first-barre tier, lowest on the neck first. */
const byTier = (a: ChordShapeChoice, b: ChordShapeChoice): number => {
  const ta = shapeTier(a.shape), tb = shapeTier(b.shape);
  return ta - tb || (ta === 1 ? a.fret - b.fret : 0);
};
```

Replace `shapesForChord` entirely:

```ts
/**
 * Shapes that play the diatonic chord on `degree` of the mode, best first:
 * shapes made only of the chord's own tones, then open chords, then the first barre, then easier fingerings, then lower on the neck.
 * Shapes without the chord's 3rd are dropped (they would not say major or minor).
 * `fit: "mode"` (default) allows any note of the mode, and the 7th counts as a chord tone.
 * `fit: "triad"` allows only root, 3rd and 5th, so a plain triad never shows as a 7th or a shell.
 * `difficulties` limits the result; if that leaves nothing, every difficulty is used.
 */
export function shapesForChord(ctx: KeyContext, degree: number, difficulties: Difficulty[] = ["easy", "medium"], opts: { fit?: "mode" | "triad" } = {}): ChordShapeChoice[] {
  const triad = opts.fit === "triad";
  const chord = modeChords(ctx)[degree];
  const [, third, fifth, seventh] = chord.notes.map((n) => n.semis);
  const stack = new Set(triad ? [0, third, fifth] : [0, third, fifth, seventh]);
  const rootPc = (ctx.tonic.pc + ctx.steps[degree]) % 12;
  const rel = new Set(ctx.steps.map((_, i) => (ctx.steps[(degree + i) % 7] - ctx.steps[degree] + 12) % 12));

  const all: ChordShapeChoice[] = [];
  ALL_SHAPES.forEach((shape) => {
    if (!fitsRoot(shape, rootPc)) return;
    const tones = new Set(shapeSemitones(shape).filter((v): v is number => v !== null));
    if (!tones.has(third)) return;
    if (![...tones].every((t) => (triad ? stack : rel).has(t))) return;
    all.push({ shape, rootPc, fret: rootFretFor(shape, rootPc), exact: [...tones].every((t) => stack.has(t)) });
  });

  const wanted = all.filter((c) => difficulties.includes(c.shape.diff));
  const list = wanted.length ? wanted : all;
  return list.sort((a, b) => Number(b.exact) - Number(a.exact) || byTier(a, b) || DIFF_RANK[a.shape.diff] - DIFF_RANK[b.shape.diff] || a.fret - b.fret || a.shape.id - b.shape.id);
}
```

In `shapesForTones`, change `RICH_SHAPES.forEach((shape) => {` to:

```ts
  ALL_SHAPES.forEach((shape) => {
    if (!fitsRoot(shape, rootPc)) return;
```

(The rest of the loop body stays the same.) Then change its sort to:

```ts
    .sort((a, b) => Number(b.full) - Number(a.full) || b.score - a.score || byTier(a.choice, b.choice) || Number(b.choice.exact) - Number(a.choice.exact) || DIFF_RANK[a.choice.shape.diff] - DIFF_RANK[b.choice.shape.diff] || a.choice.fret - b.choice.fret || a.choice.shape.id - b.choice.shape.id)
```

- [ ] **Step 4: Use the triad fit for "Chords in key"**

In `src/components/chordKit/CagedExplorer.tsx`, in `KeyChords`:

```tsx
  const items = useMemo(() => ctx.chords.map((c, d) => ({ c, d, pick: shapesForChord(ctx, d, ["easy", "medium", "hard"], { fit: "triad" })[0] })), [ctx]);
```

In the same component, change the `<Info>` text to:

```tsx
<Info label="About these chords">The chord built on each note of the scale, with the simplest way to play it: an open chord when there is one, otherwise the first barre shape. The Roman numeral is the degree: capitals are major chords, lower case minor. Tap a diagram to hear it.</Info>
```

- [ ] **Step 5: Update the carousel help text**

In `src/components/chordKit/ChordShapeCarousel.tsx`, replace the `<Info label="About these shapes">` body with:

```tsx
<Info label="About these shapes">Shapes that contain this chord&rsquo;s 3rd and only notes of the mode. Shapes made purely of the chord&rsquo;s own root, 3rd, 5th and 7th come first; among those, open chords, then the first barre shapes, then easier fingerings. Use the arrows to flip through, tap the diagram to hear it.</Info>
```

- [ ] **Step 6: Run tests and type check**

Run: `$TSX --test src/lib/chordKit/*.test.ts`
Expected: all pass. The existing "chord shapes for a mode chord" suite still passes, because open chords contain their 3rd and sit on the right pitch class.

Run: `npx tsc --noEmit 2>&1 | grep -v '^.next/'`
Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add src/lib/chordKit/chordShapes.ts src/lib/chordKit/openShapes.test.ts src/components/chordKit/CagedExplorer.tsx src/components/chordKit/ChordShapeCarousel.tsx
git commit -m "Chords in a key show the simplest chord: open, then first barre; triads never pick 7th or shell shapes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Open chords in the Shapes and In-a-key browsers

**Files:**
- Modify: `src/lib/chordKit/shapeTools.ts` (`plainEntries`, `keyEntries`)
- Modify: `src/components/chordKit/ShapeBrowser.tsx` (an "Open chords" section first)
- Modify: `src/components/chordKit/ShapeCard.tsx` (no stepper for open chords)
- Modify: `src/components/chordKit/ShapesTab.tsx` (header copy)
- Modify: `src/app/theory/chords/page.tsx` (intro copy)
- Test: `src/lib/chordKit/openShapes.test.ts` (append)

**Interfaces:**
- Consumes: `ALL_SHAPES`, `fitsRoot` (Task 1).
- Produces: `plainEntries()` and `keyEntries(ctx)` include open chords. In `keyEntries` an open chord is only placed on degrees whose root matches it.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/chordKit/openShapes.test.ts`:

```ts
import { keyEntries, plainEntries } from "./shapeTools";

describe("open chords in the browsers", () => {
  it("plainEntries lists every open chord once", () => {
    assert.equal(plainEntries().filter((e) => e.shape.at !== undefined).length, OPEN_SHAPES.length);
  });
  it("keyEntries places open chords only on their own root", () => {
    const G = makeKeyContext(7, 0, 0); // G major
    const open = keyEntries(G).filter((e) => e.shape.at !== undefined);
    assert.ok(open.length > 0);
    open.forEach((e) => assert.equal(openRootPc(e.shape), e.rootPc));
    const names = new Set(open.map((e) => `${e.roman}:${e.shape.suf}`));
    assert.ok(names.has("I:") && names.has("IV:") && names.has("V:") && names.has("vi:m"));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `$TSX --test src/lib/chordKit/openShapes.test.ts`
Expected: FAIL. The open-chord count is 0 because `plainEntries` still uses `RICH_SHAPES`.

- [ ] **Step 3: Include open chords in the entry builders**

In `shapeTools.ts`:

```ts
/** Every shape-level entry with no key applied (for the key-free explorer): movable shapes and open chords. */
export const plainEntries = (): Entry[] => ALL_SHAPES.map((shape) => ({ shape }));
```

In `keyEntries`, change the inner loop:

```ts
    ALL_SHAPES.forEach((shape) => {
      if (opts.rs && opts.rs !== "all" && shape.rs !== opts.rs) return;
      if (!fitsRoot(shape, rootPc)) return;
      if (!shape.exp.every((v) => rel.has(v))) return;
      out.push({ shape, roman: ch.roman, mode: modeNameAt(ctx, d), degree: d, rootPc });
    });
```

- [ ] **Step 4: Run the tests**

Run: `$TSX --test src/lib/chordKit/*.test.ts`
Expected: all pass.

- [ ] **Step 5: Give `ShapeBrowser` an "Open chords" section first**

In `ShapeBrowser.tsx`, extract the card rendering into a local function inside the component, just above `return (`:

```tsx
  const card = (g: (typeof groups)[number]) => (
    <ShapeCard
      key={g.shape.id}
      shape={g.shape}
      selectedTags={active}
      onToggleTag={toggle}
      ctx={ctx}
      placements={ctx ? g.entries.map((e): Placement => ({
        name: ctx.names[e.degree ?? 0] + g.shape.suf,
        roman: e.roman,
        mode: e.mode,
        rootPc: e.rootPc!,
        degrees: placedDegrees(g.shape, e.rootPc!, ctx),
      })) : undefined}
    />
  );
  const openGroups = groups.filter((g) => g.shape.at !== undefined);
```

Change `allIds` to include the new section:

```tsx
  const allIds = ["open", ...STRING_ORDER.flatMap((rs) => [`s${rs}`, ...FAMILY_ORDER.map((f) => `s${rs}${f}`)])];
```

Directly after the empty-state `<p>`, insert:

```tsx
      {openGroups.length > 0 && (
        <Section title="Open chords" meta={`${openGroups.length} chord${openGroups.length === 1 ? "" : "s"}`} open={!closed.has("open")} onToggle={() => flip("open")}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{openGroups.map(card)}</div>
        </Section>
      )}
```

In the `STRING_ORDER.map` block, exclude open chords and use `card`:

```tsx
        const list = groups.filter((g) => g.shape.rs === rs && g.shape.at === undefined);
```

and replace the inline `<ShapeCard ... />` in `sub.map(...)` with `{sub.map(card)}`.

- [ ] **Step 6: Fix open chords in place in `ShapeCard`**

In `ShapeCard.tsx`, after `const highest = 17 - maxOff;` add:

```tsx
  const fixed = shape.at !== undefined;
```

Change the initial fret:

```tsx
  const [fret, setFret] = useState(fixed ? shape.at! : placed[0]?.fret ?? lowest);
```

Replace the stepper row's `<Stepper ... />` and the `<span>` after it with:

```tsx
        {fixed ? (
          <span className="text-xs text-slate-400">Open position<Info label="About open chords">An open chord uses open strings, so it is one chord in one place. It does not slide like the movable shapes below it.</Info></span>
        ) : (
          <>
            <Stepper
              label="Root fret"
              value={`fret ${fret}`}
              onDec={() => setFret((f) => Math.max(lowest, f - 1))}
              onInc={() => setFret((f) => Math.min(highest, f + 1))}
              decDisabled={fret <= lowest}
              incDisabled={fret >= highest}
            />
            <span className="text-xs text-slate-500">{STRING_SHORT[shape.rs]} string root<Info label="About the root fret">The fret where the root note sits. The shape is movable: slide it up or down the neck and it becomes the same chord on another root. The stepper moves it one fret at a time. The root is on the {STRING_SHORT[shape.rs]} string.</Info></span>
          </>
        )}
```

When `fixed`, give the card a chord name in the header. Change the `<h4>`:

```tsx
        <h4 className="text-sm font-medium text-slate-100">{fixed ? `${OPEN_ROOT_NAME[openRootPc(shape)!]}${shape.suf} · ` : ""}{shapeName(shape.suf)}</h4>
```

Add `openRootPc` to the `shapeTools` import, and put this at module level:

```tsx
const OPEN_ROOT_NAME = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
```

- [ ] **Step 7: Update copy**

`ShapesTab.tsx` header:

```tsx
header={<p className="text-xs text-slate-400">Open chords first, then every movable shape, drawn once. Slide a movable shape&rsquo;s root fret, tap a diagram to hear it, tap tags to filter.</p>}
```

The `ShapesTab` doc comment becomes `/** The key-free explorer: open chords and every movable shape, once. */`.

In `src/app/theory/chords/page.tsx`, the `intro` becomes:

```tsx
      intro="Open chords and movable guitar shapes labelled by scale degree, the chords of any key and mode, and progressions with the shapes to use and every position on the neck. New to guitar? Start with the open chords: Em, Am, C, D, G, E, A, Dm."
```

- [ ] **Step 8: Type check and manual check**

Run: `npx tsc --noEmit 2>&1 | grep -v '^.next/'`
Expected: no output.

Run `npm run dev` and open `/theory/chords`:
- The Shapes tab shows "Open chords" first with 22 cards. Each is titled with its chord name (e.g. "C · Major triad"), has no stepper, shows open-string dots above the nut, and plays when tapped.
- The "open" chip appears in the Shape row and filters to the open chords.
- In the "In a key" tab with G major, the open G, C, D, Em and Am appear under Open chords.
- On `/theory/caged` with C major, "Chords in C major" shows open C, Dm, Em, G and Am, F as the 1st-fret barre, and a triad for Bdim.

- [ ] **Step 9: Commit**

```bash
git add src/lib/chordKit/shapeTools.ts src/lib/chordKit/openShapes.test.ts src/components/chordKit/ShapeBrowser.tsx src/components/chordKit/ShapeCard.tsx src/components/chordKit/ShapesTab.tsx src/app/theory/chords/page.tsx
git commit -m "Chord explorer: open chords section first, fixed in place, in the key view too

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Chord search

**Files:**
- Create: `src/lib/chordKit/chordSearch.ts`
- Create: `src/components/chordKit/ChordSearchResults.tsx`
- Modify: `src/components/chordKit/ShapesTab.tsx`
- Test: `src/lib/chordKit/chordSearch.test.ts`

**Interfaces:**
- Consumes: `shapesForTones` (Task 2), `Entry` and `shapeName` from `shapeTools`.
- Produces:
  - `parseChordQuery(q: string): { rootPc: number; semis: number[]; name: string } | null`
  - `matchesText(e: Entry, q: string): boolean`
  - `<ChordSearchResults rootPc semis name />`
  - URL param `?q=` on `/theory/chords`. Later stage articles link to `/theory/chords?q=Am`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/chordKit/chordSearch.test.ts`:

```ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { matchesText, parseChordQuery } from "./chordSearch";
import { plainEntries } from "./shapeTools";

describe("chord search", () => {
  const p = (q: string) => { const r = parseChordQuery(q); return r && [r.rootPc, [...r.semis].sort((a, b) => a - b)]; };
  it("parses common chord spellings", () => {
    assert.deepEqual(p("C"), [0, [0, 4, 7]]);
    assert.deepEqual(p("Am"), [9, [0, 3, 7]]);
    assert.deepEqual(p("am7"), [9, [0, 3, 7, 10]]);
    assert.deepEqual(p("F#m7"), [6, [0, 3, 7, 10]]);
    assert.deepEqual(p("F♯m"), [6, [0, 3, 7]]);
    assert.deepEqual(p("Bb maj7"), [10, [0, 4, 7, 11]]);
    assert.deepEqual(p("B♭7"), [10, [0, 4, 7, 10]]);
    assert.deepEqual(p("Dsus4"), [2, [0, 5, 7]]);
    assert.deepEqual(p("Cadd9"), [0, [0, 2, 4, 7]]);
    assert.deepEqual(p("E5"), [4, [0, 7]]);
  });
  it("returns null for words and qualities without a root", () => {
    for (const q of ["", "  ", "funk", "bossa", "shell", "open", "dim", "hendrix", "barre"]) assert.equal(parseChordQuery(q), null, q);
  });
  it("text search matches names, variants, tags and notes, every word", () => {
    const all = plainEntries();
    const hits = (q: string) => all.filter((e) => matchesText(e, q));
    assert.ok(hits("hendrix").some((e) => e.shape.suf === "7♯9"));
    assert.ok(hits("shell").every((e) => e.shape.v === "shell" || e.shape.tags.includes("shell")));
    assert.ok(hits("open").length >= 22);
    assert.ok(hits("jazz shell").every((e) => e.shape.tags.includes("jazz")));
    assert.equal(hits("zzzz").length, 0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `$TSX --test src/lib/chordKit/chordSearch.test.ts`
Expected: FAIL with `Cannot find module './chordSearch'`.

- [ ] **Step 3: Implement `chordSearch.ts`**

```ts
import { Chord, Interval, Note } from "@tonaljs/tonal";
import { shapeName, type Entry } from "./shapeTools";

/**
 * Read a chord symbol typed by a person ("am7", "Bb maj7", "F♯m") with tonal.
 * Returns null unless there is a root note and a known chord type, so plain words fall through to text search.
 */
export function parseChordQuery(q: string): { rootPc: number; semis: number[]; name: string } | null {
  const s = q.trim().replace(/\s+/g, "").replace(/♯/g, "#").replace(/♭/g, "b");
  if (!/^[a-g]/i.test(s)) return null;
  const sym = s[0].toUpperCase() + s.slice(1);
  const ch = Chord.get(sym);
  if (ch.empty || !ch.tonic) return null;
  const rootPc = Note.chroma(ch.tonic);
  if (rootPc === undefined || Number.isNaN(rootPc)) return null;
  const semis = [...new Set(ch.intervals.map((iv) => ((Interval.semitones(iv) % 12) + 12) % 12))];
  return { rootPc, semis, name: q.trim() };
}

/** Free-text match over a shape's name, suffix, variant, tags and note. Every word must match. */
export function matchesText(e: Entry, q: string): boolean {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const sh = e.shape;
  const hay = [shapeName(sh.suf), sh.suf, sh.v ?? "", ...sh.tags, sh.note ?? ""].join(" ").toLowerCase();
  return words.every((w) => hay.includes(w));
}
```

If the `bossa` or `barre` cases fail because tonal reads them as `B` plus a chord type, add a guard. After `const ch = Chord.get(sym);`, reject when the typed type is not a known alias:

```ts
  if (ch.empty || !ch.tonic || !ch.aliases.length) return null;
```

Then re-run. Keep whichever version passes every case in the test.

- [ ] **Step 4: Run the tests**

Run: `$TSX --test src/lib/chordKit/chordSearch.test.ts`
Expected: PASS.

- [ ] **Step 5: Create `ChordSearchResults.tsx`**

```tsx
"use client";

import { useMemo } from "react";
import ChordDiagram from "./ChordDiagram";
import { DIFF_CLASS } from "./palette";
import { shapesForTones } from "@/lib/chordKit/chordShapes";
import { STRING_SHORT } from "@/lib/chordKit/shapeTools";
import { strumShape } from "@/lib/chordKit/playback";

/** Every shape that plays one chord, simplest first: open chord, first barre, then the rest. */
export default function ChordSearchResults({ rootPc, semis, name }: { rootPc: number; semis: number[]; name: string }) {
  const list = useMemo(() => shapesForTones(rootPc, semis, ["easy", "medium", "hard"]).filter((r) => r.full).map((r) => r.choice), [rootPc, semis]);
  if (!list.length) return <p className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">No shape in the library plays {name} yet.</p>;
  return (
    <section aria-label={`Shapes for ${name}`} className="flex flex-col gap-2">
      <p className="text-xs text-slate-400"><b className="text-slate-200">{list.length}</b> way{list.length === 1 ? "" : "s"} to play <b className="text-slate-200">{name}</b>, simplest first.</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {list.map((c) => (
          <div key={c.shape.id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-2">
            <div className="mb-1 flex items-center gap-1.5 text-xs">
              <span className={`rounded-full border px-1.5 ${DIFF_CLASS[c.shape.diff]}`}>{c.shape.diff}</span>
              {c.shape.at !== undefined ? <span className="text-sky-300">open</span> : c.shape.v && <span className="text-slate-400">{c.shape.v}</span>}
            </div>
            <ChordDiagram shape={c.shape} rootFret={c.fret} onPlay={() => strumShape(c.shape, c.fret)} />
            <div className="text-xs text-slate-500">{c.shape.at !== undefined ? "open position" : `${STRING_SHORT[c.shape.rs]} string root · fret ${c.fret}`}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Add the search box to `ShapesTab.tsx`, synced to `?q=`**

Replace the file:

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import ShapeBrowser from "./ShapeBrowser";
import ChordSearchResults from "./ChordSearchResults";
import { plainEntries } from "@/lib/chordKit/shapeTools";
import { matchesText, parseChordQuery } from "@/lib/chordKit/chordSearch";

/** Read and write `?q=` without a navigation, so links like /theory/chords?q=Am open on a search. */
function useQueryParam(): [string, (v: string) => void] {
  const [q, setQ] = useState("");
  useEffect(() => setQ(new URLSearchParams(window.location.search).get("q") ?? ""), []);
  const set = (v: string) => {
    setQ(v);
    const url = new URL(window.location.href);
    if (v) url.searchParams.set("q", v);
    else url.searchParams.delete("q");
    window.history.replaceState(null, "", url);
  };
  return [q, set];
}

/** The key-free explorer: open chords and every movable shape, once, with search. */
export default function ShapesTab() {
  const [q, setQ] = useQueryParam();
  const all = useMemo(() => plainEntries(), []);
  const chord = useMemo(() => parseChordQuery(q), [q]);
  const entries = useMemo(() => (chord ? all : all.filter((e) => matchesText(e, q))), [all, chord, q]);
  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-xs text-slate-400">
        Search
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="A chord (C, F#m7, Bb maj7) or a word (shell, funk, open)"
          className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
        />
      </label>
      {chord ? (
        <ChordSearchResults rootPc={chord.rootPc} semis={chord.semis} name={chord.name} />
      ) : (
        <ShapeBrowser
          entries={entries}
          header={<p className="text-xs text-slate-400">Open chords first, then every movable shape, drawn once. Slide a movable shape&rsquo;s root fret, tap a diagram to hear it, tap tags to filter.</p>}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 7: Run all tests, type check and lint**

Run: `$TSX --test src/lib/chordKit/*.test.ts`
Expected: all pass.

Run: `npx tsc --noEmit 2>&1 | grep -v '^.next/'`
Expected: no output.

Run: `npx eslint src/lib/chordKit src/components/chordKit`
Expected: no errors.

- [ ] **Step 8: Manual check**

Run `npm run dev`:
- On `/theory/chords`, typing `C` shows open C first, then the 3rd-fret A-shape barre, then the rest.
- `am7` shows the open Am7 first.
- `Bb maj7` shows only movable shapes, with no open chord.
- `shell` filters the browser to shell voicings, and `funk` filters by tag.
- Clearing the box restores the full browser.
- Loading `/theory/chords?q=G` opens on the G results.
- The URL updates while typing, and the back button does not step through every keystroke.

- [ ] **Step 9: Commit**

```bash
git add src/lib/chordKit/chordSearch.ts src/lib/chordKit/chordSearch.test.ts src/components/chordKit/ChordSearchResults.tsx src/components/chordKit/ShapesTab.tsx
git commit -m "Chord explorer: search by chord symbol or word, synced to ?q=

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

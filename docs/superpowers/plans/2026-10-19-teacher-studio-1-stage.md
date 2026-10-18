# Teacher Studio, Plan 1: the stage (route, frame, palette, widgets, camera)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A working `/teachers/studio` page. A fixed 16:9 frame shows the camera (or a screen share) plus theory widgets. Widgets are added with a Spotlight-style palette (`/ e6`), moved and resized live, and listed in a Layers panel. No recording yet (Plan 2).

**Architecture:** A new feature `src/features/stage` owns the stage model, the palette search and the widget renderer:
- **Model** (`model/`): widget subjects, layers, palette search and keys. Pure and tested.
- **Renderer** (`render/`): turns a subject into a live widget. It's built so the Plan 3 editor can receive it injected.

A new feature `src/features/teachers/studio` composes the page from the stage, the camera and the panels. The creator gains a controlled `KeyScope`, so each widget can follow its own key.

Layer rectangles are **fractions of the frame** (0–1), not pixels, so the same data renders at any size. Plans 2 and 3 record and replay this exact data.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind 4, Web Audio, `getUserMedia` / `getDisplayMedia`, `node:test` via tsx.

**Spec:** `docs/superpowers/specs/2026-10-19-teacher-studio-design.md`. This plan covers phase 1 (module split, stage-widget part only) and phase 2 minus recording and export. The audio-input move out of the looper is deferred to the plan that adds DI (phase 5), because nothing needs it before then.

**Later plans (not this one):**
- Plan 2: media core, live record into tracks, plain export.
- Plan 3: the editor module (timeline, cuts, widget editing, real-time export).
- Plan 4: video import, preview copies, overdub.
- Plan 5: audio-input move, DI and re-amp, dry DI export, scenes.

## Global Constraints

- Desktop Chrome/Edge only. Other browsers (no `CropTarget`/`RestrictionTarget` in `window`) see: "The studio needs desktop Chrome or Edge." Phones see the same message.
- Next.js here has breaking changes. Read `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md` and `05-server-and-client-components.md` before writing routes.
- Separation:
  - `src/features/stage` may import `@/features/theory`, `@/features/sound`, `@/features/instruments/model`, the creator's public `index.ts`, `src/lib/chordKit`, `src/components/chordKit` and shared `@/components`.
  - `src/features/teachers/studio` may import `@/features/stage` and shared `@/components`.
  - Nothing imports the studio. Neither imports `src/lib/looper` or `src/components/looper`.
- No mic, camera or screen prompt without a click.
- localStorage keys are prefixed `musickit.studio.`. Every read and write goes in try/catch, and loads are sanitised.
- Keys match on `KeyboardEvent.code` (e.g. `Slash`, `KeyK`). Shortcuts are ignored while typing in an input (except Escape in the palette).
- The palette, side panels, Keys panel and selection outlines are **outside** the frame element, or hidden by a `data-chrome` attribute that Plan 2's capture will exclude. In-frame handles show only on hover and are thin (2px outline, 8px corner dots).
- Tests: `TSX=$(ls ~/.npm/_npx/*/node_modules/.bin/tsx | head -1); $TSX --test <files>` (`npx tsx` hangs on this machine). Add `src/features/stage/model/*.test.ts` to `npm test` in `package.json`.
- Type check: `npx tsc --noEmit 2>&1 | grep -v '^.next/'` must print nothing. Lint: `npx eslint src/features/stage src/features/teachers src/app/teachers src/features/creator`.
- Commit in a worktree (superpowers:using-git-worktrees). In the main checkout, never `git add` into the shared index; use a temporary `GIT_INDEX_FILE`.

## Review Focus

1. **Typing in the palette must not trigger shortcuts.** Typing `c` in the search box must not run "camera corner", and Delete must not remove the selected widget. Pinned in Task 6 (`shortcutFor` returns null when `typing: true`).
2. **Corrupt or old saved layers** (hand-edited localStorage, a removed plugin id) load as an empty stage or drop the bad layer. They never crash the page. Pinned in Task 3 (`sanitiseLayers`).
3. **Queries that aren't anything** (`hello`, empty string, `h7`, `x dorian`) give no results or only command matches. They never throw. Pinned in Task 2.
4. **Resizing to nothing or off the frame:** a widget can't be dragged fully out of the frame or shrunk below a usable size. Pinned in Task 3 (`clampRect`).
5. **Camera denied or unplugged:** the camera layer shows "Camera off: click to retry" and the rest of the studio keeps working. Pinned by a manual check in Task 7.

---

### Task 1: Creator `KeyScope` (a key for one subtree, no storage)

**Files:**
- Modify: `src/features/creator/KeyProvider.tsx`
- Modify: `src/features/creator/index.ts`
- Modify: `src/features/creator/CLAUDE.md` ("Keep it separate" section)

**Interfaces:**
- Produces:
  - `KeyScope({ value, onChange, children }: { value: KeyChoice; onChange: (c: KeyChoice) => void; children: ReactNode })`, a controlled provider of the same context `useCreatorKey()` reads. It does no storage and no URL writes.
  - The index also exports `type KeyChoice`, `EMPTY_KEY`, `sanitiseKey`, `keyTitle` from `./model/key`.

- [ ] **Step 1: Refactor.** Move the value-building part of `CreatorKeyProvider` (`setTonic`, `setMode`, `setKey`, `clear`, `ctx`, `title`) into `KeyScope`, which works from `value`/`onChange`. `CreatorKeyProvider` keeps its restore and persist effects and renders `<KeyScope value={choice} onChange={setChoice}>`. Behaviour of `/cheatsheet` is unchanged.
- [ ] **Step 2: Export.** Add the exports above to `index.ts`. In `CLAUDE.md`, change "Nothing imports from the creator except its page" to "Nothing imports from the creator except its page and `src/features/stage`, and only through `index.ts` (`PLUGINS`, `KeyScope`, the key model)."
- [ ] **Step 3: Verify.**
  - Run: `$TSX --test src/features/creator/model/*.test.ts`. Expected: all pass.
  - Run the type check (see Global Constraints). Expected: no output.
  - Manually: `/cheatsheet?key=7&family=0&mode=1` still opens on G Dorian, and changing the key still updates the URL.
- [ ] **Step 4: Commit.** Message: `Creator: KeyScope, a controlled key provider other features can wrap a plugin in`

### Task 2: Widget subjects and palette search

**Files:**
- Create: `src/features/stage/model/subject.ts`
- Create: `src/features/stage/model/search.ts`
- Test: `src/features/stage/model/search.test.ts`

**Interfaces:**
- Consumes: `parseChordQuery`, `chordLabel` (`src/lib/chordKit/chordSearch.ts`); `TONICS`, `FAMILIES`, `shortModeName` (`@/features/theory`); `type PositionKind` (`src/lib/chordKit/scalePositions.ts`); `type KeyChoice`, `keyTitle` and the plugin ids from the creator index.
- Produces (`subject.ts`):
  ```ts
  export type Subject =
    | { kind: "chord"; symbol: string }                                   // "E6"
    | { kind: "plugin"; plugin: string; key: KeyChoice }                  // creator PLUGINS id
    | { kind: "position"; key: KeyChoice; positionKind: PositionKind; index: number } // 0-based box
    | { kind: "drone"; root: number; fifth: boolean }
    | { kind: "camera" }                                                  // the webcam, a layer like any other (at most one)
    | { kind: "screen" };                                                 // the screen share (at most one)
  export type StudioCommand = "camera-corner" | "camera-full" | "camera-off" | "screen-share" | "screen-stop" | "clear";
  export interface PaletteResult { id: string; label: string; detail: string; group: "chord" | "scale" | "position" | "theory" | "audio" | "studio"; action: { type: "add"; subject: Subject } | { type: "command"; command: StudioCommand } }
  export function subjectTitle(s: Subject): string;   // "E6 chord", "A Dorian · Scale", "E Aeolian · pentatonic box 1", "Drone E + 5th"
  export function sanitiseSubject(raw: unknown, pluginIds: string[]): Subject | null;
  ```
- Produces (`search.ts`): `export function searchPalette(query: string, pluginIds: string[]): PaletteResult[]`, ranked best-first, at most 8 results.

**Parsing rules (spec goal 5):**
- Leading `/` and whitespace are ignored. Matching is case-insensitive.
- **Chord** (`parseChordQuery` succeeds) → `{kind:"chord", symbol: chordLabel(q)}`, ranked first.
- **Key**: a tonic followed by a mode word.
  - Mode words: `major`/`ionian` → family 0 mode 0; `dorian` 1; `phrygian` 2; `lydian` 3; `mixolydian` 4; `minor`/`aeolian` 5; `locrian` 6. Also any `FAMILIES[f].names[m]` matched by `shortModeName`.
  - A bare tonic means major.
  - A key gives one `plugin` result per plugin id, with `scale` first, then `modes`, `chords`, `arpeggios`, `caged`, `triads`, `progressions`, `circle`, `keys`, `improv`, `tunings`.
- **Position**: `pent` or `pentatonic` in the query, with a key → `positionKind: "pentatonic"`.
  - `minor pent` uses mode 5 and `major pent` uses mode 0.
  - `pos N` / `position N` / `box N` → `index: N-1`. Without one, results for boxes 1–5 are offered.
  - `3nps` → `positionKind: "3nps"`.
- **Plugin words alone** (`circle`, `caged`, `triads`, `arpeggios`, `progressions`, `modes`, `tunings`, `keys`, `improv`) → that plugin with `EMPTY_KEY`. With a tonic (`circle g`, `caged c`) → that plugin in that key, major.
- **Drone**: `drone <note>` → `{kind:"drone", root, fifth:false}`. A trailing `5th`/`fifth` → `fifth:true`.
- **Commands** match by prefix of their words: `camera corner`, `camera full`, `camera off`, `screen share`, `stop screen`, `clear`.

- [ ] **Step 1: Write the failing tests.**
  ```ts
  test("a chord symbol gives the chord first", () => {
    const r = searchPalette("/ e6", ids);
    assert.deepEqual(r[0].action, { type: "add", subject: { kind: "chord", symbol: "E6" } });
  });
  test("a key with a mode gives the scale plugin first", () => {
    const r = searchPalette("a dorian", ids);
    assert.deepEqual(r[0].action, { type: "add", subject: { kind: "plugin", plugin: "scale", key: { tonicPc: 9, family: 0, mode: 1 } } });
  });
  test("minor pent pos 1 is box 0 of E aeolian", () => {
    const r = searchPalette("e minor pent pos 1", ids);
    assert.deepEqual(r[0].action, { type: "add", subject: { kind: "position", key: { tonicPc: 4, family: 0, mode: 5 }, positionKind: "pentatonic", index: 0 } });
  });
  test("circle g is the circle plugin in G major", () => { /* plugin "circle", key {7,0,0} */ });
  test("caged alone has no key", () => { /* plugin "caged", key EMPTY_KEY */ });
  test("drone a 5th", () => { /* {kind:"drone", root:9, fifth:true} */ });
  test("camera c offers camera corner", () => { /* some result has command "camera-corner" */ });
  test("nonsense gives nothing and never throws", () => {
    for (const q of ["", "   ", "hello", "h7", "x dorian", "/", "pos 9"]) assert.doesNotThrow(() => searchPalette(q, ids));
    assert.equal(searchPalette("hello", ids).length, 0);
  });
  test("at most 8 results", () => { assert.ok(searchPalette("c", ids).length <= 8); });
  test("sanitiseSubject drops unknown plugins and bad shapes", () => {
    assert.equal(sanitiseSubject({ kind: "plugin", plugin: "gone", key: EMPTY_KEY }, ids), null);
    assert.equal(sanitiseSubject({ kind: "chord" }, ids), null);
    assert.deepEqual(sanitiseSubject({ kind: "drone", root: 4, fifth: true }, ids), { kind: "drone", root: 4, fifth: true });
  });
  ```
  Here `ids` is the list of creator plugin ids, written out literally in the test file so the test stays pure (no React import): `["scale","chords","circle","keys","progressions","modes","triads","caged","arpeggios","improv","tunings"]`.
- [ ] **Step 2: Run them and confirm they fail.** Run: `$TSX --test src/features/stage/model/search.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement** `subject.ts` and `search.ts` following the parsing rules above. Tokenise once. Tonic tokens are matched against `TONICS` names, accepting `#`/`b` and `♯`/`♭`.
- [ ] **Step 4: Run them and confirm they pass.** Same command. Expected: PASS.
- [ ] **Step 5: Commit.** Message: `Stage: widget subjects and the palette search`

### Task 3: Layers model (fractions of the frame)

**Files:**
- Create: `src/features/stage/model/layers.ts`
- Test: `src/features/stage/model/layers.test.ts`

**Interfaces:**
- Consumes: `Subject`, `sanitiseSubject` (Task 2).
- Produces:
  ```ts
  export interface FrameRect { x: number; y: number; w: number; h: number }  // 0..1 of the frame
  export interface Layer { id: string; subject: Subject; rect: FrameRect; visible: boolean }
  export interface Stage { layers: Layer[]; selected: string | null }       // array order = paint order, last on top
  export const MIN_SIZE = 0.08;   // fraction of frame width/height
  export const KEEP_IN = 0.04;    // at least this much of a widget stays inside the frame
  export function clampRect(r: FrameRect): FrameRect;
  export function defaultRect(s: Subject, existing: Layer[]): FrameRect;
  export type StageAction =
    | { type: "add"; layer: Layer } | { type: "remove"; id: string }
    | { type: "move"; id: string; dx: number; dy: number } | { type: "resize"; id: string; dw: number; dh: number }
    | { type: "setRect"; id: string; rect: FrameRect } | { type: "swap"; id: string; subject: Subject }
    | { type: "toggle"; id: string } | { type: "raise"; id: string } | { type: "lower"; id: string }
    | { type: "select"; id: string | null } | { type: "clear" };
  export function stageReducer(s: Stage, a: StageAction): Stage;
  export function sanitiseStage(raw: unknown, pluginIds: string[]): Stage;
  export const EMPTY_STAGE: Stage;
  export const CAMERA_CORNER: FrameRect, FULL: FrameRect;
  /** Adding a camera or screen when one exists selects the existing layer instead. A new screen layer goes to the bottom of the paint order, and a new camera goes above the screen but below the widgets. */
  export function addSubject(s: Stage, id: string, subject: Subject): Stage;
  ```
- **Default rects:**
  - chord 0.22 × 0.42
  - plugin and position 0.5 × 0.42
  - drone 0.16 × 0.1 in the bottom-left corner
  - camera: the **corner preset** `CAMERA_CORNER = { x: 0.78, y: 0.52, w: 0.2, h: 0.45 }` (portrait, bottom-right)
  - screen: `FULL = { x: 0, y: 0, w: 1, h: 1 }`
  - Each new layer is offset by +0.03,+0.03 from the last added, so widgets don't stack exactly. Then clamped.

- [ ] **Step 1: Write the failing tests.**
  - `clampRect({x:-1,y:-1,w:0.01,h:0.01})` → `{x: -(0.08-0.04), y: -(0.08-0.04), w:0.08, h:0.08}`: min size applies, and at most `w - KEEP_IN` can hang off any edge.
  - `clampRect({x:0.98,y:0.5,w:0.5,h:0.3}).x === 1 - 0.04`.
  - `w` and `h` are capped at 1.
  - Reducer cases:
    - add then remove leaves no layers
    - `remove` of the selected layer clears `selected`
    - `raise` moves the layer to the end of the array and `lower` moves it one back
    - `swap` keeps `id` and `rect` and replaces `subject`
    - `move` and `resize` go through `clampRect`
    - `clear` empties the stage
  - `sanitiseStage("junk")` → `EMPTY_STAGE`.
  - `sanitiseStage({layers:[good, {id:"x", subject:{kind:"plugin",plugin:"gone",key:EMPTY_KEY}, rect, visible:true}]})` keeps only `good`.
  - Out-of-range rects come back clamped.
  - Duplicate ids keep only the first.
  - A second `camera` layer (by `addSubject` or in saved data) is refused or dropped. The same goes for `screen`.
  - `addSubject` with `{kind:"screen"}` puts it at index 0. `{kind:"camera"}` goes just above the screen when one exists, else at index 0, and widgets stay above both.
  - `setRect` on the camera to `FULL` and back to `CAMERA_CORNER` works like any layer (the presets are just rects).
- [ ] **Step 2: Run them and confirm they fail.** Run: `$TSX --test src/features/stage/model/layers.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `layers.ts`. Ids come from `crypto.randomUUID()` at the call site, not in the reducer, so the reducer stays pure.
- [ ] **Step 4: Run them and confirm they pass.** Expected: PASS.
- [ ] **Step 5: Commit.** Message: `Stage: layers model in frame fractions`

### Task 4: Routes, page shell and the frame

**Files:**
- Create: `src/app/teachers/page.tsx` (minimal landing: a title, one line and a link to the studio)
- Create: `src/app/teachers/studio/page.tsx`
- Create: `src/features/teachers/studio/StudioApp.tsx` (client)
- Create: `src/features/teachers/studio/browserSupport.ts`
- Create: `src/features/teachers/studio/useStage.ts` (`useReducer(stageReducer)` + load/save to `musickit.studio.stage`)
- Create: `src/features/stage/StageFrame.tsx`
- Create: `src/features/stage/index.ts`
- Create: `src/features/stage/CLAUDE.md`
- Create: `src/features/teachers/studio/CLAUDE.md`
- Create: `spec/studio.md`
- Modify: `spec/features.md`
- Modify: `package.json` (test glob)

**Interfaces:**
- Consumes: Task 3's model.
- Produces:
  - `StageFrame({ stage, background, renderLayer, onAction }: { stage: Stage; background?: ReactNode; renderLayer: (l: Layer) => ReactNode; onAction: (a: StageAction) => void })`
    - Renders a 16:9 box that fills the available width. Each visible layer is absolutely positioned using `rect` × frame size.
    - The frame's root element has `data-stage-frame`. Plan 2 captures exactly this element.
  - `useStage(pluginIds: string[]): [Stage, (a: StageAction) => void]`
  - `isStudioSupported(): boolean`: true when `"RestrictionTarget" in window || "CropTarget" in window`, and the viewport is at least 1024 px wide.

- [ ] **Step 1:** Read the two Next docs named in Global Constraints. Pages are server components that export `metadata` and render the client `StudioApp`, following the pattern of `src/app/looper/page.tsx`. Title: `Studio · Music Kit`.
- [ ] **Step 2: Build the `StudioApp` layout.**
  - Left column (240 px): **Layers**. One row per layer, top layer first, showing `subjectTitle`. Each row has buttons for show/hide (eye), raise/lower and delete (trash). Clicking a row selects that layer.
  - Centre: `StageFrame`.
  - Right column (220 px): **Keys** panel (filled in Task 6).
  - When `!isStudioSupported()`, render only the message from Global Constraints.
  - `renderLayer` is a placeholder card showing `subjectTitle` until Task 5.
- [ ] **Step 3: Write the docs.**
  - `src/features/stage/CLAUDE.md` and `src/features/teachers/studio/CLAUDE.md` state the import rules from Global Constraints. They also state that layer rects are frame fractions, and that the renderer must stay injectable (the Plan 3 editor receives it as a prop).
  - `spec/studio.md`: the behaviour so far (route, layout, palette, layers, camera), kept current by every later task.
  - `spec/features.md`: add one line for the studio.
  - `package.json`: add the stage test glob.
- [ ] **Step 4: Verify.**
  - Type check and lint print nothing.
  - Run `npm run dev` and open `/teachers/studio` in Chrome. You should see the three columns and an empty 16:9 frame.
  - Seed a layer through devtools (`localStorage.setItem("musickit.studio.stage", …)`). It should appear at the right place and size, and still appear after a reload.
  - In Safari, the "needs Chrome or Edge" message shows.
- [ ] **Step 5: Commit.** Message: `Teachers: /teachers and /teachers/studio with the 16:9 stage frame and layers panel`

### Task 5: Widget renderer

**Files:**
- Create: `src/features/stage/render/StageWidget.tsx`
- Create: `src/features/stage/render/ChordWidget.tsx`
- Create: `src/features/stage/render/PositionWidget.tsx`
- Create: `src/features/stage/render/DroneWidget.tsx`
- Modify: `src/features/stage/index.ts`
- Modify: `src/features/teachers/studio/StudioApp.tsx` (use `StageWidget` as `renderLayer`)

**Interfaces:**
- Consumes:
  - `PLUGINS`, `KeyScope` (creator index)
  - `ChordDiagram`, `ScaleNeck` (`src/components/chordKit`)
  - `shapesForTones` (`src/lib/chordKit/chordShapes.ts`)
  - `strumShape` (`src/lib/chordKit/playback.ts`)
  - `positionsFor`, `scaleCells` (`src/lib/chordKit/scalePositions.ts`)
  - `keyContext` from the creator key model (via the index; add it to the index if missing)
  - `DroneVoice`, `DEFAULT_DRONE`, `clampDrone` (`@/features/instruments/model`)
  - `getAudioContext`, `getOutputBus` (`@/features/sound`)
- Produces:
  - `StageWidget({ subject, onSubjectChange }: { subject: Subject; onSubjectChange: (s: Subject) => void }): ReactNode`, the injectable renderer.
  - `export type RenderSubject = typeof StageWidget`.
- **What each kind renders:**
  - **chord:** `ChordDiagram` of the first `shapesForTones(rootPc, semis)` choice. Clicking it strums. Small ‹ › buttons step through the other shape choices; the index is local state, not part of the subject.
  - **plugin:** `<KeyScope value={subject.key} onChange={k => onSubjectChange({...subject, key: k})}><Def.Component/></KeyScope>`. A plugin changing the key (the circle) updates the layer.
  - **position:** `ScaleNeck` with `focus` set to `positionsFor(ctx, positionKind)[index]`, `fadeOutside`, and the label system from `useLabelSystem`. Clicking a note plays it.
  - **drone:** a badge "Drone E (+5th)". On mount it creates a `DroneVoice(getAudioContext(), getOutputBus())` with `clampDrone({ root, fifth: fifth ? 0.6 : 0 })`, starts it when added and stops it on unmount. The audio doesn't start until the first user gesture, so call `wakeAudio()` from the palette's Enter handler (Task 6).
  - Every widget scales to fit its rect: the content is rendered at a design size and CSS-transformed to fit, the same way `FloatingWindow` does with `fit`.
- [ ] **Step 1: Implement** the four renderers and `StageWidget`.
- [ ] **Step 2: Verify.** Type check and lint print nothing. Seed one layer of each kind and check that:
  - the chord strums
  - the Dorian scale shows the right notes (A B C D E F♯ G)
  - pentatonic box 1 of E minor is highlighted on the neck
  - the drone sounds after a click and stops when its layer is deleted
- [ ] **Step 3: Commit.** Message: `Stage: renderer for chord, theory plugins, scale positions and drone`

### Task 6: Palette, keys and in-frame editing

**Files:**
- Create: `src/features/stage/model/keys.ts`
- Test: `src/features/stage/model/keys.test.ts`
- Create: `src/features/teachers/studio/Palette.tsx`
- Create: `src/features/teachers/studio/KeysPanel.tsx`
- Modify: `src/features/stage/StageFrame.tsx` (drag, resize, select)
- Modify: `src/features/teachers/studio/StudioApp.tsx`

**Interfaces:**
- Consumes: `searchPalette`, `stageReducer`, `defaultRect` (Tasks 2–3).
- Produces (`keys.ts`):
  ```ts
  export type Shortcut = "palette" | "delete" | "nudge-left" | "nudge-right" | "nudge-up" | "nudge-down" | "grow-w" | "shrink-w" | "grow-h" | "shrink-h" | "deselect" | "camera-corner" | "camera-full" | "help";
  export interface KeyInfo { shortcut: Shortcut; keys: string; label: string; needsSelection: boolean }
  export const KEYS: KeyInfo[];   // the Keys panel and the "?" overlay render this list
  export function shortcutFor(e: { code: string; shiftKey: boolean; metaKey: boolean; ctrlKey: boolean; altKey: boolean }, ctx: { typing: boolean; hasSelection: boolean }): Shortcut | null;
  export const NUDGE = 0.01, NUDGE_BIG = 0.05;  // fractions; Shift = big
  ```
- **Bindings:**

  | Keys | Shortcut |
  |---|---|
  | `Slash`, or `⌘K` / `Ctrl+K` | palette |
  | `Backspace` / `Delete` | delete |
  | arrows (Shift for big steps) | nudge |
  | `Alt` + arrows | resize: Right/Down grow, Left/Up shrink |
  | `Escape` | deselect |
  | `KeyC` | camera-corner |
  | `KeyF` | camera-full |
  | `Shift+Slash` (`?`) | help |

  The grid shortcut `C` for the editor comes in Plan 3 and only applies in the editor. Here `C` is camera corner.

- [ ] **Step 1: Write the failing tests.**
  - `shortcutFor({code:"KeyC",…}, {typing:true, hasSelection:false})` → `null`
  - `shortcutFor({code:"Backspace"}, {typing:true, hasSelection:true})` → `null`
  - `shortcutFor({code:"Backspace"}, {typing:false, hasSelection:false})` → `null` (delete needs a selection)
  - `shortcutFor({code:"KeyK", metaKey:true}, {typing:false, hasSelection:false})` → `"palette"`
  - `shortcutFor({code:"Slash", shiftKey:true}, …)` → `"help"`
  - `shortcutFor({code:"ArrowLeft", altKey:true}, {typing:false, hasSelection:true})` → `"shrink-w"`
  - Every `Shortcut` value appears exactly once in `KEYS`.
- [ ] **Step 2: Run them and confirm they fail.** Run: `$TSX --test src/features/stage/model/keys.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `keys.ts`. Run the tests again. Expected: PASS.
- [ ] **Step 4: Build `Palette.tsx`.**
  - A centred overlay with `data-chrome`, mounted outside the frame element (a portal to `document.body`).
  - It contains an input, a results list grouped by `group` and showing `label` + `detail`, ↑/↓ to move, Enter to run and Escape to close.
  - **Add** dispatches `add` with a new `crypto.randomUUID()` id and `defaultRect`, then selects the new layer.
  - **Command** calls `onCommand(cmd)`.
  - The last 5 picked results are shown when the query is empty. They're stored under `musickit.studio.recent` and sanitised with `sanitiseSubject`.
  - The Enter handler calls `wakeAudio()`.
- [ ] **Step 5: Add in-frame editing to `StageFrame`.**
  - Pointer-down on a layer selects it. Dragging moves it with `setRect`, converting pixels to fractions with the frame's `getBoundingClientRect()`.
  - The bottom-right corner dot resizes.
  - The handles and the 2px outline show only while hovering or selected. They're thin, as Global Constraints says, because they will be in the video.
  - Clicks inside a widget's content (chord strum, note click) still reach the widget: dragging starts only after 4 px of movement or from the 16 px top strip.
  - Clicking the frame background deselects.
  - No focus ring on mouse focus (`:focus-visible` only).
- [ ] **Step 6: Wire it up.**
  - `KeysPanel` lists `KEYS`, dimming the ones whose `needsSelection` isn't met.
  - `?` opens an overlay with the full list.
  - `StudioApp` has a single `keydown` listener on `window` that calls `shortcutFor`. Set `typing` when `document.activeElement` is an input, textarea or contenteditable.
- [ ] **Step 7: Verify.**
  - Type check, lint and tests pass.
  - Manually:
    - `/ e6` Enter adds the chord, and `/ a dorian` Enter adds the scale.
    - Dragging and resizing work, and the arrows and Alt+arrows nudge and resize.
    - Typing `c` in the palette does not switch the camera.
    - Delete removes the selected widget, and the layout survives a reload.
- [ ] **Step 8: Commit.** Message: `Studio: spotlight palette, keyboard shortcuts with a Keys panel, drag and resize in the frame`

### Task 7: Camera and screen share

**Files:**
- Create: `src/features/teachers/studio/media/useCamera.ts`
- Create: `src/features/teachers/studio/media/useScreenShare.ts`
- Create: `src/features/stage/render/CameraLayer.tsx`, `src/features/stage/render/ScreenLayer.tsx`, `src/features/stage/render/mediaContext.ts`
- Modify: `src/features/stage/render/StageWidget.tsx`
- Modify: `src/features/teachers/studio/StudioApp.tsx`
- Modify: `spec/studio.md`

**Interfaces:**
- Produces:
  - `useCamera(): { stream: MediaStream | null; error: string | null; devices: MediaDeviceInfo[]; deviceId: string | null; start(deviceId?: string): Promise<void>; stop(): void }`.
    - Opens with `{ video: { deviceId, width: 1920, height: 1080 }, audio: false }`. Audio comes in Plan 2.
    - The chosen device is remembered in `musickit.studio.camera`.
  - `useScreenShare(): { stream: MediaStream | null; start(): Promise<void>; stop(): void }`, using `getDisplayMedia({ video: true, audio: false })` (spec: the shared app's sound isn't recorded). It clears itself when the track ends.
  - `CameraLayer({ stream, error, onRetry })` and `ScreenLayer({ stream })`, rendered by `StageWidget` for `{kind:"camera"}` and `{kind:"screen"}`. The streams come from a `StudioMediaContext` provided by `StudioApp`, so the renderer stays injectable.
- **Camera and screen are ordinary layers (decided by the user: the camera is a widget):**
  - They're dragged, resized, raised, lowered, hidden and deleted exactly like any widget, and they appear in the Layers list.
  - The video fills its rect with `object-fit: cover`, so any aspect works (portrait, square, wide).
  - **Presets** are just `setRect` calls on the camera layer: `camera-corner` → `CAMERA_CORNER`, `camera-full` → `FULL`. If no camera layer exists, the preset adds one first (`addSubject`).
  - `camera-off` removes the camera layer and stops its tracks.
  - `screen-share` starts the share and adds a screen layer (default `FULL`, at the bottom of the paint order). It can be resized like anything else, e.g. into a corner. `screen-stop` (or ending the share from Chrome's bar) removes the layer.
  - The camera stream is never opened on page load, even if a camera layer is saved. The camera layer shows a "Start camera" button (with `data-chrome`) until clicked. A device picker sits under the Layers panel once started.
- [ ] **Step 1: Implement** the hooks, `CameraLayer`, `ScreenLayer` and the two renderer cases. Wire the palette commands (`camera-corner`, `camera-full`, `camera-off`, `screen-share`, `screen-stop`) and the `C`/`F` keys. Stop all tracks on unmount.
- [ ] **Step 2: Verify manually in Chrome.**
  - Clicking Start camera prompts for access and the camera appears in the corner.
  - Drag the camera to the top-left and resize it to a square: it stays cropped cleanly, and the position survives a reload.
  - `F` makes it full frame and `C` puts it back in the corner.
  - `/ screen share` asks you to pick a window, which then fills the frame behind the camera and widgets. Resize the screen layer to half the frame and it still works. Ending the share from Chrome's bar removes the screen layer.
  - Deny camera access: "Camera off: click to retry" shows and widgets still work.
  - Unplug the camera mid-session: the same message shows, with no crash.
- [ ] **Step 3: Update `spec/studio.md`.** Run the type check and lint, then commit. Message: `Studio: camera and screen share as movable layers, with corner and full presets`

---

## Self-review notes

- **Spec coverage in this plan:**
  - goals 1–6 and 12: route, layout, camera, screen share, palette, per-widget subject, keyboard-first
  - the live-mouse rules: hover-only thin handles and no mouse focus rings
  - the separation rules
- **Deferred to later plans:**
  - Scenes, metronome and tuner widgets (Plans 4–5)
  - Recording, the editor, import, overdub and export (Plans 2–4)
  - Audio inputs and DI (Plan 5)
  - The pointer highlight, which needs Plan 2's capture
- **Not pinned by automated tests:** UI behaviour (React, no DOM test setup in this repo). Each UI task has a manual check instead.

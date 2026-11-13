# Settings Panel Everywhere Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One settings panel (side column or above the page) on every tool page, built from a layout-only panel, shared section components and each tool's own `<Name>Settings`.

**Architecture:** `SettingsPanel` (design system, layout only, CSS-first via the existing `side:` variant) takes the page's composed `settings`, `tools`, `summary` and `criteria`. Shared rows that need feature code live in a new `src/features/settings`. Each tool exports `<Name>Settings` with `look: "bar" | "menu"`; `ToolSettings` becomes a dropdown that composes rows with `look="menu"` for hosts with no panel (the plan).

**Tech Stack:** Next.js 16 (see `node_modules/next/dist/docs/`), React 19, Tailwind 4, node test runner via cached tsx.

**Spec:** `docs/superpowers/specs/2026-11-13-settings-panel-design.md`

## Global Constraints

- Work in `.claude/worktrees/settings-panel` on branch `settings-panel`. Dev server: `npx next dev --webpack -p 3001` (node_modules is a symlink). Tests: `$(ls ~/.npm/_npx/*/node_modules/.bin/tsx | head -1) --test <files>`. Types: `npx tsc --noEmit 2>&1 | grep -v '^.next/'`. Lint the files you touched.
- No heredocs or `&&`-chained git in the worktree; one git command per call; scripts go in the scratchpad.
- Design system: import only from `@/components/ui`; each component in its own folder under `atoms|molecules|organisms` with an `index.ts`; add it to `src/components/ui/index.ts` and to `uiStories.tsx` (`/dev/stories`).
- `components/` must not import `features/` for new code (dependency-cruiser `components-not-up`).
- A setting appears in one place per page. Pickers (swap what is practised) stay in the page above the tool; settings (tune how) go in the panel.
- No new settings, defaults or storage keys. Volume, accuracy, labels, melody view keep their existing hooks (`useVolume`, `useAccuracy`, `useLabelSystem`, `useExerciseSetting("view")`).
- Layout stays CSS-first: `side:` variant + `data-settings` on `<html>` + `SETTINGS_BOOT`; the panel renders its body once (no second tree for the other layout), so tools keep playing when it moves.
- `full` on `PageShell` only for a page with a `SettingsPanel` that can be a column.
- Interface copy: load `design:ux-copy` and read "Words about the app" in `.claude/skills/teaching-voice/SKILL.md` before writing any label, tooltip or tour text; report old → new strings.
- Keep `README.md` / `CLAUDE.md` beside touched code true in the same commit (`src/components/ui/CLAUDE.md`, `src/features/instruments/CLAUDE.md`, `src/features/exercises/README.md`, `src/components/chordKit/heardNote.ts` doc).
- Commit after each task: `feat(settings): …`, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Phone width (390px):** the panel is the folding bar on top, folds on first scroll, no panel-position button, no horizontal scroll (`document.documentElement.scrollWidth <= innerWidth`). Checked in each page task.
2. **Embedded host (`side={false}`, scale-neck and pentatonic tools in the plan, `/dev/examples`):** always the bar on top, no panel-position button, no page-width change. Checked in Task 3.
3. **Tours:** every tour step target still exists (`pageTours.test.ts`, `toolTours.test.ts`), and step text saying "below"/"above"/"on the right" matches where the control now is. Checked in every task that moves a control.
4. **Saved "top" on load:** a page loads straight into the above layout with no flash and no hydration warning from the panel (the existing `tabindex` warning from `NoControlFocus` is not ours). Checked in Task 1 and Task 3.
5. **Moving the panel while something plays** (pocket drone, a running warm-up): it keeps playing. Checked in Task 3.

---

### Task 1: `SettingsPanel`, `SettingsRow`, `SettingsSection` in the design system

**Files:**
- Create: `src/components/ui/organisms/SettingsPanel/{index.ts,SettingsPanel.tsx,PlaceToggle.tsx,place.ts,boot.ts}`
- Create: `src/components/ui/molecules/SettingsRow/{index.ts,SettingsRow.tsx}` (holds `SettingsRow` and `SettingsSection`)
- Modify: `src/components/ui/index.ts`, `src/components/ui/CLAUDE.md`, `src/features/devtools/stories/uiStories.tsx`, `src/app/layout.tsx` (import `SETTINGS_BOOT` from `@/components/ui`)
- Delete at the end of Task 3 (not now): `src/components/chordKit/settingsPlace.ts`, `settingsBoot.ts`
- Test: `src/components/ui/organisms/SettingsPanel/place.test.ts` (add the glob `src/components/ui/*/*/*.test.ts` to `npm test`)

**Interfaces:**
- Produces:
  - `SettingsPanel(props: { settings: ReactNode; tools?: ReactNode; summary?: ReactNode; criteria?: ReactNode; side?: boolean /* default true */; tour?: string /* default "settings" */; children: ReactNode })`
  - `SettingsRow(props: { label: string; info?: ReactNode; children: ReactNode })` (today's `BarRow`, same markup)
  - `SettingsSection(props: { title?: string; first?: boolean; children: ReactNode })` (today's `BarSection`)
  - `SettingsFact(props: { from?: "sm" | "md" | "lg"; className?: string; children: ReactNode })` (today's `Fact`, for `summary`)
  - `type SettingsPlace = "side" | "top"`, `SETTINGS_PLACE_KEY = "musickit.settingsPlace"`, `SETTINGS_BOOT: string`, `readSettingsPlace(stored: string | null): SettingsPlace`, `getSettingsPlace()`, `setSettingsPlace(p)`, `useSettingsPlace(): SettingsPlace`
  - `UNDER_PANEL = "scroll-mt-48"` (today's `UNDER_BAR`)

- [ ] **Step 1: Write the failing test** `place.test.ts`: `readSettingsPlace("top") === "top"`, `readSettingsPlace("side") === "side"`, `readSettingsPlace(null) === "side"`, `readSettingsPlace("junk") === "side"`; and `SETTINGS_BOOT` contains `SETTINGS_PLACE_KEY`.
- [ ] **Step 2: Run it**, expect FAIL (module not found).
- [ ] **Step 3: Implement** `boot.ts` (no `"use client"`, no React: `SETTINGS_BOOT`, key, type, `readSettingsPlace`) and `place.ts` (`"use client"`, the get/set/hook moved from `chordKit/settingsPlace.ts`). Keep `boot.ts` importable by the server layout: `index.ts` re-exports it; check the dev server still serves `/` after the layout import change.
- [ ] **Step 4: Implement `SettingsPanel`** by moving the frame of `ScaleSettingsBar` and `Layout` from `src/components/chordKit/ScaleSettings.tsx`: the sticky shell with `SIDE` classes, header (title "Settings", `summary`, Hide/Show fold, `PlaceToggle`), phone auto-fold (`PHONE_QUERY` from `@/components/usePhone`), body = `settings` then `tools` (`tools` beside `settings` at `xl` when not a column, under them in the column), the grid layout with `data-with-settings`, `criteria` box (`data-tour="scale-criteria"`) at the top of the content while a column and appended to the body otherwise (use `side:` / `useSettingsPlace` as `ScaleSettingsBar` does today). `side={false}`: no grid, no `data-with-settings`, no toggle. Panel root carries `data-tour={tour}`.
- [ ] **Step 5: Story** in `uiStories.tsx`: a `SettingsPanel` with two `SettingsRow`s of chips and a paragraph of content.
- [ ] **Step 6: Verify** test passes; tsc and eslint clean; `/dev/stories` shows the panel; on `:3001/dev/stories` the toggle moves it.
- [ ] **Step 7: Commit.**

### Task 2: Shared sections in `src/features/settings`

**Files:**
- Create: `src/features/settings/{index.ts,README.md,KeyRow.tsx,LabelsRow.tsx,AccuracyRow.tsx,MelodyViewRow.tsx,VolumeRow.tsx,PocketSection.tsx,InputSection.tsx,HeardNoteProvider.tsx,ScaleFacts.tsx}`
- Modify: `src/components/chordKit/heardNote.ts` (doc: provided by `HeardNoteProvider`)
- Test: `src/features/settings/settings.test.ts` (add glob to `npm test`)

**Interfaces:**
- Consumes: `SettingsRow`, `SettingsSection`, `SettingsFact` (Task 1).
- Produces (all `look?: "bar" | "menu"`, default `"bar"`; `"menu"` draws today's `DropdownSection` + `Tile` markup from `ToolSettings`):
  - `KeyRow({ tonicPc, onTonic, scale?: { slug?; onPick?; picker?: ReactNode } , keys?: boolean })` — today's key row incl. `ScalePicker` (moved here). Label "Scale" with a scale, else "Key".
  - `LabelsRow({ omit?: LabelSystem[]; extra?: ReactNode; look? })`
  - `AccuracyRow({ look? })`, `MelodyViewRow({ look? })`, `VolumeRow({ look? })` (the `Volume` speaker + slider; `"menu"` the same inline)
  - `PocketSection({ keyPc: number; drone?: boolean; clickAlways?: boolean; stacked?: boolean; onStatus?: (s: PocketStatus) => void; lines?: ReactNode })`
  - `InputSection()` — today's `InputLine`, publishes the heard note to `HeardNoteProvider`
  - `HeardNoteProvider({ children })` — today's `WithSettings` heard-note state and `SetHeard` context
  - `ScaleFacts({ tonicPc?: number; scaleName?: string; labels?: boolean; pocket?: PocketStatus | null; drone?: boolean })` — today's header facts
  - `usePocketStatus(): [PocketStatus | null, (s: PocketStatus) => void]`

- [ ] **Step 1: Write the failing test** `settings.test.ts`: a source scan asserting `src/features/settings/*.tsx` never import from `@/components/chordKit/ScaleSettings` and that `index.ts` exports each name above.
- [ ] **Step 2: Run it**, expect FAIL.
- [ ] **Step 3: Implement** by moving code out of `ScaleSettings.tsx` and `ToolSettings.tsx` (no behaviour change). `KEY_INFO` and `LABEL_INFO` strings move unchanged.
- [ ] **Step 4: Verify** test passes, tsc, eslint.
- [ ] **Step 5: Commit.**

### Task 3: Existing panel pages onto the new pieces; delete the old ones

**Files:**
- Modify: `src/components/chordKit/{ScalesIndex,ScalePage,PentatonicPage,TriadsExplorer,CagedExplorer,DoubleStopsExplorer,ArpeggiosExplorer}.tsx`, `src/components/theory/singing/{SingingApp,IntervalSingerApp,WarmUpsApp}.tsx`, `src/features/teachers/studio/StudioApp.tsx` (only if it imports moved names), `src/features/exercises/basics/{lip-roll,voice-hill}/settings.tsx` (`BarRow` → `SettingsRow`), every user of `UNDER_BAR`, `ColourKey`, `ModeAlias`
- Modify tours: `src/features/guide/tours/{scales,caged,triads,arpeggios,double-stops,singing}.ts` (`scale-settings` → `settings`)
- Modify docs: `src/features/instruments/CLAUDE.md` (`ScaleSettingsBar` → `PocketSection` in `SettingsPanel`)
- Delete: `WithSettings`, `ScaleSettingsBar`, `SettingsConfig`, `BarRow`, `BarSection`, `Layout`, `Fact`, `PlaceToggle`, `SIDE` from `ScaleSettings.tsx` (keep `ColourKey`, `ModeAlias` there or move to `chordKit/ScaleBits.tsx`; rename the file if it no longer holds settings), `src/components/chordKit/settingsPlace.ts`, `settingsBoot.ts`
- Test: `src/features/settings/settings.test.ts` (extend)

**Interfaces:**
- Consumes: Task 1 and Task 2 exports.

- [ ] **Step 1: Extend the test**: no file in `src` contains `ScaleSettingsBar`, `WithSettings`, `BarRow`, `onTonic={noTonic}` or `keys: false`. Expect FAIL.
- [ ] **Step 2: Move each page.** Mapping from old config to composition: `scale` → `KeyRow scale`; `keys: false` → no `KeyRow`; `labels` (on unless false) → `LabelsRow`; `pocket` (on unless false) → `tools={<PocketSection …/>}` with `stacked` = column (`useSettingsPlace() === "side"` and `side`); `input` → `InputSection` in `tools` + `HeardNoteProvider` around the page; `filters` → `SettingsSection title="Filter" first`; `top`/`rows` → in order around `KeyRow`; `criteria` → `criteria`; summary → `ScaleFacts` with `usePocketStatus`. Settings section title "Settings" shows only when a Filter or pocket section exists (today's rule).
- [ ] **Step 3: Delete the old pieces** and update tours and docs.
- [ ] **Step 4: Verify**: settings, guide (`pageTours`, `toolTours`) and devtools stories tests pass; tsc; eslint. On `:3001` compare each of the 10 pages before/after at 1456px (side and above) and 390px: no visible change. Review Focus 2 (`/dev/examples`, a scale-neck example), 4 (set "top", reload), 5 (start the drone on `/theory/scales`, press the panel button, it keeps playing).
- [ ] **Step 5: Commit.**

### Task 4: Shared rows in the dropdown; tools on a panel page stop drawing it

**Files:**
- Modify: `src/components/practice/ToolSettings.tsx` → move to `src/features/settings/ToolSettings.tsx` (it composes feature rows; keep the export name and props), update importers: `src/features/exercises/basics/{warmUpBar.tsx,interval-singer/index.tsx,sing-along/SingAlong.tsx,staff/index.tsx}`, `src/components/practice/EarGame.tsx`
- Modify: `src/features/exercises/basics/lip-roll/{index.tsx,settings.tsx}`, `voice-hill/{index.tsx,settings.tsx}`, `warmUpBar.tsx`, `interval-singer/index.tsx`, `sing-along/SingAlong.tsx`, `staff/index.tsx`
- Modify pages: `WarmUpsApp.tsx`, `IntervalSingerApp.tsx`, `SingingApp.tsx` (they host the settings now)
- Test: `src/features/settings/settings.test.ts` (extend)

**Interfaces:**
- Produces:
  - Every tool View that draws `ToolSettings` takes `hostSettings?: boolean` (default false). True: no sliders button, no `Volume`; the host puts the rows in its panel. Replaces lip roll's `controls` prop (rename at its users).
  - `LipRollSettings` and `HillSettings`: `look?: "bar" | "menu"` (drop `"rows"`); `"menu"` draws `DropdownSection`s.
  - A basic that passes its own rows in `ToolSettings more` today exports them as `<ToolName>Settings` in `<tool>/settings.tsx`: `SingAlongSettings` (the rows `SingAlong.tsx` passes in `more`), `WarmUpSettings` for the play-ahead and roll accuracy `warmUpBar.tsx` hosts. `interval-singer` and `staff` pass no own rows (only `accuracy`/`labels`), so they get none.

- [ ] **Step 1: Extend the test**: every file under `src/features/exercises/basics/*/index.tsx` that renders `<ToolSettings` also reads `hostSettings`; `LipRollSettings`/`HillSettings` source has no `"rows"`. Expect FAIL.
- [ ] **Step 2: Implement** `look="menu"` on the shared rows and `ToolSettings` composing `VolumeRow`, `AccuracyRow`, `LabelsRow`, `MelodyViewRow` with `look="menu"` plus `more`.
- [ ] **Step 3: Implement `hostSettings`** on each View; the three singing pages pass it and add `VolumeRow`, `AccuracyRow`, `MelodyViewRow`, `LabelsRow` and the tool's `<Name>Settings look="bar"` to their panel, only those the tool used before.
- [ ] **Step 4: Verify** tests (settings, exercises, devtools stories, guide), tsc, eslint. `:3001/theory/singing/warm-ups`, `/intervals`, `/melodies`: no sliders button on the tool; the same settings in the panel. `/dev/examples` with a lip-roll and a sing-along example: the sliders button is there with the same sections as before. Tour steps that named the sliders button (`toolTours.ts`, `src/features/guide/tours/*`) point at the panel.
- [ ] **Step 5: Commit.**

### Tasks 5–15: One page each

Same steps for every page below, one task and one commit per page, in this order. Each page's `<Name>Settings` lives in the page tool's feature folder (create the folder's `settings.tsx`; for a tool still under `src/components/…`, put `settings.tsx` next to it and note in the report that the tool should move to a feature).

| Task | Page | Component | Panel holds (beyond the tool's own `<Name>Settings`) | `PocketSection` |
| --- | --- | --- | --- | --- |
| 5 | `/theory/ears` | `components/practice/EarGame.tsx` | Volume | no |
| 6 | `/theory/notes` | `components/practice/NoteGame.tsx` | Volume, Labels if it names notes | no |
| 7 | `/theory/singing/breathing` | `components/theory/singing/BreathingApp.tsx` | Volume | no |
| 8 | `/theory/tune-by-ear` | `components/theory/TuneByEar.tsx` | Volume, Labels | builder flags |
| 9 | `/theory/piano` | `components/theory/piano/TheoryPiano.tsx` | Key, Labels, Volume | builder flags |
| 10 | `/theory/chords` | `components/chordKit/ChordKit.tsx` | Key, Labels, Volume | builder flags |
| 11 | `/theory/circle` | `components/theory/CircleOfFifths.tsx` | Key, Labels | no |
| 12 | `/tuner` | `features/tuner` (`TunerSettings.tsx`) | Volume | no |
| 13 | `/theory/metronome-drone` | `features/instruments` | Volume | no |
| 14 | `/theory/rhythm` | `features/rhythm/RhythmGame.tsx` | Volume | no |
| 15 | `/theory/backing` | `features/backing` | Volume | no |

**Files (per page):** the page's `src/app/…/page.tsx` (add `full`), its component, its new `settings.tsx`, its tour `src/features/guide/tours/<page>.ts`, its feature README.

**Interfaces:**
- Consumes: `SettingsPanel` (Task 1), shared rows (Task 2), `hostSettings` (Task 4).
- Produces: `<Name>Settings({ …controlled value/onChange pairs; look?: "bar" | "menu" })`.

- [ ] **Step 1: Sort the page's controls** into pickers (stay above the tool) and settings (panel) by the spec's rule; write the split as the first lines of the commit message body.
- [ ] **Step 2: Extend `settings.test.ts`**: the page file has `full` and its component (or the page) renders `<SettingsPanel`. Expect FAIL.
- [ ] **Step 3: Implement** `<Name>Settings`, compose the panel, add `full`. Load `design:ux-copy` before touching any label; one name per control across pages (reuse existing labels).
- [ ] **Step 4: Update the tour**: step targets and "below/above/on the right" wording.
- [ ] **Step 5: Verify**: settings, guide and the feature's tests; tsc; eslint; `:3001` at 1456px side and above, and 390px (Review Focus 1). Near-empty panel (Volume only): keep it and note it in the report.
- [ ] **Step 6: Commit.**

### Task 16: Guard and wrap-up

**Files:**
- Modify: `src/features/settings/settings.test.ts`, `src/components/PageShell.tsx` doc, `src/features/exercises/README.md`, `src/features/settings/README.md`

- [ ] **Step 1: Add the guard test**: every `src/app/**/page.tsx` with `full` (except `note/[slug]`, `teachers/studio`, which have the studio panel) reaches a `<SettingsPanel` in its own file or a component it imports directly; and the 21 tool routes in Tasks 3 and 5–15 all have `full`.
- [ ] **Step 2: Run the full `npm test` with the cached tsx**, tsc, eslint on `src/features/settings src/components/ui`.
- [ ] **Step 3: Commit.**

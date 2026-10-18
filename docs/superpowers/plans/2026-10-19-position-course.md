# Position Course Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A new guitar course at `/course`: stages made of sections (one page each), a floating section panel, static arrow paths on the fretboard, strum grids, a per-section "My notes" panel saved in the browser, and an index laid out by stage or by topic.

**Architecture:** Course content is pure TypeScript data under `src/features/course/` (stages → sections → blocks), rendered by server pages under `src/app/course/` with small client components under `src/components/course/` for the panel, notes and index. Fretboard paths are a new optional prop on the existing `NoteNeck`; the block visuals reuse the `Visual` type from `src/features/theory/course/visuals.ts`. Student notes live in `localStorage` behind `useSyncExternalStore` stores, the same pattern as `src/features/theory/useLabelSystem.tsx`.

**Tech Stack:** Next.js 16 (app router, static params), React 19, Tailwind 4, `node:test` via tsx.

**Spec:** `docs/superpowers/specs/2026-10-19-position-course-design.md`

## Global Constraints

- Read `node_modules/next/dist/docs/` (app router: dynamic routes, `generateStaticParams`, `redirect`, `notFound`) before writing any route; this Next.js has breaking changes. Copy the params pattern from `src/app/theory/stage/[n]/page.tsx` (`params: Promise<…>`).
- Key: E minor / G major for stages 0–5. Positions are CAGED shapes of G: position 1 = frets 0–3, position 2 = frets 2–5.
- Songs: title, artist and chords only; melodies in tab only if traditional or public domain.
- No accounts, nothing sent anywhere. Student notes are `localStorage` only; every read/write wrapped in try/catch; pages render fully when storage is blocked.
- Paths are static: no animation, no audio sync.
- Phone width: no horizontal page scroll. Follows the site's style themes (use the same Tailwind slate palette and `PageShell` as the stage pages).
- The old course (`/theory/stage/*`, `src/features/theory/course/*`) stays untouched and online.
- Tests: run with the cached tsx binary, not `npx tsx` (it hangs here): `TSX=$(ls ~/.npm/_npx/*/node_modules/.bin/tsx | head -1)`, then `$TSX --test <files>`. `tsc --noEmit` errors under `.next/` are stale; ignore those lines.
- Other sessions commit to `main` and share the main checkout's index: work in a worktree (`superpowers:using-git-worktrees`); in a worktree the dev server needs `--webpack` unless `npm install` was run there.

## Review Focus

1. **Blocked or corrupt storage** (private window, old/garbled JSON): the page renders with empty notes and nothing throws. Pinned by `parseNotesStore` / `parseCustomTags` tests in Task 4.
2. **First render vs stored notes:** server HTML has no notes; the client fills them in after hydration without a hydration warning (server snapshot is the empty store). Check in Task 6's browser step.
3. **Stage 1 has 8 sections on a 360px phone:** the bottom bar scrolls sideways, the current section is scrolled into view, the page itself never scrolls horizontally. Check in Task 6's browser step.
4. **Custom tag input** with only spaces, a duplicate of an existing tag (any case), only an emoji, or a very long string: rejected, deduped, accepted, trimmed to 24 chars. Pinned by `makeCustomTag` tests in Task 4.
5. **A path point outside the drawn frets or on a note not in the stated chord/scale:** every content task's test asserts both for every neck block.

---

## File map

| File | Responsibility |
|---|---|
| `src/features/course/model.ts` | Types (`CourseStage`, `CourseSection`, `Block`, `TopicId`), `TOPICS`, `pcAt` |
| `src/features/course/strum.ts` | `parseStrum`, the three strum patterns |
| `src/features/course/paths.ts` | `segment` geometry for arrows |
| `src/features/course/notes.ts` | Notes data model, preset tags, parsing, compact marks (pure) |
| `src/features/course/stages/s0.ts` … `s6.ts` | Stage content (`s0.ts` holds 0.1–0.4) |
| `src/features/course/course.ts` | `COURSE`, `findSection`, `nextSection`, `sectionHref`, `byTopic` |
| `src/features/course/*.test.ts` | Tests (one per module + `content.test.ts`) |
| `src/features/theory/course/visuals.ts` | `Dot.sub`, neck `paths`, chord `voicing`, `lessonShape(name, prefer, voicing)` |
| `src/components/theory/NoteNeck.tsx` | `paths` prop, `NeckDot.sub` |
| `src/components/course/useCourseNotes.tsx` | Client stores: notes, custom tags, index layout |
| `src/components/course/SectionPanel.tsx` | Left panel (desktop) / bottom bar (phone) |
| `src/components/course/SectionBody.tsx` | Renders a section's blocks |
| `src/components/course/StrumGrid.tsx` | Strum pattern grid |
| `src/components/course/MyNotes.tsx` | End-of-section notes panel |
| `src/components/course/Marks.tsx` | Compact marks for a section |
| `src/components/course/CourseIndex.tsx` | `/course` index with layout toggle and filters |
| `src/app/course/page.tsx`, `[stage]/page.tsx`, `[stage]/[section]/page.tsx` | Routes |

---

### Task 1: Course model, topics and the full stage/section skeleton

**Files:**
- Create: `src/features/course/model.ts`, `src/features/course/course.ts`, `src/features/course/stages/s0.ts`, `s1.ts`, `s2.ts`, `s3.ts`, `s4.ts`, `s5.ts`, `s6.ts`
- Test: `src/features/course/course.test.ts`
- Modify: `package.json` (`test` script: append `src/features/course/*.test.ts`)

**Interfaces:**
- Produces:
  ```ts
  // model.ts
  export type TopicId = "basics" | "open-chords" | "strumming" | "three-views" | "melody" | "box-1" | "box-2" | "boxes-3-5"
    | "triads" | "fifths" | "arpeggios" | "paths" | "soloing" | "barre-drop3" | "colour" | "modes" | "keys";
  export const TOPICS: { id: TopicId; label: string }[]; // in this order, labels:
  // Guitar basics · Open chords · Strumming · Piano, guitar & solfège · Melodies & single notes ·
  // Position 1 · CAGED box 1 · Position 2 · CAGED box 2 · Positions 3–5 · CAGED boxes 3–5 · Triads ·
  // 5ths & double stops · Arpeggios · Paths & the circle of fifths · Scales & soloing · Barres & drop 3 ·
  // Colour chords · Modes · Other keys
  export type Block =
    | { kind: "text"; paras: string[] }
    | { kind: "visual"; visual: Visual }            // Visual from @/features/theory/course/visuals
    | { kind: "strum"; pattern: StrumPatternId; chords: string[]; caption: string }
    | { kind: "links"; explore: CourseLink[]; practise: CourseLink[] }   // CourseLink from theory/course/stages
    | { kind: "songs"; songs: Song[] }
    | { kind: "melody"; melody: Melody }
    | { kind: "task"; text: string };               // a practice task or "you're ready when…"
  export interface CourseSection { slug: string; title: string; topic: TopicId; blocks: Block[] }
  export interface CourseStage { slug: string; label: string; title: string; intro: string; sections: CourseSection[] }
  export const pcAt = (string: number, fret: number): number; // (OPEN_PCS[string] + fret) % 12, string 0 = low E
  // course.ts
  export const COURSE: CourseStage[];
  export function findSection(stage: string, section: string): { stage: CourseStage; section: CourseSection } | undefined;
  export function nextSection(stage: string, section: string): { stage: CourseStage; section: CourseSection } | undefined; // crosses into the next stage
  export function prevSection(stage: string, section: string): { stage: CourseStage; section: CourseSection } | undefined;
  export const sectionHref = (stage: string, section: string) => `/course/${stage}/${section}`;
  export function byTopic(): { topic: { id: TopicId; label: string }; items: { stage: CourseStage; section: CourseSection }[] }[]; // TOPICS order, empty topics dropped, course order within a topic
  ```
  `StrumPatternId` is declared in Task 3; in this task declare it in `model.ts` as `"downs-quarter" | "downs-eighth" | "island" | "sixteenths"` and Task 3 imports it from there.

**Stages and sections (slug · title · topic).** Every section starts with `blocks: []`; content tasks fill them.

| Stage slug · label · title | Sections |
|---|---|
| `0-1` · 0.1 · Guitar basics | `strings-and-tuning` Strings & tuning · basics; `tab-and-chord-boxes` Tab & chord boxes · basics; `notes-on-e-and-a` Notes on E and A · basics |
| `0-2` · 0.2 · First open chords | `em-and-am` Em & Am · open-chords; `c-d-g` C, D, G · open-chords; `one-minute-changes` One-minute changes · open-chords; `all-downstrums` All downstrums · strumming; `island-strum` Island strum · strumming; `sixteenths` 16th strumming pattern · strumming; `first-songs` First songs · open-chords |
| `0-3` · 0.3 · One note, three views | `piano-and-guitar` Piano ↔ guitar · three-views; `solfege` Solfège · three-views; `do-re-mi` The major scale as do-re-mi · three-views; `hearing-do-fa-sol` Hearing do, fa, sol · three-views |
| `0-4` · 0.4 · Single notes | `melodies` Melodies in tab · melody |
| `1` · 1 · Position 1 | `chords` Chords · box-1; `triads` Triads · triads; `fifths` 5ths & double stops · fifths; `arpeggios` Arpeggios · arpeggios; `one-four-five` 1 → 4 → 5 → 1 & the circle of fifths · paths; `pentatonic` E minor pentatonic · soloing; `soloing` Soloing over Em ↔ Am · soloing; `move-it` Move it: G minor · box-1 |
| `2` · 2 · Position 2 | `bm-barre` The Bm barre · barre-drop3; `easier-bm` Easier Bm · barre-drop3; `drop-3` Drop 3 chords · barre-drop3; `arpeggios` Arpeggios in position 2 · arpeggios; `joining` Joining positions 1 and 2 · box-2 |
| `3` · 3 · Position 1 flavours | `six-chords` 6 chords · colour; `sevenths` maj7 & 7 · colour; `sus-add9` sus & add9 · colour; `colour-paths` The same paths with colour · paths |
| `4` · 4 · Up the neck | `d-c-a-shapes` D, C and A shapes · boxes-3-5; `one-arpeggio` One arpeggio through all five shapes · arpeggios; `triads-everywhere` Triads on every string set · triads |
| `5` · 5 · Modes | `modes` Aeolian, Dorian, Phrygian, Mixolydian · modes; `harmonic-minor` Harmonic minor and why B7 works · modes |
| `6` · 6 · Other keys | `moving-keys` Moving it all to Am/C, Dm/F · keys; `circle-map` The circle as a map between keys · keys |

Stage `intro`: one or two plain sentences each, written by the implementer from the spec's intent.

- [ ] **Step 1: Write the failing test** `course.test.ts`:
  - `COURSE.map(s => s.slug)` deep-equals `["0-1","0-2","0-3","0-4","1","2","3","4","5","6"]`.
  - Stage `1` section slugs deep-equal `["chords","triads","fifths","arpeggios","one-four-five","pentatonic","soloing","move-it"]`; stage `0-2` slugs deep-equal `["em-and-am","c-d-g","one-minute-changes","all-downstrums","island-strum","sixteenths","first-songs"]`.
  - Section slugs unique within a stage; every slug matches `/^[a-z0-9-]+$/`.
  - Every section's `topic` is in `TOPICS`.
  - `nextSection("0-1","notes-on-e-and-a")?.section.slug === "em-and-am"`; `nextSection("6","circle-map") === undefined`; `prevSection("0-1","strings-and-tuning") === undefined`.
  - `findSection("1","nope") === undefined`; `findSection("9","chords") === undefined`.
  - `byTopic()[0].topic.id === "basics"`; the `strumming` group's section slugs are `["all-downstrums","island-strum","sixteenths"]`.
  - `pcAt(0,3) === 7` (G), `pcAt(2,0) === 2` (D), `pcAt(5,0) === 4` (E).
- [ ] **Step 2: Run it, expect FAIL** (module not found): `$TSX --test src/features/course/course.test.ts`
- [ ] **Step 3: Implement** `model.ts`, `course.ts` and the stage files with the table above.
- [ ] **Step 4: Run it, expect PASS.**
- [ ] **Step 5: Commit** — `git add src/features/course package.json` then `git commit -m "Course: model, topics and the stage/section skeleton"`

---

### Task 2: Fretboard paths and second-line labels on `NoteNeck`; drop 3 lookup

**Files:**
- Create: `src/features/course/paths.ts`, Test: `src/features/course/paths.test.ts`
- Modify: `src/components/theory/NoteNeck.tsx`, `src/features/theory/course/visuals.ts`, `src/components/theory/TrackVisual.tsx` (pass `paths` through; pass `voicing` to `lessonShape`)
- Test: `src/features/theory/course/visuals.test.ts` (add a case)

**Interfaces:**
- Produces:
  ```ts
  // paths.ts
  export interface PathPoint { string: number; fret: number }
  export interface NeckPath { points: PathPoint[]; colour: string }
  /** The drawn part of one arrow: from a's centre to b's, shortened by `gap` at both ends; null if the dots overlap. */
  export function segment(a: { x: number; y: number }, b: { x: number; y: number }, gap: number): { x1: number; y1: number; x2: number; y2: number } | null;
  // visuals.ts
  export interface Dot { string: number; fret: number; label: string; fill: string; big?: boolean; sub?: string }
  // neck variant gains:  paths?: NeckPath[]
  // chords variant entries gain: voicing?: string   (matches Shape.v, e.g. "drop 3")
  export function lessonShape(name: string, prefer?: string, voicing?: string): ChordShapeChoice | undefined;
  // NoteNeck.tsx
  export interface NeckDot { /* existing */ sub?: string }
  // new prop: paths?: NeckPath[]
  ```
- Rendering: for each path, each consecutive pair of points → `segment(centreA, centreB, dotRadius + 3)` drawn as an SVG `<line>` (stroke = path colour, width 2.5, round caps) with an arrowhead marker at the end. Paths draw **under** the dots. Marker ids must be unique per `NoteNeck` instance (use React `useId`) and per colour. `sub` renders as small text (fontSize 8) just below the dot, in the dot's fill colour. Reference picture: option C in `.superpowers/brainstorm/68251-1792343425/content/paths.html`.

- [ ] **Step 1: Write failing tests**
  - `paths.test.ts`: `segment({x:0,y:0},{x:100,y:0},10)` → `{x1:10,y1:0,x2:90,y2:0}`; `segment({x:0,y:0},{x:0,y:50},10)` → `{x1:0,y1:10,x2:0,y2:40}`; `segment({x:0,y:0},{x:15,y:0},10) === null`.
  - `visuals.test.ts`: `lessonShape("Am7", undefined, "drop 3")?.shape.v === "drop 3"` and its fret is `0`; `lessonShape("Bm7", undefined, "drop 3")?.fret === 2`; `lessonShape("Em7", undefined, "drop 3")?.shape.v === "drop 3"`.
- [ ] **Step 2: Run both, expect FAIL.**
- [ ] **Step 3: Implement** `segment`, the `lessonShape` voicing filter (pick the first full shape whose `shape.v === voicing`, falling back to `prefer`, then the first), `NoteNeck` paths and `sub`, the `Visual` type changes, and pass-through in `TrackVisual`.
- [ ] **Step 4: Run both, expect PASS;** run all `src/features/theory/course/*.test.ts` to confirm the old course is unaffected.
- [ ] **Step 5: Commit** — `"Neck: static arrow paths between notes and a second label line; drop 3 lookup for lessons"`

---

### Task 3: Strum patterns and the strum grid

**Files:**
- Create: `src/features/course/strum.ts`, `src/components/course/StrumGrid.tsx`
- Test: `src/features/course/strum.test.ts`

**Interfaces:**
- Consumes: `StrumPatternId` from `model.ts`.
- Produces:
  ```ts
  export type Stroke = "D" | "U" | ".";
  export interface StrumPattern { id: StrumPatternId; name: string; steps: Stroke[]; perBeat: 1 | 2 | 4 }
  export function parseStrum(spec: string): Stroke[]; // tokens separated by spaces; "|" ignored; any other token throws
  export const STRUMS: Record<StrumPatternId, StrumPattern>;
  // StrumGrid.tsx
  export default function StrumGrid({ pattern }: { pattern: StrumPattern }): JSX.Element;
  ```
- Pattern specs (exact):
  - `downs-quarter`: "All downstrums, one per beat", `"D D D D"`, perBeat 1
  - `downs-eighth`: "All downstrums, two per beat", `"D D D D D D D D"`, perBeat 2
  - `island`: "Island strum", `"D . D U . U D U"`, perBeat 2
  - `sixteenths`: "16th pattern, downs on 1 and 3", `"D . . U . U D U | D . . U . U D U"`, perBeat 4
- `StrumGrid`: one row of cells for one bar, a count row above (`1 & 2 &` for perBeat 2; `1 e & a 2 e & a …` for perBeat 4; `1 2 3 4` for perBeat 1), beat starts visibly stronger, D/U shown as ↓/↑ with the letter, `.` as an empty cell (hand still moves). Fits 360px for 16 cells (cells shrink; no horizontal page scroll).

- [ ] **Step 1: Failing test** `strum.test.ts`: `STRUMS.island.steps.length === 8`; `STRUMS.sixteenths.steps.length === 16`; `STRUMS.sixteenths.steps[0] === "D"` and `[8] === "D"`; every pattern's `steps.length === 4 * perBeat`; `parseStrum("D | U .")` deep-equals `["D","U","."]`; `assert.throws(() => parseStrum("D X"))`.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** `strum.ts` and `StrumGrid.tsx`.
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** — `"Course: strum patterns and the strum grid"`

---

### Task 4: My-notes data model (pure)

**Files:**
- Create: `src/features/course/notes.ts`, Test: `src/features/course/notes.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type Know = "new" | "getting" | "solid" | "own";
  export const KNOW: { id: Know; emoji: string; label: string }[]; // 🌱 new · 🌿 getting there · 🌳 solid · 🏆 own it
  export type Like = 1 | 2 | 3 | 4;
  export const LIKE: { id: Like; emoji: string }[];                 // 😖 😐 🙂 😍
  export interface SectionNotes { know?: Know; like?: Like; often?: boolean; warmup?: boolean; tags: string[]; note: string }
  export const EMPTY_NOTES: SectionNotes; // { tags: [], note: "" }
  export interface Tag { id: string; emoji?: string; text: string }
  export const PRESET_TAGS: Tag[];  // the 24 tags from the spec, in spec order, ids kebab-case ("clicked", "confusing", …)
  export const noteKey = (stage: string, section: string) => `${stage}/${section}`;
  export function parseNotesStore(raw: string | null): Record<string, SectionNotes>; // bad JSON / wrong shapes → dropped, never throws
  export function parseCustomTags(raw: string | null): Tag[];                        // same rules
  export function makeCustomTag(input: string, existing: Tag[]): Tag | null;
  export function hasNotes(n: SectionNotes): boolean;
  export function compactMarks(n: SectionNotes, tags: Tag[]): string[]; // [know emoji, like emoji, "🔁", "🔥", ...tag emoji or first word]; "📝" last if note non-empty
  ```
- `makeCustomTag`: trim; empty → null; a leading emoji (`/^\p{Extended_Pictographic}(️|‍\p{Extended_Pictographic})*/u`) becomes `emoji`, the rest (trimmed) `text`; text trimmed to 24 chars; id = `"c:" + (emoji ?? "") + text.toLowerCase()`; a tag whose id or lower-cased text+emoji already exists in `existing` (presets + custom) → null.

- [ ] **Step 1: Failing tests:**
  - `parseNotesStore(null)` and `parseNotesStore("{oops")` and `parseNotesStore("[1,2]")` deep-equal `{}`.
  - `parseNotesStore('{"1/chords":{"know":"solid","tags":["clicked"],"note":"x"},"1/triads":{"know":"bogus"}}')` keeps `1/chords` with `know:"solid"`, and `1/triads` with `know` undefined and `tags: []`, `note: ""`.
  - `parseCustomTags('[{"id":"c:x","text":"x"},{"nope":1}]')` → one tag.
  - `makeCustomTag("   ", [])` → null; `makeCustomTag("🎯 Timing", [])` → `{ emoji:"🎯", text:"Timing", … }`; `makeCustomTag("🎯", [])` → emoji `"🎯"`, text `""`; `makeCustomTag("timing", [{id:"c:timing",text:"timing"}])` → null; `makeCustomTag("a".repeat(40), [])!.text.length === 24`.
  - `PRESET_TAGS.length === 24`, ids unique, first is `{ emoji: "💡", text: "it clicked" }`.
  - `compactMarks({ know:"getting", like:4, often:true, warmup:true, tags:["clicked"], note:"hi" }, PRESET_TAGS)` deep-equals `["🌿","😍","🔁","🔥","💡","📝"]`.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** `notes.ts`.
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** — `"Course: my-notes model, preset tags and safe parsing"`

---

### Task 5: Client stores for notes, custom tags and layout

**Files:**
- Create: `src/components/course/useCourseNotes.tsx`

**Interfaces:**
- Consumes: `parseNotesStore`, `parseCustomTags`, `EMPTY_NOTES`, `noteKey`, `PRESET_TAGS`, `Tag`, `SectionNotes` (Task 4).
- Produces:
  ```ts
  export function useSectionNotes(key: string): [SectionNotes, (patch: Partial<SectionNotes>) => void];
  export function useAllNotes(): Record<string, SectionNotes>;
  export function useTags(): [Tag[] /* presets then custom */, (t: Tag) => void /* add custom */];
  export type CourseLayout = "stage" | "topic";
  export function useCourseLayout(): [CourseLayout, (v: CourseLayout) => void];
  ```
- Storage keys: `musickit.course.notes`, `musickit.course.tags`, `musickit.course.layout`. Follow `useLabelSystem.tsx`: module-level value, lazy load on first subscribe, `queueMicrotask(fn)` after subscribe, server snapshot = empty/default (`{}`, presets only, `"stage"`). Snapshots must be referentially stable between changes (no new object per `getSnapshot` call). A patch that leaves a section with `hasNotes() === false` deletes its key. Also listen to the `storage` event so two tabs stay in step.

- [ ] **Step 1:** Implement the hooks.
- [ ] **Step 2:** `npx tsc --noEmit 2>&1 | grep -v '^.next/'` → no errors in `src/components/course/`.
- [ ] **Step 3: Commit** — `"Course: browser stores for notes, tags and index layout"`

(Behaviour is exercised in Task 6's browser check; the parsing logic it relies on is tested in Task 4.)

---

### Task 6: Section page, section panel, block renderer and My notes

**Files:**
- Create: `src/app/course/[stage]/[section]/page.tsx`, `src/app/course/[stage]/page.tsx`, `src/components/course/SectionPanel.tsx`, `SectionBody.tsx`, `MyNotes.tsx`, `Marks.tsx`

**Interfaces:**
- Consumes: `COURSE`, `findSection`, `nextSection`, `prevSection`, `sectionHref` (Task 1); `StrumGrid`, `STRUMS` (Task 3); `TrackVisual` (existing, now path-aware); hooks (Task 5); `KNOW`, `LIKE`, `compactMarks`, `makeCustomTag`, `noteKey` (Task 4).
- Produces:
  ```ts
  export default function SectionPanel({ stage, current }: { stage: CourseStage; current: string }): JSX.Element; // client
  export default function SectionBody({ section }: { section: CourseSection }): JSX.Element;
  export default function MyNotes({ stage, section }: { stage: string; section: string }): JSX.Element;      // client
  export default function Marks({ noteKey }: { noteKey: string }): JSX.Element | null;                       // client, renders compactMarks inline
  ```
- **Routes:** `[stage]/[section]` — `generateStaticParams` over every stage × section; `generateMetadata` title `"<stage label> · <section title> · Music Kit"`; unknown → `notFound()`. Page: `PageShell` (active `"/course"`), panel + body side by side from `lg`, then `MyNotes`, then a "Next: <section title>" link (into the next stage's first section after the last one; "Back to the course" on the very last). `[stage]` → `redirect` to its first section; unknown → `notFound()`.
- **SectionPanel:** desktop (`lg` and up): sticky left column, ~13rem, shows `Stage <label>` + stage title, then section titles as links (current highlighted, `<Marks>` after each), then "‹ prev stage · All stages · next stage ›" (All stages → `/course`). Phone: `fixed bottom-0` bar, horizontally scrollable (`overflow-x-auto`), current item `scrollIntoView({ inline: "center", block: "nearest" })` on mount; page gets bottom padding so the bar never covers content; stage label + title and ‹ › links shown as a small line at the top of the page instead. Highlight colour = `stageColour` logic: reuse `degreeColour` with a fixed per-stage index (implementer's choice, stable per stage).
- **SectionBody:** renders blocks in order. `text` → paragraphs; `visual` → `TrackVisual`; `strum` → `StrumGrid` + chord chips + caption; `links` → link cards (copy the `LinkCard` look from `StageArticle.tsx`; extract it to a shared component if that's cleaner); `songs` → the song cards from `StageArticle.tsx`; `melody` → the existing `Tab` component as the old stage page uses it; `task` → a highlighted box.
- **MyNotes:** heading "My notes"; the five parts in spec order with exact labels: "How well do I know it?", "How do I like it?", "Keep it close" (🔁 come back often, 🔥 warm-up), "🤷", "Note". Single-choice rows clear on second tap. 🤷 shows all tags from `useTags()` as toggles plus a "+ tag" chip that opens an inline text input (Enter adds via `makeCustomTag`, adds it to custom tags and toggles it on; invalid → input shakes/keeps text, no error dialog). Note: textarea, saved on change (debounce ~400 ms). All buttons are real `<button>`s with `aria-pressed`.

- [ ] **Step 1:** Implement routes and components. A section with `blocks: []` renders its title, the panel and My notes (content arrives in later tasks).
- [ ] **Step 2:** `npx tsc --noEmit 2>&1 | grep -v '^.next/'` → clean; `npm run lint` → no new errors.
- [ ] **Step 3: Browser check** (dev server; `--webpack` in a worktree). At 1280px and at 360px (CDP device metrics, per memory `worktree-dev-and-screenshots`) open `/course/1/chords`:
  - panel on the left at 1280; bottom bar at 360, scrolls sideways, current section in view, `document.documentElement.scrollWidth === innerWidth`.
  - set know 🌿, like 😍, 🔥, toggle 💡, add "🎯 Timing", type a note; reload → all still set; marks show next to the section in the panel.
  - console has no hydration warning.
  - in DevTools, block site storage (or run `localStorage.setItem("musickit.course.notes","{oops")`) and reload → page renders, notes empty, no error.
  - `/course/1` redirects to `/course/1/chords`; `/course/1/nope` and `/course/9/chords` are 404.
- [ ] **Step 4: Commit** — `"Course: section pages with the floating section panel and My notes"`

---

### Task 7: Course index with layout toggle and filters; entry points

**Files:**
- Create: `src/app/course/page.tsx`, `src/components/course/CourseIndex.tsx`
- Modify: `src/features/theory/sections.ts` (learn group: add `{ href: "/course", label: "Course", desc: "Learn the neck one position at a time", icon: "graduation-cap", tone: "emerald" }` first, matching the existing entry shape), `src/components/theory/TheoryHub.tsx` (hero CTA → `/course`, text "Start the course"; old stage list stays below), `src/app/sitemap.ts` (add `/course` and every section URL)
- Test: `src/features/theory/sections.test.ts` (extend if it asserts the learn group's contents)

**Interfaces:**
- Consumes: `COURSE`, `byTopic`, `sectionHref` (Task 1); `useCourseLayout`, `useAllNotes` (Task 5); `Marks` (Task 6); `noteKey` (Task 4).
- Produces: `export default function CourseIndex(): JSX.Element` (client).
- Layout: header with a two-way toggle "By stage" / "By topic" (`useCourseLayout`). By stage: each stage (label, title, intro) with its sections as links + `<Marks>`. By topic: `byTopic()` groups, each item shows section title, a small stage label, `<Marks>`. Filter chips "🔥 Warm-ups" and "🔁 Come back often" (shown in both layouts): when on, only sections whose notes have that flag; empty result shows "Nothing marked yet — use My notes at the end of a section."

- [ ] **Step 1:** Implement page and component; update sections/hub/sitemap.
- [ ] **Step 2:** `$TSX --test src/features/theory/*.test.ts src/features/course/*.test.ts` → PASS; `tsc` clean; lint clean.
- [ ] **Step 3: Browser check:** toggle layouts (choice survives reload); with notes from Task 6 set, 🔥 filter shows only that section; Theory menu and `/theory` hub link to `/course`; 360px has no horizontal scroll.
- [ ] **Step 4: Commit** — `"Course: index by stage or by topic with warm-up filters; course linked from the theory hub"`

---

## Content tasks (8–12)

Each content task fills `blocks` for its stage files only. Rules for all of them:
- Every section has at least one `text` block and at least one non-text block (`visual`, `strum`, `melody`, `songs`, or `task`).
- Voice: plain, short, practical, like `src/features/theory/course/stages.ts`. Reuse its songs, melodies and practice links where they fit.
- Necks: use `scaleDots` / `naturalDots` from `visuals.ts` or hand-written `Dot`s; label with degree and `sub` = solfège (movable do, `solfege()` from `labels.ts`) wherever the section is about degrees. Colour by `degreeColour`.
- Links: only to real pages (`/theory/...` explorer and practice routes listed in `THEORY_SECTIONS`, or `/course/...`).

**Shared content test** — Task 8 creates `src/features/course/content.test.ts` with these helpers and generic checks; later tasks add stage-specific cases to it:
- `necks(section)`: all `visual` blocks of kind `neck`.
- For every neck in the whole course: every dot and every path point has `0 <= string < 6` and `from <= fret <= to`; every path has ≥ 2 points.
- For every `chords` visual: `lessonShape(name, prefer, voicing)` exists; if `prefer`, `shape.tags` includes it; if `voicing`, `shape.v === voicing`.
- For every `strum` block: `pattern in STRUMS`.
- Links resolve (same rule as `stages.test.ts`'s `ok`, extended to `/course/<stage>/<section>` via `findSection`).
- For stages whose content task is done (a `DONE` list in the test, extended by each task): every section meets the "text + non-text" rule.

### Task 8: Stage 0 content (0.1–0.4)

**Files:** Modify `src/features/course/stages/s0.ts`; Create/extend `src/features/course/content.test.ts`

Pins:
- `0-1/notes-on-e-and-a`: neck `naturalDots([0, 1], 12)`.
- `0-2/em-and-am`, `c-d-g`: `chords` visuals of Em, Am / C, D, G. `0-2/first-songs`: songs using only Em, Am, C, D, G, B7.
- `0-2/all-downstrums`: two strum blocks, `downs-quarter` then `downs-eighth`, chords `["Em","Am"]`. `island-strum`: `island`, chords `["G","C","D"]`. `sixteenths`: `sixteenths`, chords `["Em","Am"]`, with text explaining the hand keeps moving in 16ths and touches the strings only where marked, down on 1 and 3.
- `0-3/piano-and-guitar`: show the same notes on piano and guitar (use `MiniPiano` from `src/components/theory/MiniPiano.tsx` via a new `visual` kind `"piano"` with `{ notes: number[] /* pcs */; caption }` added to `Visual` and rendered in `TrackVisual`) next to a neck. `0-3/do-re-mi`: G major scale in position 1 (frets 0–3) with degree labels and solfège `sub`.
- `0-3/hearing-do-fa-sol`: links to `/theory/ears` levels for 4th and 5th.
- `0-4/melodies`: Ode to Joy and When the Saints from the old `stages.ts`.

- [ ] **Step 1: Failing tests** (in `content.test.ts`): the generic checks; `DONE = ["0-1","0-2","0-3","0-4"]`; `0-2/sixteenths` has a strum block with `pattern === "sixteenths"`; every song in `0-2/first-songs` uses only `Em Am C D G B7`; every dot in `0-3/do-re-mi` necks has `pcAt` in G major `{7,9,11,0,2,4,6}` and fret ≤ 3.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Write the content** (and the `"piano"` visual kind).
- [ ] **Step 4: Run, expect PASS;** open `/course/0-2/sixteenths` and `/course/0-3/piano-and-guitar` at 360px and 1280px.
- [ ] **Step 5: Commit** — `"Course: stage 0 content — basics, open chords, strumming, three views, melodies"`

### Task 9: Stage 1 content (Position 1)

**Files:** Modify `src/features/course/stages/s1.ts`, `src/features/course/content.test.ts`

Pins (string 0 = low E):
- `chords`: Em, Am, C, D, G, B7 chord boxes.
- `triads`: neck frets 0–4 with top-3-string triads Em `000`, G `003`, C `010`, Am `210`, D `232` (strings 3,4,5), one neck per triad or one neck per pair — implementer's call.
- `fifths`: E5, A5, D5 (open string + fret 2 on the next string up), G5 (low E 3 + open D) and C5 (A 3 + open G) as two-dot necks with an arrow root → 5th.
- `arpeggios`: Em arpeggio path, points exactly `[(0,0),(0,3),(1,2),(2,2),(3,0),(4,0),(5,0)]`, labels R ♭3 5 R ♭3 5 R, `sub` = `solfege(label)` (movable do from the chord root: Do, Me, Sol); plus Am and G arpeggios in position 1.
- `one-four-five`: neck frets 0–4 with path `[(0,3),(1,3),(2,0),(3,0)]` (G C D G), labels `1 4 5 1`, `sub` `Do Fa Sol Do`; second neck with path `[(0,0),(1,0),(1,2),(2,2)]` (Em Am B Em), labels `1 4 5 1`, text introducing B7 as the open stand-in for Bm; a `circle` visual explaining why 4 and 5 are the neighbours of 1.
- `pentatonic`: E minor pentatonic, frets 0–3, `scaleDots(4, [0,3,5,7,10], …)`.
- `soloing`: backing over Em ↔ Am (link to `/theory/improv` with Em settings if the improv page supports query presets; else plain link) + task.
- `move-it`: two necks: E natural minor frets 0–3, and the same shape at frets 3–6 = G natural minor (`scaleDots(7, [0,2,3,5,7,8,10], …, 3, 6)`), text: open strings become the first finger; this is the idea behind barre chords in stage 2.

- [ ] **Step 1: Failing tests:** add `"1"` to `DONE`; the `one-four-five` first neck's first path points deep-equal `[{string:0,fret:3},{string:1,fret:3},{string:2,fret:0},{string:3,fret:0}]` and their `pcAt`s are `[7,0,2,7]`; the Em arpeggio path's `pcAt`s are all in `{4,7,11}`; every `move-it` dot on the 3–6 neck has `pcAt` in G minor `{7,9,10,0,2,3,5}` and `3 <= fret <= 6`; every `pentatonic` dot `pcAt` in `{4,7,9,11,2}`.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Write the content.**
- [ ] **Step 4: Run, expect PASS;** look at `/course/1/one-four-five` and `/course/1/arpeggios` at both widths — arrows readable, arrowheads not hidden under dots.
- [ ] **Step 5: Commit** — `"Course: stage 1 content — position 1 chords, triads, 5ths, arpeggios, paths, pentatonic, move it"`

### Task 10: Stage 2 content (Position 2)

**Files:** Modify `src/features/course/stages/s2.ts`, `content.test.ts`

Pins:
- `bm-barre`: Bm with `prefer: "barre"` (A shape at fret 2, `x24432`); text: barres are hard, here's why; it's the Am shape moved up 2 (link back to `/course/1/move-it`).
- `easier-bm`: Bm7 `x20202`, small Bm `xx4432`, B7 `x21202` — use `chords` entries that resolve to those shapes (add `prefer`/`voicing` as needed; if a shape is missing from `shapes.ts`, show it as a neck with dots instead of adding a shape).
- `drop-3`: chords with `voicing: "drop 3"`: Em7, Am7 first ("you already play these"), then Bm7, Cmaj7, Gmaj7, G7, F♯m7♭5; text: drop 3 as the jazz/bossa stepping stone to barres.
- `arpeggios`: Bm arpeggio in position 2 (frets 2–5) and G arpeggio from the E shape at fret 3, with paths.
- `joining`: one neck frets 0–5 with position 1 and position 2 both shown (`window` on 2–5), G major scale dots, a path showing one way across.

- [ ] **Step 1: Failing tests:** add `"2"` to `DONE`; `drop-3` chords all resolve with `shape.v === "drop 3"` and the list starts `["Em7","Am7"]`; `lessonShape("Bm","barre")!.fret === 2`; every `arpeggios` path point in this stage has `2 <= fret <= 5` and its `pcAt` is a tone of the arpeggio's chord (Bm `{11,2,6}`, G `{7,11,2}`).
- [ ] **Step 2–4:** fail → write → pass; browser check `/course/2/drop-3`.
- [ ] **Step 5: Commit** — `"Course: stage 2 content — Bm barre, easier Bm, drop 3, position 2 arpeggios"`

### Task 11: Stage 3 content (Position 1 flavours)

**Files:** Modify `src/features/course/stages/s3.ts`, `content.test.ts`

Pins: `six-chords` G6, C6, Em6 (or D6) in position 1; `sevenths` Gmaj7, Cmaj7, D7, Em7, Am7, B7; `sus-add9` Dsus2, Dsus4, Asus2, Cadd9, Esus4; `colour-paths` revisits G → C → D → G as Gmaj7 → Cmaj7 → D7 → G with the same root path `[(0,3),(1,3),(2,0),(3,0)]` plus a second path showing the moving 7th.

- [ ] **Step 1: Failing tests:** add `"3"` to `DONE`; every chord in this stage's `chords` visuals resolves with a fret ≤ 3 (position 1); `colour-paths` contains the root path above.
- [ ] **Step 2–4:** fail → write → pass.
- [ ] **Step 5: Commit** — `"Course: stage 3 content — 6, 7, sus and add9 chords in position 1"`

### Task 12: Stages 4–6 content (up the neck, modes, other keys)

**Files:** Modify `src/features/course/stages/s4.ts`, `s5.ts`, `s6.ts`, `content.test.ts`

Pins:
- `4/d-c-a-shapes`: G major scale and G chord tones in the D shape (≈ frets 4–8), C shape (≈ 7–10) and A shape (≈ 9–13), one neck each with `window`; text ties them to CAGED and to `/theory/caged`.
- `4/one-arpeggio`: one neck frets 0–15 with the G arpeggio in all five shapes, each shape a separate path colour.
- `4/triads-everywhere`: G, C, D triads on string sets 1-2-3, 2-3-4, 3-4-5, 4-5-6; link `/theory/triads`.
- `5/modes`: `wheels` visual for Aeolian, Dorian, Phrygian vs major (plus Mixolydian from G); necks of E Dorian (C♯) vs E Aeolian in position 1 with the changed note marked.
- `5/harmonic-minor`: E harmonic minor in position 1; text: the raised 7th (D♯) makes B major / B7 the strong 5 — why B7 pulled so hard back to Em in stage 1.
- `6/moving-keys`: position 1 ideas moved to Am/C and Dm/F (necks + chord boxes); text on moving shapes as in `/course/1/move-it`.
- `6/circle-map`: `circle` visual; text: every key's 1, 4, 5 are neighbours on the circle; links to `/theory/circle`.

- [ ] **Step 1: Failing tests:** add `"4","5","6"` to `DONE`; every dot in `4/one-arpeggio` has `pcAt` in `{7,11,2}`; `5/harmonic-minor` dots have `pcAt` in `{4,6,7,9,11,0,3}` and include a D♯ (`3`).
- [ ] **Step 2–4:** fail → write → pass; browser check `/course/4/one-arpeggio` at 360px (whole neck readable, no page scroll).
- [ ] **Step 5: Commit** — `"Course: stages 4–6 content — up the neck, modes, other keys"`

---

### Task 13: Final pass

- [ ] **Step 1:** `$TSX --test src/features/course/*.test.ts src/features/theory/*.test.ts src/features/theory/course/*.test.ts` → all PASS.
- [ ] **Step 2:** `npx tsc --noEmit 2>&1 | grep -v '^.next/'` → clean; `npm run lint` → no new errors; `npm run build` → succeeds and lists every `/course/...` page as static.
- [ ] **Step 3:** Walk the course at 360px from `/course` → `0-1` first section → "Next" through to the last section of stage 1; every page loads, no horizontal scroll, panel/bar correct.
- [ ] **Step 4:** Commit any fixes — `"Course: final pass fixes"`

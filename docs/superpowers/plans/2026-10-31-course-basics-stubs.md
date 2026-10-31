# Course basics stubs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every course section gets an `about` line; ~15 planned sections (solfège basics, dexterity) are added and
shown to learners; new glossary words point at them; the autoplan link list carries the about lines; three stub tools
render "Stub exercise: …".

**Architecture:** Course content stays pure data in `src/features/course/stages/*.ts`. `about` is a required field on
`CourseSection`. Planned = no blocks (unchanged); the index and the section page render planned sections from `about`.
Stub tools follow the "Add a basic" recipe in `src/features/exercises/CLAUDE.md` and share one placeholder view.

**Tech Stack:** Next.js (app router, read `node_modules/next/dist/docs/` before touching pages), TypeScript, React,
Tailwind, `node:test` via tsx.

**Spec:** `docs/superpowers/specs/2026-10-31-course-basics-stubs-design.md`

## Global Constraints

- Tests: `TSX=~/.npm/_npx/69f9afb961c37556/node_modules/.bin/tsx`; run `$TSX --test <files>` (never `npx tsx`, it hangs).
- Type check: `npx tsc --noEmit 2>&1 | grep -v '^.next/'` must print nothing.
- Lint: `npx eslint src/features/course src/features/exercises src/features/plan src/components/course`.
- Commits go straight to main via a temp index, never `git add` in the checkout (other sessions share the index):
  `GIT_INDEX_FILE=<scratchpad>/idx git read-tree HEAD`, `git update-index --add <files>`, `write-tree`, `commit-tree -p HEAD`,
  `update-ref refs/heads/main <new> HEAD`, then `git reset -q -- <files>`. Commit message ends with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Don't push.
- Other sessions edit `src/features/plan/model/tools.ts` and `ExerciseTool.tsx` concurrently: re-read before editing,
  commit only your own files.
- Copy voice: plain, short, second person, like existing course text. No glossary forms "Do", "Mi", "Sol", "tone",
  "step", "measure" alone.
- Stub view heading text exactly: `Stub exercise: <tool name>`.
- Planned page note text exactly: `Exercises for this section are on their way.`
- Planned catalogue desc suffix exactly: ` (planned)`.
- Never hand-edit `src/features/exercises/docs/docs.generated.json`; regenerate with `$TSX scripts/gen-exercise-docs.ts`.

## Review Focus

- A glossary word inside a longer term: "12-bar" must stay the 12-bar-blues term, "barre chord" must not mark "bar",
  "root note" marks "root". Tests in Task 4.
- A planned section reached from an old (legacy) stage address still redirects and renders its about. Test in Task 2
  (`findSection` on the new slugs) plus manual check in Task 3.
- Old plans stored before this change still parse: no existing tool or link changes shape. Existing plan tests must
  stay green in Tasks 5 and 6.
- AI sends a stub tool with junk (`fingers: "1155"`, `string: 9`, `bpm: "fast"`): tool dropped or field left out, never
  a crash. Tests in Task 6.
- A section's `about` that is empty or whitespace slips through the type. Test in Task 1.

---

### Task 1: `about` on every section

**Files:**
- Modify: `src/features/course/model.ts` (CourseSection, `section()`, `TOPICS`, `TopicId`)
- Modify: `src/features/course/stages/s0.ts` … `s7.ts` (every `section(...)` call)
- Test: `src/features/course/course.test.ts`

**Interfaces:**
- Produces: `CourseSection { slug; title; topic; about: string; blocks }`;
  `section(slug: string, title: string, topic: TopicId, about: string, blocks: Block[] = []): CourseSection`;
  `TopicId` gains `"technique"`, `TOPICS` gains `{ id: "technique", label: "Technique & dexterity" }` right after `strumming`.

- [ ] **Step 1: Write the failing test** in `course.test.ts`:

```ts
it("every section says what it is about", () => {
  ALL_SECTIONS.forEach(({ stage, section }) => assert.ok(section.about?.trim().length > 10, `${stage.slug}/${section.slug}`));
});
```

- [ ] **Step 2: Run** `$TSX --test src/features/course/course.test.ts` — Expected: FAIL.
- [ ] **Step 3: Change `model.ts`** per Interfaces. Add `about` as the 4th argument of every `section(...)` call in
  all stage files: one sentence (two at most) saying what the section teaches, drawn from its existing text. The five
  existing empty stubs (`2/what-is-a-chord`, `3/intervals`, `11/ii-v-i`, `11/comping`, `11/guide-tones`) say what they
  will teach; `3/intervals` covers half steps, whole steps and the octave.
- [ ] **Step 4: Run** `$TSX --test src/features/course/*.test.ts` and tsc — Expected: PASS, no type errors.
- [ ] **Step 5: Commit** `feat(course): about line on every section`.

### Task 2: New planned sections

**Files:**
- Modify: `src/features/course/stages/s0.ts` (stages 1–4), `s1.ts` (5), `s3.ts` (7), `s4.ts` (8)
- Test: `src/features/course/course.test.ts`

**Interfaces:**
- Consumes: `section(slug, title, topic, about)` from Task 1.
- Produces: these addresses, used by Task 4's glossary: `/course/1/steady-beat`, `/course/1/spider`,
  `/course/3/home-note`, `/course/3/step-melodies`, `/course/3/do-mi-sol`, `/course/3/la-minor-home`,
  `/course/4/sing-then-find`, `/course/4/do-mi-sol-neck`, `/course/4/legato`, `/course/5/chords-from-scale`,
  `/course/5/hearing-changes`, `/course/7/ti-do`, `/course/8/do-mi-sol-shapes`, `/course/8/string-skipping`.

- [ ] **Step 1: Write the failing test**: the order of slugs per stage.

```ts
it("planned basics sit where the design puts them", () => {
  const slugs = (st: string) => COURSE.find((s) => s.slug === st)!.sections.map((x) => x.slug);
  assert.deepEqual(slugs("1"), ["strings-and-tuning", "tab-and-chord-boxes", "notes-on-e-and-a", "steady-beat", "spider"]);
  assert.deepEqual(slugs("3"), ["piano-and-guitar", "solfege", "home-note", "do-re-mi", "step-melodies", "do-mi-sol", "intervals", "hearing-do-fa-sol", "la-minor-home", "major-or-minor"]);
  assert.deepEqual(slugs("4"), ["melodies", "sing-then-find", "do-mi-sol-neck", "legato"]);
  const s5 = slugs("5");
  assert.equal(s5.indexOf("chords-from-scale") + 1, s5.indexOf("one-four-five"));
  assert.equal(s5.indexOf("hearing-changes") - 1, s5.indexOf("one-four-five"));
  const s7 = slugs("7"); assert.equal(s7.indexOf("ti-do") - 1, s7.indexOf("hearing-sevenths"));
  const s8 = slugs("8"); assert.equal(s8.indexOf("do-mi-sol-shapes") - 1, s8.indexOf("one-arpeggio")); assert.equal(s8.at(-1), "string-skipping");
  assert.equal(findSection("3", "solfege")!.section.title, "Introduction to solfège");
  ["1/spider", "4/legato", "8/string-skipping"].forEach((a) => assert.equal(findSection(...(a.split("/") as [string, string]))!.section.topic, "technique"));
});
```
(Use whatever `COURSE`/`findSection` export names `course.ts` has; check before writing.)

- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Add the 14 sections** with titles, topics and abouts from spec §2 (no blocks); retitle `solfege`.
  If `stages/s0.ts` stage "4" has a stage `intro`, leave it.
- [ ] **Step 4: Run** course tests + tsc — Expected: PASS. Check `legacy.test.ts` still passes (renumbered stage
  addresses must not collide with new slugs).
- [ ] **Step 5: Commit** `feat(course): planned basics and dexterity sections`.

### Task 3: Planned sections on the index and the page

**Files:**
- Modify: `src/components/course/CourseIndex.tsx` (`Row`, `planned`)
- Modify: `src/components/course/SectionBody.tsx` (default export)
- Possibly modify: `src/components/course/SectionPanel.tsx` if it also hides planned sections from navigation (check)

**Interfaces:**
- Consumes: `section.about`, `section.blocks.length === 0` as "planned".

- [ ] **Step 1: Index row**: every row is a `Link`. A planned row keeps the **soon** chip and shows `section.about`
  under the title in `text-xs text-slate-500` (wrap, not truncate). Written rows don't show `about`.
- [ ] **Step 2: Section page**: when `section.blocks.length === 0`, `SectionBody` renders `about` as a text paragraph
  in the same style as a `text` block, then a dimmed line `Exercises for this section are on their way.`
- [ ] **Step 3: Verify in the browser** (dev server; see memory on worktree dev/screenshots and keeping user
  localStorage): `/course` shows about lines under soon rows and they link; `/course/3/home-note` shows the about and
  note; `/course/2/what-is-a-chord` too; a written page is unchanged.
- [ ] **Step 4: Lint + tsc** — Expected: clean.
- [ ] **Step 5: Commit** `feat(course): planned sections show what they will teach`.

### Task 4: Explained words

**Files:**
- Modify: `src/features/course/glossary.ts` (`GLOSSARY`)
- Test: `src/features/course/glossary.test.ts`

**Interfaces:**
- Consumes: addresses from Task 2.
- Produces: terms (id → forms → href) exactly as spec §3, with `bar` forms `["bar"]` only (no "measure"). Write
  each `short` (one plain line).

- [ ] **Step 1: Write the failing tests**:

```ts
it("finds the basics words", () => {
  assert.deepEqual(terms(explain(["Hold the tonic as a drone, sing each scale degree, a half step then a whole step up to the octave."])[0]),
    ["home-note:tonic", "drone:drone", "degree:scale degree", "half-step:half step", "whole-step:whole step", "octave:octave"]);
  assert.deepEqual(terms(explain(["Count the beats of each bar, then the spider with alternate picking, a hammer-on, a pull-off: legato."])[0]),
    ["beat:beats", "bar:bar", "spider:spider", "alternate-picking:alternate picking", "hammer-on:hammer-on", "pull-off:pull-off", "legato:legato"]);
});
it("bar stays out of longer words", () => {
  assert.deepEqual(terms(explain(["A barre chord, then a 12-bar blues on the root note."])[0]), ["barre-chord:barre chord", "twelve-bar:12-bar blues", "root:root"]);
});
```

- [ ] **Step 2: Run** `$TSX --test src/features/course/glossary.test.ts` — Expected: FAIL.
- [ ] **Step 3: Add the terms.** If "12-bar" loses to "bar", fix the pattern ordering rather than the test.
- [ ] **Step 4: Run** glossary tests and `$TSX --test src/features/plan/model/*.test.ts` (prompt lists the words) —
  Expected: PASS.
- [ ] **Step 5: Commit** `feat(course): explained words for the basics`.

### Task 5: Link catalogue carries the about lines

**Files:**
- Modify: `src/features/plan/model/catalogue.ts` (`catalogue()`)
- Test: `src/features/plan/model/plan.test.ts`

**Interfaces:**
- Produces: course entry `desc` = `` `Course ${stage.label} · ${stage.title}: ${section.about}` `` plus `" (planned)"`
  when `section.blocks.length === 0`.

- [ ] **Step 1: Write the failing test**:

```ts
it("course links say what the article covers", () => {
  const e = catalogue();
  const home = e.find((x) => x.href === "/course/3/home-note")!;
  assert.match(home.desc, /^Course 3 · One note, three views: .+ \(planned\)$/);
  const tab = e.find((x) => x.href === "/course/1/tab-and-chord-boxes")!;
  assert.ok(tab.desc.startsWith("Course 1 · Guitar basics: ") && !tab.desc.endsWith("(planned)"));
});
```

- [ ] **Step 2: Run** plan tests — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** plan tests — Expected: PASS (existing ones too).
- [ ] **Step 5: Commit** `feat(plan): course links describe their article`.

### Task 6: Stub tools

**Files:**
- Create: `src/features/exercises/basics/finger-pattern/{finger-pattern.props.ts,index.tsx}`,
  `basics/picking-drill/{picking-drill.props.ts,index.tsx}`, `basics/legato-trill/{legato-trill.props.ts,index.tsx}`
- Create: `src/features/exercises/basics/stub.tsx` (shared `StubView`)
- Modify: `src/features/exercises/docs/docs.generated.json` (regenerated), `src/features/plan/model/tools.ts`
  (`PlanTool`, `TOOLS`), `src/features/plan/ui/ExerciseTool.tsx`, `src/features/exercises/README.md`,
  `src/features/plan/README.md`
- Test: `src/features/plan/model/plan.test.ts`, `src/features/exercises/basics/basics.test.ts`

**Interfaces:**
- Produces (`PlanTool` members, stored shapes):
  - `{ type: "finger-pattern"; fingers: string; fret: number; strings?: number[]; bpm: number }`
  - `{ type: "picking-drill"; strokes: string; notesPerString: number; strings?: number[]; skip?: boolean; bpm: number }`
  - `{ type: "legato-trill"; fingers: string; string: number; fret: number; bpm: number }`
- `StubView({ name, settings }: { name: string; settings: string[] })`: dashed-border box, heading
  `Stub exercise: {name}`, settings joined with ` · ` below.
- Each `View` builds its settings line, e.g. finger-pattern → `["fingers 1-2-3-4", "from fret 1", "all strings", "60 bpm"]`.

Parse rules (strings numbered 1–6, 6 = low E):
- `fingers` (finger-pattern): 2–4 distinct digits from 1–4, as string or number; else drop tool.
- `fingers` (legato-trill): exactly 2 distinct digits 1–4; else drop.
- `fret` 1–12: finger-pattern default 1 when missing/invalid; legato-trill required.
- `string` 1–6 required (legato-trill). `strings`: keep valid distinct 1–6, sorted descending; omit if none.
- `strokes`: 1–8 chars of D/U (case-insensitive, stored uppercase); else drop. `notesPerString` 1–4, default 4 (my call).
- `skip`: boolean only. `bpm`: 40–200, default 80 when missing/invalid (matches existing fallback).

- [ ] **Step 1: Write the props files** with `@component <name> basic` and a JSDoc starting
  `Stub: shows a placeholder until the real view exists.` then what it is for (spider and finger permutations /
  alternate picking and string skipping / hammer-on and pull-off trills) and when to use it. Document every prop
  with its range and default. Run `$TSX scripts/gen-exercise-docs.ts`.
- [ ] **Step 2: Write the failing tests** in `plan.test.ts`:

```ts
it("stub tools parse and drop junk", () => {
  assert.deepEqual(parseTool({ type: "finger-pattern", fingers: "1324", bpm: 60 }), { type: "finger-pattern", fingers: "1324", fret: 1, bpm: 60 });
  assert.deepEqual(parseTool({ type: "finger-pattern", fingers: 1234, fret: 5, strings: [1, 6, 6, 9], bpm: "fast" }), { type: "finger-pattern", fingers: "1234", fret: 5, strings: [6, 1], bpm: 80 });
  assert.equal(parseTool({ type: "finger-pattern", fingers: "1155", bpm: 60 }), null);
  assert.deepEqual(parseTool({ type: "picking-drill", strokes: "du", bpm: 90, skip: true }), { type: "picking-drill", strokes: "DU", notesPerString: 4, skip: true, bpm: 90 });
  assert.equal(parseTool({ type: "picking-drill", strokes: "DX", bpm: 90 }), null);
  assert.deepEqual(parseTool({ type: "legato-trill", fingers: "13", string: 3, fret: 5, bpm: 70 }), { type: "legato-trill", fingers: "13", string: 3, fret: 5, bpm: 70 });
  assert.equal(parseTool({ type: "legato-trill", fingers: "13", string: 9, fret: 5, bpm: 70 }), null);
});
it("stub tools are in the prompt's tool list", () => {
  const list = toolInterface().join("\n");
  ["finger-pattern", "picking-drill", "legato-trill"].forEach((n) => assert.ok(list.includes(n), n));
});
```
  Key order in the stored objects is free; `deepEqual` doesn't care.
- [ ] **Step 3: Run** `$TSX --test src/features/plan/model/*.test.ts src/features/exercises/*/*.test.ts` — Expected:
  the new tests FAIL, docs freshness test PASSES.
- [ ] **Step 4: Implement** the parses in `TOOLS`, `StubView`, the three `View`s, and their `case`s in
  `ExerciseTool.tsx`. Add a render test in `basics.test.ts` only if that file already renders views; otherwise skip.
- [ ] **Step 5: Run** the tests, tsc, lint — Expected: PASS, clean.
- [ ] **Step 6: Docs**: exercises README layer 4 lists the three stubs as "stubs, placeholder view"; plan README notes
  them where it lists tools.
- [ ] **Step 7: Verify in the browser**: paste a plan (or use a dev fixture) with one of each stub tool; each shows
  its dashed box with `Stub exercise: …`.
- [ ] **Step 8: Commit** `feat(exercises): stub tools for finger, picking and legato drills`.

### Task 7: Final check

- [ ] Run the full `npm test` file list with `$TSX --test` (copy the globs from `package.json`), tsc, lint.
- [ ] Open `/course`, a planned page, a written page, and a plan with stub tools once more.

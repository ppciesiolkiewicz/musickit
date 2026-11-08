# Studio widgets from the learning components

Date: 2026-11-08. Ticket 1 of `2026-11-08-studio-ux-tickets.md`. Areas: `src/features/stage/model` (subject, search),
`src/features/stage/render`, `src/features/teachers/studio/Palette.tsx`, and (read-mostly) `src/features/exercises`,
`src/features/plan/model/tools.ts`, `src/features/plan/ui/ExerciseTool.tsx`.

## Why

Teachers use the palette to put theory on screen in a few keystrokes. Today each variant is its own row (five pentatonic boxes,
five scale positions, seven 3-notes-per-string positions, five CAGED shapes), CAGED and pentatonic behave differently, and widgets
already on the stage are only ticks in the list: you cannot see or change their options.

The AI practice plan already has what is wanted. Its tools are the *learning components* (`scale-neck`, `position-neck`,
`arpeggio-neck`, `chord-shapes`, `staff`, `melody-singer`, `run-singer`, `interval-singer`, `interval-ears`, `note-finder`,
`click-drone`, `backing-band`, `strum-along`, `chord-backing`, `tuning-ears`, the drills...): one component each, configured only by
props (`boxes: [1,2]`, `scale`, `key`, `chord`, `enable`, `highlight`...), with every prop documented (`COMPONENT_DOCS`, regenerated
by `npm run docs:exercises`). `plan/model/tools.ts` parses a tool, `plan/ui/ExerciseTool.tsx` (`Tool`) renders one. The same
components should be the studio's widgets, so "one widget, many boxes" is just a prop.

## Goals

1. A new `Subject` kind, `tool`, holding a plan tool (`{ type, ...props }`, the plan's `PlanTool`). It renders through the plan's
   `Tool`. Existing kinds (`position`, `caged`, `neck`, `section`, ...) stay and keep working: saved stages, recordings and widget
   videos need no migration.
2. The palette lists **families**, one row each, from the learning components: Scale boxes (pentatonic / scale, `scale-neck`),
   3 notes per string and positions (`position-neck`), CAGED, Arpeggio (`arpeggio-neck`), Chord shapes, Staff, ... Which components
   are offered and under which names is a curated list in `stage/model`; the props shown come from `COMPONENT_DOCS`.
3. Choosing a family opens **step two in the same spotlight**: its main props as controls, e.g. scale and key, boxes 1 to 5 as toggles
   ("All"), chord for an arpeggio. Enter adds the widget. The rest of the props (`enable`, `highlight`, `placement`, `add`, `mute`,
   `hide`, `others`) sit in a collapsed "More" section.
4. **Add another**: a family row's "Add another …" adds a further widget of that family (two keys, two box sets side by side).
5. The spotlight's top section lists **what is on the stage**. A widget row reads "Major pentatonic · C major · positions 1, 2" (family,
   key, main props); an accordion opens the same controls to edit it in place. Props are never shown on the widget's own name beyond
   that line.
6. CAGED is offered the same way as pentatonic (same step two, same Add another, same accordion). The learning components cannot
   express CAGED (they number boxes by position, not by shape letter), so the existing `caged` subject is wrapped in the same
   step-two UI, and gains an optional `shapes: letter[]` (several letters in one widget, like `boxes`); the old `shape` still loads.
   A new `caged-neck` learning component is out of scope (a later ticket).
7. **Typing a mode or key** ("ionian", "a dorian") lists every family that takes it, one row each with its options in an accordion,
   not a flat list of variants. A hidden shortcut: nothing in the UI announces it. Typing "pent pos 2" or "e shape" still adds that
   one widget with a single Enter (anti-goal below).
8. The Key & scale master still sets the key of key-following tool widgets (via `setStageKey` / `withMaster`); a tool widget stores
   its key and scale as props plus `pinned`, as other keyed subjects do. This is the adapter between the master's `KeyChoice` and the
   components' `scale` slug and `key` string.

## Non-goals

- No layout, minimap, drag-and-drop, beta notice or inline key selector (other tickets). No key regions (ticket 9).
- Not removing Progressions or renaming labels (ticket 2).
- Not touching the AI plan's behaviour or its stored plans. Changes to the learning components must keep the plan and
  `docs.generated.json` tests green.
- Not offering every component. Only the ones that make sense on a stage; the rest can follow in ticket 7.

## Anti-goal

Making a common action slower: adding "A minor pentatonic box 1" by typing stays one search and one Enter.

## Constraints

- Follow `src/features/stage/CLAUDE.md` and `teachers/studio/CLAUDE.md`: a `Subject` is plain JSON; a new kind needs `Subject`,
  `sanitiseSubject`, `subjectTitle`, `defaultRect`, the renderer and a test; pure logic in `model/` with tests; the palette stays
  outside the recorded frame (`data-chrome`); update `spec/studio.md`.
- `stage` must stay injectable and may not import the looper, the studio page, recording or the editor. Importing `@/features/exercises`
  and the plan's tool model/`Tool` is new for `stage`: the builder should check what they pull in (the plan store, `usePlan`,
  `ExerciseSettings` wrappers, audio focus groups) and either inject it or split a plan-free `Tool` out so the stage doesn't need
  the plan's React context. The review found `Tool` is a pure switch (only the `ExerciseTool` wrapper calls `usePlan`), so split
  `Tool` into its own file, which also drops the plan store from the stage's imports. Update `stage/CLAUDE.md`'s import rule accordingly.
- The notes creator (`Palette notes`) uses the same palette; it gets the same families and on-stage list, minus camera, screen and
  audio widgets.
- Music facts (boxes, positions, CAGED forms) come from `npm run -s theory -- ...` and `lib/chordKit`, not by hand.
- AGENTS.md: this Next.js has breaking changes; read the relevant `node_modules/next/dist/docs/` guide before writing code.

## Decided

- A widget is one `tool` subject, not a group of siblings: picking boxes 1 and 2 is `boxes: [1,2]` on one widget. There is no
  grouping rule and no "All" bookkeeping: "All" just sets every box.
- Step two edits the widget's props; the accordion edits the same props on an existing widget.
- Family and prop knowledge comes from the learning components' docs where possible; only the family names, ordering, the main-props
  shortlist and CAGED handling are curated.

## My calls (change if wrong)

- "Add another" always adds an independent widget; two identical widgets are allowed.
- Search Enter always adds (as now); only a click on an already-on-stage row opens it for editing, and a remove button takes it off.
- The old per-variant palette rows go away from the catalog but their searches still resolve (to `tool` subjects).
- The plan's `Tool` is reused as is for rendering; stage-specific sizing (fit to the widget's rect) is done by the existing `FitBox`.
- Overview-style "all five CAGED boxes" stays as the existing `caged` subject with `shape: null`, offered as the CAGED family's
  first option.
- Mic-using tools (staff, singers) get the existing mic badge and the one-audio-input rule.

- **Master key and tools:** the master moves a tool widget's key (tonic) only. The scale (pentatonic, major, ...) is the family's
  own choice and never follows the master; `pinned` on a tool widget can only hold `tonic`. A tool subject stores the parsed plan
  form (`key` as a pitch class number, `scale` as a slug); the controls map to the docs' string forms.
- **Mic tools:** a `staff` or singer widget uses the studio's one audio input and the mic badge, not its own mic. If `Staff`
  needs a prop for that, add it without changing plan output.

## Left to the builder

Exact visuals and keyboard flow of step two and the accordion, the shape of the curated family list, how prop controls are chosen
from a prop's type, how a `tool` subject is named and keyed for `subjectIdentity`, test layout.

# Learning components: basics, guided exercises, and the autoplan tool layer

## Intent

AI Autoplan builds practice exercises out of "tools" (`src/features/plan/model/tools.ts`). Those tools are a closed
list, named for the plan (`band`, `comp`, `sing`), and their docs are hand-written JSON Schema. The course will need
the same pieces later, and the AI cannot yet build several things the app already does (arpeggios, singing the
melody and run books, progressions played as arpeggio fragments).

Goal: a foundation where a **learning component** is defined once, with typed props and JSDoc, and is usable by
(a) the course, (b) autoplan, (c) the prompt and debug view, all from the same source. Adding an exercise should
mean configuring components, not writing a new tool.

## Structure

Three layers.

1. **Basic components.** One purpose each, no timing logic beyond their own. The course can drop them in alone.
2. **Guided exercises.** Bundles of basics that share one clock where timing matters. They take settings.
3. **Autoplan tool layer.** A thin adapter that exposes layers 1 and 2 to the AI: input schema, parsing and
   validation of the AI's JSON, and prompt text. If a component's props are already AI-safe, its adapter is nearly
   empty. Layer 3 stays in `features/plan`; layers 1 and 2 move to a shared place (for example
   `src/features/exercises/`), so the course imports them without depending on the plan.

### Layer 0: the music timeline (added by the user)

Exercises like "G barre, root-6-root, D barre, 4th-5th-4th" mix chords and scales, so a progression alone can't
describe them. Underneath the components sits a pure, tested **timeline model** (no React): bars and beats, with
events placed on it:

- a **key / scale change** (`key`, `scale`) that holds until the next one,
- a **chord** (name, voicing open or barre),
- **steps**: `strum`, or notes as degrees counted `from: "key" | "chord"`, or absolute notes,
- optional `highlight` per event.

Views (tab, notes, neck, scale boxes) are generated from the timeline; so are the click, the playhead and the
playback. A new exercise is new timeline data, not new view code. Generators (progression to timeline, arpeggio part
to timeline, a book melody to timeline) are also pure functions in this layer.

**The AI's main interface is one component built on this**, a score / play-along (working name `play-along`): it takes
`bpm` and one `shape` (below) that the code expands into timeline events. The event timeline is internal: the AI
never writes events. (Decided with the user: hand-building events means the AI doing bar and note arithmetic, which
it does badly.) The simple basics (`scale-neck`, `chord-shapes`, `staff`, and so on) stay as they are for
single-purpose use.

**Shapes.** A model makes fewer mistakes with a short, named shape than with a long hand-built list (off-by-one
bars, a forgotten scale change). Keep the shapes few, each with one worked example in its JSDoc, so the prompt stays
small:

- `progression`: chords (or numerals in a key), bars per chord, optional repeated step template.
- `two-scales`: play in one scale, then switch to another at a bar (default: halfway), same click throughout. Each
  can have its own key: "A minor pentatonic for 4 bars, then A dorian for 4". (Renamed from `split`; it is a shape of
  `play-along`, not a component of its own.)
- `chord-steps`: per chord, a step list ("strum, 1, 6, 1" for G, then "strum, 4, 5, 4" for D).
- `arpeggio-part`: part of one arpeggio (for example 1-3, 1-3-5) over a chord or a progression, or one arpeggio connected across two neighbouring boxes (`across: [1, 2]`: up through box 1, over the seam into box 2, and back). `arpeggio-neck` takes the same `boxes` setting to show both boxes with the connecting path. Built on the arpeggio positions the arpeggios page already computes.

  **Crossing boxes (user's description, my reading).** Within a box, `part` is `"lower"` (the bass-side strings) or
  `"upper"` (the treble-side strings). A crossing goes from a part of box A to a part of box B: the usual one is
  upper to upper or lower to lower, and the two that swap, `upper -> lower` and `lower -> upper`, can reuse notes both
  boxes contain. `across` is therefore `{ from: {box, part}, to: {box, part} }`. In a `progression` the same idea
  places chords: each chord gets a box and part (`place`), so I IV V -> I IV IV can be played with the first chords in
  box A and the repeat in box B, sharing notes where the boxes overlap. The code picks the shared notes; the AI only
  names boxes, parts and the order.
- **`guide` (my reading, to confirm):** every shape and basic may carry `guide`, a short per-step cue the view shows
  as the playhead reaches it ("cross to box 2, lower part"). If omitted, the code writes a default cue from the
  crossing/step it knows (box change, chord change, scale change).
- `melody`: a tune from the singing book, as timeline events.
- `solo-over` (added at the user's request): improvising around chords. Per chord: a scale (so the scale can change
  with the chord), the chord tones to aim for (`target`, by degree, shown highlighted with the rest dimmed or
  hidden), and an optional `approach` hint ("land on the 3rd on beat 1"). The code plays the backing (click plus
  comping pattern) and shows the neck/staff with the targets lit. No fixed steps and nothing is graded: the student
  makes up the notes. Exercise ideas the text can then explain: target the 3rd of each chord, connect the chord
  tones with scale notes, one scale over all chords vs. a scale per chord, approach notes from a fret below.

Each shape is a pure function from its few inputs to events; debug can show the events a shape expanded to. If an
exercise doesn't fit any shape, the fix is a new or better shape written in code, not raw events from the AI.

**Division of work.** The AI decides what to practise: which exercise, in which order, at what difficulty, how the
week progresses. Code computes everything exact: notes, tabs, fret positions, durations. The AI never writes a fret,
a note name derived from a degree, or a duration in seconds. Example of one AI-written exercise (a `progression`
shape with a step template):

    { component: "play-along", shape: "progression", key: "G", numerals: ["I","IV","V"],
      steps: ["1","3","5"], bars: 4, bpm: 70, repeats: 6 }

- `repeats` is optional on `play-along` (loops of the whole timeline). Without it the timeline loops until the
  exercise's time runs out. (My call.) There is no `goal` field: the exercise's text sections already say what it is
  for, so a second place would drift.
- With `repeats`, the exercise's total time is derived from the timeline (bars x beats x 60 / bpm x repeats), so the
  exercise timer and the playback cannot disagree; the derived value wins over the AI's suggested minutes. Without
  `repeats`, the AI's minutes apply.

### Single source of docs

Each component's props are a TypeScript interface with JSDoc. The prompt's interface section and the debug view
are both generated from that source (the existing `toolInterface` / `offeredInterface` in `tools.ts` become
generators over the registry). Debug may show a shortened form: names, one-line description, props with types.
The prompt must stay descriptive enough for the AI to use a component well; the JSDoc is written for that reader.
How the interface is turned into JSON Schema (derived from the TS types, or written next to them and checked
against them) is left to the builder, as long as there is no second hand-kept copy.

## Common props

Every visual component takes, where it makes sense:

- `highlight`: the notes that stand out, by scale degree (as the AI writes them today: `"1" "b3" "5"`).
- `others`: what happens to the rest, `"dimmed"` (default) or `"hidden"` (muted).

This is the existing `highlight` on `scale` and `sing`, made uniform and extended to the other components.

## Basic components (layer 1)

Names are final unless the user vetoes. Where an existing tool is renamed, the old name is in brackets.

| Name | What | Built from |
|---|---|---|
| `scale-neck` [scale] | Scale or pentatonic boxes on the neck | `ScaleBoxes` |
| `chord-shapes` [chords] | Chord diagrams, tap to strum | `ChordShapes` |
| `staff` [part of sing] | Notes on a stave in a voice range; optional live mic pitch; tap to hear | `SingNotes`, `SingingStaff` |
| `click-drone` | Metronome and/or drone in a key | `features/instruments` click and drone |
| `backing-band` [band] | Click, drone, drums and bass playing along in a key | `PracticeBand` |
| `note-finder` [notes] | Fretboard-notes game | `NoteGame` |
| `interval-ears` [ears] | Interval / chord ear training | `EarGame` |
| `arpeggio-neck` (new) | An arpeggio (chord tones of a chord) on the neck, whole or part of it (for example Do-Mi, Do-Mi-Sol) | arpeggios page |
| `melody-singer` (new) | Sing a melody chosen from the singing page's melody book (`BOOK`), on `staff` with mic | `singingMelodies.ts`, `MelodyStaff` |
| `run-singer` (new) | Sing a run from the runs book (`RUNS`) | same |

`melody-singer` and `run-singer` take a book id or stage so the AI picks from predefined tunes; the JSDoc lists the
stages and what each teaches (from `STAGES` / `RUN_STAGES` titles and hints), generated from the data, not copied.

`sing` splits: the plain scale-on-stave view becomes `staff`; singing tunes and runs become the two singers.

## Guided exercises (layer 2)

| Name | What |
|---|---|
| `progression` [comp, extended] | A chord progression over a shared metronome, specified in a key as numerals (I IV V) or chord names. A few bars. Plays it for the student (patterns as `comp` has now) and/or shows what the student plays. |

`progression` settings (names are a starting point):

- `chords` or `numerals` + `key`, `bpm`, `beatsPerChord`, `bars`.
- `voicing`: `"open"` (default) or `"barre"`. Barre chord progressions are a setting here, not a separate tool.
- `play`: which part of each chord the student plays, for example `"full"`, `"arpeggio"`, or a list of chord-tone
  degrees such as `["1","3"]` or `["1","3","5"]` (Do-Mi, Do-Mi-Sol over each chord). Just a few bars.
- `view`: `"tab"` (default), `"notes"`, `"neck"`; the student can switch between them, all three show the same music
  and all follow the same playhead on the same click.
- `highlight` / `others` as above.

**Per-chord steps (added by the user).** A progression is a list of chords, and each chord can carry an ordered
list of steps, played in time on the click, so the exercise reads like:

> Strum G barre. Root, 6, Root. Strum D barre. 4th, 5th, 4th. Strum E ...

- A step is `strum` (the whole chord) or a note given as a degree.
- `degreesFrom`: `"key"` (degrees of the scale, so G over D is 4th = G) or `"chord"` (counted from the chord's own
  root, which makes arpeggios over a chord easy to configure). Default `"chord"` (my guess); settable per
  progression and per chord.
- The steps are the `play` setting, generalised: `play: "full"` / `["1","3","5"]` is shorthand for one repeated
  step list. Tab, notes and neck views show the same steps and follow the click; the neck marks where each step is
  played on the chord's shape (barre shape when `voicing: "barre"`).
- Open question for the user: in "Root -> 6 -> Root", is 6 the sixth degree (as I assume) or the sixth string?

More guided exercises (a single arpeggio part, drone with neck, and so on) are expected later; they are
configurations of the same pieces, and this design only needs to make adding them cheap.

## Autoplan tool layer (layer 3)

- One registry lists every component the AI may use. Each entry: name, JSDoc description, props interface, parse
  (checks the AI's JSON, returns null when it can't be shown), and the view.
- Sections (heading, text, list, tool, link) are unchanged.
- Plans already stored with old tool names (`scale`, `band`, `comp`, `sing`, `notes`, `ears`) must keep showing:
  parse old names to the new components. Old links and legacy sections keep working.
- The rules in the prompt (`model/prompt.ts`) are checked against the new names, for example the "sing is for short,
  focused singing" rule.

## Goals

- A new exercise = a configuration of existing components, no new tool code.
- Prompt and debug view generated from one source; no hand-listed tools elsewhere.
- Course can use layers 1 and 2 without importing from `features/plan`.
- `highlight` / `others` on most visual components.
- Names say what the thing is ("backing-band", not "band").
- Fill the gaps: arpeggios, melody singing, run singing, and the I-IV-V fragment exercise with notes / tabs / neck on
  one click.

## Non-goals

- Reworking the AI's planning logic or prompt strategy (more AI tooling work comes later).
- Building the course itself.
- New exercise content beyond the components above.

## Anti-goals

- Two copies of component docs that drift apart.
- Components that only work inside the plan flow.
- A tool per exercise idea (the thing this redesign exists to stop).
- Breaking any plan a user already has stored.

## Constraints

- Next.js in this repo has breaking changes: read `node_modules/next/dist/docs/` before writing code (`AGENTS.md`).
- `features/plan/CLAUDE.md` rules apply: pure logic in `model/` with tests, README kept up to date, `tsx --test`,
  `tsc --noEmit` and eslint on the feature. Its rule "exercise tools stay a small set, each a view with no settings
  to touch" and the single-source rule need updating to match this design.
- Nothing embedded may write the address bar (existing rule).
- Work lands on main; no worktree round trip.

## Decided by the user

- Both small basic components and bigger guided tools, with autoplan wrapping them in its own tool layer.
- `sing` splits into `staff` and singers; the singing exercise lets the AI pick from the sing page's melodies and runs.
- Barre progressions are part of the progressions tool, as a setting.
- `band` is renamed `backing-band`.
- The student switches between notes, tabs (default) and neck, synced to the metronome.
- Highlight prop, alongside shown / muted, on most exercises.
- TypeScript interfaces with JSDoc; the same source feeds the prompt and the debug view.

## Calls I made (user to check)

- The names of the other components in the table (everything except `backing-band`).
- The shared home `features/exercises` for layers 1 and 2.
- `others: "dimmed" | "hidden"` as the shown / muted switch, and highlight by degree.
- `progression` takes numerals or chord names, and barre is `voicing: "barre"`.

## Calls added after the builder check (all mine, user to check)

- **Refactoring is in scope.** Existing components (`PracticeBand`, `NoteGame`, `EarGame`, `CompPlayer`) may be
  refactored where needed so `progression` shares one clock and one click with `backing-band` / `click-drone`.
  Prefer thin wrappers first; refactor only what composition can't do.
- **Legacy mapping.** Stored `sing` becomes `staff` (with mic on), keeping scale, key, voice, notes and highlight.
  `scale` -> `scale-neck`, `chords` -> `chord-shapes`, `band` -> `backing-band`, `notes` -> `note-finder`,
  `ears` -> `interval-ears`, `comp` -> `progression` with `voicing: "open"`, `play: "full"` and `view: "neck"` (what `CompPlayer` shows
  today), with defaults for any new field. The current parsers are the contract;
  `plan.test.ts` keeps covering old shapes.
- **`highlight` / `others` scope.** Required on `scale-neck`, `staff`, `arpeggio-neck`, `melody-singer`, `run-singer`
  and `progression` (hidden = other chord tones not shown in notes / tab / neck). On `chord-shapes` highlight marks
  chord tones in the diagram if cheap, else skipped. Not on `note-finder`, `interval-ears`, `click-drone`,
  `backing-band`.
- **`progression` semantics.** The student's playing is not detected: the music is shown and played back, nothing is
  graded. `play` picks chord tones by degree and applies to open and barre voicings alike, so tab, notes and neck
  show the same pitches. "Play for the student" is a flag `listen: boolean` (default true), a few bars, looped.
- **Do-Mi-Sol** are movable-do degrees of the chord's key; `arpeggio-neck` reuses the arpeggios page's data and
  shapes, adding a `part` setting (degrees or a range) the builder designs if the page has none.
- **Commits.** Small commits; moves to `features/exercises` come as their own commit, staged with a temporary index
  (shared main checkout).
- **Prompt size.** Melody and run stages go into the prompt as id, title and hint (not the tunes), generated from data.

## Left to the builder

- How the TypeScript/JSDoc turns into prompt text and JSON Schema.
- The internal shape of the shared clock and how views follow it.
- How tabs are produced for chord fragments (the repo's chord shapes and `Tab.tsx` are the starting points).
- Migration details, file layout, tests.

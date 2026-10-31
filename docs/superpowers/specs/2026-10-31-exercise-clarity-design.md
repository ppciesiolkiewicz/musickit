# Exercise clarity: placement, visibility, teaching views, rhythm grid

Date: 2026-10-31. Area: `src/features/exercises` (components) and `src/features/plan/model` (prompt, tool parsing).

## Why

AI-written exercises in the practice plan are often wrong or hard to decode. Reviewing real exercises showed the cause
is mostly the components, not the prompt wording: when a component can't show something, the AI either crams it into
prose ("Dm7 has F and C, G7 has B and F") or guesses at a parameter it doesn't understand (a box number, a degree
string). The prompt is about to be rewritten with many good examples; this design gives that prompt the components and
rules it needs. The guiding principle: **whenever text has to carry information a tool could show, a tool option is
missing.** Fix the component, then add a rule and a wrong → right pair to the prompt.

A day is one lesson: an idea is explained once, the first time it appears that day, and later exercises build on it.

## Observed failures (the test cases)

1. "A minor pentatonic box 1 + C♯ over A7 · I–IV–I–V": chords shown as open shapes (frets 0–3), scale shown as box 1
   (fret 5). The AI can't know where a box sits on the neck.
2. "Play each chord as a 3-note shell: root on the E or A string, plus the 3rd and the 7th. Name the 3rd and 7th…":
   pure prose, no tool shows the shells or the notes.
3. "Learn each shape, then name its 3rd and 7th: Em7 G/D, A7 C♯/G…": same; no explanation of where the 3rd and 7th
   come from.
4. "The highlighted notes (C, E, F, B) are the guide tones from the two lines" over Dm7–G7–Cmaj7: says *what*, not *why*.
5. "Add the 3rd" (A minor pentatonic + C♯ over A7–D7): the scale-neck highlighted `"b3"`, lighting **C** when the text
   is about **C♯** (`"3"`). `highlight` is major-relative from the key root and not scale-aware, a trap. Also only two
   visibility levels exist (highlighted vs dimmed/hidden).
6. "Bossa thumb and fingers": no tool can show it. A step is one beat; there are no 8th-note slots and no bossa pattern.

## Goals

- The AI can place any neck view near the chords it shows, in words it can't get wrong.
- Every note on a neck or diagram has one of four visibility states, and the AI can name notes by name, not only by
  degree, so text and tool agree by construction.
- Chord-tone and voicing exercises are shown (labelled diagrams, then a note-by-note play-along), not described.
- Rhythm patterns on an 8th-note grid, played over real chords, with a few named basic presets.
- The AI can choose among teaching components, each with a clear "use when".
- A day reads as one lesson.
- A post-paste consistency check catches what slips through.

## Non-goals

- Rewriting the prompt's examples (the user is doing that separately). This design supplies rules, wrong → right pairs
  and one or two examples per new feature only.
- 16th-note grids, swing feel, groove variants beyond basics (`bossa-shuffle`, `reggae-one-drop` come later; the naming
  leaves room).
- Piano-specific views.

## Anti-goals

- The AI writing frets, tab, or note lists the app can compute (existing rule in `CLAUDE.md`; nothing here weakens it).
- Silent "fixes" that change what an exercise teaches.
- A second visibility system per component: one shared set of states everywhere.

## Design

### 1. Neck placement object

A `placement` prop on `scale-neck` and `arpeggio-neck`, and as an alternative form of `Place` in the shapes'
per-chord `place`. The AI states *how* it wants the box chosen; the code picks the box.

```ts
type Placement =
  | { by: "box"; box: number }            // today's behaviour; for exercises about the boxes themselves
  | { by: "open" }                        // the box that uses open strings (next to open chords)
  | { by: "fret"; fret: number }          // the box nearest this fret (0-15)
  | { by: "root"; string: 6 | 5 | 4 }     // the box with the root on this string (lowest such box)
  | { by: "chords" };                     // follow the chord shapes shown in the same exercise
```

- `boxes` stays for exercises that are about boxes ("connect box 1 and 2"). `placement` and `boxes` together is an
  error (drop `placement`, keep `boxes`).
- "Box" keeps today's numbering (`positionsFor` / `pentatonicPositions`).
- `by: "chords"` resolves from the exercise's `chord-shapes` or play-along chords and their voicing. For open voicings it
  equals `by: "open"`; for barre voicings it is the box containing the barre's root fret.
- One resolver, pure, in layer 2 (`cues/` or a new `placement.ts`), used by every neck view.

**Wrapper component `scale-over-chords`** (second priority, part of the teaching set in §4): one neck, the chord shape's
notes "highlighted" inside a "normal" scale box, the box placed by `by: "chords"`. Use when: "here are your chords, here
is the scale around them". Props: `scale`, `key`, `chords`, `voicing`, optional `add`.

### 2. Four visibility states

Every note drawn on a neck or chord diagram has one state:

| State | Meaning | Look |
|---|---|---|
| `hidden` | not shown | absent |
| `muted` | context only | faint |
| `normal` | part of what's practised | regular dot |
| `highlighted` | the point of the exercise | ring / accent colour |

Interface (on `scale-neck`, `arpeggio-neck`, `staff`, play-along `highlight`, and the new components):

```ts
highlight?: (Degree | NoteName)[];   // -> highlighted
mute?: (Degree | NoteName)[];        // -> muted
hide?: (Degree | NoteName)[];        // -> hidden
others?: "normal" | "muted" | "hidden"; // state of everything not listed; default "normal" when nothing is highlighted, "muted" when something is
```

- Replaces today's `highlight` + `others: "dimmed" | "hidden"`. Migrate: `others: "dimmed"` → `"muted"`. Stored plans
  keep working through `migrate.ts`.
- **Note names accepted** (`"c-sharp"`, same spelling as `add`). The AI names the note it wrote in the text; no
  translation to a degree. Degrees still work.
- **Notes in `add` are `highlighted` by default** (they are always the point: the outside note). This alone fixes case 5.
- One shared type and resolver (`visibility.ts` in layer 2) mapping each pitch class to a state; views only render it.
- The view's caption names highlighted notes by name, not degree ("C♯ lit", not "♭3 lit"), so a wrong highlight is
  visible to the reader.

### 3. Chord diagrams that teach (shells and labels)

`chord-shapes` gains:

- `voicing: "shell"`: root on the E or A string (code chooses which, by the lowest playable), plus 3rd and 7th. Works
  for 7th chords (maj7, 7, m7, m7b5); for a triad it is an error (dropped tool).
- `labels?: "finger" | "degree" | "note" | "both"`: what each dot shows. Default `"finger"` (today). `"degree"` shows 1,
  3, b7; `"note"` shows D, F, C; `"both"` shows degree on the dot and the note name under the string.
- The four visibility states (§2) apply to dots: e.g. `highlight: ["3", "b7"]` rings the guide tones, root `normal`.

**Prompt rule (case 2 and 3):** when an exercise introduces a voicing or asks to name chord tones: one or two sentences
of why → `chord-shapes` with labels → a play-along. When the student moves from note to note (a shell built note by
note, a guide-tone line, a target on the chord change), show a play-along with a `chord-steps` shape, steps as degrees
(`["1","3","b7"]`), `view: "tab"` or `"neck"`, and `guide` naming each note ("F, the 3rd"). These already exist.

Wrong → right:
- ✗ "Dm7 has F and C, G7 has B and F…" as prose only.
- ✓ why → `chord-shapes` (`voicing: "shell"`, `labels: "both"`, `highlight: ["3","b7"]`) → play-along chord-steps with guide.

### 4. Teaching components the AI chooses from

Each new component documents a one-line "use when" in its `@component` JSDoc so the prompt's tool list carries it.

| Component | Shows | Use when |
|---|---|---|
| `chord-anatomy` | one chord: diagram with labelled dots + the same notes as degrees on a one-octave row | introducing a chord or chord type |
| `chord-in-key` | the key's scale as a row of degrees, the chord's notes highlighted, its numeral (Dm7 = ii in C) | explaining where a chord comes from |
| `guide-tone-line` | 3rds and 7ths across a progression, half-step / common-tone moves drawn between chords | explaining why guide tones are the notes to target (case 4) |
| `scale-over-chords` | §1 wrapper | showing the scale around the chords |

All are pure derivations (no AI-written notes), in `basics/<name>/`, registered per the "Add a basic" rule.

**Day as a lesson.** Plan schema additions:
- `day.lesson?: string`: 1–3 sentences shown above the day's exercises: the idea of the day and why.
- `exercise.buildsOn?: number`: index of an earlier exercise that day. When set, the exercise shows "Builds on: <title>"
  and the prompt tells the AI to skip re-explaining (no repeated diagrams for the same chords).

Prompt rules: every exercise's first section says *why* in one sentence ("Guide tones move by a half step or stay put,
so they make the changes audible"). The first exercise of a day to use an idea explains it with a teaching component;
later ones set `buildsOn` and refer back.

### 5. Rhythm grid with grooves

A new play-along shape `rhythm`:

```ts
interface RhythmShape {
  shape: "rhythm";
  key?: string;
  chords: string[];                 // one per bar, cycled to fill bars
  bars: number;
  voicing?: Voicing;
  grid: "8th";                      // only 8ths for now
  // either a preset...
  groove?: GrooveId;
  // ...or lanes: one char per slot, "x" hit, "." rest, "m" muted hit; 8 slots per 4/4 bar
  lanes?: { bass?: string; chord?: string; down?: string; up?: string };
  technique?: "fingerstyle" | "pick";
}
```

- Lanes are **what is heard**: `bass` (root, or 5th on alternating hits), `chord` (upper strings), `down` / `up`
  (strummed). The notes come from the bar's chord; the pattern stores only *who plays when*.
- `technique: "fingerstyle"` makes the view label `bass`/`chord` as "thumb"/"fingers"; `"pick"` shows ↓ ↑ arrows.
- View: a grid with the count `1 & 2 & 3 & 4 &` above the lanes, the current slot lit by the play-along clock.

Starter presets (`style-variant` names so variants can be added later):

| Preset | Lanes |
|---|---|
| `straight-quarters` | down `x.x.x.x.` |
| `straight-eighths` | down `x.x.x.x.`, up `.x.x.x.x` |
| `folk-basic` (D DU UDU) | down `x.x...x.`, up `...x.x.x` |
| `bossa-basic` | bass `x...x...`, chord `x..x..x.` (fingerstyle) |
| `reggae-basic` | chord `..m...m.` (short muted chop on 2 and 4, pick) |
| `travis-basic` | bass `x.x.x.x.`, chord `.x.x.x.x` (fingerstyle) |

Presets are checked by a test against a hand-written expected slot list, not by eye. The prompt's examples include
`bossa-basic` as a preset and one pattern written as lanes, so the AI learns both forms.

### 6. Consistency check after paste

Runs in `src/features/plan/model` after parsing. Each finding names the day, exercise and problem. Checks:

- A note named in the text (C♯, "the 3rd of A7") is shown in the tool right after it (in the scale, `add`, or
  highlighted).
- Highlighted notes are a subset of the notes shown.
- Every chord named in the text appears in a chord tool in that exercise.
- A neck view's box is near the chord shapes shown (open chords + a box above fret 4 = finding; suggest `by: "open"`).
- A rhythm lane has 8 slots per bar; an exercise talking about "and" counts or a named groove has a rhythm tool.
- An exercise without a why sentence (first section not text).

Output: a findings list shown after paste, with a **copyable fix-it message** to paste back into the AI. Only lossless
corrections are applied silently (e.g. `"dimmed"` → `"muted"`, both `placement` and `boxes` → keep `boxes`); anything
that changes what's taught is reported, never auto-changed.

### 7. Prompt: "Common mistakes" section

Short wrong → right pairs, one per failure above, added to `prompt.ts` after "Rules for good exercises". Kept compact
so the coming example-rich prompt can absorb it.

## Order

1. Visibility states + note-name highlights + `add` auto-highlighted (fixes the live bug, case 5).
2. Placement object (case 1).
3. Rhythm shape + presets (case 6).
4. `chord-shapes` shell + labels, and the prompt rules for cases 2–3.
5. Teaching components, `lesson` / `buildsOn` (case 4).
6. Consistency check + fix-it message.
7. "Common mistakes" prompt section (grows with each step above).

## Calls I made (not discussed)

- Lanes stored as `bass`/`chord`/`down`/`up`; "thumb"/"fingers" is display only.
- Shells: diagrams show them as held chords; the play-along plays them note by note.
- Labels: AI picks `degree` / `note` / `both`; `both` recommended in the prompt for naming exercises.
- Consistency check: report + fix-it message; silent fixes only when lossless.
- `others` default flips to `"muted"` when something is highlighted (today's "dimmed" behaviour, renamed).
- **Degree meaning unchanged** (no stored-plan rewrite): key-relative on `scale-neck`/`staff`, chord-relative on
  `arpeggio-neck`, chord diagrams and play-along, as today. Note names are absolute pitch classes and mean the same
  note over every chord. The prompt steers scale-neck highlights to note names; the case-5 trap is closed by `add`
  auto-highlighting plus the caption naming lit notes.
- **`add` auto-highlight does not trigger the muted default**: a scale-neck with only `add` keeps the scale `normal`,
  so existing plans look the same apart from the added note gaining a ring. Only explicit `highlight` mutes the rest.
- **Shell string across a progression**: the first chord takes the lowest playable shell; each next chord takes the
  6th- or 5th-string shell closest in fret to the previous one (smooth voice leading). `by: "chords"` follows the result.
- **`"shell"` is a general `Voicing` value** (`"open" | "barre" | "shell"`), accepted by `chord-shapes` and every
  play-along shape, so the note-by-note play-along matches the diagrams. Cues and voicing lookup in `cues/voicing.ts`
  gain the shell case.
- **`by: "chords"` with mixed chords**: on a play-along, each chord gets its own box (per-chord, like `place`). On a
  single neck view, the box nearest the first chord; if the chords span more than 5 frets, the consistency check
  reports it.
- **Rhythm makes sound**: the play-along plays the pattern with its usual instrument and click. `bass` plays the
  voicing's lowest note, `chord` the top three strings, `down`/`up` strum the full voicing with the strum gap in that
  direction, `m` is a short dead click. Steps gain half-beat timing in the timeline and scheduler (`at`, `beats` already
  take fractions in beats; the rhythm shape expands to events at 0.5-beat slots).
- **Consistency check runs on paste only**, not on stored plans. Saving is allowed with findings; they stay visible in
  the paste step until the user pastes a fixed version or dismisses them.

## Left to the builder

File layout inside layers, view styling of the four states, the grid's visual design, how text-note detection parses
note names and degree words, migration details for stored plans.

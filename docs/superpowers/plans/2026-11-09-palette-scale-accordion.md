# Palette: one Scale family, families as inline accordions

Date: 2026-11-09. Follows `2026-11-08-studio-tool-widgets.md` (spec: `../specs/2026-11-08-studio-widget-families-design.md`).
The user's feedback: no step-two page, no "Add another" rows, no "On the stage" section. A family row opens in place in the
palette list: its options, **Add to stage**, then that family's widgets on the stage (edit in place, ✕). One **Scale** family
replaces Pentatonic boxes, Scale positions, 3 notes per string, Fretboard and Fretboard positions.

## Mapping (Scale family, `id: "scale"`)

| View | Style | Subject |
|---|---|---|
| Positions | Pentatonic / Scale | tool `scale-neck` with `boxes` (pentatonic slug from the key's quality, or the mode slug) |
| Positions | 3 notes per string | `position` (`3nps`, one position: the `position` toggle keeps one, `max: 1`) |
| Whole neck | – | `neck` |
| Overview | – | `section: "guitar"` |
| Intervals within each mode | – | plugin `scale` (compact) |
| Relative modes | – | `section: "relatives"` |

- Controls: `view` (choice), `style` (choice, shown for Positions), `boxes` (multi 1–5 + All, Positions + Pentatonic/Scale),
  `position` (multi 1–7, `max: 1`, Positions + 3nps). A control may have `when(values)`; `visibleControls(f, values)` filters.
- `read` covers every subject above plus the old `position` kinds `pentatonic` / `scale` (saved stages): they show as Positions.
  A hidden value `scale` (a tool's slug) keeps an unusual pentatonic (blues, In…) while the style stays Pentatonic.
- `update` (new optional `Family.update`): the widget's key as a `KeyChoice` (keyed: its key; tool: its tonic and the mode its
  slug names, a pentatonic its host mode), made afresh with the merged values; pins carried (keyed → tool keeps only `tonic`;
  tool → keyed carries `tonic`); a tool → tool change keeps the "More" props. Switching View swaps the layer's subject (`swap`
  keeps id and rect). No data migration: nothing saved changes.
- Row text: `Scale · C major · pentatonic, 1–2`, `· scale, 1, 3`, `· 3 notes per string, 4`, `· whole neck`, `· overview`,
  `· intervals within each mode`, `· relative modes`. Titles of the non-tool subjects stay their own (`Fretboard · Dorian`), with
  two renames from ticket 2: plugin `scale` → **Intervals within each mode**, section `relatives` → **Relative modes**.
- `moreProps(f, values?)`: the "More" props of the tool the values make (`Family.toolFor`); none for the non-tool views.

## Tasks

**A. Model** (`stage/model/families.ts`, `search.ts`, `subject.ts`, `index.ts`; tests first)
- `families.ts`: replace `pentatonic`, `scale-positions`, `three-nps` with `scale`; `FAMILIES` = scale, caged, arpeggio,
  chord-shapes, staff. Add `FamilyControl.when`, `Family.update`, `Family.toolFor`, `Family.hidden`, `visibleControls`. `stepValues(f, key)` (no `another`).
- `search.ts`: one `fam(id)` row per family (no "Add another"); the catalog drops the Fretboard, Fretboard positions,
  Relative modes and Intervals rows (they are Scale views). Search keeps them as Scale variants ("fretboard", "same notes",
  "intervals"), plus pentatonic boxes 1–5, scale positions 1–5, 3nps 1–7, with their own labels ("Pentatonic box 2").
- `subject.ts`: `PaletteResult` `family` action loses `another`; the two renames.
- Tests (`families.test.ts`): `the families, in the palette's order`; `the Scale family maps each view to its subject`;
  `every Scale subject reads back as the Scale family, old position kinds too`; `switching View converts the subject, keeping key and pins`;
  `a pentatonic widget keeps its unusual pentatonic while the style stays`; `style and position controls show only for Positions`;
  `3 notes per string keeps one position`; existing pentatonic/scale/3nps tests rewritten on `scale`.
- Tests (`search.test.ts`): catalog has one row per family, no Add another, no neck/guitar/relatives/intervals rows;
  `a pentatonic` offers `family:scale` and boxes 1–5; `fretboard`, `same notes`, `intervals` still find their widgets; key-only lists the five families.

**B. Palette UI** (`teachers/studio/Palette.tsx`, `FamilyStep.tsx`)
- No `step`, no Back, no On the stage section. State: `expanded` (family id + key + values + More text), `editing` (layer id).
- A family row is an option with `aria-expanded`; clicking it (or Enter) expands it in place; Enter on the expanded row (focus
  in the search) adds. Below it a `role="group"`: `FamilyStep` (visible controls), **Add to stage**, then the family's widgets
  (`describeSubject`), each with an edit toggle (`FamilyEditor`, live as today) and ✕. Collapsed rows show a count.
- Esc: collapse first, then close. Typing collapses; a key-only search ("ionian") opens its first family.
- `FamilyEditor` commits pending typed text on unmount (Esc, collapse, close). Enter on an option chip submits (adds in the add
  form, applies in the editor); Space toggles. Footer hint says so.

**C. Docs**: `spec/studio.md` (palette, families), `stage/CLAUDE.md` (renderer bullet), tickets doc (ticket 1 rework, ticket 2
renames partly done).

## Verify
`tsx --test src/features/stage/**/*.test.ts src/features/plan/model/*.test.ts src/features/exercises/**/*.test.ts`, `npx tsc --noEmit`,
eslint on changed files; browser at `/teachers/studio` and `?notes=1` with Playwright (dev server `--webpack -p 3124`).

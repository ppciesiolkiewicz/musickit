# Music Kit — Guitar Tools

Three pages built on a shared theory library in `src/lib/chordKit/`. All of them are scale-degree oriented: shapes are labelled with intervals (R, ♭3, 5, ♭7 ...), not fingers.

## Routes

| Route | Purpose |
|-------|---------|
| `/theory/chords` | Chord explorer with three tabs: **Shapes**, **In a key**, **Progressions** |
| `/theory/triads` | Closed triads and inversions by string group |
| `/theory/scales?key=N` | All 21 modes in the chosen key: every scale degree and note, step pattern, relative major/minor and sibling modes, link to each mode page |
| `/theory/scales/[slug]?key=N` | One mode: key picker, relatives, every chord with its notes |
| `/theory/caged` | The CAGED system, major and minor: the five chord forms (C A G E D) in any key, the fret box around each, and its chord, arpeggio, scale and pentatonic as toggleable layers, plus other chords that sit in the box |
| `/theory/arpeggios` | Arpeggios over any key and any of the 21 modes, on the whole neck |

## Chord explorer (`/theory/chords`)

- **Shapes**: 90 movable shapes (`shapes.ts`), grouped by root string (6th first) then chord type (major above minor). One card per shape.
- **In a key**: pick key, scale family and mode. Each shape is listed once with every chord of the key it plays, its degree/roman numeral, the mode it belongs to, and the degree of each chord tone. A chord strip above filters shapes to one degree and plays the chord.
- **Progressions**: 30 progressions in modes, shown as an accordion. Sectioned forms (A / B / turnaround / side trips with ×N repeats and voicing preferences such as drop 3) include the "tune in G". Each opens to: the form, shapes to use per chord, and neck diagrams over frets 0–17 with the shortest move between chords. Interactive: play the main form with a tempo slider, toggle chords on the neck, focus one chord.
- **Tags**: multi-select rows Difficulty, Style, Shape, Mode, Degree. OR within a row, AND between rows. Counts show how many shapes a tag would give. Default: easy + medium.
- **Card interactions**: tap the diagram to hear it, slide the root fret, tap a placed chord to jump to its fret, tap tags to filter, ℹ︎ explainers, collapsible sections with collapse/expand all.

Difficulty is derived from the fingering (fret span, barre, muted gaps, number of distinct frets). `fit` lists every mode (from the chord root) that contains all chord tones.

## Triads (`/theory/triads`)

Choose root, triad quality (major, minor, diminished, augmented) and string groups (6-5-4, 5-4-3, 4-3-2, 3-2-1). For each group the three inversions are generated, not tabulated: every fret combination whose notes are the chord tones in the inversion's order, inside one octave and within a 4-fret span. Tap a voicing to hear it.

## Mode pages (`/theory/scales/[slug]`)

Key picker at the top (stored in `?key=` as a pitch class). Shows the scale coloured by degree, step pattern, relative major/minor (major family), parent scale, differences from the parallel major/minor, and links to the other modes with the same notes. Every diatonic chord lists its stacked notes (R 3 5 7, optionally 9 11 13) coloured by scale degree (1 white, 2 teal, 3 amber, 4 lime, 5 blue, 6 violet, 7 rose), so a note keeps one colour in every chord. Tap a chord to hear it.

## Arpeggios (`/theory/arpeggios`)

Pick key and mode (all 21), then an arpeggio on any scale degree: one row of types, the scale's own triad, 7th or 9th chord, or any other quality (major, minor, dim, aug, maj7, 7, m7, m7♭5, dim7, m(maj7)) on that root. The neck (frets 0–17) shows the arpeggio as large dots with the root ringed in white, and optionally the rest of the scale as small rings; both are coloured by scale degree, using the same palette as the mode pages. Notes outside the scale get a dashed red outline. Options: fret-window positions, labels (note names, scale degrees or chord tones), 1 or 2 octave playback, tap any note to hear it. Logic is in `arpeggios.ts`.

## Library layout

```
src/lib/chordKit/
├── shapes.ts        shape data and types
├── theory.ts        modes, spelling, chords on each degree, key context
├── shapeTools.ts    difficulty, mode fit, fret math, tags and filtering
├── progressions.ts  progression data, resolving into keys, neck positions
├── triads.ts        generated triad voicings
├── scales.ts        mode pages, relatives, degree colours
├── arpeggios.ts     arpeggio notes and neck map
├── playback.ts      strumming through audio.ts, MIDI names via tonal
└── *.test.ts        tests
```

Every filter and option has an (i) button explaining it in plain language.

Run the tests with `npm test` (uses `npx tsx`; `chordKit.tonal.test.ts` also needs the dependencies installed).


## CAGED (`/theory/caged`)

- `lib/chordKit/caged.ts` holds the logic. Each of the five forms is stored as fret offsets from its root fret (major: C A G E D; minor: Cm Am Gm Em Dm). `cagedBoxes(root, quality)` places each form at its lowest playable position and returns the boxes ordered up the neck (the order is always C A G E D, rotated to start where the key falls).
- A box's fret window is the chord shape's span plus one fret either side, so neighbouring boxes overlap and the five cover the neck.
- Layers inside a box: the chord shape itself, the arpeggio (triad or 7th), the pentatonic (major or minor) and the scale (major, or natural minor). Dot size shows the layer (chord and arpeggio largest, then pentatonic, then scale rings); colour is the scale degree, as on the other pages.
- Related chords come from the chord explorer's shape library: easy and medium shapes on the same root whose every note lies inside the box.
- `ChordDiagram` now draws open strings above the nut, which the open CAGED shapes need.

## Sus and extension bubbles

`ChordBubbles` (from the original Modes tab) draws one hub per chord of the selected mode: the chord with its Roman numeral, its own tones (1 3 5 7) above it, the scale notes 2, 4, 6 and 7 above its root around it, and the sus and extension chords each one gives (Em through its M2 gives Esus2 and Em9). Dashed outlines mark clashing tones. It appears on every mode page and inside the Chords "In key" tab for the chosen mode.

## Comparing modes and degree badges

- `/theory/scales` has a **Compare modes** matrix (`modeGroups.ts`, `ModeCompare.tsx`). Choose a group (the modes of one parent scale, or every mode with a major, minor, diminished or augmented tonic chord). Rows are modes ordered brightest to darkest; columns are notes in semitones above the tonic. Columns every mode has are the shaded **core**; the other columns show where subsets of modes overlap, and the outlined circles are what each mode adds.
- **Degree badges** (`Fretboard.tsx`, shared by both necks): a tiny circle on a fretboard dot giving its scale degree (1, ♭3, 5), coloured by degree. On by default on the CAGED boxes and the arpeggio neck whenever dots are labelled with note names; toggle with "Degree badges".

# Music Kit — Guitar Tools

Three pages built on a shared theory library in `src/lib/chordKit/`. All of them are scale-degree oriented: shapes are labelled with intervals (R, ♭3, 5, ♭7 ...), not fingers.

## Routes

| Route | Purpose |
|-------|---------|
| `/chords` | Chord explorer with three tabs: **Shapes**, **In a key**, **Progressions** |
| `/triads` | Closed triads and inversions by string group |
| `/scales` | Index of the 21 modes |
| `/scales/[slug]?key=N` | One mode: key picker, relatives, every chord with its notes |

## Chord explorer (`/chords`)

- **Shapes**: 90 movable shapes (`shapes.ts`), grouped by root string (6th first) then chord type (major above minor). One card per shape.
- **In a key**: pick key, scale family and mode. Each shape is listed once with every chord of the key it plays, its degree/roman numeral, the mode it belongs to, and the degree of each chord tone. A chord strip above filters shapes to one degree and plays the chord.
- **Progressions**: 30 progressions in modes, shown as an accordion. Sectioned forms (A / B / turnaround / side trips with ×N repeats and voicing preferences such as drop 3) include the "tune in G". Each opens to: the form, shapes to use per chord, and neck diagrams over frets 0–17 with the shortest move between chords. Interactive: play the main form with a tempo slider, toggle chords on the neck, focus one chord.
- **Tags**: multi-select rows Difficulty, Style, Shape, Mode, Degree. OR within a row, AND between rows. Counts show how many shapes a tag would give. Default: easy + medium.
- **Card interactions**: tap the diagram to hear it, slide the root fret, tap a placed chord to jump to its fret, tap tags to filter, ℹ︎ explainers, collapsible sections with collapse/expand all.

Difficulty is derived from the fingering (fret span, barre, muted gaps, number of distinct frets). `fit` lists every mode (from the chord root) that contains all chord tones.

## Triads (`/triads`)

Choose root, triad quality (major, minor, diminished, augmented) and string groups (6-5-4, 5-4-3, 4-3-2, 3-2-1). For each group the three inversions are generated, not tabulated: every fret combination whose notes are the chord tones in the inversion's order, inside one octave and within a 4-fret span. Tap a voicing to hear it.

## Mode pages (`/scales/[slug]`)

Key picker at the top (stored in `?key=` as a pitch class). Shows the scale in rainbow colours, step pattern, relative major/minor (major family), parent scale, differences from the parallel major/minor, and links to the other modes with the same notes. Every diatonic chord lists its stacked notes (R 3 5 7, optionally 9 11 13) coloured by scale degree, red (1st) to violet (7th), so a note keeps one colour in every chord. Tap a chord to hear it.

## Library layout

```
src/lib/chordKit/
├── shapes.ts        shape data and types
├── theory.ts        modes, spelling, chords on each degree, key context
├── shapeTools.ts    difficulty, mode fit, fret math, tags and filtering
├── progressions.ts  progression data, resolving into keys, neck positions
├── triads.ts        generated triad voicings
├── scales.ts        mode pages, relatives, rainbow colours
├── playback.ts      strumming through audio.ts, MIDI names via tonal
└── *.test.ts        tests
```

Run the tests with `npm test` (uses `npx tsx`; `chordKit.tonal.test.ts` also needs the dependencies installed).

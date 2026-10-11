# Music Kit — Cheatsheet builder (the creator)

Page: `/cheatsheet` ("Cheatsheet" on the right of the top nav, before the Looper), full width like the looper: the board runs edge to edge, the key bar and plugin chips keep the page padding. `/creator` and the old `/theory/cheatsheet` redirect there, keeping their query. Code: `src/features/creator`. Rules: `src/features/creator/CLAUDE.md`.

## What it is
Every theory page as a plugin (panel) on one board, all following one key. One key selector sits on top (a tonic, a scale family and a mode); every plugin follows it. The key can be empty ("Any"): each plugin then shows a general page about its subject.

Each plugin has a **compact** view (a cheatsheet card) and, for the plugins that come from a theory page, a **full** view: that page itself, started on the board's key. The **Full / Compact** button next to the panel's title switches them. Switching to full grows the panel to at least 960 x 680 (never shrinks it). Views are saved in `musickit.creator.views`. A full view keeps its own pickers; changing the board's key starts it again on the new key. With no key the full views start on C.

## Key
`KeyChoice { tonicPc: number | null, family, mode }`. Chosen with the tonic chips, the family and mode selects, or by a plugin (the circle of fifths). Shown with its notes and key signature (the signature of the parent major scale, for the major family). Kept in the URL (`?key=7&family=0&mode=1`, so a link shares it) and in `musickit.creator.key`.

## Plugins
| Plugin | With a key | With no key |
|---|---|---|
| Scale | the notes, spelled and coloured by degree, steps, formula, signature, mood and use; plays | the 21 modes as formulas; choosing one sets the mode |
| Chords | a triad and a seventh on each degree with numerals and notes; click to hear | the common chord types with formulas, heard on C |
| Circle of fifths | the key marked, with IV, I, V and ii, vi, iii lit; click any key to choose it | the full circle as a key chooser |
| Keys | a piano with the scale marked in degree colours; click to play | a plain piano, click to play |
| Progressions | written progressions for the mode, in the key, with numerals; plays | the mode's progressions as numerals, played from C |
| Modes | the modes that share the key's notes; click to move there, and how it differs from major and minor | the major modes from bright to dark |
| Triads | the triad on a chosen degree in root position and both inversions on one string group (cycled with the strings button); click to hear | C major |
| CAGED | the five CAGED shapes of the tonic chord (minor forms when the key has a minor 3rd), with fret boxes, pentatonic and scale notes | C major |
| Arpeggios | the triad, 7th or 9th arpeggio on every degree, notes with chord tones; click to hear | C major |
| Improvisation | an interference rhythm (a against b) and a motive with its reverse, mirror and rotations, spelled in the key | the motive as scale degrees |
| Tunings | an instrument and tuning, its open strings to hear; the strings that are notes of the key lit, with a count | the tuning's note |

Full views: Scale → the mode page (`/theory/scales/[slug]`), Chords → the chord explorer (on its In a key tab when a key is set), Circle of fifths → the circle page (picking a key there sets the board's key), Progressions → the progressions accordion (opened on the mode's first one), Modes → the scales index, Triads, CAGED, Arpeggios, Improvisation, Tunings → their pages. Keys has no full view.

## Board
Plugins are widgets (`features/widgets`): drag by the header, resize from the corner, close with the ×. They stay inside the board; the board's height is adjustable. Switch plugins on and off with the chips; the arrange button tiles them. Open plugins: `musickit.creator.plugins`; layout and height: `musickit.creator.board`.

## Adding a plugin
Write a component in `plugins/` that uses `useCreatorKey()` and handles `ctx === null`, then add it to `plugins/registry.tsx`. For a full view, add a wrapper in `plugins/full.tsx` that starts the page component on the key, and set `Full` in the registry.

## Where things live
- `features/theory`: modes, key contexts, chords of a key, progressions, labels (shared with the guitar pages and the games)
- `features/sound`: playing notes
- `features/widgets`: the board
- `features/theory/circle.ts`: circle of fifths maths (shared with `/theory/circle`)
- `components/chordKit`, `components/improv`, `components/theory`: the theory pages used as full views
- `features/creator/model`: key choice, voicings, general content (tested)

## Canvas

The plugins sit on a canvas that fills the window below the plugin buttons. It is larger than the screen (8000 x 6000): zoom with the buttons or Ctrl/Cmd and the wheel (15% to 200%), pan with the wheel or by dragging empty space, fit shows every plugin, and the (i) button explains this. Layout and view are saved in `musickit.creator.board`.

Plugins resize from all four corners and can be dragged anywhere on the canvas, including up and left of where they start; a plugin switched on later appears where you are looking.

# Music Kit — Creator

Page: `/creator`. Code: `src/features/creator`. Rules: `src/features/creator/CLAUDE.md`.

## What it is
Music theory as plugins. One key selector sits on top (a tonic, a scale family and a mode); every plugin follows it. The key can be empty ("Any"): each plugin then shows a general page about its subject.

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

## Board
Plugins are widgets (`features/widgets`): drag by the header, resize from the corner, close with the ×. They stay inside the board; the board's height is adjustable. Switch plugins on and off with the chips; the arrange button tiles them. Open plugins: `musickit.creator.plugins`; layout and height: `musickit.creator.board`.

## Adding a plugin
Write a component in `plugins/` that uses `useCreatorKey()` and handles `ctx === null`, then add it to `plugins/registry.tsx`.

## Where things live
- `features/theory`: modes, key contexts, chords of a key, progressions, labels (shared with the guitar pages and the games)
- `features/sound`: playing notes
- `features/widgets`: the board
- `features/creator/model`: key choice, circle maths, voicings, general content (tested)

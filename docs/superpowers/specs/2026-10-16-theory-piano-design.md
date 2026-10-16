# Theory Piano: a playable piano with a live staff

## Intent

A practice page in the theory section where you play a piano (mouse, computer keyboard or MIDI keyboard) and a grand staff above it shows what you played *in the key you chose*: the key signature, the note names spelled for that key, each note's scale degree, the interval from the previous note, and the chord name when notes sound together. The point is to connect "what my fingers did" to "what that is in theory" while it happens, instead of reading it off a chart afterwards.

The existing chromatic `Piano` (`src/features/sound/keyboard/Piano.tsx`) already does key/scale highlighting, degrees on keys, computer-keyboard mapping and MIDI input. This page builds on it. Its look is then redone to match the rest of the app.

## Goals

1. New page `/theory/piano`, listed in the **Practice** group of `THEORY_SECTIONS` (`src/features/theory/sections.ts`), rendered in `PageShell` with a `Lesson` intro like the other practice pages (e.g. `src/app/theory/drone/page.tsx`).
2. A **grand staff** (treble + bass) above the piano.
3. **Key signature** pinned at the left of the staff, always in the same place. Changing the key changes the signature immediately.
4. A fixed **"now" spot** near the right of the staff. Whatever is currently being played lands there, drawn a little larger than the trail.
5. A **trail** to the left of "now": the previous steps, oldest furthest left, fading with age. Its length is a code constant (`TRAIL_LENGTH`, default 4, counting the "now" step or not is the builder's call but must be one obvious constant). It is not a UI control.
6. **Interval lines**: a dashed line between every pair of neighbouring steps, including into "now", labelled with the interval (m2, M3, P4, TT, P5, … ; compound intervals above an octave as M9, M10 etc.). Lines and labels fade with their notes; the line into "now" is the brightest.
7. **Labels under each note**, below the staff: note name on top, scale degree directly under it (user chose the "stacked" mockup). The "now" labels are larger/brighter.
8. **Chords**: notes sounding together appear stacked on one stem at "now", with the chord name and its Roman numeral in the key, e.g. "D major · I in D". Each chord note still gets its degree.
9. **Key choice**: pick tonic and scale/mode as on the existing piano; the keys of the scale are highlighted on the piano and show their degree, as today.
10. **Piano redesign** (do last): restyle `Piano` to fit the current app design; the change applies everywhere `Piano` is used (today: this new page and the looper's instrument panel).

## How it behaves (decided)

- **Step rule.** Every key *press* is a new step. "Now" shows *all notes currently held*. On a press, the previous "now" picture slides back into the trail and "now" becomes the held set including the new note. So pressing C, then E while holding C, then G while holding both leaves the trail `C → C+E` behind `C+E+G` at "now".
- **Notes struck together are one step** (Claude's call, follows from "recognise chords if notes are played at the same time"). Presses arriving within a short window (about 30–50 ms, a constant) merge into a single step, so a chord struck on MIDI or several computer keys at once lands at "now" as one chord, not as a C → C+E → C+E+G build-up. Presses further apart follow the step rule above.
- **Interval into a new step** is measured from the previous step to the newly pressed note (C+E → C+E+G shows m3, E to G). When the previous step is a chord and a single new note follows, measure from the chord's lowest note (builder may refine; keep it predictable).
- **Release.** Not important to the user. Sensible default: releasing does not create a step; "now" keeps showing the last thing played until the next press (or shrinks to what's still held — builder's call, pick one and keep it consistent).
- **Spelling follows the key.** Note names on the staff and in labels use the key's spelling (B♭ in F major, not A♯). Accidentals already in the key signature are not repeated on noteheads; notes outside the key get the accidental (♮, ♯, ♭) drawn on the staff.
- **Degrees count against the chosen scale** (Claude's call). In C minor, E♭ is "3" and the E♭ chord is "III"; in C major, E♭ is "♭3" and the chord "♭III". Notes outside the scale get an accidental relative to a scale degree: ♭7, ♯4, ♭3. Roman numerals follow (♭VII, ♭III). The degrees printed on the piano keys must use the same numbering as the staff.
- **Spelling of notes outside the key** (Claude's call). When the held notes form a recognised chord, spell its tones from the chord root (E major in C major is E G♯ B, so G♯ is "♯5", not A♭). For a single note or no recognised chord, use a fixed per-key table: ♭2 ♭3 ♯4 ♭6 ♭7 relative to the tonic, shifted to fit the scale (for example, in minor the raised 6th and 7th are ♮6 and ♮7). Each trail step stores the spelling it was drawn with, so it does not change later.
- **Tonic spelling and signature** (Claude's call). The tonic picker offers 12 pitch classes. For the chosen tonic and scale, the page uses the enharmonic spelling whose key signature has fewer accidentals: G♯ minor (5♯), not A♭ minor (7♭); E♭ Dorian (parent D♭, 5♭), not D♯ Dorian; E♭ minor over D♯ minor. On a tie (F♯/G♭ major), use F♯. The tonic's displayed name follows the chosen spelling.
- **Other scales** (Claude's call):
  - **Modes:** the parent major's signature.
  - **Harmonic and melodic minor:** the natural minor signature, with the raised notes drawn as accidentals.
  - **Pentatonic and blues:** the parent major or minor signature. Degrees are numbered as in the parent scale, so A in C major pentatonic is "6". Notes of the parent scale that are missing from the pentatonic (F, B in C) still count as in the key for spelling and degree, but are not highlighted on the piano.
  - **Chromatic or no scale:** no key signature. Degrees are counted relative to the tonic's major scale. Chord names are shown without numerals.
- **Chord recognition** (proposed by Claude, user agreed):
  - Use `@tonaljs/tonal` (already a dependency) chord detection over the held pitch classes, bass = lowest held note.
  - Inversions shown as slash chords: "C/E" with the inversion figure in the numeral ("I⁶" or "I/3", builder's choice).
  - Two notes held: show the interval instead of a chord ("C + G · P5").
  - No match: show nothing in the name slot; the notes and degrees still show.
  - Several names fit (C6 vs Am7/C): show the one that fits the key best as the main name, the other small underneath.
- **Inputs**: mouse/touch on keys, computer keyboard (existing mapping, arrow keys shift octaves), MIDI keyboard (existing `midi.ts`). All three feed the same step logic.
- **Staff placement**: notes go on treble or bass by pitch (middle C and above on treble is fine; builder may use ledger lines near middle C sensibly).

## Visual reference

Mockups from the brainstorm (chosen: fixed "now" spot + dashed interval lines + stacked name/degree labels) are in `.superpowers/brainstorm/*/content/trail-layout-v2.html` ("Stacked" card). Dark slate background, amber noteheads for played notes, sky-blue interval lines and labels, slate degree text, amber highlight on the "now" degree. These are the existing app accents (slate neutral, sky accent, amber for "pressed" on both current pianos).

## Constraints

- Next.js in this repo has breaking changes vs. common knowledge: read `node_modules/next/dist/docs/` before writing page code (see `AGENTS.md`).
- Colours via the Tailwind scales / CSS variables (`var(--color-slate-…)`, `sky`, `amber`) so themes in `src/app/themes.css` keep working. The current `Piano` uses hard-coded `white/10`, `zinc`, `stone`, `emerald` colours that ignore themes; the redesign should fix that.
- Pure logic (step/trail state, spelling in a key, degree with accidentals, interval naming, chord naming with numeral) goes in a tested module (node test runner via `npm test`, add the file to the `test` script). Rendering stays in components.
- The looper uses `Piano` with a `voice` prop and must keep working (`src/components/looper/InstrumentPanel.tsx`). Looper rules in `src/lib/looper/CLAUDE.md`.
- Key signatures need flat keys: today's `TONIC_OPTIONS` are sharps only (D♯, A♯…). The page needs proper key names (E♭, B♭, A♭, D♭, G♭/F♯) so signatures and spelling are right. Modes use their parent major's signature (D Dorian = no sharps/flats); pentatonic/blues use their parent major/minor's.
- Work happens in the `worktree-theory-piano` worktree. Dev server there needs `npx next dev --webpack -p <port>` (Turbopack fails on the symlinked node_modules).
- No new heavy notation dependency is required; hand-drawn SVG (as the mockups) is expected. Using a library is the builder's call only if it stays small and themeable.

## Non-goals

- Rhythm/duration notation, bars, time signatures. Noteheads are plain (no stems/beams needed beyond stacking chords).
- Recording, playback or saving what was played.
- Scoring or a game; this is a free-play practice tool.
- A UI control for trail length.

## Anti-goals

- Wrong spelling for the key (A♯ in F major) or a key signature that doesn't match the chosen key. This is the thing that would make the page untrustworthy.
- Key signature or "now" spot that moves around. Both stay fixed; only the trail moves.
- Breaking the looper's piano.

## Left to the builder

- Exact sizes, spacing, animation timing/easing of the trail shift and fade.
- Page intro / `Lesson` copy (why it matters, something to try), in the voice of the other theory pages.
- Whether "now" also shows a big readout (e.g. "D · degree 1") beside the staff.
- How the controls (key, scale, octave, MIDI, sound) are laid out on the new page.
- Visual details of the redesigned piano, within the app's design language (see e.g. `src/components/theory/NoteNeck.tsx`, `src/features/sound/keyboard/ScalePiano.tsx`).

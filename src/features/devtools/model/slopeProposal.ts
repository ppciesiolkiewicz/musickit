import { PATH, type Track } from "@/features/plan/model/path";

/*
 * A proposed change to the path, to judge on /dev/path → "Slope" beside the path as it is
 * (docs/superpowers/specs/2026-11-16-path-slope-design.md). Nothing outside /dev/path reads it. Once the user settles a
 * proposal its links and tracks move into PATH (plan/model/path.ts) and this file is emptied for the next one.
 * Settled so far: the named prerequisites and the double-stops track (2026-11-16). Proposed now: the agents' links.
 */

/**
 * Links proposed by three Fable agents (one per area, with musictheory.net's lesson order and Open Music Theory's
 * contents as references), checked by hand on 2026-11-16: [learn first, then, why].
 */
export const PROPOSED_LINKS: [from: string, to: string, why: string][] = [
  // guitar
  ["open-chords:1", "strumming:1", "A player needs one chord under the fingers before a strum has anything to sound; Em is enough."],
  ["strumming:1", "open-chords:5", "Changing chords on the beat means the strumming hand already keeps a steady down-up going while the other hand moves."],
  ["beat:4", "strumming:4", "Sixteenth strumming patterns are counted 1 e and a, so the player should be able to count and clap sixteenths and rests first."],
  ["double-stops:1", "power-chords:1", "The root-and-5th on two strings is the power chord's core; the full shape only adds the octave on top."],
  ["power-chords:1", "barre:3", "The power chord with the root on string 6 is the bottom three strings of the full F barre, so the hand already knows the frame and the roots."],
  ["open-chords:5", "barre:4", "Changing to a barre in time is the same skill as changing open chords in time, with a harder shape; the easy version comes first."],
  ["notes-on-neck:2", "barre:5", "Playing barre shapes anywhere means finding any root on strings 6 and 5 up to fret 12 by name."],
  ["seventh-shapes:3", "barre:5", "\"Barre shapes anywhere\" includes the 7 shapes on both roots, which are learned as shapes in Barre 7ths."],
  ["open-chords:4", "seventh-shapes:1", "Each open dominant 7th is an open chord with one finger moved or lifted (E to E7, A to A7, D to D7, G to G7), so the plain chords, G included, come first."],
  ["open-chords:2", "sus-add9:1", "Dsus2 and Dsus4 are a D chord with one finger off or on, so the D chord has to be there first."],
  ["sevenths-up:7", "shells:3", "Putting a 9th or 13th on top of a shell needs the player to know what a 9 and a 13 are and which 7th chord they sit on."],
  ["dim-aug:2", "triads:8", "Diminished and augmented triad shapes are a major or minor shape with the 5th moved one fret, which only makes sense once 1 b3 b5 and 1 3 #5 are known."],
  ["chords-of-a-key:4", "caged:7", "Playing every chord of a key in one area needs the player to know which seven chords the key has."],
  ["bends-slides:1", "pentatonic-positions:4", "Joining positions 1 and 2 is done with a slide between them, so the slide itself is practised first."],
  // voice
  ["pitch:1", "steps-to-leaps:1", "A singer has to be able to land on one given note before two notes a step apart mean anything."],
  ["breath:1", "pitch:3", "Holding Do steady over a drone needs a breath that lasts a few even counts first."],
  ["steps-to-leaps:2", "tunes:1", "Easy tunes move by step from Do within the first five notes, so the Do-to-Sol stages come before them."],
  ["steps-to-leaps:5", "tunes:2", "Medium tunes are built on skips through the chord, which is exactly this stage."],
  ["steps-to-leaps:12", "tunes:3", "Hard tunes have leaps of a 4th and more and notes under Do; the 4ths stage (which follows 'Under Do') covers both."],
  ["steps-to-leaps:14", "tunes:4", "Expert tunes use awkward leaps outside the chord, so 6ths and 7ths should be drilled on their own first."],
  ["note-names:3", "sight-singing:2", "Reading skips off the staff needs the notes on the staff known, not just followed up and down by shape."],
  ["steps-to-leaps:4", "runs:1", "The first run is Do to Sol and back, so those five notes must be sung in tune slowly before they are sung fast."],
  ["steps-to-leaps:9", "runs:2", "The quick home-chord run is the broken home chord up to the high Do, sped up."],
  ["pitch:3", "harmony-line:2", "Holding a 5th under a tune is holding a pitch against other sound, learned first on Do over a drone."],
  ["steps-to-leaps:6", "harmony-line:3", "A harmony a 3rd above the tune needs 3rds sung in tune as a melody first."],
  ["steps-to-leaps:9", "improvise:1", "Improvising with chord tones over one chord needs the home chord's notes in the voice first."],
  ["pitch:4", "singing-modes:1", "A mode is sung by step over a drone, so plain major steps over a drone come first."],
  // theory
  ["note-names:2", "scales:3", "A scale formula like 1 b3 4 5 b7 can't be read or spelled without sharps and flats; musictheory.net puts 'Steps and Accidentals' before 'The Major Scale' and Open Music Theory puts 'Half Steps, Whole Steps, and Accidentals' before 'Major Scales'."],
  ["intervals:2", "sevenths-up:1", "A major or minor triad is told apart by its 3rd, so the major and minor 3rd come first; both references teach Intervals before Triads (musictheory.net 'Intervals' then 'Chords', Open Music Theory 'Intervals' then 'Triads')."],
  ["scales:3", "keys:1", "The keys of G and F are the major scale started on another note, with one note changed; both references teach the major scale before key signatures (musictheory.net 'The Major Scale' then 'Key Signatures')."],
  ["sevenths-up:1", "chords-of-a-key:1", "The 1, 4 and 5 chords are triads built on notes of the scale, so the player needs to know what a triad is first; musictheory.net teaches 'Introduction to Chords' before 'Diatonic Triads' and Open Music Theory 'Triads' before 'Roman Numerals'."],
  ["chords-of-a-key:2", "styles:1", "Pop's 1 5 6 4 is made of the 1, 4, 5 and 6 chords of a key, so those chords come first; musictheory.net teaches 'Diatonic Triads' before 'Common Chord Progressions' and Open Music Theory 'Roman Numerals' long before 'Four-Chord Schemas'."],
  ["chords-of-a-key:2", "hearing-changes:3", "To pick out the 6 chord by ear the player has to know what the 6 chord of a key is, the same way the existing link puts 1, 4, 5 on paper before 1, 4 or 5 by ear."],
  ["sevenths-up:1", "sus:1", "A sus4 chord is a major or minor triad with the 3rd swapped for the 4th, so it only makes sense after the plain triad."],
  ["sevenths-up:1", "dim-aug:1", "Diminished and augmented triads are the major and minor triad with the 5th lowered or raised; both references introduce major and minor first inside their triad lesson (musictheory.net 'Introduction to Chords', Open Music Theory 'Triads')."],
  ["dim-aug:1", "sevenths-up:5", "A half-diminished chord is a diminished triad with a b7 on top, so the diminished triad comes first; musictheory.net builds every 7th chord from its triad ('Introduction to Chords' before 'Seventh Chords')."],
  ["sevenths-up:5", "dim-aug:3", "Diminished 7 is learned against half-diminished: the same diminished triad with the 7th lowered once more; musictheory.net teaches the common 7th chords first and the rest in 'More Seventh Chords'."],
  ["scales:4", "modes:1", "Dorian is taught as natural minor with a major 6th, so natural minor comes first; Open Music Theory puts 'Minor Scales' right before 'Introduction to Diatonic Modes'."],
  ["chords-of-a-key:3", "ii-v-i:1", "A ii-V-I starts on the 2 chord of the key, so the player needs the 2 chord before the progression; musictheory.net teaches 'Diatonic Triads' and 'Diatonic Seventh Chords' before 'Circle Progressions'."],
  ["chords-of-a-key:1", "minor-colours:2", "'The 5 chord in minor' assumes the player knows what a 5 chord is from the major key; musictheory.net teaches 'Diatonic Triads' before 'Composing with Minor Scales', where the raised 7th makes the 5 chord major."],
  ["minor-colours:2", "ii-v-i:2", "The V in a minor ii-V-i is the major 5 chord that comes from the raised 7th of harmonic minor, so that step comes first."],
  ["sevenths-up:5", "ii-v-i:2", "The ii chord of a minor ii-V-i is a half-diminished chord, so the player has to be able to build one first."],
];

/** The steps each step gains to learn first, as "trackId:n" → refs. */
export const ADDED_AFTER: Record<string, string[]> = PROPOSED_LINKS.reduce<Record<string, string[]>>((m, [from, to]) => ({ ...m, [to]: [...(m[to] ?? []), from] }), {});

/** Why a proposed link is there. */
export const whyOf = (to: string, from: string) => PROPOSED_LINKS.find(([f, t]) => f === from && t === to)?.[2];

/** New tracks, each placed right before the track named in `before`. */
export const ADDED_TRACKS: { before: string; track: Track }[] = [];

/** The path with the proposal applied. */
export function proposedPath(tracks: Track[] = PATH): Track[] {
  const out = tracks.flatMap((t) => [...ADDED_TRACKS.filter((x) => x.before === t.id).map((x) => x.track), t]);
  return out.map((t) => ({
    ...t,
    steps: t.steps.map((st, i) => {
      const add = ADDED_AFTER[`${t.id}:${i + 1}`];
      return add ? { ...st, after: [...(st.after ?? []), ...add.filter((r) => !st.after?.includes(r))] } : st;
    }),
  }));
}

/** Whether a step's link is one the proposal adds. */
export const isAdded = (ref: string, after: string) => ADDED_AFTER[ref]?.includes(after) ?? false;

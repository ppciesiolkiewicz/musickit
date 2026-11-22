import type { Area } from "./concepts";
import { LADDERS } from "./ladders";
import type { PlanTool } from "./tools";
import type { Level } from "./types";

/*
 * The learning path (NEW13 in tasks.txt): every concept is a track, one skill a player gets better at, and a track has
 * steps from easiest to hardest. Each step has its own level, so a track runs across the levels its steps reach and
 * tracks in one topic interleave: the first triads come before CAGED, the last after it. A step may name steps of other
 * tracks to learn first (`after`); with the step before it in its own track, those are its predecessors (`predecessorsOf`),
 * and how deep that chain runs places it inside its level (`slope`). Pentatonic comes before the modes, pentatonic
 * position 1 before every other first position, double stops before triads, and the first triads before barre chords. A step a ladder in the code stands for (ladders.ts) is read back from an exercise's
 * tools (`stepOf`); the others are "not implemented" until a tool has a level for them.
 * `merges` lists the concept ids from before the path (2026-11-16); concepts.ts maps them to their track.
 */

export interface PathStep {
  level: Level;
  name: string;
  holds: string;
  /** the ladder step in the code that stands for it, as "ladderId:key" (ladders.ts); none: not implemented */
  ladder?: string;
  /** steps of other tracks to learn first, as "trackId:n", n counted from 1 */
  after?: string[];
  /** a mixing step: the steps before it in its track together, nothing new (`m`) */
  mix?: true;
}

export interface Track {
  id: string;
  label: string;
  area: Area;
  /** the questionnaire topic (intake/topics.ts) */
  topic: string;
  /** the concept ids from before the path that this track took the place of; empty for one that is new */
  merges: string[];
  /** easiest first; levels never go down */
  steps: PathStep[];
  /**
   * The order its keys are learned in, as pitch classes (C = 0) in groups, the first key first: a step is first played
   * in the first group, and each later group is a key stage inside the step (model/keyStages.ts). None: the area's
   * key ladder (model/keys.ts).
   */
  keys?: number[][];
}

type Opts = { ladder?: string; after?: string[] };
const s = (level: Level, name: string, holds = "", o: Opts = {}): PathStep => ({ level, name, holds, ...o });
/** A mixing step: what the track has taught so far, together, so a new step doesn't stay on its own. */
const m = (level: Level, name: string, holds = "", o: Opts = {}): PathStep => ({ ...s(level, `Mix: ${name}`, holds, o), mix: true });
const N = "new", B = "beginner", I = "intermediate", A = "advanced";
const track = (area: Area, topic: string, id: string, label: string, merges: string[], steps: PathStep[], keys?: number[][]): Track => ({ id, label, area, topic, merges, steps, ...(keys ? { keys } : {}) });
const g = (topic: string, id: string, label: string, merges: string[], steps: PathStep[], keys?: number[][]) => track("guitar", `guitar-${topic}`, id, label, merges, steps, keys);
const v = (topic: string, id: string, label: string, merges: string[], steps: PathStep[]) => track("voice", `voice-${topic}`, id, label, merges, steps);
const t = (topic: string, id: string, label: string, merges: string[], steps: PathStep[]) => track("theory", `theory-${topic}`, id, label, merges, steps);

/** Every track, per area, in questionnaire topic order. */
export const PATH: Track[] = [
  // ---- Guitar
  g("basic-chords", "open-chords", "Open chords", ["open-chords", "one-minute-changes"], [
    s(N, "Em, Am", "two-finger and three-finger shapes"),
    s(N, "E, A, D", ""),
    m(N, "Em, Am, E, A, D", "any two in a row"),
    s(N, "One-minute changes", "two chords, count the changes"),
    s(B, "G, C", ""),
    m(B, "all seven open chords", "changes between any of them"),
    s(B, "Changes in time", "on the beat at 60", { after: ["strumming:1"] }),
    s(I, "Songs with four chords", "changes on the bar line, no gaps", { ladder: "song-chart:four-chords" }),
  ]),
  g("basic-chords", "strumming", "Strumming", ["strumming-patterns"], [
    s(N, "Down strums on the beat", "", { after: ["open-chords:1"] }),
    s(N, "Down and up in eighths", ""),
    s(B, "Island strum", "a missed strum in the middle"),
    s(I, "Sixteenth patterns", "", { after: ["beat:4"] }),
    s(I, "Muted chucks", "the backbeat on 2 and 4"),
    m(I, "every pattern in one song", "eighths, island, sixteenths and chucks"),
  ]),
  g("basic-chords", "fingerpicking", "Fingerpicking", [], [
    s(A, "Fingerpicking pattern", "thumb on the root, fingers on the top strings"),
  ]),
  g("basic-chords", "power-chords", "Power chords", ["power-chords"], [
    s(B, "Root on string 6", "one shape, moved along the string", { after: ["double-stops:1"] }),
    s(B, "Root on string 5", "the same shape one string over"),
    s(B, "Palm-muted riffs", "between both roots, in eighths"),
  ]),
  g("barre-chords", "barre", "Barre chords", ["bm-f-barre"], [
    s(B, "Small F", "four strings, a short barre", { after: ["triads:1"] }),
    s(B, "Bm", "barre with the root on string 5"),
    s(I, "Full F", "barre with the root on string 6", { after: ["power-chords:1"] }),
    s(I, "Changes to a barre in time", "", { after: ["open-chords:7"] }),
    s(A, "Barre shapes anywhere", "major, minor and 7 on both roots", { after: ["seventh-shapes:4", "notes-on-neck:2"] }),
  ]),
  g("extended-chords", "seventh-shapes", "7th chord shapes", [], [
    s(B, "Open dominant 7ths", "E7, A7, D7, G7, B7", { after: ["open-chords:5"] }),
    s(B, "Open minor and major 7ths", "Am7, Em7, Dm7, Cmaj7, Fmaj7"),
    m(B, "dominant, minor and major 7ths", "in one progression"),
    s(I, "Barre 7ths", "roots on strings 6 and 5", { after: ["barre:3"] }),
  ]),
  g("extended-chords", "sus-add9", "Sus & add9 shapes", ["sus-add9-shapes"], [
    s(B, "Dsus2, Dsus4", "one finger off or on a D", { after: ["open-chords:2"] }),
    s(I, "Asus and Esus", ""),
    s(I, "Cadd9 and G", "two fingers stay put"),
    s(A, "Moving sus shapes", "on a barre, up the neck", { after: ["barre:5"] }),
  ]),
  g("extended-chords", "shells", "Shells & comping", ["shells-comping"], [
    s(I, "Shells, root on 6", "root, 3rd, 7th", { after: ["seventh-shapes:4"] }),
    s(I, "Shells, root on 5", ""),
    s(A, "9ths and 13ths on top", "", { after: ["sevenths-up:9"] }),
    s(A, "Comping a ii–V–I", "", { after: ["ii-v-i:1"] }),
  ]),
  g("caged", "double-stops", "Double stops", [], [
    s(B, "5ths on two strings", "root and 5th, the smallest power chord"),
    s(B, "3rds on strings 3 and 2", "in one key", { ladder: "double-stops-neck:3rds" }),
    s(B, "6ths on strings 3 and 1", "in one key, string 2 skipped", { ladder: "double-stops-neck:6ths" }),
    m(B, "3rds and 6ths", "low on the neck, in one key"),
    s(I, "Up the neck in one key", "3rds and 6ths", { ladder: "double-stops-neck:up" }),
  ]),
  g("caged", "triads", "Triads", ["top-string-triads", "triads-every-set"], [
    s(B, "Strings 3 2 1", "major triads", { after: ["double-stops:2"] }),
    s(B, "Strings 3 2 1", "minor triads"),
    m(B, "major and minor on strings 3 2 1", "the chords of one key"),
    s(B, "Strings 4 3 2", "major and minor"),
    s(I, "Strings 5 4 3", "major and minor"),
    s(I, "Strings 6 5 4", "major and minor"),
    m(I, "all four string sets", "one progression in one area of the neck"),
    s(I, "One set up the neck", "the three inversions of one chord, joined"),
    s(A, "Every set", "one chord across all four sets", { after: ["caged:8"] }),
    s(A, "Diminished and augmented", "", { after: ["dim-aug:2"] }),
  ]),
  g("caged", "caged", "CAGED shapes", ["caged"], [
    s(I, "E shape", "", { after: ["barre:3", "pentatonic-positions:1"] }),
    s(I, "A shape", "", { after: ["barre:2"] }),
    m(I, "E and A shapes", "one chord in both, then 1 4 5 in one area"),
    s(I, "C shape", ""),
    s(I, "G shape", ""),
    m(I, "E, A, C and G shapes", "one chord, in neck order"),
    s(A, "D shape", ""),
    s(A, "One chord in all five", "linked up the neck"),
    s(A, "Every chord of a key in one area", "", { after: ["chords-of-a-key:4"] }),
  ]),
  g("caged", "arpeggios", "Arpeggios", ["arpeggios-position"], [
    s(I, "In the E shape", "major and minor", { after: ["caged:1", "pentatonic-positions:1"] }),
    s(I, "In the A shape", "major and minor", { after: ["caged:2"] }),
    s(A, "7th arpeggios", "", { after: ["sevenths-up:4"] }),
    s(A, "Through all five shapes", "", { after: ["caged:8"] }),
  ]),
  g("scales", "notes-on-neck", "Notes on the neck", ["notes-e-a-strings", "find-every-note"], [
    s(N, "E and A, frets 0 to 5", "natural notes", { ladder: "note-finder:new" }),
    s(B, "E and A, frets 0 to 12", "natural notes", { ladder: "note-finder:beginner" }),
    s(I, "Every string, frets 0 to 12", "sharps and flats too", { ladder: "note-finder:intermediate" }),
    s(A, "Every string, frets 0 to 15", "", { ladder: "note-finder:advanced" }),
  ]),
  // intervals as shapes: the same interval on one string, on the next string and two strings over, played up and down
  // (user, 2026-11-22). No tool has a level for these yet, so every step is "not implemented".
  g("scales", "intervals-on-neck", "Intervals on the neck", [], [
    s(B, "Octaves", "two strings over, up and down", { after: ["notes-on-neck:2"] }),
    s(B, "5ths and 4ths", "on one string and on the next string"),
    s(I, "3rds and 6ths", "on one string, the next string and two strings over"),
    s(I, "Up and down from one note", "each interval above the note and below it"),
    m(I, "every interval so far", "on any pair of strings"),
    s(A, "Every interval, every pair of strings", "2nds to 7ths, up and down, strings 3 and 2 too"),
  ]),
  g("scales", "pentatonic-positions", "Pentatonic positions", ["pentatonic-box-1", "five-pentatonic-boxes", "joining-positions"], [
    s(B, "Position 1, minor", "from the root on string 6"),
    s(B, "Position 1, major", "the same shape, the root moved"),
    s(B, "Position 2", "next to position 1"),
    s(I, "Joining 1 and 2", "slide between them", { after: ["bends-slides:1"] }),
    s(I, "Positions 3, 4, 5", ""),
    m(I, "all five positions", "in neck order, one key"),
    s(A, "Across three positions", "runs that move along the neck"),
    s(A, "The whole neck in one key", ""),
    // position 1 by where it sits on the neck (`npm run theory -- positions <key> minor pentatonic`): A at frets 5 to 8
    // first, then G (3 to 6) and E (the open strings), B and C (7 to 10, 8 to 11), D and F (10 to 13, 1 to 4; user: F before F♯), the rest
  ], [[9], [7, 4], [11, 0], [2, 5], [6, 10, 8, 1, 3]]),
  g("scales", "major-on-neck", "Major scale & modes on the neck", ["modes-on-neck"], [
    s(I, "Major scale, root on 6", "one position", { after: ["pentatonic-positions:1"] }),
    s(I, "Major scale, root on 5", ""),
    s(A, "Dorian", "", { after: ["modes:2"] }),
    s(A, "Mixolydian", ""),
    s(A, "Phrygian", ""),
    s(A, "Lydian", ""),
    s(A, "Locrian", ""),
    m(A, "the modes from one root", "in a chain, one note lowered at a time"),
  ]),
  g("scales", "guitar-melodies", "Melodies", ["guitar-melodies-new", "guitar-melodies-beginner", "guitar-melodies-intermediate", "guitar-melodies-advanced"], [
    s(N, "One string", ""),
    s(B, "Open position", "a few strings"),
    s(I, "Up the neck", "eighths and dotted notes"),
    s(A, "Shifting positions", ""),
    s(A, "Modal tunes", "", { after: ["major-on-neck:3"] }),
    s(A, "Octave jumps", "a leap of an octave in the tune, then the tune an octave higher", { after: ["intervals-on-neck:1"] }),
  ]),
  g("techniques", "spider", "The spider", ["spider"], [
    s(N, "Fingers 1 2 3 4 from fret 5", "", { ladder: "finger-pattern:new" }),
    s(B, "Fingers 1 2 3 4 from fret 1", "", { ladder: "finger-pattern:beginner" }),
    s(I, "Fingers 1 3 2 4", "", { ladder: "finger-pattern:intermediate" }),
    s(A, "Fingers 1 4 2 3", "", { ladder: "finger-pattern:advanced" }),
  ]),
  g("techniques", "picking", "Picking & string skipping", ["string-skipping"], [
    s(N, "Down strokes", "four notes a string", { ladder: "picking-drill:new" }),
    s(B, "Down and up", "four notes a string", { ladder: "picking-drill:beginner" }),
    s(I, "Three notes a string", "", { ladder: "picking-drill:intermediate" }),
    s(A, "Skipping a string", "two notes a string", { ladder: "picking-drill:advanced" }),
  ]),
  g("techniques", "legato", "Hammer-ons & pull-offs", ["hammer-pull"], [
    s(N, "Fingers 1 and 2", "", { ladder: "legato-trill:new" }),
    s(B, "Fingers 1 and 3", "", { ladder: "legato-trill:beginner" }),
    s(I, "Fingers 2 and 3", "", { ladder: "legato-trill:intermediate" }),
    s(A, "Fingers 3 and 4", "", { ladder: "legato-trill:advanced" }),
  ]),
  g("techniques", "bends-slides", "Bends & slides", ["bends-slides"], [
    s(B, "Slides", "", { after: ["pentatonic-positions:1"] }),
    s(I, "Half-step bend", "up one fret's pitch"),
    s(I, "Whole-step bend", "up two frets' pitch"),
    s(A, "Bends in tune, with vibrato", "", { after: ["legato:3"] }),
  ]),

  // ---- Voice
  v("pitch", "pitch", "Pitch", ["matching-a-pitch", "in-tune-over-drone"], [
    s(N, "Match a note", "in your easy range"),
    s(N, "Match notes the piano plays", ""),
    s(B, "Hold Do over a drone", "", { after: ["breath:1"] }),
    s(B, "Steps over a drone", ""),
    s(I, "Notes across your range", ""),
    s(A, "A whole song in tune", ""),
  ]),
  v("intervals", "steps-to-leaps", "Steps, skips & leaps", ["do-re-mi-steps", "do-mi-sol-skips", "leaps"], [
    s(N, "Do Re", "", { ladder: "melody-stages:do-re", after: ["pitch:1"] }),
    s(N, "Up to Mi", "", { ladder: "melody-stages:mi" }),
    s(N, "Up to Fa", "", { ladder: "melody-stages:fa" }),
    s(N, "Up to Sol", "", { ladder: "melody-stages:sol" }),
    m(N, "Do to Sol", "the five notes in any order"),
    s(B, "Skips through the chord", "", { ladder: "melody-stages:skips" }),
    s(B, "Thirds", "Do Mi Re Fa Mi Sol", { ladder: "melody-stages:thirds" }),
    m(B, "steps and skips", "in one tune"),
    s(B, "Up to La", "", { ladder: "melody-stages:la" }),
    s(B, "Up to Ti", "the note that leads home", { ladder: "melody-stages:ti" }),
    s(B, "The home chord broken", "", { ladder: "melody-stages:arpeggio" }),
    m(B, "the whole octave", "by step and by skip"),
    s(I, "The chords next door", "", { ladder: "melody-stages:chords" }),
    s(I, "Under Do", "Ti, La, Sol", { ladder: "melody-stages:under" }),
    s(I, "4ths", "", { ladder: "melody-stages:fourths" }),
    s(I, "5ths", "", { ladder: "melody-stages:fifths" }),
    m(I, "4ths and 5ths", "with steps and notes under Do"),
    s(A, "6ths", "", { ladder: "melody-stages:sixths" }),
    s(A, "7ths", "", { ladder: "melody-stages:sevenths" }),
    s(A, "Octave", "", { ladder: "melody-stages:octave" }),
    m(A, "6ths, 7ths and the octave", ""),
    s(A, "10ths", "", { ladder: "melody-stages:tenths" }),
  ]),
  v("intervals", "singing-intervals", "Singing intervals from Do", ["singing-intervals"], [
    s(N, "3rd and 5th", "up", { ladder: "interval-singer:new", after: ["steps-to-leaps:4"] }),
    s(B, "3rd, 5th, octave", "up", { ladder: "interval-singer:beginner", after: ["steps-to-leaps:6"] }),
    s(I, "4th, 5th, 6th, octave", "up", { ladder: "interval-singer:intermediate" }),
    s(A, "Every interval", "up and down, Do in a random key", { ladder: "interval-singer:advanced" }),
  ]),
  v("melodies", "tunes", "Tunes by ear", ["voice-melodies-easy"], [
    s(N, "Easy", "from Do, by step", { ladder: "melody-difficulty:Easy", after: ["steps-to-leaps:2"] }),
    s(B, "Medium", "skips, a start off Do", { ladder: "melody-difficulty:Medium", after: ["steps-to-leaps:6"] }),
    s(I, "Hard", "leaps, notes under Do", { ladder: "melody-difficulty:Hard", after: ["steps-to-leaps:15"] }),
    m(I, "easy to hard", "tunes of each difficulty, unannounced"),
    s(A, "Expert", "awkward leaps, dotted rhythms", { ladder: "melody-difficulty:Expert", after: ["steps-to-leaps:18"] }),
    m(A, "every difficulty", "chords off"),
  ]),
  v("melodies", "sight-singing", "Sight-singing", ["sight-singing"], [
    s(B, "Steps from the staff", "", { after: ["tunes:1"] }),
    s(I, "Skips from the staff", "", { after: ["note-names:3"] }),
    s(I, "Rhythm from the staff", "eighths and rests"),
    s(A, "A new tune from the staff", ""),
  ]),
  v("melodies", "singing-modes", "Singing the modes", [], [
    s(I, "Dorian", "over a drone", { after: ["modes:2", "scales:1", "pitch:4"] }),
    s(I, "Mixolydian", "", { after: ["modes:3"] }),
    m(I, "Dorian or Mixolydian", "from one Do, over one drone"),
    s(A, "Phrygian", "", { after: ["modes:4"] }),
    s(A, "Lydian", "", { after: ["modes:5"] }),
    s(A, "Locrian", "", { after: ["modes:6"] }),
    m(A, "all five modes", "from one Do, with major and minor between them"),
  ]),
  v("breath-range", "breath", "Breath & holding a note", ["breath-holding-note"], [
    s(N, "Counts 2 to 5", "", { ladder: "farinelli:new" }),
    s(B, "Counts 3 to 8", "", { ladder: "farinelli:beginner" }),
    s(B, "A long held note", "one note on one slow breath"),
    s(I, "Counts 4 to 10", "", { ladder: "farinelli:intermediate" }),
    s(I, "Hiss, then buzz", "the same air with and without the voice"),
    s(I, "A long breath out", "out for longer than in"),
    s(A, "Counts 4 to 20", "", { ladder: "farinelli:advanced" }),
    s(A, "Longer breaths out", "the hiss, the buzz and the breath out, each held for longer"),
  ]),
  v("breath-range", "range", "Stretching your range", ["stretch-range"], [
    s(B, "Lip rolls through the middle", ""),
    s(I, "Slides across the break", ""),
    s(I, "A few notes higher and lower", ""),
    s(A, "Top and bottom with ease", ""),
  ]),
  v("runs", "runs", "Runs", ["runs", "fast-runs"], [
    s(B, "Do to Sol and back", "eighths, then sixteenths", { ladder: "run-stages:five", after: ["steps-to-leaps:4"] }),
    s(I, "The home chord, quick", "", { ladder: "run-stages:arpeggio-run", after: ["steps-to-leaps:11"] }),
    s(I, "Turns", "the note above, the note, the note below", { ladder: "run-stages:turns" }),
    s(I, "Pentatonic runs", "", { ladder: "run-stages:pentatonic-run" }),
    m(I, "every run so far", "back to back"),
    s(A, "Up to the high Re", "", { ladder: "run-stages:nine" }),
    s(A, "The whole scale", "in sixteenths", { ladder: "run-stages:octave-run" }),
    s(A, "Fast", "the runs at a faster tempo"),
  ]),
  v("harmony", "harmony-line", "Harmony", ["harmony-line"], [
    s(N, "Hold your note", "while another one sounds"),
    s(B, "A 5th under the tune", "held", { after: ["pitch:3"] }),
    s(I, "3rds above a tune", "", { after: ["steps-to-leaps:7"] }),
    s(I, "A harmony line over chords", ""),
  ]),
  v("harmony", "improvise", "Improvising a melody", ["improvise-melody"], [
    s(I, "Chord tones over one chord", "", { after: ["harmony-line:2", "steps-to-leaps:11"] }),
    s(A, "Over changing chords", ""),
    s(A, "Question and answer", "phrases that reply"),
  ]),

  // ---- Theory & ear
  t("basics", "beat", "Steady beat & rhythm", ["steady-beat"], [
    s(N, "Clap on the beat", "", { ladder: "clap-along:new" }),
    s(N, "Count 1 2 3 4", ""),
    s(B, "Eighths", "", { ladder: "clap-along:beginner" }),
    s(I, "Sixteenths and rests", "", { ladder: "clap-along:intermediate" }),
    m(I, "quarters to sixteenths", "switching inside one bar"),
    s(A, "Syncopation", "", { ladder: "clap-along:advanced" }),
    s(A, "Metronome on 2 and 4", ""),
  ]),
  t("basics", "note-names", "Note names", ["note-names"], [
    s(N, "A to G", "the seven letters"),
    s(B, "Sharps and flats", ""),
    s(B, "Notes on the staff", "treble clef"),
    s(A, "Name notes quickly", ""),
  ]),
  t("ear", "home-and-colour", "Home note & major/minor", ["do-as-home", "major-vs-minor"], [
    s(N, "Do as home", ""),
    s(N, "Major or minor chord", ""),
    s(B, "Major or minor key", ""),
    s(I, "La as home", "the minor home", { after: ["scales:4"] }),
    m(I, "Do or La as home", "major and minor keys with the same notes"),
  ]),
  t("ear", "intervals", "Intervals by ear", ["intervals"], [
    s(N, "5th, octave", "", { ladder: "interval-ears:1" }),
    s(B, "Major and minor 3rd", "", { ladder: "interval-ears:2" }),
    s(B, "4th, 2nd", "", { ladder: "interval-ears:3" }),
    s(I, "Minor 2nd, 6ths", "", { ladder: "interval-ears:4" }),
    m(I, "up, down and together", "every interval so far"),
    s(A, "7ths, tritone", "all twelve", { ladder: "interval-ears:5" }),
    m(A, "all twelve, down and together", ""),
    s(A, "Wider than an octave", "9ths and 10ths"),
  ]),
  t("ear", "hearing-changes", "Hearing chord changes", ["hearing-changes"], [
    s(B, "When the chord changes", ""),
    s(I, "1, 4 or 5", "", { ladder: "chord-changes:1", after: ["chords-of-a-key:1"] }),
    s(I, "The 6 too", "", { ladder: "chord-changes:2", after: ["chords-of-a-key:2"] }),
    m(I, "1, 4, 5 and 6", "in any order, in a new key"),
    s(A, "A song's chords by ear", "", { ladder: "song-chart:by-ear" }),
  ]),
  t("scales-keys", "scales", "Scales", ["pentatonic", "major-scale", "natural-minor", "relative-major-minor"], [
    s(B, "Minor pentatonic", "1 b3 4 5 b7"),
    s(B, "Major pentatonic", "1 2 3 5 6"),
    s(B, "Major scale", "", { after: ["note-names:2"] }),
    s(I, "Natural minor", ""),
    s(I, "Relative major and minor", "same notes, another home"),
  ]),
  t("scales-keys", "keys", "Keys & the circle of fifths", ["circle-of-fifths", "changing-key"], [
    s(B, "One sharp, one flat", "G and F", { after: ["scales:3"] }),
    s(I, "The sharp keys", "round the circle", { after: ["scales:3"] }),
    s(I, "The flat keys", ""),
    m(I, "sharp and flat keys", "the key from its signature, and back"),
    s(A, "Moving to a close key", ""),
    s(A, "Up a step for the last chorus", ""),
  ]),
  t("building-chords", "sevenths-up", "7ths up to 13ths", ["seventh-chords", "extended-chords"], [
    s(B, "Major and minor triads", "1 3 5, 1 b3 5", { after: ["intervals:2"] }),
    s(B, "Dominant 7", "1 3 5 b7"),
    s(I, "Major 7", "1 3 5 7"),
    s(I, "Minor 7", "1 b3 5 b7"),
    m(I, "maj7, 7 and m7", "on one root"),
    s(I, "Half-diminished", "1 b3 b5 b7", { after: ["dim-aug:1"] }),
    m(I, "the four 7th chords and the triads", ""),
    s(A, "9ths", "a 7th chord with the 9"),
    s(A, "13ths", "a 7th chord with the 13"),
  ]),
  t("building-chords", "sus", "Sus & add9", ["sus-chords"], [
    s(B, "sus4", "1 4 5", { after: ["sevenths-up:1"] }),
    s(B, "sus2", "1 2 5"),
    s(I, "add9", "1 3 5 9"),
    m(I, "sus2, sus4, add9 or plain", ""),
  ]),
  t("building-chords", "dim-aug", "Diminished & augmented", ["diminished", "augmented"], [
    s(I, "Diminished triad", "1 b3 b5", { after: ["sevenths-up:1"] }),
    s(I, "Augmented triad", "1 3 #5"),
    m(I, "major, minor, diminished or augmented", "on one root"),
    s(A, "Diminished 7", "1 b3 b5 bb7", { after: ["sevenths-up:6"] }),
  ]),
  t("progressions", "chords-of-a-key", "Chords of a key", ["chords-in-key"], [
    s(B, "1, 4, 5", "", { after: ["scales:3", "sevenths-up:1"] }),
    s(B, "The 6", "the relative minor chord"),
    s(I, "The 2 and 3", ""),
    s(I, "All seven", ""),
  ]),
  t("progressions", "styles", "Chords in styles", ["chords-pop-rock", "chords-folk", "chords-blues", "chords-jazz"], [
    s(B, "Pop: 1 5 6 4", "", { after: ["chords-of-a-key:2"] }),
    s(I, "Folk", ""),
    s(I, "12-bar blues", "", { after: ["sevenths-up:2"] }),
    s(A, "Jazz standards", "", { after: ["ii-v-i:2"] }),
  ]),
  t("progressions", "ii-v-i", "ii–V–I & guide tones", ["ii-v-i", "guide-tones"], [
    s(I, "ii–V–I in major", "", { after: ["sevenths-up:4", "chords-of-a-key:3"] }),
    s(A, "ii–V–i in minor", "", { after: ["minor-colours:2", "sevenths-up:6"] }),
    m(A, "major and minor ii–V–I", "in one tune"),
    s(A, "Guide tones", "the 3rds and 7ths through the changes"),
  ]),
  t("modes", "modes", "Modes", ["modes", "lydian-locrian"], [
    s(B, "Major and minor from one root", "bright and dark, the first two modes", { after: ["scales:3"] }),
    s(I, "Dorian", "minor with a major 6th", { after: ["scales:3", "scales:1", "scales:4"] }),
    s(I, "Mixolydian", "major with a b7"),
    s(A, "Phrygian", "minor with a b2"),
    s(A, "Lydian", "major with a #4"),
    s(A, "Locrian", "minor with a b2 and a b5"),
  ]),
  t("modes", "minor-colours", "Minor colours", ["harmonic-minor", "melodic-minor"], [
    s(I, "Harmonic minor", "natural minor with a raised 7th", { after: ["scales:4"] }),
    s(I, "The 5 chord in minor", "major, from the raised 7th", { after: ["chords-of-a-key:1"] }),
    s(A, "Melodic minor", "raised 6th and 7th"),
    m(A, "natural, harmonic or melodic", "by the 6th and 7th"),
  ]),
];

/** A step pointed at by "trackId:n". */
export function stepAt(ref: string, tracks: Track[] = PATH): { track: Track; step: PathStep; index: number } | undefined {
  const [id, n] = ref.split(":");
  const track = tracks.find((x) => x.id === id);
  const index = Number(n) - 1;
  return track && track.steps[index] ? { track, step: track.steps[index], index } : undefined;
}

const LEVELS: Level[] = ["new", "beginner", "intermediate", "advanced"];
export const levelIndex = (level: Level) => LEVELS.indexOf(level);

/** The level of a block that practises these steps: the highest of their levels. Refs that point at no step are skipped; undefined when none is left. */
export function levelOfSteps(refs: readonly string[], tracks: Track[] = PATH): Level | undefined {
  const levels = refs.flatMap((r) => { const at = stepAt(r, tracks); return at ? [at.step.level] : []; });
  return levels.length ? levels.reduce((a, b) => (levelIndex(b) > levelIndex(a) ? b : a)) : undefined;
}

/** What a step needs first: the step before it in its own track, then its `after` steps. */
export function predecessorsOf(ref: string, tracks: Track[] = PATH): string[] {
  const at = stepAt(ref, tracks);
  if (!at) return [];
  return [...(at.index > 0 ? [`${at.track.id}:${at.index}`] : []), ...(at.step.after ?? [])];
}

/** A step on the path, with how deep its chain of steps to learn first runs. */
export interface SlopeStep {
  ref: string;
  track: Track;
  /** in its track, from 0 */
  index: number;
  level: Level;
  /** 0 when it needs nothing first, else 1 + the deepest step it needs */
  depth: number;
}

function depths(tracks: Track[]): Map<string, number> {
  const memo = new Map<string, number>();
  const open = new Set<string>();
  const visit = (ref: string): number => {
    const known = memo.get(ref);
    if (known !== undefined) return known;
    if (open.has(ref)) throw new Error(`cycle at ${ref}`);
    open.add(ref);
    const d = predecessorsOf(ref, tracks).reduce((m, p) => Math.max(m, visit(p) + 1), 0);
    open.delete(ref);
    memo.set(ref, d);
    return d;
  };
  for (const t of tracks) t.steps.forEach((_, i) => visit(`${t.id}:${i + 1}`));
  return memo;
}

/** How deep a step's chain of steps to learn first runs. */
export const depthOf = (ref: string, tracks: Track[] = PATH): number => depths(tracks).get(ref) ?? 0;

/** Every step in path order: by level, then depth, then the track's place in `tracks`, then its place in the track. */
export function slope(tracks: Track[] = PATH): SlopeStep[] {
  const d = depths(tracks);
  const place = new Map(tracks.map((t, i) => [t.id, i]));
  const steps: SlopeStep[] = tracks.flatMap((track) => track.steps.map((st, index) => ({ ref: `${track.id}:${index + 1}`, track, index, level: st.level, depth: d.get(`${track.id}:${index + 1}`)! })));
  return steps.sort((a, b) => levelIndex(a.level) - levelIndex(b.level) || a.depth - b.depth || place.get(a.track.id)! - place.get(b.track.id)! || a.index - b.index);
}

/** Each step's place in `slope()`, by ref. */
export const slopeIndex = (tracks: Track[] = PATH): Map<string, number> => new Map(slope(tracks).map((s, i) => [s.ref, i]));

/** The first and last level a track's steps reach, as indexes 0 to 3. */
export function spanOf(track: Track): [number, number] {
  return [levelIndex(track.steps[0].level), levelIndex(track.steps[track.steps.length - 1].level)];
}

/** Counts for the line above the /dev/path diagram, over the tracks given. */
export function pathStats(tracks: Track[]): { tracks: number; merged: number; added: number; steps: number; fromLadder: number; spanning: number } {
  return {
    tracks: tracks.length,
    merged: tracks.reduce((n, x) => n + x.merges.length, 0),
    added: tracks.filter((x) => x.merges.length === 0).length,
    steps: tracks.reduce((n, x) => n + x.steps.length, 0),
    fromLadder: tracks.reduce((n, x) => n + x.steps.filter((st) => st.ladder).length, 0),
    spanning: tracks.filter((x) => { const [a, b] = spanOf(x); return b > a; }).length,
  };
}

/**
 * The step of a track an exercise works on, as its index from 0: read from the exercise's own tools through the ladders
 * its steps name, the hardest one when several are in it. Null when the track has no ladder step or no tool says one.
 */
export function stepOf(trackId: string, tools: PlanTool[], tracks: Track[] = PATH): number | null {
  const track = tracks.find((x) => x.id === trackId);
  if (!track) return null;
  let at = -1;
  track.steps.forEach((st, i) => {
    if (!st.ladder) return;
    const [id, key] = st.ladder.split(":");
    const ladder = LADDERS.find((l) => l.id === id);
    if (ladder?.read && tools.some((t) => ladder.read!(t) === key)) at = Math.max(at, i);
  });
  return at < 0 ? null : at;
}

/** Whether any step of the track is read from a ladder, so `stepOf` can say a step. */
export const hasLadder = (track: Track): boolean => track.steps.some((st) => st.ladder);

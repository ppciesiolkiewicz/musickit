import type { Level } from "./types";

export type Area = "guitar" | "voice" | "theory";

/** One thing a player can know or learn, rated in the questionnaire. */
export interface Concept {
  id: string;
  area: Area;
  level: Level;
  label: string;
  hint?: string;
  /** Concepts to know first, by id. They always come earlier in CONCEPTS. */
  buildsOn?: string[];
  /** Course section page this concept is taught on. */
  course?: string;
}

export const AREAS: { id: Area; label: string }[] = [
  { id: "guitar", label: "Guitar" },
  { id: "voice", label: "Voice" },
  { id: "theory", label: "Theory & ear" },
];

const LEVELS: Level[] = ["new", "beginner", "intermediate", "advanced"];

const course = (stage: string, section: string) => `/course/${stage}/${section}`;

function c(area: Area, level: Level, id: string, label: string, extra: { hint?: string; buildsOn?: string[]; course?: string } = {}): Concept {
  return { id, area, level, label, ...extra };
}
const t = (level: Level, id: string, label: string, extra?: Parameters<typeof c>[4]) => c("theory", level, id, label, extra);
const g = (level: Level, id: string, label: string, extra?: Parameters<typeof c>[4]) => c("guitar", level, id, label, extra);
const v = (level: Level, id: string, label: string, extra?: Parameters<typeof c>[4]) => c("voice", level, id, label, extra);

/** Every concept, per area from easiest to hardest. The order is the order shown in the questionnaire. */
export const CONCEPTS: Concept[] = [
  // Theory & ear
  t("new", "do-as-home", "Do as home", { course: course("3", "home-note") }),
  t("new", "major-vs-minor", "Major vs minor by ear", { course: course("3", "major-or-minor") }),
  t("new", "steady-beat", "Steady beat", { course: course("1", "steady-beat") }),
  t("new", "note-names", "Note names", { course: course("1", "notes-on-e-and-a") }),
  t("beginner", "pentatonic", "Pentatonic (minor & major)", { course: course("5", "pentatonic") }),
  t("beginner", "major-scale", "Major scale", { buildsOn: ["pentatonic"], course: course("3", "do-re-mi") }),
  t("beginner", "natural-minor", "Natural minor scale", { buildsOn: ["major-scale"], course: course("9", "modes") }),
  t("beginner", "intervals", "Intervals within an octave", { course: course("3", "intervals") }),
  t("beginner", "chords-in-key", "Chords in a key (1-4-5)", { buildsOn: ["major-scale"], course: course("5", "one-four-five") }),
  t("intermediate", "relative-major-minor", "Relative major/minor", { buildsOn: ["natural-minor"], course: course("3", "la-minor-home") }),
  t("intermediate", "seventh-chords", "7th chords", { course: course("7", "sevenths") }),
  t("intermediate", "sus-chords", "Sus chords (sus2, sus4, add9)", { course: course("7", "sus-add9") }),
  t("intermediate", "diminished", "Diminished chords", { course: course("7", "diminished-chords") }),
  t("intermediate", "augmented", "Augmented chords", { buildsOn: ["diminished"], course: course("7", "augmented-chords") }),
  t("intermediate", "circle-of-fifths", "Circle of fifths", { buildsOn: ["chords-in-key"], course: course("10", "circle-map") }),
  t("intermediate", "hearing-changes", "Hearing chord changes", { buildsOn: ["chords-in-key"], course: course("5", "hearing-changes") }),
  t("intermediate", "harmonic-minor", "Harmonic minor", { buildsOn: ["natural-minor"], course: course("9", "harmonic-minor") }),
  t("intermediate", "ii-v-i", "ii–V–I", { buildsOn: ["seventh-chords"], course: course("11", "ii-v-i") }),
  t("intermediate", "chords-blues", "Chords in blues", { buildsOn: ["seventh-chords"], course: course("7", "twelve-bar") }),
  t("intermediate", "chords-pop-rock", "Chords in pop/rock", { buildsOn: ["chords-in-key"], course: course("7", "chords-in-pop-rock") }),
  t("intermediate", "chords-folk", "Chords in folk", { buildsOn: ["chords-in-key"], course: course("7", "chords-in-folk") }),
  t("advanced", "modes", "Modes (Dorian, Mixolydian, Phrygian)", { buildsOn: ["major-scale"], course: course("9", "modes") }),
  t("advanced", "lydian-locrian", "Lydian & Locrian", { buildsOn: ["modes"], course: course("9", "lydian-locrian") }),
  t("advanced", "melodic-minor", "Melodic minor", { buildsOn: ["harmonic-minor"], course: course("9", "melodic-minor") }),
  t("advanced", "extended-chords", "9ths & 13ths", { buildsOn: ["seventh-chords"], course: course("11", "extended") }),
  t("advanced", "guide-tones", "Guide tones", { buildsOn: ["ii-v-i"], course: course("11", "guide-tones") }),
  t("advanced", "changing-key", "Changing key", { buildsOn: ["circle-of-fifths"], course: course("10", "moving-keys") }),
  t("advanced", "chords-jazz", "Chords in jazz", { buildsOn: ["ii-v-i"], course: course("11", "jazz-standards") }),

  // Guitar
  g("new", "open-chords", "Open chords", { course: course("2", "em-and-am") }),
  g("new", "one-minute-changes", "One-minute changes", { buildsOn: ["open-chords"], course: course("2", "one-minute-changes") }),
  g("new", "strumming-patterns", "Strumming patterns", { course: course("2", "island-strum") }),
  g("new", "notes-e-a-strings", "Notes on the E and A strings", { course: course("1", "notes-on-e-and-a") }),
  g("new", "spider", "The spider", { course: course("1", "spider") }),
  g("new", "guitar-melodies-new", "Melodies (one string)", { course: course("4", "melodies") }),
  g("beginner", "power-chords", "Power chords", { course: course("5", "power-chords") }),
  g("beginner", "pentatonic-box-1", "Pentatonic box 1", { course: course("5", "pentatonic") }),
  g("beginner", "guitar-melodies-beginner", "Melodies (open position, a few strings)", { buildsOn: ["guitar-melodies-new"], course: course("4", "do-mi-sol-neck") }),
  g("beginner", "top-string-triads", "Triads on the top strings", { course: course("5", "triads") }),
  g("beginner", "bm-f-barre", "Bm/F barre", { buildsOn: ["open-chords"], course: course("6", "bm-barre") }),
  g("intermediate", "sus-add9-shapes", "Sus & add9 shapes", { buildsOn: ["open-chords"], course: course("7", "sus-add9") }),
  g("intermediate", "five-pentatonic-boxes", "All five pentatonic boxes", { buildsOn: ["pentatonic-box-1"], course: course("8", "pentatonic-boxes") }),
  g("intermediate", "caged", "CAGED shapes", { buildsOn: ["bm-f-barre"], course: course("8", "d-c-a-shapes") }),
  g("intermediate", "arpeggios-position", "Arpeggios in a position", { course: course("6", "arpeggios") }),
  g("intermediate", "bends-slides", "Bends & slides", { buildsOn: ["pentatonic-box-1"], course: course("5", "bends-and-slides") }),
  g("intermediate", "hammer-pull", "Hammer-ons & pull-offs", { course: course("4", "legato") }),
  g("intermediate", "joining-positions", "Joining positions", { buildsOn: ["pentatonic-box-1"], course: course("6", "joining") }),
  g("intermediate", "guitar-melodies-intermediate", "Melodies (up the neck, eighths and dotted notes)", { buildsOn: ["guitar-melodies-beginner"], course: course("8", "greensleeves") }),
  g("advanced", "modes-on-neck", "Modes on the neck", { buildsOn: ["caged"], course: course("9", "modes-over-drone") }),
  g("advanced", "triads-every-set", "Triads on every string set", { buildsOn: ["top-string-triads"], course: course("8", "triads-everywhere") }),
  g("advanced", "find-every-note", "Finding every note", { buildsOn: ["notes-e-a-strings"], course: course("8", "every-note") }),
  g("advanced", "string-skipping", "String skipping", { course: course("8", "string-skipping") }),
  g("advanced", "shells-comping", "Shells & comping", { course: course("11", "comping") }),
  g("advanced", "guitar-melodies-advanced", "Melodies (shifting positions, modal tunes)", { buildsOn: ["guitar-melodies-intermediate"], course: course("9", "scarborough-fair") }),

  // Voice
  v("new", "matching-a-pitch", "Matching a pitch", { course: course("3", "matching-a-pitch") }),
  v("new", "do-re-mi-steps", "Do Re Mi steps", { course: course("3", "step-melodies") }),
  v("new", "breath-holding-note", "Breath & holding a note", { course: course("3", "breath-and-holding-a-note") }),
  v("beginner", "do-mi-sol-skips", "Do Mi Sol skips", { buildsOn: ["do-re-mi-steps"], course: course("3", "do-mi-sol") }),
  v("beginner", "in-tune-over-drone", "In tune over a drone", { buildsOn: ["matching-a-pitch"], course: course("3", "home-note") }),
  v("beginner", "singing-intervals", "Singing intervals", { buildsOn: ["do-mi-sol-skips"], course: course("6", "every-interval") }),
  v("beginner", "voice-melodies-easy", "Melodies (easy)", { buildsOn: ["do-re-mi-steps"], course: course("3", "step-melodies") }),
  v("intermediate", "leaps", "Leaps (4th, 5th, octave)", { buildsOn: ["singing-intervals"], course: course("6", "singing-leaps") }),
  v("intermediate", "sight-singing", "Sight-singing melodies", { buildsOn: ["voice-melodies-easy"], course: course("6", "sight-singing") }),
  v("intermediate", "harmony-line", "A harmony line over chords", { course: course("6", "harmony-line") }),
  v("intermediate", "runs", "Runs", { course: course("6", "vocal-runs") }),
  v("advanced", "fast-runs", "Fast runs", { buildsOn: ["runs"], course: course("9", "fast-runs") }),
  v("advanced", "stretch-range", "Stretching your range", { course: course("9", "stretching-your-range") }),
  v("advanced", "improvise-melody", "Improvising a melody over chords", { buildsOn: ["sight-singing"], course: course("9", "improvising-a-melody") }),
];

export const conceptById = (id: string): Concept | undefined => CONCEPTS.find((x) => x.id === id);

/** The area's concepts at this level and the one below, in catalogue order. */
export function conceptsFor(area: Area, level: Level): Concept[] {
  const top = LEVELS.indexOf(level);
  return CONCEPTS.filter((x) => x.area === area && LEVELS.indexOf(x.level) >= top - 1 && LEVELS.indexOf(x.level) <= top);
}

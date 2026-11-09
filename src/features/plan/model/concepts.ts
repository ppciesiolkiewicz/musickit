import type { Level } from "./types";

export type Area = "guitar" | "voice" | "theory";

/** One thing a player can know or learn. Exercises are tagged with these; the questionnaire asks about their topics. */
export interface Concept {
  id: string;
  area: Area;
  level: Level;
  label: string;
  /** The questionnaire topic it belongs to (intake/topics.ts), always one of its own area. */
  topic: string;
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

function c(area: Area, level: Level, id: string, label: string, topic: string, extra: { hint?: string; buildsOn?: string[]; course?: string } = {}): Concept {
  return { id, area, level, label, topic, ...extra };
}
const t = (level: Level, id: string, label: string, topic: string, extra?: Parameters<typeof c>[5]) => c("theory", level, id, label, topic, extra);
const g = (level: Level, id: string, label: string, topic: string, extra?: Parameters<typeof c>[5]) => c("guitar", level, id, label, topic, extra);
const v = (level: Level, id: string, label: string, topic: string, extra?: Parameters<typeof c>[5]) => c("voice", level, id, label, topic, extra);

/** Every concept, per area from easiest to hardest. The order is the order shown in the questionnaire. */
export const CONCEPTS: Concept[] = [
  // Theory & ear
  t("new", "do-as-home", "Do as home", "theory-ear", { course: course("3", "home-note") }),
  t("new", "major-vs-minor", "Major vs minor by ear", "theory-ear", { course: course("3", "major-or-minor") }),
  t("new", "steady-beat", "Steady beat", "theory-basics", { course: course("1", "steady-beat") }),
  t("new", "note-names", "Note names", "theory-basics", { course: course("1", "notes-on-e-and-a") }),
  t("beginner", "pentatonic", "Pentatonic (minor & major)", "theory-scales-keys", { course: course("5", "pentatonic") }),
  t("beginner", "major-scale", "Major scale", "theory-scales-keys", { buildsOn: ["pentatonic"], course: course("3", "do-re-mi") }),
  t("beginner", "natural-minor", "Natural minor scale", "theory-scales-keys", { buildsOn: ["major-scale"], course: course("9", "modes") }),
  t("beginner", "intervals", "Intervals within an octave", "theory-ear", { course: course("3", "intervals") }),
  t("beginner", "chords-in-key", "Chords in a key (1-4-5)", "theory-progressions", { buildsOn: ["major-scale"], course: course("5", "one-four-five") }),
  t("intermediate", "relative-major-minor", "Relative major/minor", "theory-scales-keys", { buildsOn: ["natural-minor"], course: course("3", "la-minor-home") }),
  t("intermediate", "seventh-chords", "7th chords", "theory-building-chords", { course: course("7", "sevenths") }),
  t("intermediate", "sus-chords", "Sus chords (sus2, sus4, add9)", "theory-building-chords", { course: course("7", "sus-add9") }),
  t("intermediate", "diminished", "Diminished chords", "theory-building-chords", { course: course("7", "diminished-chords") }),
  t("intermediate", "augmented", "Augmented chords", "theory-building-chords", { buildsOn: ["diminished"], course: course("7", "augmented-chords") }),
  t("intermediate", "circle-of-fifths", "Circle of fifths", "theory-scales-keys", { buildsOn: ["chords-in-key"], course: course("10", "circle-map") }),
  t("intermediate", "hearing-changes", "Hearing chord changes", "theory-ear", { buildsOn: ["chords-in-key"], course: course("5", "hearing-changes") }),
  t("intermediate", "harmonic-minor", "Harmonic minor", "theory-modes", { buildsOn: ["natural-minor"], course: course("9", "harmonic-minor") }),
  t("intermediate", "ii-v-i", "ii–V–I", "theory-progressions", { buildsOn: ["seventh-chords"], course: course("11", "ii-v-i") }),
  t("intermediate", "chords-blues", "Chords in blues", "theory-progressions", { buildsOn: ["seventh-chords"], course: course("7", "twelve-bar") }),
  t("intermediate", "chords-pop-rock", "Chords in pop/rock", "theory-progressions", { buildsOn: ["chords-in-key"], course: course("7", "chords-in-pop-rock") }),
  t("intermediate", "chords-folk", "Chords in folk", "theory-progressions", { buildsOn: ["chords-in-key"], course: course("7", "chords-in-folk") }),
  t("advanced", "modes", "Modes (Dorian, Mixolydian, Phrygian)", "theory-modes", { buildsOn: ["major-scale"], course: course("9", "modes") }),
  t("advanced", "lydian-locrian", "Lydian & Locrian", "theory-modes", { buildsOn: ["modes"], course: course("9", "lydian-locrian") }),
  t("advanced", "melodic-minor", "Melodic minor", "theory-modes", { buildsOn: ["harmonic-minor"], course: course("9", "melodic-minor") }),
  t("advanced", "extended-chords", "9ths & 13ths", "theory-building-chords", { buildsOn: ["seventh-chords"], course: course("11", "extended") }),
  t("advanced", "guide-tones", "Guide tones", "theory-progressions", { buildsOn: ["ii-v-i"], course: course("11", "guide-tones") }),
  t("advanced", "changing-key", "Changing key", "theory-scales-keys", { buildsOn: ["circle-of-fifths"], course: course("10", "moving-keys") }),
  t("advanced", "chords-jazz", "Chords in jazz", "theory-progressions", { buildsOn: ["ii-v-i"], course: course("11", "jazz-standards") }),

  // Guitar
  g("new", "open-chords", "Open chords", "guitar-basic-chords", { course: course("2", "em-and-am") }),
  g("new", "one-minute-changes", "One-minute changes", "guitar-basic-chords", { buildsOn: ["open-chords"], course: course("2", "one-minute-changes") }),
  g("new", "strumming-patterns", "Strumming patterns", "guitar-basic-chords", { course: course("2", "island-strum") }),
  g("new", "notes-e-a-strings", "Notes on the E and A strings", "guitar-scales", { course: course("1", "notes-on-e-and-a") }),
  g("new", "spider", "The spider", "guitar-techniques", { course: course("1", "spider") }),
  g("new", "guitar-melodies-new", "Melodies (one string)", "guitar-scales", { course: course("4", "melodies") }),
  g("beginner", "power-chords", "Power chords", "guitar-basic-chords", { course: course("5", "power-chords") }),
  g("beginner", "pentatonic-box-1", "Pentatonic box 1", "guitar-scales", { course: course("5", "pentatonic") }),
  g("beginner", "guitar-melodies-beginner", "Melodies (open position, a few strings)", "guitar-scales", { buildsOn: ["guitar-melodies-new"], course: course("4", "do-mi-sol-neck") }),
  g("beginner", "top-string-triads", "Triads on the top strings", "guitar-caged", { course: course("5", "triads") }),
  g("beginner", "bm-f-barre", "Bm/F barre", "guitar-barre-chords", { buildsOn: ["open-chords"], course: course("6", "bm-barre") }),
  g("intermediate", "sus-add9-shapes", "Sus & add9 shapes", "guitar-extended-chords", { buildsOn: ["open-chords"], course: course("7", "sus-add9") }),
  g("intermediate", "five-pentatonic-boxes", "All five pentatonic boxes", "guitar-scales", { buildsOn: ["pentatonic-box-1"], course: course("8", "pentatonic-boxes") }),
  g("intermediate", "caged", "CAGED shapes", "guitar-caged", { buildsOn: ["bm-f-barre"], course: course("8", "d-c-a-shapes") }),
  g("intermediate", "arpeggios-position", "Arpeggios in a position", "guitar-caged", { course: course("6", "arpeggios") }),
  g("intermediate", "bends-slides", "Bends & slides", "guitar-techniques", { buildsOn: ["pentatonic-box-1"], course: course("5", "bends-and-slides") }),
  g("intermediate", "hammer-pull", "Hammer-ons & pull-offs", "guitar-techniques", { course: course("4", "legato") }),
  g("intermediate", "joining-positions", "Joining positions", "guitar-scales", { buildsOn: ["pentatonic-box-1"], course: course("6", "joining") }),
  g("intermediate", "guitar-melodies-intermediate", "Melodies (up the neck, eighths and dotted notes)", "guitar-scales", { buildsOn: ["guitar-melodies-beginner"], course: course("8", "greensleeves") }),
  g("advanced", "modes-on-neck", "Modes on the neck", "guitar-scales", { buildsOn: ["caged"], course: course("9", "modes-over-drone") }),
  g("advanced", "triads-every-set", "Triads on every string set", "guitar-caged", { buildsOn: ["top-string-triads"], course: course("8", "triads-everywhere") }),
  g("advanced", "find-every-note", "Finding every note", "guitar-scales", { buildsOn: ["notes-e-a-strings"], course: course("8", "every-note") }),
  g("advanced", "string-skipping", "String skipping", "guitar-techniques", { course: course("8", "string-skipping") }),
  g("advanced", "shells-comping", "Shells & comping", "guitar-extended-chords", { course: course("11", "comping") }),
  g("advanced", "guitar-melodies-advanced", "Melodies (shifting positions, modal tunes)", "guitar-scales", { buildsOn: ["guitar-melodies-intermediate"], course: course("9", "scarborough-fair") }),

  // Voice
  v("new", "matching-a-pitch", "Matching a pitch", "voice-pitch", { course: course("3", "matching-a-pitch") }),
  v("new", "do-re-mi-steps", "Do Re Mi steps", "voice-intervals", { course: course("3", "step-melodies") }),
  v("new", "breath-holding-note", "Breath & holding a note", "voice-breath-range", { course: course("3", "breath-and-holding-a-note") }),
  v("beginner", "do-mi-sol-skips", "Do Mi Sol skips", "voice-intervals", { buildsOn: ["do-re-mi-steps"], course: course("3", "do-mi-sol") }),
  v("beginner", "in-tune-over-drone", "In tune over a drone", "voice-pitch", { buildsOn: ["matching-a-pitch"], course: course("3", "home-note") }),
  v("beginner", "singing-intervals", "Singing intervals", "voice-intervals", { buildsOn: ["do-mi-sol-skips"], course: course("6", "every-interval") }),
  v("beginner", "voice-melodies-easy", "Melodies (easy)", "voice-melodies", { buildsOn: ["do-re-mi-steps"], course: course("3", "step-melodies") }),
  v("intermediate", "leaps", "Leaps (4th, 5th, octave)", "voice-intervals", { buildsOn: ["singing-intervals"], course: course("6", "singing-leaps") }),
  v("intermediate", "sight-singing", "Sight-singing melodies", "voice-melodies", { buildsOn: ["voice-melodies-easy"], course: course("6", "sight-singing") }),
  v("intermediate", "harmony-line", "A harmony line over chords", "voice-harmony", { course: course("6", "harmony-line") }),
  v("intermediate", "runs", "Runs", "voice-runs", { course: course("6", "vocal-runs") }),
  v("advanced", "fast-runs", "Fast runs", "voice-runs", { buildsOn: ["runs"], course: course("9", "fast-runs") }),
  v("advanced", "stretch-range", "Stretching your range", "voice-breath-range", { course: course("9", "stretching-your-range") }),
  v("advanced", "improvise-melody", "Improvising a melody over chords", "voice-harmony", { buildsOn: ["sight-singing"], course: course("9", "improvising-a-melody") }),
];

export const conceptById = (id: string): Concept | undefined => CONCEPTS.find((x) => x.id === id);

/** The concepts of one questionnaire topic, in catalogue order. */
export const conceptsOf = (topicId: string): Concept[] => CONCEPTS.filter((x) => x.topic === topicId);

/** The area's concepts at this level and the one below, in catalogue order. */
export function conceptsFor(area: Area, level: Level): Concept[] {
  const top = LEVELS.indexOf(level);
  return CONCEPTS.filter((x) => x.area === area && LEVELS.indexOf(x.level) >= top - 1 && LEVELS.indexOf(x.level) <= top);
}

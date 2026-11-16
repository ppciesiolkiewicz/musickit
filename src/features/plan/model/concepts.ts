import { PATH, spanOf, type PathStep, type Track } from "./path";
import type { Level } from "./types";

export type Area = "guitar" | "voice" | "theory";

/**
 * One thing a player can know or learn: a track of the learning path (path.ts), with its steps. Exercises are tagged
 * with these; the questionnaire asks about their topics.
 */
export interface Concept {
  id: string;
  area: Area;
  /** the level of its first step; `levels` is every level its steps reach */
  level: Level;
  levels: Level[];
  label: string;
  /** The questionnaire topic it belongs to (intake/topics.ts), always one of its own area. */
  topic: string;
  /** Course section page it is taught on: the first of its merged concepts' that has one. */
  course?: string;
  /** easiest first; each with its own level */
  steps: PathStep[];
  /** the concept ids from before the path that it took the place of */
  merges: string[];
}

export const AREAS: { id: Area; label: string }[] = [
  { id: "guitar", label: "Guitar" },
  { id: "voice", label: "Voice" },
  { id: "theory", label: "Theory & ear" },
];

const LEVELS: Level[] = ["new", "beginner", "intermediate", "advanced"];

const course = (stage: string, section: string) => `/course/${stage}/${section}`;

/** The course page of each concept id from before the path (2026-11-16), for the track that took its place. */
const OLD_COURSES: Record<string, string | undefined> = {
  "do-as-home": course("3", "home-note"),
  "major-vs-minor": course("3", "major-or-minor"),
  "steady-beat": course("1", "steady-beat"),
  "note-names": course("1", "notes-on-e-and-a"),
  "pentatonic": course("5", "pentatonic"),
  "major-scale": course("3", "do-re-mi"),
  "natural-minor": course("9", "modes"),
  "intervals": course("3", "intervals"),
  "chords-in-key": course("5", "one-four-five"),
  "relative-major-minor": course("3", "la-minor-home"),
  "seventh-chords": course("7", "sevenths"),
  "sus-chords": course("7", "sus-add9"),
  "diminished": course("7", "diminished-chords"),
  "augmented": course("7", "augmented-chords"),
  "circle-of-fifths": course("10", "circle-map"),
  "hearing-changes": course("5", "hearing-changes"),
  "harmonic-minor": course("9", "harmonic-minor"),
  "ii-v-i": course("11", "ii-v-i"),
  "chords-blues": course("7", "twelve-bar"),
  "chords-pop-rock": course("7", "chords-in-pop-rock"),
  "chords-folk": course("7", "chords-in-folk"),
  "modes": course("9", "modes"),
  "lydian-locrian": course("9", "lydian-locrian"),
  "melodic-minor": course("9", "melodic-minor"),
  "extended-chords": course("11", "extended"),
  "guide-tones": course("11", "guide-tones"),
  "changing-key": course("10", "moving-keys"),
  "chords-jazz": course("11", "jazz-standards"),
  "open-chords": course("2", "em-and-am"),
  "one-minute-changes": course("2", "one-minute-changes"),
  "strumming-patterns": course("2", "island-strum"),
  "notes-e-a-strings": course("1", "notes-on-e-and-a"),
  "spider": course("1", "spider"),
  "guitar-melodies-new": course("4", "melodies"),
  "power-chords": course("5", "power-chords"),
  "pentatonic-box-1": course("5", "pentatonic"),
  "guitar-melodies-beginner": course("4", "do-mi-sol-neck"),
  "top-string-triads": course("5", "triads"),
  "bm-f-barre": course("6", "bm-barre"),
  "sus-add9-shapes": course("7", "sus-add9"),
  "five-pentatonic-boxes": course("8", "pentatonic-boxes"),
  "caged": course("8", "d-c-a-shapes"),
  "arpeggios-position": course("6", "arpeggios"),
  "bends-slides": course("5", "bends-and-slides"),
  "hammer-pull": course("4", "legato"),
  "joining-positions": course("6", "joining"),
  "guitar-melodies-intermediate": course("8", "greensleeves"),
  "modes-on-neck": course("9", "modes-over-drone"),
  "triads-every-set": course("8", "triads-everywhere"),
  "find-every-note": course("8", "every-note"),
  "string-skipping": course("8", "string-skipping"),
  "shells-comping": course("11", "comping"),
  "guitar-melodies-advanced": course("9", "scarborough-fair"),
  "matching-a-pitch": course("3", "matching-a-pitch"),
  "do-re-mi-steps": course("3", "step-melodies"),
  "breath-holding-note": course("3", "breath-and-holding-a-note"),
  "do-mi-sol-skips": course("3", "do-mi-sol"),
  "in-tune-over-drone": course("3", "home-note"),
  "singing-intervals": course("6", "every-interval"),
  "voice-melodies-easy": course("3", "step-melodies"),
  "leaps": course("6", "singing-leaps"),
  "sight-singing": course("6", "sight-singing"),
  "harmony-line": course("6", "harmony-line"),
  "runs": course("6", "vocal-runs"),
  "fast-runs": course("9", "fast-runs"),
  "stretch-range": course("9", "stretching-your-range"),
  "improvise-melody": course("9", "improvising-a-melody"),
};

function conceptOf(t: Track): Concept {
  const [from, to] = spanOf(t);
  const first = t.merges.map((id) => OLD_COURSES[id]).find(Boolean);
  return { id: t.id, area: t.area, level: t.steps[0].level, levels: LEVELS.slice(from, to + 1), label: t.label, topic: t.topic, ...(first ? { course: first } : {}), steps: t.steps, merges: t.merges };
}

/** Every concept, per area, in questionnaire topic order: the tracks of the path. */
export const CONCEPTS: Concept[] = PATH.map(conceptOf);

/** A concept id from before the path, to the track that took its place; ids that are both map to themselves. */
export const OLD_CONCEPT_IDS: Record<string, string> = Object.fromEntries(PATH.flatMap((t) => t.merges.map((id) => [id, t.id])));

/** The concept an id names: a track's id, or a concept id from before the path, which maps to its track. */
export const conceptId = (id: string): string | undefined => (CONCEPTS.some((c) => c.id === id) ? id : OLD_CONCEPT_IDS[id]);

export const conceptById = (id: string): Concept | undefined => {
  const at = conceptId(id);
  return at === undefined ? undefined : CONCEPTS.find((x) => x.id === at);
};

/** Ids as known concepts: old ids mapped to their track, unknown ones dropped, each once, in the order given. */
export const conceptIds = (ids: readonly string[]): string[] => [...new Set(ids.map(conceptId).filter((x): x is string => !!x))];

/** The concepts of one questionnaire topic, in catalogue order. */
export const conceptsOf = (topicId: string): Concept[] => CONCEPTS.filter((x) => x.topic === topicId);


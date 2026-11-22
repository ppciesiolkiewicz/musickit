import { CLAP_ALONG_LEVELS, DOUBLE_STOPS_NECK_LEVELS, FARINELLI_LEVELS, FINGER_PATTERN_LEVELS, INTERVAL_EARS_LEVELS, INTERVAL_SINGER_LEVELS, LEGATO_TRILL_LEVELS, NOTE_FINDER_LEVELS, PICKING_DRILL_LEVELS, STAFF_READING_LEVELS, STRING_SINGER_LEVELS, TOOL_LEVELS, VOWEL_GUIDE_LEVELS, type ToolLevel } from "@/features/exercises/basics/levels";
import { intervalName } from "@/features/theory/singingIntervals";
import { BOOK, DIFFICULTIES, RUNS, RUN_STAGES, STAGES } from "@/features/theory/singingMelodies";
import { CHANGE_LEVELS, EAR_LEVELS, TOP_EAR_LEVEL, earKindOf, parseEarSettings } from "@/lib/practice/earGame";
import { patternById } from "@/features/rhythm/patterns";
import { DYAD_DEFAULT_STRINGS } from "@/features/exercises/basics/double-stops-neck/walk";
import { DYAD_MAX_FRET } from "@/lib/chordKit/scaleChords";
import { INTERVAL_STEPS_HELD, intervalStep } from "@/features/exercises/shapes/interval";
import { octaveLeap } from "@/features/theory/singingMelodies";
import { OPEN_CHORDS, chartStep } from "@/features/exercises/basics/song-chart/chart";
import { notesOf, type ReadingSet } from "@/features/exercises/basics/staff-reading/reading";
import { VOWEL_CLIMBS, type VowelClimb } from "@/features/exercises/basics/vowel-guide/vowels";
import type { PlanTool } from "./tools";

/*
 * Ladders: the levels the code already has for one thing (a tool's levels in exercises/basics/levels.ts, the ear game's
 * levels, the stages of the tune and run books). A step of the path (path.ts) that one of these stands for names it as
 * "ladderId:key", and its step is read back from an exercise's tools through the ladder's `read`. Never restate a
 * ladder's steps elsewhere.
 */

export interface Step {
  /** the step's own name in its ladder: a level, a stage title */
  name: string;
  /** what it holds, in a few words */
  holds: string;
}

/** A ladder the code already has, easiest step first. */
export interface Ladder {
  id: string;
  label: string;
  /** the file that holds it */
  file: string;
  steps: (Step & { key: string })[];
  /** the key of the step a tool of a plan is set to, or null when the tool is not this ladder's or says no step */
  read?: (tool: PlanTool) => string | null;
}

const LEVELS_FILE = "src/features/exercises/basics/levels.ts";
/** A tool's ladder: the step is the `level` the plan's parser keeps on the tool. */
const byLevel = (id: string, type: PlanTool["type"], label: string, holds: (level: (typeof TOOL_LEVELS)[number]) => string, also: (tool: PlanTool) => boolean = () => true): Ladder => ({
  id, label, file: LEVELS_FILE,
  steps: TOOL_LEVELS.map((level) => ({ key: level, name: level, holds: holds(level) })),
  read: (tool) => (tool.type === type && also(tool) && "level" in tool && typeof tool.level === "string" ? tool.level : null),
});
/** A book's ladder: the step is the stage of the tune or run the tool plays. */
const stages = (id: string, label: string, list: { id: string; title: string; hint: string }[], read: Ladder["read"]): Ladder =>
  ({ id, label, file: "src/features/theory/singingMelodies.ts", steps: list.map((s) => ({ key: s.id, name: s.title, holds: s.hint })), read });

/** double-stops-neck: a level's frets in words, and the levels that stay low on the neck (the same frets as "new"). */
const fretsOf = (l: ToolLevel) => `frets ${DOUBLE_STOPS_NECK_LEVELS[l].from} to ${DOUBLE_STOPS_NECK_LEVELS[l].to}`;
const LOW_LEVELS = TOOL_LEVELS.filter((l) => DOUBLE_STOPS_NECK_LEVELS[l].to === DOUBLE_STOPS_NECK_LEVELS.new.to);

/** staff-reading: a set's notes in the treble clef, low to high, as letters. */
const trebleNotes = (set: ReadingSet) => notesOf("treble", set).map((n) => n.letter).join(" ");

/** vowel-guide: what each climb holds, and the levels that stand for it. */
const CLIMB_HOLDS: Record<VowelClimb, string> = {
  "one-note": "every vowel on one easy note low in the voice",
  "to-break": "every vowel on four notes, from the easy note up to the first break",
  "across-break": "every vowel on four notes, from the first break up to the second",
};
const levelsOf = (c: VowelClimb) => TOOL_LEVELS.filter((l) => VOWEL_GUIDE_LEVELS[l] === c).join(", ");

/** Every ladder in the code that says what a level holds. */
export const LADDERS: Ladder[] = [
  byLevel("interval-singer", "interval-singer", "interval-singer levels", (l) => {
    const { intervals, dir, random } = INTERVAL_SINGER_LEVELS[l];
    return `${intervals.map((s) => intervalName(s).replace(/ up$/, "")).join(", ")}; ${dir === "both" ? "up and down" : "up"}${random ? "; Do in a random key" : ""}`;
  }),
  {
    id: "interval-ears", label: "interval-ears levels", file: "src/lib/practice/earGame.ts",
    steps: EAR_LEVELS.map((l) => ({ key: String(l.n), name: `Level ${l.n}`, holds: l.label })),
    // the word a plan writes stands for one of the game's own levels; one over the top is the top. A level written as the
    // game's own number has no word: it is read from the tool's query (`level=3`)
    read: (tool) => {
      // a chord-change game is the chord-changes ladder's
      if (tool.type !== "interval-ears" || earKindOf(tool.query) === "change") return null;
      const n = tool.level ? INTERVAL_EARS_LEVELS[tool.level] : Number(/(?:^|&)level=(\d+)(?:&|$)/.exec(tool.query)?.[1]);
      return Number.isInteger(n) && n >= 1 ? String(Math.min(TOP_EAR_LEVEL, n)) : null;
    },
  },
  // the hearing-changes track's ladder: interval-ears asked for chord changes (kind "change"). The step is the game's own
  // level, read from the tool's query as the game reads it (a level word is already written there as its number)
  {
    id: "chord-changes", label: "interval-ears chord-change levels", file: "src/lib/practice/earGame.ts",
    steps: CHANGE_LEVELS.map((l) => ({ key: String(l.n), name: `Level ${l.n}`, holds: l.label })),
    read: (tool) => (tool.type === "interval-ears" && earKindOf(tool.query) === "change" ? String(parseEarSettings(new URLSearchParams(tool.query)).level) : null),
  },
  byLevel("note-finder", "note-finder", "note-finder levels", (l) => {
    const { strings, from, to, naturals } = NOTE_FINDER_LEVELS[l];
    return `strings ${strings.split(",").join(" ")}; frets ${from} to ${to}; ${naturals ? "natural notes only" : "sharps and flats too"}`;
  }),
  byLevel("string-singer", "string-singer", "string-singer levels", (l) => `drill "${STRING_SINGER_LEVELS[l]}"`),
  byLevel("farinelli", "breathwork", "breathwork (farinelli) levels", (l) => `counts from ${FARINELLI_LEVELS[l].from} to ${FARINELLI_LEVELS[l].to}`, (t) => t.type === "breathwork" && (t.drill == null || t.drill === "farinelli")),
  byLevel("finger-pattern", "finger-pattern", "finger-pattern levels", (l) => `fingers ${FINGER_PATTERN_LEVELS[l].fingers} from fret ${FINGER_PATTERN_LEVELS[l].fret}`),
  byLevel("picking-drill", "picking-drill", "picking-drill levels", (l) => {
    const { strokes, notesPerString, skip } = PICKING_DRILL_LEVELS[l];
    return `strokes ${strokes}; ${notesPerString} notes a string${skip ? "; skips a string" : ""}`;
  }),
  byLevel("legato-trill", "legato-trill", "legato-trill levels", (l) => `fingers ${LEGATO_TRILL_LEVELS[l].split("").join(" and ")}`),
  // the beat track's ladder. The step is the level only while the tool still plays the level's own rhythm: a clap-along
  // written with another `pattern` beside its level says no step
  byLevel("clap-along", "clap-along", "clap-along levels", (l) => {
    const p = patternById(CLAP_ALONG_LEVELS[l]);
    return `${p.name.toLowerCase()}: ${p.hint}`;
  }, (t) => t.type === "clap-along" && !!t.level && t.pattern === CLAP_ALONG_LEVELS[t.level]),
  // the double-stops track's ladder: double-stops-neck. Its level says how far up the neck (low, or up it); the interval
  // and the strings are the tool's own. Low on the neck the step is the interval on its home strings (3rds on 3 and 2,
  // 6ths on 3 and 1); up the neck it is one step for either, on any pair. As on clap-along, the step is read only while
  // the tool still holds its level's own frets: raw `from` and `to` say no step
  {
    id: "double-stops-neck", label: "double-stops-neck levels", file: LEVELS_FILE,
    steps: [
      { key: "3rds", name: "3rds, low", holds: `3rds on strings ${DYAD_DEFAULT_STRINGS["3rds"].split("").join(" and ")}, ${fretsOf("beginner")} (levels new and beginner)` },
      { key: "6ths", name: "6ths, low", holds: `6ths on strings ${DYAD_DEFAULT_STRINGS["6ths"].split("").join(" and ")}, ${fretsOf("beginner")} (levels new and beginner)` },
      { key: "up", name: "Up the neck", holds: `3rds or 6ths on any pair of strings, ${fretsOf("intermediate")} (level intermediate) or ${fretsOf("advanced")} (advanced)` },
    ],
    read: (tool) => {
      if (tool.type !== "double-stops-neck" || !tool.level) return null;
      const { from, to } = DOUBLE_STOPS_NECK_LEVELS[tool.level];
      if ((tool.from ?? 0) !== from || (tool.to ?? DYAD_MAX_FRET) !== to) return null;
      if (!LOW_LEVELS.includes(tool.level)) return "up";
      return tool.strings === DYAD_DEFAULT_STRINGS[tool.interval] ? tool.interval : null;
    },
  },
  // the reading-the-staff track's ladder: staff-reading. In the treble clef the step is the level's own set of notes
  // (lines, spaces, ledger lines, all); in the bass clef it is one step at any level. As on clap-along, the step is read
  // only while the tool still asks its level's own notes: another `notes` beside the level, or none, says no step
  {
    id: "staff-reading", label: "staff-reading levels", file: LEVELS_FILE,
    steps: [
      ...TOOL_LEVELS.map((l) => ({ key: STAFF_READING_LEVELS[l], name: `${STAFF_READING_LEVELS[l]} (level ${l})`, holds: `treble clef: ${trebleNotes(STAFF_READING_LEVELS[l])}` })),
      { key: "bass", name: "bass clef", holds: "the bass clef at any level: its lines, spaces, ledger lines or all" },
    ],
    read: (tool) => (tool.type !== "staff-reading" || !tool.level || tool.notes !== STAFF_READING_LEVELS[tool.level] ? null : tool.clef === "bass" ? "bass" : tool.notes),
  },
  // the vowels track's ladder: vowel-guide. Its step is how far the notes climb, and two levels (new, beginner) stand for
  // the first. As on staff-reading, the step is read only while the tool still climbs as its level says: another
  // `climb` beside the level, or no level, says no step
  {
    id: "vowel-guide", label: "vowel-guide levels", file: LEVELS_FILE,
    steps: VOWEL_CLIMBS.map((c) => ({ key: c, name: `${c} (level ${levelsOf(c)})`, holds: CLIMB_HOLDS[c] })),
    read: (tool) => (tool.type !== "vowel-guide" || !tool.level || tool.climb !== VOWEL_GUIDE_LEVELS[tool.level] ? null : tool.climb),
  },
  // song-chart has no levels: its step is read from the chart itself (`chartStep`). A song of open chords to play
  // through is the last step of the open-chords track; a chart whose chord names start hidden is the last step of
  // hearing-changes. Any other chart (five chords, a bar of two chords, one section) says no step
  {
    id: "song-chart", label: "song-chart charts", file: "src/features/exercises/basics/song-chart/chart.ts",
    steps: [
      { key: "four-chords", name: "Four open chords", holds: `the chords shown; two different sections or more, one chord a bar, four different chords at most, each one of ${OPEN_CHORDS.join(", ")}` },
      { key: "by-ear", name: "By ear", holds: "the chord names start hidden (hide), shown by the student to check" },
    ],
    read: (tool) => (tool.type === "song-chart" ? chartStep(tool.sections, tool.form, tool.hide === true) : null),
  },
  // the intervals-on-neck track's ladder: guitar-play-along with an `interval` shape. Like song-chart it has no levels:
  // the step is read from the shape itself (`intervalStep`): which intervals, on which strings, through the scale or from
  // one note. A set-up that is no step's own (5ths with 3rds, octaves along one string) says no step
  {
    id: "intervals-on-neck", label: "guitar-play-along interval shapes", file: "src/features/exercises/shapes/interval.ts",
    steps: INTERVAL_STEPS_HELD.map((s) => ({ ...s })),
    read: (tool) => (tool.type === "guitar-play-along" ? intervalStep(tool.shape) : null),
  },
  // the last step of the guitar Melodies track: guitar-play-along with a `melody` shape whose tune leaps an octave from
  // one note to the next (read from the tune book, `octaveLeap`), as written or an octave higher (`octave`)
  {
    id: "guitar-tunes", label: "guitar-play-along tunes", file: "src/features/theory/singingMelodies.ts",
    steps: [{ key: "octave-leap", name: "A tune with an octave leap", holds: `a tune of the book that leaps an octave between two notes (tunes ${BOOK.filter((b) => octaveLeap(b.notes)).map((b) => b.n).join(", ")}), where it is written or an octave higher ("octave": 1)` }],
    read: (tool) => {
      if (tool.type !== "guitar-play-along" || tool.shape.shape !== "melody") return null;
      const { tune } = tool.shape;
      return BOOK.some((b) => b.n === tune && octaveLeap(b.notes)) ? "octave-leap" : null;
    },
  },
  stages("melody-stages", "melody-singer stages", STAGES, (t) => (t.type === "melody-singer" ? BOOK.find((b) => b.n === t.tune)?.stage.id ?? null : null)),
  stages("run-stages", "run-singer stages", RUN_STAGES, (t) => (t.type === "run-singer" ? RUNS.find((b) => b.n === t.run)?.stage.id ?? null : null)),
  { id: "melody-difficulty", label: "melody difficulties", file: "src/features/theory/singingMelodies.ts", steps: DIFFICULTIES.map((d) => ({ key: d.title, name: d.title, holds: d.hint })) },
];

/** The ladder and its step that a ref "ladderId:key" points at. */
export function ladderStep(ref: string): { ladder: Ladder; step: Ladder["steps"][number] } | undefined {
  const [id, key] = ref.split(":");
  const ladder = LADDERS.find((l) => l.id === id);
  const step = ladder?.steps.find((x) => x.key === key);
  return ladder && step ? { ladder, step } : undefined;
}

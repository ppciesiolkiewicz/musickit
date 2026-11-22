import { CLAP_ALONG_LEVELS, DOUBLE_STOPS_NECK_LEVELS, FARINELLI_LEVELS, FINGER_PATTERN_LEVELS, INTERVAL_EARS_LEVELS, INTERVAL_SINGER_LEVELS, LEGATO_TRILL_LEVELS, NOTE_FINDER_LEVELS, PICKING_DRILL_LEVELS, STRING_SINGER_LEVELS, TOOL_LEVELS, type ToolLevel } from "@/features/exercises/basics/levels";
import { intervalName } from "@/features/theory/singingIntervals";
import { BOOK, DIFFICULTIES, RUNS, RUN_STAGES, STAGES } from "@/features/theory/singingMelodies";
import { CHANGE_LEVELS, EAR_LEVELS, TOP_EAR_LEVEL, earKindOf, parseEarSettings } from "@/lib/practice/earGame";
import { patternById } from "@/features/rhythm/patterns";
import { DYAD_DEFAULT_STRINGS } from "@/features/exercises/basics/double-stops-neck/walk";
import { DYAD_MAX_FRET } from "@/lib/chordKit/scaleChords";
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

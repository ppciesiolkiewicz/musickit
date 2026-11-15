import { FARINELLI_LEVELS, FINGER_PATTERN_LEVELS, INTERVAL_EARS_LEVELS, INTERVAL_SINGER_LEVELS, LEGATO_TRILL_LEVELS, NOTE_FINDER_LEVELS, PICKING_DRILL_LEVELS, STRING_SINGER_LEVELS, TOOL_LEVELS } from "@/features/exercises/basics/levels";
import type { PlanTool } from "@/features/plan/model/tools";
import { intervalName } from "@/features/theory/singingIntervals";
import { BOOK, DIFFICULTIES, RUNS, RUN_STAGES, STAGES } from "@/features/theory/singingMelodies";
import { EAR_LEVELS, TOP_EAR_LEVEL } from "@/lib/practice/earGame";

/*
 * The steps inside a concept, for /dev/path: a concept is one box on the path, but most are several levels of the same
 * thing (which intervals, which string set, which mode). A concept has no steps of its own in the code. What the code
 * does have is ladders: a tool's levels (exercises/basics/levels.ts), the ear game's levels, the stages of the tune and
 * run books. LINKS says which concept a ladder belongs to; its steps are read from the ladder, never restated here.
 * PLANNED holds steps nothing in the code stands for yet: the page shows them as "not implemented".
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

/** Every ladder in the code that says what a level holds. */
export const LADDERS: Ladder[] = [
  byLevel("interval-singer", "interval-singer", "interval-singer levels", (l) => {
    const { intervals, dir, random } = INTERVAL_SINGER_LEVELS[l];
    return `${intervals.map((s) => intervalName(s).replace(/ up$/, "")).join(", ")}; ${dir === "both" ? "up and down" : "up"}${random ? "; Do in a random key" : ""}`;
  }),
  {
    id: "interval-ears", label: "interval-ears levels", file: "src/lib/practice/earGame.ts",
    steps: EAR_LEVELS.map((l) => ({ key: String(l.n), name: `Level ${l.n}`, holds: l.label })),
    // the word a plan writes stands for one of the game's own levels; one over the top is the top
    read: (tool) => (tool.type === "interval-ears" && tool.level ? String(Math.min(TOP_EAR_LEVEL, INTERVAL_EARS_LEVELS[tool.level])) : null),
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
  stages("melody-stages", "melody-singer stages", STAGES, (t) => (t.type === "melody-singer" ? BOOK.find((b) => b.n === t.tune)?.stage.id ?? null : null)),
  stages("run-stages", "run-singer stages", RUN_STAGES, (t) => (t.type === "run-singer" ? RUNS.find((b) => b.n === t.run)?.stage.id ?? null : null)),
  { id: "melody-difficulty", label: "melody difficulties", file: "src/features/theory/singingMelodies.ts", steps: DIFFICULTIES.map((d) => ({ key: d.title, name: d.title, holds: d.hint })) },
];

/** Which concept a ladder's steps belong to; `only` takes some of its steps, by key. */
export const LINKS: Record<string, { ladder: string; only?: string[] }> = {
  "singing-intervals": { ladder: "interval-singer" },
  intervals: { ladder: "interval-ears" },
  "notes-e-a-strings": { ladder: "note-finder", only: ["new", "beginner"] },
  "find-every-note": { ladder: "note-finder", only: ["intermediate", "advanced"] },
  "breath-holding-note": { ladder: "farinelli" },
  spider: { ladder: "finger-pattern" },
  "hammer-pull": { ladder: "legato-trill" },
  runs: { ladder: "run-stages" },
  "do-re-mi-steps": { ladder: "melody-stages", only: ["do-re", "mi", "fa", "sol"] },
  "do-mi-sol-skips": { ladder: "melody-stages", only: ["skips", "arpeggio"] },
  leaps: { ladder: "melody-stages", only: ["fourths", "fifths", "sixths", "sevenths", "octave", "tenths"] },
};

/**
 * Steps a concept could have that nothing in the code stands for yet, as [name, what it holds]. Shown after the
 * concept's linked steps, marked "not implemented". Move one out of here when a ladder in the code holds it.
 */
export const PLANNED: Record<string, [string, string][]> = {
  pentatonic: [["Minor pentatonic", "1 b3 4 5 b7"], ["Major pentatonic", "1 2 3 5 6"]],
  "seventh-chords": [["Dominant 7", "1 3 5 b7"], ["Major 7", "1 3 5 7"], ["Minor 7", "1 b3 5 b7"]],
  "sus-chords": [["sus4", "1 4 5"], ["sus2", "1 2 5"], ["add9", "1 3 5 9"]],
  "extended-chords": [["9ths", "a 7th chord with the 9"], ["13ths", "a 7th chord with the 13"]],
  modes: [["Dorian", "minor with a major 6th"], ["Mixolydian", "major with a b7"], ["Phrygian", "minor with a b2"]],
  "lydian-locrian": [["Lydian", "major with a #4"], ["Locrian", "minor with a b2 and a b5"]],
  "power-chords": [["Root on string 6", "one shape, moved along the string"], ["Root on string 5", "the same shape one string over"]],
  "bm-f-barre": [["Bm", "barre with the root on string 5"], ["F", "barre with the root on string 6"]],
  "pentatonic-box-1": [["Minor pentatonic", "box 1 from the root on string 6"], ["Major pentatonic", "the same box, the root moved"]],
  "five-pentatonic-boxes": [["Box 2", "next to box 1"], ["Box 3", ""], ["Box 4", ""], ["Box 5", "joins back to box 1 an octave up"]],
  caged: [["E shape", ""], ["A shape", ""], ["C shape", ""], ["G shape", ""], ["D shape", ""]],
  "top-string-triads": [["Strings 3 2 1", "major triads"], ["Strings 3 2 1", "minor triads"], ["Strings 4 3 2", "major and minor"]],
  "triads-every-set": [["Strings 5 4 3", "major and minor"], ["Strings 6 5 4", "major and minor"], ["Every set", "one chord up the neck across all four sets"]],
  "modes-on-neck": [["Dorian", ""], ["Mixolydian", ""], ["Phrygian", ""], ["Lydian", ""], ["Locrian", ""]],
  "bends-slides": [["Slides", ""], ["Half-step bend", "up one fret's pitch"], ["Whole-step bend", "up two frets' pitch"]],
  "fast-runs": [["Sixteenths", "the run stages at a faster tempo"]],
};

export interface ConceptStep extends Step {
  /** nothing in the code stands for it yet */
  planned: boolean;
  /** its key in the ladder it is read from; a planned step has none, so nothing can be tracked on it */
  key?: string;
}

export interface ConceptSteps {
  steps: ConceptStep[];
  /** the ladder its implemented steps are read from */
  from?: string;
}

/** Every concept that has steps, by id: the linked ladder's first, then the planned ones. */
export function conceptSteps(): Record<string, ConceptSteps> {
  const out: Record<string, ConceptSteps> = {};
  for (const [id, link] of Object.entries(LINKS)) {
    const ladder = LADDERS.find((l) => l.id === link.ladder)!;
    const steps = ladder.steps.filter((s) => !link.only || link.only.includes(s.key));
    out[id] = { from: `${ladder.label} (${ladder.file})`, steps: steps.map(({ key, name, holds }) => ({ key, name, holds, planned: false })) };
  }
  for (const [id, list] of Object.entries(PLANNED)) {
    out[id] ??= { steps: [] };
    out[id].steps.push(...list.map(([name, holds]) => ({ name, holds, planned: true })));
  }
  return out;
}

/**
 * The step of `concept` an exercise works on, as the step's key: read from the exercise's own tools, the hardest one
 * when several of the concept's steps are in it. Null when the concept has no ladder or no tool says a step.
 */
export function stepOf(concept: string, tools: PlanTool[]): string | null {
  const link = LINKS[concept];
  const ladder = link && LADDERS.find((l) => l.id === link.ladder);
  if (!ladder?.read) return null;
  const keys = ladder.steps.map((s) => s.key).filter((k) => !link.only || link.only.includes(k));
  const at = Math.max(-1, ...tools.map((t) => keys.indexOf(ladder.read!(t) ?? "")));
  return at < 0 ? null : keys[at];
}

/** The ladder steps no concept is linked to, per ladder; a ladder fully linked is left out. */
export interface SpareSteps { ladder: Pick<Ladder, "id" | "label" | "file">; steps: Step[] }

// plain data: the page hands it from the server to the view, and a ladder's `read` can't cross
export function spareSteps(): SpareSteps[] {
  const used = new Map<string, Set<string> | "all">();
  for (const { ladder, only } of Object.values(LINKS)) {
    const at = used.get(ladder);
    if (at === "all") continue;
    if (!only) used.set(ladder, "all");
    else used.set(ladder, new Set([...(at ?? []), ...only]));
  }
  return LADDERS.flatMap((ladder) => {
    const at = used.get(ladder.id);
    const steps = at === "all" ? [] : ladder.steps.filter((s) => !at?.has(s.key));
    return steps.length ? [{ ladder: { id: ladder.id, label: ladder.label, file: ladder.file }, steps: steps.map(({ name, holds }) => ({ name, holds })) }] : [];
  });
}

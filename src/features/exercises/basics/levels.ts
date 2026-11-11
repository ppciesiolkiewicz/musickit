/**
 * What a `level` means on each tool that takes one: the settings it stands for, easiest first. Pure data, no React.
 * A level is a short way to write those settings: the plan's parser fills them in (`src/features/plan/model/tools.ts`),
 * and a step-choice with levels moves a tool from one to the next (`setLevel` there). The views never see a level.
 * The ladder each tool's `level` prop describes in its `*.props.ts` is this table in words, and the plan prompt reads
 * those props: change both together.
 */
export type ToolLevel = "new" | "beginner" | "intermediate" | "advanced";
export const TOOL_LEVELS: ToolLevel[] = ["new", "beginner", "intermediate", "advanced"];
export const isToolLevel = (v: unknown): v is ToolLevel => TOOL_LEVELS.includes(v as ToolLevel);

type Ladder<T> = Record<ToolLevel, T>;

/**
 * interval-singer: the intervals asked (semitones from Do), the direction, and whether Do moves through all twelve keys.
 * The home chord first, then the leaps of the major scale, then the leaps that are hard to hear (all but the major 7th are outside the major scale), down as well as up.
 */
export const INTERVAL_SINGER_LEVELS: Ladder<{ intervals: number[]; dir: "up" | "both"; random: boolean }> = {
  new: { intervals: [4, 7], dir: "up", random: false },
  beginner: { intervals: [4, 7, 12], dir: "up", random: false },
  intermediate: { intervals: [5, 7, 9, 12], dir: "up", random: false },
  advanced: { intervals: [3, 6, 8, 10, 11], dir: "both", random: true },
};

/** interval-ears: the game's own level 1-6 (`EAR_LEVELS`, each adds intervals to the ones before). */
export const INTERVAL_EARS_LEVELS: Ladder<number> = { new: 1, beginner: 2, intermediate: 4, advanced: 6 };

/** note-finder: the strings (as the game's letters, low E first), the frets, and whether only natural notes are asked. */
export const NOTE_FINDER_LEVELS: Ladder<{ strings: string; from: number; to: number; naturals: boolean }> = {
  new: { strings: "E,A", from: 0, to: 5, naturals: true },
  beginner: { strings: "E,A", from: 0, to: 12, naturals: true },
  intermediate: { strings: "E,A,D,G,B,e", from: 0, to: 12, naturals: false },
  advanced: { strings: "E,A,D,G,B,e", from: 0, to: 15, naturals: false },
};

/** string-singer: the drill. */
export const STRING_SINGER_LEVELS: Ladder<"strings" | "pairs" | "fifth-fret"> = { new: "strings", beginner: "strings", intermediate: "pairs", advanced: "fifth-fret" };

/** breathwork, farinelli only: the first and last count. */
export const FARINELLI_LEVELS: Ladder<{ from: number; to: number }> = {
  new: { from: 2, to: 5 },
  beginner: { from: 3, to: 6 },
  intermediate: { from: 4, to: 10 },
  advanced: { from: 4, to: 12 },
};

/** finger-pattern: the order of the fingers, and the fret under finger 1 (the frets are closer together higher up). */
export const FINGER_PATTERN_LEVELS: Ladder<{ fingers: string; fret: number }> = {
  new: { fingers: "1234", fret: 5 },
  beginner: { fingers: "1234", fret: 1 },
  intermediate: { fingers: "1324", fret: 1 },
  advanced: { fingers: "1423", fret: 1 },
};

/** picking-drill: the strokes, the notes on each string (fewer: more string changes) and whether a string is skipped. */
export const PICKING_DRILL_LEVELS: Ladder<{ strokes: string; notesPerString: number; skip: boolean }> = {
  new: { strokes: "D", notesPerString: 4, skip: false },
  beginner: { strokes: "DU", notesPerString: 4, skip: false },
  intermediate: { strokes: "DU", notesPerString: 3, skip: false },
  advanced: { strokes: "DU", notesPerString: 2, skip: true },
};

/** legato-trill: the two fingers, the strong pair first and the weak pair last. */
export const LEGATO_TRILL_LEVELS: Ladder<string> = { new: "12", beginner: "13", intermediate: "23", advanced: "34" };

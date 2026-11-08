import { OPEN_STRINGS } from "./string-singer/strings";

/** One note of a drill: a string (6 = low E) and fret (0 = open), with the finger or pick stroke that plays it. */
export interface DrillStep {
  string: number;
  fret: number;
  /** the fretting finger 1-4, none for an open string */
  finger?: number;
  /** the pick stroke: D down, U up; none when the note is hammered or pulled */
  stroke?: "D" | "U";
}

/** Strings to play, lowest first (6 to 1); all six when none are given. */
export const orderStrings = (strings?: number[]): number[] => {
  const s = [...new Set((strings ?? []).filter((n) => n >= 1 && n <= 6))].sort((a, b) => b - a);
  return s.length ? s : [6, 5, 4, 3, 2, 1];
};

/** The midi note of a string at a fret. */
export const stepMidi = (s: DrillStep): number => OPEN_STRINGS[6 - s.string] + s.fret;

/** Each finger on its own fret (finger 1 on `fret`), played in order on each string in turn. Alternate picking. */
export function fingerPatternSteps(fingers: string, fret: number, strings?: number[]): DrillStep[] {
  const out: DrillStep[] = [];
  for (const string of orderStrings(strings)) {
    for (const ch of fingers) {
      const finger = Number(ch);
      out.push({ string, fret: fret + finger - 1, finger, stroke: out.length % 2 === 0 ? "D" : "U" });
    }
  }
  return out;
}

/** The strokes repeated `notesPerString` times on each string (open strings); `skip` jumps every other string. The stroke pattern runs on across strings. */
export function pickingDrillSteps(strokes: string, notesPerString: number, strings?: number[], skip = false): DrillStep[] {
  const all = orderStrings(strings);
  const list = skip ? all.filter((_, i) => i % 2 === 0) : all;
  const out: DrillStep[] = [];
  for (const string of list) for (let i = 0; i < notesPerString; i++) out.push({ string, fret: 0, stroke: strokes[out.length % strokes.length] as "D" | "U" });
  return out;
}

/** Two fingers alternating on one string, eight notes: the first picked, the rest hammered on or pulled off. */
export function legatoTrillSteps(fingers: string, string: number, fret: number): DrillStep[] {
  const [a, b] = [Number(fingers[0]), Number(fingers[1])];
  return Array.from({ length: 8 }, (_, i) => {
    const finger = i % 2 === 0 ? a : b;
    return { string, fret: fret + finger - 1, finger, ...(i === 0 ? { stroke: "D" as const } : {}) };
  });
}

/** "strings 6, 5" or "all strings" (6 = low E). */
export const stringsLabel = (strings?: number[]) => (strings?.length ? `${strings.length > 1 ? "strings" : "string"} ${strings.join(", ")}` : "all strings");

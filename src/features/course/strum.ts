import type { StrumPatternId } from "./model";

/** Down, up, or a miss: the hand still moves but doesn't touch the strings. */
export type Stroke = "D" | "U" | ".";
export interface StrumPattern { id: StrumPatternId; name: string; steps: Stroke[]; perBeat: 1 | 2 | 4 }

/** "D . D U | . U D U" → strokes; bar lines are only for reading. */
export function parseStrum(spec: string): Stroke[] {
  return spec.trim().split(/\s+/).filter((t) => t !== "|").map((t) => {
    if (t !== "D" && t !== "U" && t !== ".") throw new Error(`unknown stroke "${t}"`);
    return t;
  });
}

const p = (id: StrumPatternId, name: string, spec: string, perBeat: 1 | 2 | 4): StrumPattern => ({ id, name, steps: parseStrum(spec), perBeat });

export const STRUMS: Record<StrumPatternId, StrumPattern> = {
  "downs-quarter": p("downs-quarter", "All downstrums, one per beat", "D D D D", 1),
  "downs-eighth": p("downs-eighth", "All downstrums, two per beat", "D D D D D D D D", 2),
  island: p("island", "Island strum", "D . D U . U D U", 2),
  sixteenths: p("sixteenths", "16th pattern, downs on 1 and 3", "D . . U . U D U | D . . U . U D U", 4),
};

/** The count over each step: "1 2 3 4", "1 & 2 &…", "1 e & a 2 e & a…". */
export function strumCounts(perBeat: 1 | 2 | 4): string[] {
  const sub = perBeat === 4 ? ["", "e", "&", "a"] : perBeat === 2 ? ["", "&"] : [""];
  return [1, 2, 3, 4].flatMap((b) => sub.map((s) => s || String(b)));
}

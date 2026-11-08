import type { Range } from "@/features/theory/singing";

/** The guitar's open strings in standard tuning, 6th (low E) to 1st (high E), as MIDI notes. */
export const OPEN_STRINGS = [40, 45, 50, 55, 59, 64];
export const STRING_NAMES = ["E", "A", "D", "G", "B", "E"];
/** "6th" … "1st": the string's number, worded so the staff's degree labels leave it as it is */
export const ORDINALS = ["6th", "5th", "4th", "3rd", "2nd", "1st"];

export type StringDrill = "strings" | "pairs" | "fifth-fret";
export const STRING_DRILLS: StringDrill[] = ["strings", "pairs", "fifth-fret"];

/** One note to sing: its pitch, the string it stands for (0 = 6th) and what it is called under the staff. */
export interface StringNote {
  midi: number;
  string: number;
  label: string;
  at: number;
  beats: number;
}

/**
 * The open strings moved into a voice: up or down by the octaves that keep the most of them inside the range (the
 * lowest such shift on a tie), then any still outside folded in by an octave, so a voice too narrow for two octaves
 * still sings every string. Folding can drop the top E below the B, so if the strings no longer climb they are laid
 * out again, still climbing, from the E that leaves the fewest outside the range (the lowest on a tie): a two-octave
 * voice that does not start on E then has its top note a little out of range, better than a 1st-string E under the B.
 */
export function stringsInRange(range: Range): number[] {
  let best = 0;
  let bestOut = Infinity;
  for (let k = -2; k <= 4; k++) {
    const out = OPEN_STRINGS.filter((m) => m + 12 * k < range.low || m + 12 * k > range.high).length;
    if (out < bestOut) [best, bestOut] = [k, out];
  }
  const folded = OPEN_STRINGS.map((m) => {
    let n = m + 12 * best;
    while (n < range.low && n + 12 <= range.high) n += 12;
    while (n > range.high && n - 12 >= range.low) n -= 12;
    return n;
  });
  if (folded.every((n, i) => i === 0 || n > folded[i - 1])) return folded;
  let pick = folded;
  let pickOut = Infinity;
  for (let e = OPEN_STRINGS[0] - 48; e <= OPEN_STRINGS[0] + 48; e += 12) {
    const set = OPEN_STRINGS.map((m) => m - OPEN_STRINGS[0] + e);
    const out = set.filter((n) => n < range.low || n > range.high).length;
    if (out < pickOut) [pick, pickOut] = [set, out];
  }
  return pick;
}

/** Lay notes end to end, each `beats` long. */
const inTime = (notes: Omit<StringNote, "at" | "beats">[], beats: number): StringNote[] => notes.map((n, i) => ({ ...n, at: i * beats, beats }));

/**
 * What a drill sings, string by string, for a voice:
 * - `strings`: each open string from the 6th up to the 1st and back down, held two beats;
 * - `pairs`: each two neighbouring strings, low then high: the fourths, and the major third from G to B, the intervals
 *   tuning by ear listens for;
 * - `fifth-fret`: the lower string at the 5th fret (the 4th on the G string) and the next open string, the same note
 *   twice: the reference each string is tuned to.
 */
export function drillNotes(drill: StringDrill, range: Range): StringNote[] {
  const m = stringsInRange(range);
  const open = (s: number) => ({ midi: m[s], string: s, label: ORDINALS[s] });
  if (drill === "strings") return inTime([0, 1, 2, 3, 4, 5, 4, 3, 2, 1, 0].map(open), 2);
  if (drill === "pairs") return inTime([0, 1, 2, 3, 4].flatMap((s) => [open(s), open(s + 1)]), 2);
  return inTime([0, 1, 2, 3, 4].flatMap((s) => {
    const fret = s === 3 ? 4 : 5;
    return [{ midi: m[s + 1], string: s, label: `${ORDINALS[s]}·${fret}` }, open(s + 1)];
  }), 2);
}

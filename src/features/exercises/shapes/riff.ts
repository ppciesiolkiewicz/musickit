import { readRiff, riffTimeline, type RiffNote } from "../riffs/riff";
import { clampTimeline } from "../timeline/timeline";
import type { Timeline } from "../timeline/types";
import { isObj, keyPc, num, repeatsOf } from "./common";

/** A riff shape's key and its notes read (`readRiff`), or what is wrong with it. */
export function riffLine(raw: unknown): { key: number; notes: RiffNote[] } | { error: string } {
  if (!isObj(raw)) return { error: "not an object" };
  const key = keyPc(raw.key);
  if (key === null) return { error: "no key" };
  const read = readRiff(raw.notes);
  return "error" in read ? read : { key, notes: read.notes };
}

/** A riff written out note by note: its own strings and frets, in its key. Null when the notes can't be read. */
export function riff(raw: unknown): Timeline | null {
  const line = riffLine(raw);
  if ("error" in line || !isObj(raw)) return null;
  const timeline = riffTimeline(line.notes, line.key, num(raw.bpm, 80));
  return timeline && clampTimeline({ ...timeline, ...repeatsOf(raw) });
}

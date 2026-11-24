import { findRiff } from "../riffs/book";
import { riffTimeline } from "../riffs/riff";
import { clampTimeline } from "../timeline/timeline";
import type { Timeline } from "../timeline/types";
import { isObj, num, repeatsOf } from "./common";

/** A riff of the riff book by id, as it is written there: its own key, strings and frets. Null for an unknown id and for a riff with no notes yet. */
export function riff(raw: unknown): Timeline | null {
  if (!isObj(raw)) return null;
  const r = findRiff(raw.riff);
  if (!r) return null;
  const timeline = riffTimeline(r.notes, r.tonic, num(raw.bpm, r.bpm));
  return timeline && clampTimeline({ ...timeline, ...repeatsOf(raw) });
}

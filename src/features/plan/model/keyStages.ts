import type { ProgressEntry } from "@/features/progress/log";
import { KEY_LADDERS } from "./keys";
import type { Given } from "./moves";
import { PATH, stepAt, type Track } from "./path";

/*
 * The keys of a step (ChoiceSplit, "Keys on the path"). A track states the order its keys are learned in, in groups;
 * a step is first played in the first group, and each later group is a key stage inside the step: it opens once the
 * player found the step easy in a key of the stage before. A key stage is not a path step, so the next step may open
 * beside it. Keys are earned per track: a key earned on one step counts on every step of the track. Pure.
 */

/** A rating that opens the next key stage and earns its key: "Easy now" or the star below it. */
const EARNS = 4;

/** The track's key order in groups: its own, else its area's key ladder. */
export const trackKeys = (track: Track): number[][] => track.keys ?? KEY_LADDERS[track.area];

/** The track whose key order an exercise follows: that of the first step it names (and that step). Null when it names none on the path. */
export function keyTrackOf(steps: readonly string[] | undefined, tracks: Track[] = PATH): { track: Track; step: string } | null {
  for (const ref of steps ?? []) {
    const at = stepAt(ref, tracks);
    if (at) return { track: at.track, step: ref };
  }
  return null;
}

/** A player's keys on one step of a track. */
export interface TrackKeys {
  /** the key a first play opens in */
  first: number;
  /** the keys of the stages open on this step, in the track's order */
  open: number[];
  /** the keys the player has earned on the track, in the track's order */
  earned: number[];
}

/** The key a rated play opened in, when it earns: the first of its `now` keys. */
function opened(row: ProgressEntry): number | null {
  const given = (row as { given?: Given }).given;
  const key = given?.keys?.now?.[0];
  return row.stars >= EARNS && typeof key === "number" ? key : null;
}

/**
 * The keys of `step` for a player: `start` is the stage their answer to the keys question starts them on (0: the
 * first), `rows` their whole progress log. A stage above `start` opens when a play of this step, rated 4 or 5, opened
 * in a key of the stage before it.
 */
export function playerKeys(track: Track, step: string, rows: ProgressEntry[], start: number): TrackKeys {
  const groups = trackKeys(track);
  const last = groups.length - 1;
  const from = Math.min(last, Math.max(0, Math.trunc(start) || 0));
  const here = new Set(rows.filter((r) => r.steps?.includes(step)).flatMap((r) => opened(r) ?? []));
  let n = from;
  while (n < last && groups[n].some((k) => here.has(k))) n++;
  const onTrack = new Set(rows.filter((r) => r.steps?.some((s) => s.startsWith(`${track.id}:`))).flatMap((r) => opened(r) ?? []));
  return { first: groups[from][0], open: groups.slice(0, n + 1).flat(), earned: groups.flat().filter((k) => onTrack.has(k)) };
}

import { PATH, type Track } from "@/features/plan/model/path";

/*
 * A proposed change to the path, to judge on /dev/path → "Slope" beside the path as it is
 * (docs/superpowers/specs/2026-11-16-path-slope-design.md). Nothing outside /dev/path reads it. Once the user settles a
 * proposal its links and tracks move into PATH (plan/model/path.ts) and this file is emptied for the next one.
 * Settled so far: the named prerequisites and the double-stops track (2026-11-16).
 */

/** The steps each step gains to learn first, as "trackId:n" → refs. */
export const ADDED_AFTER: Record<string, string[]> = {};

/** New tracks, each placed right before the track named in `before`. */
export const ADDED_TRACKS: { before: string; track: Track }[] = [];

/** The path with the proposal applied. */
export function proposedPath(tracks: Track[] = PATH): Track[] {
  const out = tracks.flatMap((t) => [...ADDED_TRACKS.filter((x) => x.before === t.id).map((x) => x.track), t]);
  return out.map((t) => ({
    ...t,
    steps: t.steps.map((st, i) => {
      const add = ADDED_AFTER[`${t.id}:${i + 1}`];
      return add ? { ...st, after: [...(st.after ?? []), ...add.filter((r) => !st.after?.includes(r))] } : st;
    }),
  }));
}

/** Whether a step's link is one the proposal adds. */
export const isAdded = (ref: string, after: string) => ADDED_AFTER[ref]?.includes(after) ?? false;

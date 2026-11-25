import { PATH, type Track } from "@/features/plan/model/path";

/*
 * A proposed change to the path, to judge on /admin/content/path → "Slope" beside the path as it is
 * (docs/superpowers/specs/2026-11-16-path-slope-design.md). Nothing outside /admin/content/path reads it. Once the user settles a
 * proposal its links and tracks move into PATH (plan/model/path.ts) and this file is emptied for the next one.
 * Settled so far: the named prerequisites and the double-stops track (2026-11-16), the agents' links (2026-11-19).
 * Proposed now: nothing.
 */

/** Links to add, as [learn first, then, why]. */
export const PROPOSED_LINKS: [from: string, to: string, why: string][] = [];

/** The steps each step gains to learn first, as "trackId:n" → refs. */
export const ADDED_AFTER: Record<string, string[]> = PROPOSED_LINKS.reduce<Record<string, string[]>>((m, [from, to]) => ({ ...m, [to]: [...(m[to] ?? []), from] }), {});

/** Why a proposed link is there. */
export const whyOf = (to: string, from: string) => PROPOSED_LINKS.find(([f, t]) => f === from && t === to)?.[2];

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

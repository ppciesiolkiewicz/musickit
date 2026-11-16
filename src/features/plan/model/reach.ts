import { placement } from "../intake/placement";
import type { Rung } from "../intake/topics";
import { PATH, predecessorsOf, slope, type Track } from "./path";
import type { Level } from "./types";

/*
 * What a player knows on the path, what is within reach next and what is ahead (NEW16; design:
 * docs/superpowers/specs/2026-11-16-path-slope-design.md, Part C). Nothing here blocks a player: "ahead" ranks a step later.
 *
 * 1. The questionnaire places each track (intake/placement.ts): the steps under a starting step are known, a track
 *    placed "done" is known whole.
 * 2. A step rated solid is known.
 * 3. Known carries back: everything a known step or a starting step needs first is known too, across tracks and topics.
 * 4. A step not known whose predecessors are all known is a candidate. A starting step always is, whatever it needs.
 * 5. Each topic offers a few candidates at a time, set by that topic's line (REACH_CAP): starting steps first, then the
 *    rest lowest on the path first. The ones over the cap are "ahead" but `open`: the plan writer can still reach them.
 */

export type ReachMark = "known" | "reach" | "ahead";

export interface StepReach {
  /** "trackId:n", n from 1 */
  ref: string;
  mark: ReachMark;
  /** ahead only because the topic's cap is full: every step it needs is known */
  open: boolean;
  /** the step the questionnaire starts the player on in this track */
  start: boolean;
}

/** Within-reach steps a topic offers at once, by the level of that topic's line; an unanswered topic counts as new. */
export const REACH_CAP: Record<Level, number> = { new: 1, beginner: 2, intermediate: Infinity, advanced: Infinity };

const LEVELS: Level[] = ["new", "beginner", "intermediate", "advanced"];
const refOf = (t: Track, i: number) => `${t.id}:${i + 1}`;

export function reach(input: { topics: Record<string, Rung>; solid?: Iterable<string> }, tracks: Track[] = PATH): Map<string, StepReach> {
  const known = new Set<string>(input.solid ?? []);
  const starts = new Set<string>();
  for (const p of placement(input.topics)) {
    const t = tracks.find((x) => x.id === p.concept);
    if (!t) continue;
    if (p.state === "done") t.steps.forEach((_, i) => known.add(refOf(t, i)));
    else if (p.state === "on" && p.step !== null) {
      for (let i = 0; i < p.step; i++) known.add(refOf(t, i));
      starts.add(refOf(t, p.step));
    }
  }
  for (const s of starts) known.delete(s);

  // Known carries back from every known step and every start.
  const back = [...known, ...starts];
  while (back.length) {
    for (const p of predecessorsOf(back.pop()!, tracks)) if (!known.has(p)) { known.add(p); back.push(p); }
  }
  for (const s of starts) known.delete(s);

  const order = slope(tracks);
  const out = new Map<string, StepReach>();
  const used = new Map<string, number>();
  const capOf = (topic: string) => REACH_CAP[LEVELS[input.topics[topic] ?? 0]];
  const take = (topic: string) => used.set(topic, (used.get(topic) ?? 0) + 1);

  for (const s of order) if (starts.has(s.ref)) { out.set(s.ref, { ref: s.ref, mark: "reach", open: false, start: true }); take(s.track.topic); }
  for (const s of order) {
    if (out.has(s.ref)) continue;
    if (known.has(s.ref)) { out.set(s.ref, { ref: s.ref, mark: "known", open: false, start: false }); continue; }
    const ready = predecessorsOf(s.ref, tracks).every((p) => known.has(p));
    if (!ready) { out.set(s.ref, { ref: s.ref, mark: "ahead", open: false, start: false }); continue; }
    const room = (used.get(s.track.topic) ?? 0) < capOf(s.track.topic);
    if (room) take(s.track.topic);
    out.set(s.ref, { ref: s.ref, mark: room ? "reach" : "ahead", open: !room, start: false });
  }
  return out;
}

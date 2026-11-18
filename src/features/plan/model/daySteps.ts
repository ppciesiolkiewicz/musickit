import type { ProgressEntry } from "@/features/progress/log";
import type { PlanAnswers } from "../intake/answers";
import { topicsFor } from "../intake/topics";
import { SOLID_STARS, reachIndex } from "./outcome";
import { PATH, stepAt, type Track } from "./path";
import { reach } from "./reach";

/*
 * Which steps of the path one day's plan works on (NEW7). Pure: the composer picks library blocks for these.
 * Nothing here blocks a player; `open` steps are only ahead because a topic's cap is full.
 */

export interface DaySteps {
  /** within reach and not solid, one per topic before any topic's second; the opening topic rotates with the date */
  fresh: string[];
  /** ahead only because the topic's cap is full (`open`), same order */
  open: string[];
  /** solid steps, rated longest ago first */
  review: string[];
}

/** When each solid step was last rated: the newest rating that counts for it (`reachIndex`), as an ISO datetime. */
export function solidRatedAt(entries: ProgressEntry[]): Map<string, string> {
  const newest = new Map<string, ProgressEntry>();
  for (const entry of entries) {
    const steps = (entry.steps ?? []).filter((r) => stepAt(r));
    for (const id of new Set(steps.map((r) => stepAt(r)!.track.id))) {
      const upTo = reachIndex(id, { steps, entry });
      for (let i = 0; i <= upTo; i++) {
        const ref = `${id}:${i + 1}`;
        const prev = newest.get(ref);
        if (!prev || Date.parse(entry.at) >= Date.parse(prev.at)) newest.set(ref, entry);
      }
    }
  }
  const out = new Map<string, string>();
  for (const [ref, e] of newest) if (e.stars >= SOLID_STARS) out.set(ref, e.at);
  return out;
}

const dayNumber = (date: string) => Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);

export function daySteps(input: { answers: PlanAnswers; solid: Map<string, string>; date: string }, tracks: Track[] = PATH): DaySteps {
  const { answers, solid, date } = input;
  const areas = new Set<string>(answers.areas);
  const mine = (ref: string) => { const at = stepAt(ref, tracks); return at && areas.has(at.track.area) ? at.track.topic : null; };
  const marks = reach({ topics: answers.topics, solid: solid.keys() }, tracks);
  const topicOrder = answers.areas.flatMap((a) => topicsFor(a).map((t) => t.id));

  // one step per topic before any topic's second, topics in questionnaire order rotated by the day
  const spread = (refs: string[]): string[] => {
    const byTopic = new Map<string, string[]>();
    for (const ref of refs) { const t = mine(ref)!; byTopic.set(t, [...(byTopic.get(t) ?? []), ref]); }
    const withSteps = topicOrder.filter((t) => byTopic.has(t));
    if (!withSteps.length) return [];
    const shift = ((dayNumber(date) % withSteps.length) + withSteps.length) % withSteps.length;
    const ordered = [...withSteps.slice(shift), ...withSteps.slice(0, shift)];
    const out: string[] = [];
    for (let round = 0; out.length < refs.length; round++) for (const t of ordered) { const r = byTopic.get(t)![round]; if (r) out.push(r); }
    return out;
  };

  const inReach = [...marks.values()].filter((s) => mine(s.ref) !== null);
  return {
    fresh: spread(inReach.filter((s) => s.mark === "reach").map((s) => s.ref)),
    open: spread(inReach.filter((s) => s.open).map((s) => s.ref)),
    review: [...solid].filter(([ref]) => mine(ref) !== null).sort((a, b) => Date.parse(a[1]) - Date.parse(b[1]) || a[0].localeCompare(b[0])).map(([ref]) => ref),
  };
}

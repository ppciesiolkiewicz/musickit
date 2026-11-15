import type { PlanAnswers } from "../intake/answers";
import { AREAS } from "./concepts";
import { LEVEL_ORDER, type AreaOutcome, type Outcome, type TopicOutcome } from "./outcome";
import { withDayTime, type DayTime } from "./planTime";
import type { Level } from "./types";

/** The records read for every plan, with each live record of the running plan laid over them. */
export const mergeTimes = (all: DayTime[], current: DayTime[]): DayTime[] => current.reduce(withDayTime, all);

/** The areas the student chose plus any with ratings or timer seconds, in screen order. */
export function shownAreas(o: Outcome, answers: PlanAnswers | null): AreaOutcome[] {
  const order = AREAS.map((a) => a.id);
  return o.areas
    .filter((a) => answers?.areas.includes(a.area) || a.ratings > 0 || a.seconds > 0)
    .sort((a, b) => order.indexOf(a.area) - order.indexOf(b.area));
}

/** The level a topic stands on, and the next one once something there is solid; null when nothing is known. */
export function topicLevel(t: TopicOutcome): { level: Level; next: Level | null } | null {
  if (t.reached === null) return null;
  const next = t.score !== null && t.score > t.reached ? (LEVEL_ORDER[t.reached + 1] ?? null) : null;
  return { level: LEVEL_ORDER[t.reached], next };
}

/** Whole minutes, rounded down. */
export const minutesOf = (seconds: number): number => Math.floor(seconds / 60);

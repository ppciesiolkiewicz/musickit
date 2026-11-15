import type { PlanAnswers } from "../intake/answers";
import { topicsFor } from "../intake/topics";
import { AREAS, type Area } from "./concepts";

/*
 * What the questionnaire says about where a student starts, shaped for the outcome view.
 * Part C adds the ratings-based outcome (where the student ends up) to this file.
 */

/** One topic and the rung the student picked for it (0 to 3), or null when it was not answered. */
export type TopicScore = { topic: string; label: string; score: number | null };

/** Every area in AREAS order, its topics in questionnaire order, each with its starting score. */
export function startOutcome(topics: PlanAnswers["topics"]): { area: Area; topics: TopicScore[] }[] {
  return AREAS.map(({ id }) => ({
    area: id,
    topics: topicsFor(id).map((t) => ({ topic: t.id, label: t.label, score: Object.hasOwn(topics, t.id) ? topics[t.id] : null })),
  }));
}

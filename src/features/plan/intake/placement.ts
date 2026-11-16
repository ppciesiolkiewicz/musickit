import { CONCEPTS, type Concept } from "../model/concepts";
import type { Level } from "../model/types";
import type { PlanAnswers } from "./answers";
import { topicById, type Rung } from "./topics";

/*
 * Where the first questionnaire places a player on the learning path (NEW9): the line picked for a topic (0 "Not yet" to
 * 3) is a level, and every track of that topic starts at its first step of that level. The steps under it are taken as
 * known; a track whose steps all sit lower is done, and one that starts higher is ahead, starting at its first step when
 * the player gets there.
 */

const LEVELS: Level[] = ["new", "beginner", "intermediate", "advanced"];

export interface TrackPlacement {
  concept: string;
  /** "on": `step` is where they start; "done": every step is under their level; "ahead": the track starts above it */
  state: "on" | "done" | "ahead";
  /** the step to start on, from 0; null when the track is done */
  step: number | null;
}

/** One track at a rung: its first step of that level, or what the rung says when it has none there. */
export function placeTrack(c: Concept, rung: Rung): TrackPlacement {
  const level = LEVELS[rung];
  const at = c.steps.findIndex((s) => LEVELS.indexOf(s.level) >= LEVELS.indexOf(level));
  if (at < 0) return { concept: c.id, state: "done", step: null };
  return { concept: c.id, state: c.steps[at].level === level || at > 0 ? "on" : "ahead", step: at };
}

/** Every track of every answered topic, placed by the line picked for it; unanswered and unknown topics are left out. */
export function placement(topics: PlanAnswers["topics"]): TrackPlacement[] {
  return Object.entries(topics).flatMap(([id, rung]) => (topicById(id) ? CONCEPTS.filter((c) => c.topic === id).map((c) => placeTrack(c, rung as Rung)) : []));
}

import { conceptById } from "@/features/plan/model/concepts";
import { toolsOf } from "@/features/plan/model/tools";
import type { PlanExercise } from "@/features/plan/model/types";
import { conceptSteps, hasLadder, stepOf } from "./steps";

/*
 * What step each concept of an example works on, for /dev/library (NEW15): read from the exercise's own tools with
 * `stepOf`, the same read a player's rating gets. So an example written with raw tool settings, not a tool's `level` or
 * a tune or run by stage, shows up here as counting for no step.
 */

/** One concept an exercise is tagged with, and the step its tools say. */
export interface ConceptAt {
  concept: string;
  label: string;
  /** "step": the tools say a step; "no-step": the concept has a ladder but no tool says a step; "no-ladder": nothing to read */
  read: "step" | "no-step" | "no-ladder";
  /** the step's name in its ladder, when `read` is "step" */
  step?: string;
}

/** The concepts an exercise is tagged with, each with the step its tools say. */
export function exerciseSteps(exercise: Pick<PlanExercise, "concepts" | "cells">, steps = conceptSteps()): ConceptAt[] {
  const tools = toolsOf(exercise.cells);
  return (exercise.concepts ?? []).map((concept) => {
    const label = conceptById(concept)?.label ?? concept;
    if (!hasLadder(conceptById(concept)?.id ?? concept)) return { concept, label, read: "no-ladder" };
    const key = stepOf(concept, tools);
    const step = key === null ? undefined : steps[concept]?.steps.find((s) => s.key === key)?.name ?? key;
    return step === undefined ? { concept, label, read: "no-step" } : { concept, label, read: "step", step };
  });
}

/** A plan's concepts over all its exercises: the steps read for each, and how many of its exercises said none. */
export interface PlanConcept {
  concept: string;
  label: string;
  exercises: number;
  /** step names, in the order first met */
  steps: string[];
  /** exercises tagged with a concept that has a ladder, whose tools said no step */
  noStep: number;
  ladder: boolean;
}

export interface PlanSteps {
  concepts: PlanConcept[];
  /** exercises tagged with no concept: they count for no concept or step */
  untagged: number;
  exercises: number;
}

/** Every concept a plan's exercises are tagged with, in first-met order, with the steps their tools say. */
export function planSteps(exercises: Pick<PlanExercise, "concepts" | "cells">[], steps = conceptSteps()): PlanSteps {
  const by = new Map<string, PlanConcept>();
  let untagged = 0;
  for (const ex of exercises) {
    const at = exerciseSteps(ex, steps);
    if (!at.length) untagged++;
    for (const c of at) {
      const row = by.get(c.concept) ?? { concept: c.concept, label: c.label, exercises: 0, steps: [], noStep: 0, ladder: c.read !== "no-ladder" };
      row.exercises++;
      if (c.step && !row.steps.includes(c.step)) row.steps.push(c.step);
      if (c.read === "no-step") row.noStep++;
      by.set(c.concept, row);
    }
  }
  return { concepts: [...by.values()], untagged, exercises: exercises.length };
}

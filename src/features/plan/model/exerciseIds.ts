import type { PlanConfig } from "./types";

/** A random id for a plan, an exercise or a progress row. */
export const randomId = (): string => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);

/**
 * The plan with an id on every exercise, so ratings can point at it. `fresh` gives every exercise a new id (a plan being
 * started, also one used again from the history); otherwise only missing ids are filled, and a plan that has them all
 * comes back as the same object.
 */
export function withExerciseIds(config: PlanConfig, newId: () => string = randomId, fresh = false): PlanConfig {
  if (!fresh && config.days.every((d) => d.exercises.every((e) => e.id))) return config;
  return { ...config, days: config.days.map((d) => ({ ...d, exercises: d.exercises.map((e) => (e.id && !fresh ? e : { ...e, id: newId() })) })) };
}

import { blockIdOf, blockKeyOf, isBlockId } from "./blockId";
import type { PlanConfig, PlanExercise } from "./types";

/** A random id for a plan, an exercise or a progress row. */
export const randomId = (): string => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);

/**
 * The plan with an id on every exercise, so ratings can point at it. `fresh` gives every exercise a new id (a plan being
 * started, also one used again from the history); otherwise only missing ids are filled, and a plan that has them all
 * comes back as the same object.
 */
export function withExerciseIds(config: PlanConfig, newId: () => string = randomId, fresh = false): PlanConfig {
  // a stored day can lack its exercise list (hand-edited or damaged storage): it is left as it is, never a reason to throw
  const listed = (d: PlanConfig["days"][number]) => Array.isArray(d?.exercises);
  if (!fresh && config.days.every((d) => !listed(d) || d.exercises.every((e) => e.id))) return config;
  return { ...config, days: config.days.map((d) => (listed(d) ? { ...d, exercises: d.exercises.map((e) => (e.id && !fresh ? e : { ...e, id: newId() })) } : d)) };
}

/**
 * The plan with every exercise's block id set to the hash of its content and tags (`blockId.ts`). Always recomputed: a stored
 * or sent id is never trusted. A `parentBlockId` that is not a block id, or is the exercise's own, is dropped. The same object
 * when nothing changed; a day without an exercise list is left as it is.
 */
export function withBlockIds(config: PlanConfig): PlanConfig {
  const fix = (e: PlanExercise): PlanExercise => {
    const blockId = blockIdOf(blockKeyOf(e));
    const keepParent = isBlockId(e.parentBlockId) && e.parentBlockId !== blockId;
    if (e.blockId === blockId && (keepParent ? true : !("parentBlockId" in e))) return e;
    const { parentBlockId, ...rest } = e;
    return { ...rest, blockId, ...(keepParent ? { parentBlockId } : {}) };
  };
  let changed = false;
  const days = config.days.map((d) => {
    if (!Array.isArray(d?.exercises)) return d;
    const exercises = d.exercises.map(fix);
    if (exercises.every((e, i) => e === d.exercises[i])) return d;
    changed = true;
    return { ...d, exercises };
  });
  return changed ? { ...config, days } : config;
}

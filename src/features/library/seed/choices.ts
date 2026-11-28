import { choiceIdOf } from "@/features/plan/model/blockId";
import { applyChoiceSet, type ChoiceSet } from "@/features/plan/model/choiceSet";
import type { SeedBlockFile, SeedBlockRef, SeedChoice, SeedPlanFile } from "./index";

/** A choice's name: lowercase words joined by single hyphens (one word is enough). */
export const isChoiceName = (v: unknown): v is string => typeof v === "string" && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v);

/** A seed choice's `set` and `params` as one ChoiceSet, the shape `choices.set` stores. */
export const choiceSetOf = (choice: SeedChoice): ChoiceSet => ({ ...(choice.set ? { tools: choice.set } : {}), ...(choice.params ? { params: choice.params } : {}) });

/**
 * The AI-shape exercise of one choice: the file's `exercise` with the choice's `set` and `params` applied
 * (`applyChoiceSet`; `bare` leaves them out: the block as stored), plus the choice's level, steps, moves and minutes,
 * and both ids.
 */
export function exerciseOf(file: SeedBlockFile, choice: SeedChoice, opts: { bare?: boolean } = {}): Record<string, unknown> {
  return {
    ...(opts.bare ? file.exercise : applyChoiceSet(file.exercise, choiceSetOf(choice))),
    ...(choice.level !== undefined ? { level: choice.level } : {}),
    steps: choice.steps,
    ...(choice.moves !== undefined ? { moves: choice.moves } : {}),
    minutes: choice.minutes,
    blockId: file.id,
    choiceId: choiceIdOf(file.id, choice.name),
  };
}

/** The plan with each day's block refs replaced by the exercise of the choice they name; `minutes` from the ref when it has them. */
export function expandPlan(file: SeedPlanFile, blocks: SeedBlockFile[]): { plan: Record<string, unknown>; errors: string[] } {
  const errors: string[] = [];
  const days = Array.isArray(file.plan.days) ? (file.plan.days as Record<string, unknown>[]) : [];
  const expanded = days.map((d, i) => {
    const refs = Array.isArray(d.exercises) ? (d.exercises as SeedBlockRef[]) : [];
    const exercises = refs.flatMap((r, j) => {
      const where = `Day ${i + 1}, exercise ${j + 1}`;
      const b = blocks.find((x) => x.id === r.block);
      if (!b) return errors.push(`${where}: no block "${r.block}".`), [];
      const c = b.choices?.find((x) => x.name === r.choice);
      if (!c) return errors.push(`${where}: block "${r.block}" has no choice "${r.choice}".`), [];
      const e = exerciseOf(b, c);
      return [r.minutes !== undefined ? { ...e, minutes: r.minutes } : e];
    });
    return { ...d, exercises };
  });
  return { plan: { ...file.plan, days: expanded }, errors };
}

import type { ProgressEntry } from "@/features/progress/log";
import type { StarRating } from "@/features/progress/stars";
import type { StoredPlan } from "./types";

/**
 * The progress-log row for one rated exercise of a plan: its ids, where it sits, and a copy of its title and tags.
 * Null when the plan has no such exercise or the exercise has no id.
 */
export function entryFor(plan: StoredPlan, day: number, exercise: number, rating: StarRating, newId: () => string): ProgressEntry | null {
  const e = plan.config.days[day]?.exercises[exercise];
  if (!e?.id) return null;
  return {
    id: newId(), planId: plan.id, exerciseId: e.id, day, exercise, title: e.title,
    ...(e.area ? { area: e.area } : {}),
    ...(e.level ? { level: e.level } : {}),
    ...(e.topic ? { topic: e.topic } : {}),
    ...(e.concepts?.length ? { concepts: e.concepts } : {}),
    stars: rating.stars, at: rating.at,
  };
}

/** Rows for every rating already stored on these plans (`rated`), in plan order, then day and exercise order: fills a log that starts empty. */
export function backfill(plans: StoredPlan[], newId: () => string): ProgressEntry[] {
  return plans.flatMap((p) =>
    Object.entries(p.rated ?? {})
      .flatMap(([key, rating]) => {
        const [day, exercise] = key.split(":").map(Number);
        return Number.isInteger(day) && Number.isInteger(exercise) ? entryFor(p, day, exercise, rating, newId) ?? [] : [];
      })
      .sort((a, b) => a.day - b.day || a.exercise - b.exercise),
  );
}

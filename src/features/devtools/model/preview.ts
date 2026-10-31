import type { CatalogueEntry } from "@/features/plan/model/catalogue";
import { parsePlanConfig } from "@/features/plan/model/config";
import { PLAN_DAYS, type PlanConfig, type PlanExercise } from "@/features/plan/model/types";

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);

/**
 * An example's JSON made into something the plan parser takes: an exercise (has "sections") becomes a week of itself, a
 * plan shorter than seven days repeats its days in order. A full plan, or anything else, passes through unchanged (so the
 * parser reports what is wrong with it).
 */
export function previewPlanText(json: string): string {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return json;
  }
  if (!isObj(raw)) return json;
  if (Array.isArray(raw.sections)) {
    return JSON.stringify({ title: raw.title ?? "Preview", days: Array.from({ length: PLAN_DAYS }, () => ({ theme: "Preview", exercises: [raw] })) });
  }
  const days = raw.days;
  if (Array.isArray(days) && days.length > 0 && days.length < PLAN_DAYS) {
    return JSON.stringify({ ...raw, days: Array.from({ length: PLAN_DAYS }, (_, i) => days[i % days.length]) });
  }
  return json;
}

/**
 * Any example as a complete plan to paste into /plan: a week of itself (as `previewPlanText`), each day themed with the
 * exercise's title and the example's `note` as the summary when it has none. Indented, ready for the clipboard.
 */
export function planToCopy(json: string, note?: string): string {
  const raw: unknown = JSON.parse(previewPlanText(json));
  if (!isObj(raw) || !Array.isArray(raw.days)) return json;
  const days = isExercise(json) ? raw.days.map((d) => ({ ...(d as object), theme: typeof raw.title === "string" ? raw.title : "Practice" })) : raw.days;
  return JSON.stringify({ ...raw, ...(raw.summary || !note ? {} : { summary: note }), days }, null, 2);
}

/** True for one exercise's JSON (an object with "sections"); false for a plan or text that isn't plain JSON. */
function isExercise(json: string): boolean {
  try {
    const raw: unknown = JSON.parse(json);
    return isObj(raw) && Array.isArray(raw.sections);
  } catch {
    return false;
  }
}

/** An example parsed for display: one exercise, or a whole week, with the parser's warnings. */
export type Preview = { ok: true; exercise?: PlanExercise; config?: PlanConfig; warnings: string[] } | { ok: false; error: string };

export function parsePreview(json: string, entries: CatalogueEntry[]): Preview {
  const r = parsePlanConfig(previewPlanText(json), entries);
  if (!r.ok) return r;
  if (isExercise(json)) {
    // an exercise repeated seven times warns seven times; keep one day's worth
    return { ok: true, exercise: r.config.days[0].exercises[0], warnings: r.warnings.filter((w) => w.startsWith("Day 1,")) };
  }
  return { ok: true, config: r.config, warnings: r.warnings };
}

/** The "Why it's good:" note of an example part. */
export const whyOf = (text: string): string | undefined => /^Why it's good: (.+)$/m.exec(text)?.[1].trim();

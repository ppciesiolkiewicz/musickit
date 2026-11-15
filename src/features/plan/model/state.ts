import { migrateAnswers } from "../intake/answers";
import { EMPTY_STATE, type PlanReview, type PlanState, type StoredPlan } from "./types";
import { cleanRating, isStars, type StarRating } from "@/features/progress/stars";
import { withBlockIds, withExerciseIds } from "./exerciseIds";
import { cleanCells } from "./cleanExercise";

/** A plan this app can show: ids, dates, days, and `cells` on every exercise (a plan stored before blocks has none, and is dropped: nothing old is read). */
const isPlan = (p: unknown): p is StoredPlan => {
  const x = p as StoredPlan;
  return !!x && typeof x.id === "string" && typeof x.startedOn === "string" && Array.isArray(x.config?.days) && typeof x.done === "object" && x.config.days.every((d) => !d?.exercises || (Array.isArray(d.exercises) && d.exercises.every((e) => Array.isArray(e?.cells))));
};

/** The longest `why` of a plan review kept. */
export const MAX_REVIEW_WHY = 1000;

/** A stored review made safe: null unless it has valid stars and a date. The why is trimmed, cut to `MAX_REVIEW_WHY`, and kept only for 1 or 2 stars. */
export function cleanReview(raw: unknown): PlanReview | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!isStars(r.stars) || typeof r.at !== "string" || !r.at) return null;
  const why = r.stars <= 2 && typeof r.why === "string" ? r.why.trim().slice(0, MAX_REVIEW_WHY) : "";
  return { stars: r.stars, ...(why ? { why } : {}), at: r.at };
}

/** A plan with an id on every exercise (plans stored before ids get them here), its cells parsed again (`cleanExercise`), its ratings made safe (broken ones are dropped one by one), `from` kept only when it is text, and the timer's old `elapsed` and `spent` dropped. */
function cleanPlan(stored: StoredPlan): StoredPlan {
  let p: StoredPlan = { ...stored, config: withBlockIds(cleanCells(withExerciseIds(stored.config))) };
  // the day timer's seconds were kept in the plan before they got their own store (`planTime.ts`); they are not read
  if ("elapsed" in p || "spent" in p) {
    p = { ...p };
    delete (p as { elapsed?: unknown }).elapsed;
    delete (p as { spent?: unknown }).spent;
  }
  if (p.from !== undefined && typeof p.from !== "string") {
    p = { ...p };
    delete p.from;
  }
  if ("review" in p) {
    const review = cleanReview(p.review);
    p = { ...p };
    if (review) p.review = review;
    else delete p.review;
  }
  if (p.rated === undefined) return p;
  const rated: Record<string, StarRating> = {};
  if (p.rated && typeof p.rated === "object") for (const [k, v] of Object.entries(p.rated)) { const r = cleanRating(v); if (r) rated[k] = r; }
  return { ...p, rated };
}

/** A stored document, made safe: anything missing or broken falls back to the empty state's value. */
export function sanitiseState(raw: unknown): PlanState {
  const s = (raw ?? {}) as Partial<PlanState>;
  const r = s.reminder;
  return {
    answers: s.answers && typeof s.answers === "object" ? migrateAnswers(s.answers) : null,
    current: isPlan(s.current) ? cleanPlan(s.current) : null,
    history: Array.isArray(s.history) ? s.history.filter(isPlan).slice(0, 20).map(cleanPlan) : [],
    reminder: {
      enabled: !!r?.enabled,
      time: typeof r?.time === "string" && /^\d\d:\d\d$/.test(r.time) ? r.time : EMPTY_STATE.reminder.time,
      ...(typeof r?.lastShownOn === "string" ? { lastShownOn: r.lastShownOn } : {}),
    },
  };
}

/**
 * The state cut to fit `maxBytes` of JSON: its oldest earlier plans are dropped, one by one, until it fits. The running
 * plan is never dropped, and the newest earlier plan (where a claimed invite goes) is dropped last. Losing the oldest
 * history beats every save of the plan being refused. A state that fits comes back as the same object.
 */
export function fitPlanState(s: PlanState, maxBytes: number): PlanState {
  const size = (x: PlanState) => JSON.stringify(x).length;
  if (size(s) <= maxBytes) return s;
  const out = { ...s, history: [...s.history] };
  while (out.history.length > 0 && size(out) > maxBytes) out.history.pop();
  return out;
}

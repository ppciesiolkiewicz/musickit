import { migrateAnswers } from "../intake/answers";
import { EMPTY_STATE, type PlanState, type StoredPlan } from "./types";
import { cleanRating, type StarRating } from "@/features/progress/stars";
import { withExerciseIds } from "./exerciseIds";
import { parseChoiceDiag, parseCellDiag, resolveChordPlacement, type Cell } from "./tools";
import type { PlanConfig, PlanExercise } from "./types";

/** A plan this app can show: ids, dates, days, and `cells` on every exercise (a plan stored before blocks has none, and is dropped: nothing old is read). */
const isPlan = (p: unknown): p is StoredPlan => {
  const x = p as StoredPlan;
  return !!x && typeof x.id === "string" && typeof x.startedOn === "string" && Array.isArray(x.config?.days) && typeof x.done === "object" && x.config.days.every((d) => !d?.exercises || (Array.isArray(d.exercises) && d.exercises.every((e) => Array.isArray(e?.cells))));
};

/**
 * An exercise's cells and choice run through the plan's own parser again (as stored: nothing is noted), so a cell the
 * reader can't draw (a staff with no key, a tool of an unknown type) is dropped here, not met by a tool on /plan. An
 * exercise left with no cell shows its title, as on paste.
 */
function cleanExercise(e: PlanExercise): PlanExercise {
  const title = typeof e.title === "string" ? e.title : "";
  const cells = resolveChordPlacement(e.cells.flatMap((c): Cell[] => {
    // draft: an exercise being edited keeps an empty text or a section with no heading yet
    const p = parseCellDiag(c, { stored: true, draft: true });
    return p.cell ? [p.cell] : [];
  }));
  const out: PlanExercise = { ...e, title, cells: cells.length ? cells : [{ type: "text", text: title || "Exercise" }] };
  delete out.choice;
  if (e.choice !== undefined) {
    const c = parseChoiceDiag(e.choice, { notes: [], stored: true });
    if (c.choice) out.choice = c.choice;
  }
  return out;
}

const cleanCells = (config: PlanConfig): PlanConfig => ({
  ...config,
  days: config.days.map((d) => (Array.isArray(d?.exercises) ? { ...d, exercises: d.exercises.map(cleanExercise) } : d)),
});

/** A plan with an id on every exercise (plans stored before ids get them here), its cells parsed again (`cleanExercise`), its ratings made safe (broken ones are dropped one by one) and `from` kept only when it is text. */
function cleanPlan(stored: StoredPlan): StoredPlan {
  let p: StoredPlan = { ...stored, config: cleanCells(withExerciseIds(stored.config)) };
  if (p.from !== undefined && typeof p.from !== "string") {
    p = { ...p };
    delete p.from;
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

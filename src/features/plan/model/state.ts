import { migrateAnswers } from "../intake/answers";
import { AREAS, type Area } from "./concepts";
import { EMPTY_STATE, type PlanConfig, type PlanState, type StoredPlan } from "./types";
import { cleanRating, type StarRating } from "@/features/progress/stars";
import { withBlockIds, withExerciseIds } from "./exerciseIds";
import { cleanAnswersHistory, movedOver } from "./answersHistory";
import { cleanCells } from "./cleanExercise";
import { cleanTeacherScores } from "./teacherScores";

/** The longest teacher comment kept. */
export const MAX_TEACHER_COMMENT = 2000;

/** A stored `teacher` record made safe: null unless it has a `madeAt`; the comment is cut to `MAX_TEACHER_COMMENT`. */
function cleanTeacher(raw: unknown): StoredPlan["teacher"] | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;
  if (typeof t.madeAt !== "string" || !t.madeAt) return null;
  const comment = typeof t.comment === "string" ? t.comment.slice(0, MAX_TEACHER_COMMENT) : "";
  return { madeAt: t.madeAt, ...(comment ? { comment } : {}) };
}

/** A plan this app can show: ids, dates, days, and `cells` on every exercise (a plan stored before blocks has none, and is dropped: nothing old is read). */
const isPlan = (p: unknown): p is StoredPlan => {
  const x = p as StoredPlan;
  return !!x && typeof x.id === "string" && typeof x.startedOn === "string" && Array.isArray(x.config?.days) && typeof x.done === "object" && x.config.days.every((d) => !d?.exercises || (Array.isArray(d.exercises) && d.exercises.every((e) => Array.isArray(e?.cells))));
};

/** The longest sharer's name kept on a claimed plan (`sharedBy`). */
export const MAX_SHARER_NAME = 100;

/** The most earlier plans kept: about two months of one-day plans. */
export const HISTORY_CAP = 60;

/** A stored `composed` record made safe: null unless the attempt is a whole number from 0 and `short` a boolean; `declined` keeps its text items. */
function cleanComposed(raw: unknown): StoredPlan["composed"] | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  if (!Number.isInteger(c.attempt) || (c.attempt as number) < 0 || typeof c.short !== "boolean" || !Array.isArray(c.declined)) return null;
  return { attempt: c.attempt as number, declined: c.declined.filter((d): d is string => typeof d === "string"), short: c.short };
}

const AREA_IDS = new Set<string>(AREAS.map((a) => a.id));

/** The plan's days with a stored `sections` made safe: its area ids kept, each once; dropped when it is no list or none is left. The same config when nothing changed. */
function cleanSections(config: PlanConfig): PlanConfig {
  let changed = false;
  const days = config.days.map((d) => {
    if (!d || !("sections" in d)) return d;
    const { sections, ...rest } = d;
    const areas = Array.isArray(sections) ? [...new Set(sections.filter((a): a is Area => typeof a === "string" && AREA_IDS.has(a)))] : [];
    if (Array.isArray(sections) && areas.length > 0 && areas.length === sections.length) return d;
    changed = true;
    return areas.length ? { ...rest, sections: areas } : rest;
  });
  return changed ? { ...config, days } : config;
}

/** A plan with an id on every exercise (plans stored before ids get them here), its cells parsed again (`cleanExercise`), its ratings made safe (broken ones are dropped one by one), `from` kept only when it is text, `hidden` only when true, `sharedBy` only when it is text (trimmed, at most `MAX_SHARER_NAME`), the timer's old `elapsed` and `spent` and an old whole-plan `review` dropped, a day's `sections` kept only as area ids (`cleanSections`). */
function cleanPlan(stored: StoredPlan): StoredPlan {
  let p: StoredPlan = { ...stored, config: cleanSections(withBlockIds(cleanCells(withExerciseIds(stored.config)))) };
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
  if ("sharedBy" in p) {
    const by = typeof p.sharedBy === "string" ? p.sharedBy.trim().slice(0, MAX_SHARER_NAME) : "";
    p = { ...p };
    if (by) p.sharedBy = by;
    else delete p.sharedBy;
  }
  if ("hidden" in p && p.hidden !== true) {
    p = { ...p };
    delete p.hidden;
  }
  if ("composed" in p) {
    const composed = cleanComposed(p.composed);
    p = { ...p };
    if (composed) p.composed = composed;
    else delete p.composed;
  }
  // a whole-plan review was kept on the plan until reviews were dropped; old documents still carry one, and it is not read
  if ("review" in p) {
    p = { ...p };
    delete (p as { review?: unknown }).review;
  }
  if ("teacher" in p) {
    const teacher = cleanTeacher(p.teacher);
    p = { ...p };
    if (teacher) p.teacher = teacher;
    else delete p.teacher;
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
  const answers = s.answers && typeof s.answers === "object" ? migrateAnswers(s.answers) : null;
  const current = isPlan(s.current) ? cleanPlan(s.current) : null;
  const history = Array.isArray(s.history) ? s.history.filter(isPlan).slice(0, HISTORY_CAP).map(cleanPlan) : [];
  // a given plan is one claimed from an invite (`from`) or a week a teacher made (`teacher`): one with neither is not one
  const given = Array.isArray(s.given) ? s.given.filter((p) => isPlan(p) && ((typeof p.from === "string" && !!p.from) || !!cleanTeacher(p.teacher))).map(cleanPlan) : [];
  return {
    answers,
    // a document stored before the history: one entry from the answers, dated the earliest plan's start
    answersHistory: Array.isArray(s.answersHistory) && s.answersHistory.length ? cleanAnswersHistory(s.answersHistory) : movedOver(answers, [current, ...history].filter((p): p is StoredPlan => !!p)),
    current,
    history,
    given,
    teacherScores: cleanTeacherScores(s.teacherScores),
    reminder: {
      enabled: !!r?.enabled,
      time: typeof r?.time === "string" && /^\d\d:\d\d$/.test(r.time) ? r.time : EMPTY_STATE.reminder.time,
      ...(typeof r?.lastShownOn === "string" ? { lastShownOn: r.lastShownOn } : {}),
    },
  };
}

/**
 * The state cut to fit `maxBytes` of JSON: its oldest earlier plans are dropped, one by one, until it fits; with no earlier
 * plan left, the oldest given plans, one by one, never the newest one. The running plan is never dropped. Losing the oldest
 * plans beats every save of the plan being refused. A state that fits comes back as the same object.
 */
export function fitPlanState(s: PlanState, maxBytes: number): PlanState {
  const size = (x: PlanState) => JSON.stringify(x).length;
  if (size(s) <= maxBytes) return s;
  const out = { ...s, history: [...s.history], given: [...s.given] };
  while (out.history.length > 0 && size(out) > maxBytes) out.history.pop();
  while (out.given.length > 1 && size(out) > maxBytes) out.given.pop();
  return out;
}

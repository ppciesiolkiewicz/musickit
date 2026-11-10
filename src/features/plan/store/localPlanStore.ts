import { migrateAnswers } from "../intake/answers";
import { EMPTY_STATE, type PlanState, type StoredPlan } from "../model/types";
import type { PlanStore } from "./PlanStore";
import { cleanRating, type StarRating } from "@/features/progress/stars";
import { withExerciseIds } from "../model/exerciseIds";
import { accountKey } from "@/features/account/localAccountStore";

/** The shared key. A signed-in account (development only) has its own copy: read and write through `accountKey`. */
export const PLAN_KEY = "musickit.plan";
/** The stored document as it was before the first load that changed it (answers from the old questionnaire, a plan that didn't pass the checks): kept once, never overwritten. */
export const PLAN_BACKUP_KEY = "musickit.plan.backup";

const isPlan = (p: unknown): p is StoredPlan => {
  const x = p as StoredPlan;
  return !!x && typeof x.id === "string" && typeof x.startedOn === "string" && Array.isArray(x.config?.days) && typeof x.done === "object";
};

/** A plan with an id on every exercise (plans stored before ids get them here) and its ratings made safe: broken ones are dropped one by one. */
function cleanPlan(stored: StoredPlan): StoredPlan {
  const config = withExerciseIds(stored.config);
  const p = config === stored.config ? stored : { ...stored, config };
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

/** The plan in this browser's localStorage, one JSON document. Private windows or blocked storage give the empty state. */
export const localPlanStore: PlanStore = {
  async load() {
    try {
      const text = window.localStorage.getItem(accountKey(PLAN_KEY));
      const state = sanitiseState(JSON.parse(text ?? "null"));
      // what loading changed (exercise ids given to an older plan) is stored at once, so it stays the same on the next load
      if (text !== null && JSON.stringify(state) !== text) {
        const backup = accountKey(PLAN_BACKUP_KEY);
        if (window.localStorage.getItem(backup) === null) window.localStorage.setItem(backup, text);
        await this.save(state);
      }
      return state;
    } catch {
      return sanitiseState(null);
    }
  },
  async save(state) {
    try {
      window.localStorage.setItem(accountKey(PLAN_KEY), JSON.stringify(state));
    } catch {
      /* storage full or blocked: keep going in memory */
    }
  },
};

import { accountHeaders } from "@/features/userData/client/accountHeader";
import { createDocClient, putDocument, type DocClient } from "@/features/userData/client/docClient";
import { getJson, loadReporter, type LoadReporter } from "@/features/userData/client/load";
import { MAX_PLAN_BYTES } from "@/features/userData/model";
import { parseDayTime, withDayTime, type DayTime } from "../model/planTime";
import { fitPlanState, sanitiseState } from "../model/state";
import type { PlanState } from "../model/types";
import type { PlanStore } from "./PlanStore";

export interface ServerPlanOpts {
  client?: DocClient;
  /** reads the document: `{ data }` */
  get?: () => Promise<unknown>;
  /** the sender of one day's timer record (tests pass their own) */
  timeClient?: () => DocClient;
  /** reads a plan's timer records: `{ days }` */
  getTimes?: (planId: string) => Promise<unknown>;
  /** reads every plan's timer records: `{ days }` */
  getAllTimes?: () => Promise<unknown>;
  /** tells the save notice about a refused read (tests pass their own to read it) */
  loads?: LoadReporter;
}

/**
 * The plan as one document on the server (`/api/me/documents/plan`), for one signed-in session: `UserDataProvider` makes
 * a new one each time the source becomes `server`, so another account never sees this one's plan.
 *
 * The document is read once: every `load` shares the one request, and after it the store keeps the plan, with each
 * `save` replacing it. So the many `usePlan()` on a page (one per tool, for the voice) cost no request after the first,
 * and a load always gets the latest saved state. `save` goes through a `DocClient` (debounced, last write wins, retried,
 * shown in the save notice). Another tab's changes show after a reload, as with localStorage before.
 *
 * The day timer's records are rows of their own (`/api/me/plan/time`): read once per plan, and each day saved through its
 * own `DocClient`, a few bytes and small enough for `keepalive` as the page leaves.
 */
export function createServerPlanStore(opts: ServerPlanOpts = {}): PlanStore {
  const client = opts.client ?? createDocClient({ put: putDocument("plan") });
  const get = opts.get ?? (() => getJson("/api/me/documents/plan"));
  const getTimes = opts.getTimes ?? ((planId: string) => getJson(`/api/me/plan/time?plan=${encodeURIComponent(planId)}`));
  const getAllTimes = opts.getAllTimes ?? (() => getJson("/api/me/plan/time"));
  const newTimeClient = opts.timeClient ?? (() => createDocClient({ put: putPlanTime }));
  let held: PlanState | null = null;
  let reading: Promise<PlanState> | null = null;
  const loads = opts.loads ?? loadReporter();
  // per plan: the records read, with the saves made since laid over them
  const times = new Map<string, Promise<DayTime[]>>();
  // the records saved in this visit, to lay over a read of every plan's
  const saved = new Map<string, DayTime>();
  const senders = new Map<string, DocClient>();

  const read = (): Promise<PlanState> => {
    reading ??= get().then(
      (body) => {
        loads.loaded();
        // a save made while the read was out is newer than what the server sent
        held ??= sanitiseState((body as { data?: unknown } | null)?.data ?? null);
        return held;
      },
      (e) => {
        reading = null; // a refused read may be asked again
        loads.refused(e); // and the save notice says so
        throw e;
      },
    );
    return reading;
  };

  const readTimes = (planId: string): Promise<DayTime[]> => {
    let r = times.get(planId);
    if (!r) {
      r = getTimes(planId).then(
        (body) => {
          const days = (body as { days?: unknown } | null)?.days;
          return Array.isArray(days) ? days.flatMap((d) => parseDayTime(d) ?? []).filter((d) => d.planId === planId) : [];
        },
        (e) => {
          times.delete(planId);
          loads.refused(e);
          throw e;
        },
      );
      times.set(planId, r);
    }
    return r;
  };

  return {
    async load() {
      return held ?? read();
    },
    async save(state) {
      // cut the way the server cuts it, so a save is never refused for its size
      held = fitPlanState(state, MAX_PLAN_BYTES);
      client.save(held);
    },
    loadTimes: readTimes,
    // one read each call (the hook reads once per page), with this visit's saves laid over it
    async loadAllTimes() {
      let body: unknown;
      try {
        body = await getAllTimes();
      } catch (e) {
        loads.refused(e);
        throw e;
      }
      const days = (body as { days?: unknown } | null)?.days;
      let all = Array.isArray(days) ? days.flatMap((d) => parseDayTime(d) ?? []) : [];
      for (const t of saved.values()) all = withDayTime(all, t);
      return all;
    },
    async saveTime(time) {
      saved.set(`${time.planId}:${time.day}`, time);
      const before = times.get(time.planId);
      // a save before the read: the read's records with this one laid over them
      times.set(time.planId, (before ?? readTimes(time.planId)).then((ts) => withDayTime(ts, time), () => [time]));
      const key = `${time.planId}:${time.day}`;
      let sender = senders.get(key);
      if (!sender) senders.set(key, (sender = newTimeClient()));
      sender.save(time);
    },
    // before sharing: the invite is made from the stored plan, so its latest change has to land first
    flush: async () => {
      const all = await Promise.all([client.flush(), ...[...senders.values()].map((s) => s.flush())]);
      return all.every((s) => s === "saved");
    },
  };
}

/** Sends one day's timer record: `PUT /api/me/plan/time` with `{ time }`. Small enough to go with `keepalive` as the page leaves. */
const putPlanTime = (time: unknown, init?: { keepalive: boolean }): Promise<Response> =>
  fetch("/api/me/plan/time", {
    method: "PUT",
    headers: accountHeaders({ "content-type": "application/json" }),
    body: JSON.stringify({ time }),
    keepalive: !!init?.keepalive,
  });

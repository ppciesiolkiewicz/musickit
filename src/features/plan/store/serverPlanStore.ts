import { accountHeaders } from "@/features/userData/client/accountHeader";
import { createDocClient, putDocument, type DocClient } from "@/features/userData/client/docClient";
import { getJson, loadReporter, type LoadReporter } from "@/features/userData/client/load";
import { MAX_PLAN_BYTES } from "@/features/userData/model";
import { fitPlanState, sanitiseState } from "../model/state";
import type { PlanState } from "../model/types";
import type { PlanStore } from "./PlanStore";

export interface ServerPlanOpts {
  client?: DocClient;
  /** sends the day timer's seconds alone (`PUT /api/me/plan/time`) */
  timeClient?: DocClient;
  /** reads the document: `{ data }` */
  get?: () => Promise<unknown>;
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
 * The day timer's saves (`saveTime`) send only the plan id, the day and its seconds, a few bytes, through a second
 * `DocClient`; the server writes them into its plan. While a whole-plan save is waiting or out, the timer's goes with it
 * instead (the held plan already has the seconds), so a plan landing after them never takes older seconds back.
 */
export function createServerPlanStore(opts: ServerPlanOpts = {}): PlanStore {
  const client = opts.client ?? createDocClient({ put: putDocument("plan") });
  const times = opts.timeClient ?? createDocClient({ put: putPlanTime });
  const get = opts.get ?? (() => getJson("/api/me/documents/plan"));
  let held: PlanState | null = null;
  let reading: Promise<PlanState> | null = null;
  const loads = opts.loads ?? loadReporter();

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

  return {
    async load() {
      return held ?? read();
    },
    async save(state) {
      // cut the way the server cuts it, so a save is never refused for its size
      held = fitPlanState(state, MAX_PLAN_BYTES);
      client.save(held);
    },
    async saveTime(state, time) {
      held = state;
      if (client.status() === "saved") times.save(time);
      else client.save(fitPlanState(state, MAX_PLAN_BYTES));
    },
    // before sharing: the invite is made from the stored plan, so its latest change has to land first
    flush: async () => {
      const [plan, time] = await Promise.all([client.flush(), times.flush()]);
      return plan === "saved" && time === "saved";
    },
  };
}

/** Sends the day timer's seconds: `PUT /api/me/plan/time` with `{ time }`. Small enough to go with `keepalive` as the page leaves. */
const putPlanTime = (time: unknown, init?: { keepalive: boolean }): Promise<Response> =>
  fetch("/api/me/plan/time", {
    method: "PUT",
    headers: accountHeaders({ "content-type": "application/json" }),
    body: JSON.stringify({ time }),
    keepalive: !!init?.keepalive,
  });

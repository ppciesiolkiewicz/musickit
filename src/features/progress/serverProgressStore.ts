import { withRetry, type Retrying, type Schedule } from "@/features/userData/client/retry";
import { getJson } from "@/features/userData/client/load";
import { accountHeaders } from "@/features/userData/client/accountHeader";
import { cleanEntries, upsert, without, type ProgressEntry } from "./log";
import type { ProgressStore } from "./ProgressStore";

/** One exercise's latest change: its new row, or its row removed. */
export type ProgressChange = { kind: "put"; entry: ProgressEntry } | { kind: "remove" };

export interface ServerProgressOpts {
  /** sends one change; `keepalive` is asked for when the page is going away */
  send?: (exerciseId: string, change: ProgressChange, init: { keepalive: boolean }) => Promise<Response>;
  /** reads the log: `{ entries }` */
  get?: () => Promise<unknown>;
  retryMs?: number[];
  schedule?: Schedule;
}

const URL_ = "/api/me/progress";

const realSend: NonNullable<ServerProgressOpts["send"]> = (exerciseId, change, { keepalive }) =>
  change.kind === "put"
    ? fetch(URL_, { method: "PUT", headers: accountHeaders({ "content-type": "application/json" }), body: JSON.stringify({ entry: change.entry }), keepalive })
    : fetch(`${URL_}?exercise=${encodeURIComponent(exerciseId)}`, { method: "DELETE", headers: accountHeaders(), keepalive });

/**
 * The progress log on the server (`/api/me/progress`). Each `put` and `remove` is its own request through `withRetry`, so
 * it retries and shows in the save notice like a document. An exercise has one sender that always sends its latest
 * change, so a rating cleared while the rating's request is still out (or waiting to retry) ends cleared, not re-added.
 * `list` reads the server and lays any change not yet saved on top.
 */
export function createServerProgressStore(opts: ServerProgressOpts = {}): ProgressStore {
  const send = opts.send ?? realSend;
  const get = opts.get ?? (() => getJson(URL_));
  const slots = new Map<string, { change: ProgressChange; sender: Retrying }>();

  const change = (exerciseId: string, next: ProgressChange): Promise<void> => {
    let slot = slots.get(exerciseId);
    if (!slot) {
      const made: { change: ProgressChange; sender: Retrying } = {
        change: next,
        sender: withRetry((init) => send(exerciseId, made.change, init), { retryMs: opts.retryMs, schedule: opts.schedule }),
      };
      slots.set(exerciseId, made);
      slot = made;
    }
    slot.change = next;
    return slot.sender.run();
  };

  return {
    async list() {
      const body = (await get()) as { entries?: unknown } | null;
      let list = cleanEntries(body?.entries);
      for (const [exerciseId, slot] of slots) {
        if (slot.sender.status() === "saved") continue;
        list = slot.change.kind === "put" ? upsert(list, slot.change.entry) : without(list, exerciseId);
      }
      return list;
    },
    put: (entry) => change(entry.exerciseId, { kind: "put", entry }),
    remove: (exerciseId) => change(exerciseId, { kind: "remove" }),
  };
}

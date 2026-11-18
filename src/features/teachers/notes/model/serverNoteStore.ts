import { parseBlock } from "@/features/plan/model/config";
import type { Block } from "@/features/plan/model/types";
import { createDocClient, putDocument, reloadSoon, type DocClient } from "@/features/userData/client/docClient";
import { getJson, loadReporter, type LoadReporter } from "@/features/userData/client/load";
import type { NoteStore } from "./noteStore";

export interface ServerNoteOpts {
  client?: DocClient;
  /** reads the document: `{ data, version }` */
  get?: () => Promise<unknown>;
  /** tells the save notice about a refused read (tests pass their own to read it) */
  loads?: LoadReporter;
}

/**
 * The note as one document on the server (`/api/me/documents/note`), for one signed-in session: `UserDataProvider`
 * makes a new one each time the source becomes `server`. Same shape as the plan's server store: one shared read, the
 * loaded (or saved) note is kept, a save made while the read was out wins, a refused read is not kept and rejects, so
 * the page stays unloaded and never saves an empty note over the real one. `save` goes through a `DocClient`.
 */
export function createServerNoteStore(opts: ServerNoteOpts = {}): NoteStore {
  const client = opts.client ?? createDocClient({ put: putDocument("note"), onStale: reloadSoon });
  const get = opts.get ?? (() => getJson("/api/me/documents/note"));
  let held: { block: Block | null } | null = null;
  let reading: Promise<Block | null> | null = null;
  const loads = opts.loads ?? loadReporter();

  const read = (): Promise<Block | null> => {
    reading ??= get().then(
      (body) => {
        loads.loaded();
        const version = (body as { version?: unknown } | null)?.version;
        if (typeof version === "number") client.setVersion(version);
        const data = (body as { data?: unknown } | null)?.data ?? null;
        // a save made while the read was out is newer than what the server sent
        held ??= { block: data ? parseBlock(data, { draft: true }).block : null };
        return held.block;
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
      return held ? held.block : read();
    },
    async save(block) {
      held = { block };
      client.save(block);
    },
    flush: async () => (await client.flush()) === "saved",
  };
}

import { cleanEntries, upsert, without, type ProgressEntry } from "./log";
import type { ProgressStore } from "./ProgressStore";
import { accountKey } from "@/features/account/localAccountStore";

/** The shared key. A signed-in account (development only) has its own copy: read and write through `accountKey`. */
export const PROGRESS_KEY = "musickit.progress";

function read(): ProgressEntry[] {
  try {
    return cleanEntries(JSON.parse(window.localStorage.getItem(accountKey(PROGRESS_KEY)) ?? "null"));
  } catch {
    return [];
  }
}

function write(list: ProgressEntry[]): void {
  try {
    window.localStorage.setItem(accountKey(PROGRESS_KEY), JSON.stringify(list));
  } catch {
    /* storage full or blocked: keep going in memory */
  }
}

/** The progress log in this browser's localStorage, one JSON list. Private windows or blocked storage give an empty log. */
export const localProgressStore: ProgressStore = {
  async list() {
    return read();
  },
  async put(entry) {
    write(upsert(read(), entry));
  },
  async remove(exerciseId) {
    const list = read();
    const next = without(list, exerciseId);
    if (next !== list) write(next);
  },
};

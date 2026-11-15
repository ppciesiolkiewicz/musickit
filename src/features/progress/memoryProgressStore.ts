import { upsert, without, type ProgressEntry } from "./log";
import type { ProgressStore } from "./ProgressStore";

/** A log kept in memory for one visit, saving nothing: a visitor's tools and the demo plan. Each call is a new, empty log. */
export function memoryProgressStore(): ProgressStore {
  let list: ProgressEntry[] = [];
  return {
    async list() {
      return [...list];
    },
    async put(entry) {
      list = upsert(list, entry);
    },
    async remove(exerciseId) {
      list = without(list, exerciseId);
    },
  };
}

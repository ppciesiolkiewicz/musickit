import type { SamplerStore } from "./types";

/** A store that lives in memory. For tests and for browsers without IndexedDB. */
export function createMemoryStore(): SamplerStore {
  let project: unknown = null;
  const audio = new Map<string, Blob>();
  return {
    loadProject: async () => (project === null ? null : JSON.parse(JSON.stringify(project))),
    saveProject: async (p) => {
      project = JSON.parse(JSON.stringify(p));
    },
    putAudio: async (id, blob) => {
      audio.set(id, blob);
    },
    getAudio: async (id) => audio.get(id) ?? null,
    deleteAudio: async (id) => {
      audio.delete(id);
    },
  };
}

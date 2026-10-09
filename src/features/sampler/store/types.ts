/**
 * Where the sampler keeps its project and audio. The app uses the browser's IndexedDB (`idb.ts`). A cloud store
 * (for example Vercel Blob plus a database, tied to a login) would implement the same interface.
 */
export interface SamplerStore {
  loadProject(): Promise<unknown>;
  saveProject(project: unknown): Promise<void>;
  putAudio(id: string, blob: Blob): Promise<void>;
  getAudio(id: string): Promise<Blob | null>;
  deleteAudio(id: string): Promise<void>;
}

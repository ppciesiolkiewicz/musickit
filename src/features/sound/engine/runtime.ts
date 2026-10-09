/**
 * Instruments added while the app runs (the sampler's). They have the same shape as the built-in ones, so the player,
 * the sample loader and the pickers need no special case: `getInstrumentConfig` simply looks here as well.
 * Sample urls may be any url `fetch` accepts, including `blob:` urls.
 */
export interface RuntimeInstrument {
  label: string;
  /** note name -> url, resolved against `baseUrl` (use "" for absolute urls) */
  urls: Record<string, string>;
  baseUrl: string;
  attack?: number;
  release?: number;
}

const registry = new Map<string, RuntimeInstrument>();
const listeners = new Set<() => void>();
let version = 0;

const changed = () => {
  version++;
  listeners.forEach((l) => l());
};

export function registerRuntimeInstrument(id: string, instrument: RuntimeInstrument): void {
  registry.set(id, instrument);
  changed();
}

export function unregisterRuntimeInstrument(id: string): void {
  if (registry.delete(id)) changed();
}

/** Replaces every runtime instrument whose id starts with `prefix` by `next` (one change notice). */
export function replaceRuntimeInstruments(prefix: string, next: Record<string, RuntimeInstrument>): void {
  for (const id of [...registry.keys()]) if (id.startsWith(prefix)) registry.delete(id);
  for (const [id, inst] of Object.entries(next)) registry.set(id, inst);
  changed();
}

export const getRuntimeInstrument = (id: string): RuntimeInstrument | undefined => registry.get(id);

export const runtimeInstrumentOptions = (): { label: string; value: string }[] => [...registry.entries()].map(([value, i]) => ({ label: i.label, value }));

export const runtimeInstrumentVersion = () => version;

/** Calls `fn` whenever a runtime instrument is added, changed or removed. Returns the unsubscribe function. */
export function subscribeRuntimeInstruments(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

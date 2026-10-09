import { getAudioContext } from "./context";
import { getInstrumentConfig } from "./instruments";
import { noteToMidi } from "./notes";

const cache = new Map<string, AudioBuffer>();
const loading = new Map<string, Promise<AudioBuffer>>();

export const cachedSample = (url: string) => cache.get(url);

export function loadSample(url: string): Promise<AudioBuffer> {
  const hit = cache.get(url);
  if (hit) return Promise.resolve(hit);
  const pending = loading.get(url);
  if (pending) return pending;
  const p = (async () => {
    const res = await fetch(url);
    const buf = await getAudioContext().decodeAudioData(await res.arrayBuffer());
    cache.set(url, buf);
    loading.delete(url);
    return buf;
  })();
  p.catch(() => loading.delete(url));
  loading.set(url, p);
  return p;
}

/** The samples of an instrument as { midi, url }, or [] for an instrument without samples (the oscillator). */
export function instrumentSamples(instrumentId: string): { midi: number; url: string }[] {
  const config = getInstrumentConfig(instrumentId);
  if (!config) return [];
  return Object.entries(config.urls).flatMap(([note, file]) => {
    const midi = noteToMidi(note);
    return midi === null ? [] : [{ midi, url: config.baseUrl + file }];
  });
}

export async function preloadInstrument(instrumentId: string): Promise<void> {
  await Promise.all(instrumentSamples(instrumentId).map((s) => loadSample(s.url)));
}

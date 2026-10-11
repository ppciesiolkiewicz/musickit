import type { SamplerStore } from "./store/types";

/** One object url per sample id, made from the stored audio when first needed and revoked when the sample is deleted. */
const urls = new Map<string, string>();

export async function urlFor(store: SamplerStore, sampleId: string): Promise<string | null> {
  const hit = urls.get(sampleId);
  if (hit) return hit;
  const blob = await store.getAudio(sampleId);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urls.set(sampleId, url);
  return url;
}

export function forgetSample(sampleId: string) {
  const url = urls.get(sampleId);
  if (url) URL.revokeObjectURL(url);
  urls.delete(sampleId);
}

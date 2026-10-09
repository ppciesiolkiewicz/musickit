import { sanitiseProject } from "./model/project";
import type { SamplerProject } from "./model/types";
import type { SamplerStore } from "./store/types";

/** A whole project as one file: the structure and every sample, so it can be backed up or moved to another browser. */
interface Bundle {
  kind: "musickit-sampler";
  project: SamplerProject;
  audio: Record<string, string>;
}

const toDataUrl = (blob: Blob) => new Promise<string>((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(String(r.result));
  r.onerror = () => rej(r.error);
  r.readAsDataURL(blob);
});

const fromDataUrl = async (url: string) => (await fetch(url)).blob();

export async function exportBundle(project: SamplerProject, store: SamplerStore): Promise<Blob> {
  const audio: Record<string, string> = {};
  for (const s of project.samples) {
    const blob = await store.getAudio(s.id);
    if (blob) audio[s.id] = await toDataUrl(blob);
  }
  const bundle: Bundle = { kind: "musickit-sampler", project, audio };
  return new Blob([JSON.stringify(bundle)], { type: "application/json" });
}

/** Reads a bundle into the store and returns the project, or throws a short message. */
export async function importBundle(text: string, store: SamplerStore): Promise<SamplerProject> {
  let raw: Partial<Bundle>;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("That file is not a sampler project.");
  }
  if (raw.kind !== "musickit-sampler") throw new Error("That file is not a sampler project.");
  const project = sanitiseProject(raw.project);
  const kept: string[] = [];
  for (const s of project.samples) {
    const data = raw.audio?.[s.id];
    if (typeof data !== "string" || !data.startsWith("data:")) continue;
    await store.putAudio(s.id, await fromDataUrl(data));
    kept.push(s.id);
  }
  // samples whose audio is missing are dropped (with their pads)
  return sanitiseProject({ ...project, samples: project.samples.filter((s) => kept.includes(s.id)) });
}

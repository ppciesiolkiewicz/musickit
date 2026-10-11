import type { SampleMeta, SamplerProject } from "./types";

export const emptyProject = (): SamplerProject => ({ version: 1, samples: [] });

const MAX_NAME = 60;
const clean = (s: unknown, fallback: string) => (typeof s === "string" && s.trim() ? s.trim().slice(0, MAX_NAME) : fallback);
const num = (v: unknown, lo: number, hi: number, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback);

/** A fresh id that is not in `taken`. */
export function uniqueId(prefix: string, taken: Iterable<string>, random: () => number = Math.random): string {
  const used = new Set(taken);
  for (;;) {
    const id = `${prefix}${Math.floor(random() * 0x7fffffff).toString(36)}`;
    if (!used.has(id)) return id;
  }
}

/** Loads whatever was saved. Anything malformed is dropped; old instruments are ignored. */
export function sanitiseProject(raw: unknown): SamplerProject {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<SamplerProject>;
  const samples: SampleMeta[] = [];
  const seen = new Set<string>();
  for (const s of Array.isArray(r.samples) ? r.samples : []) {
    if (!s || typeof s.id !== "string" || seen.has(s.id)) continue;
    seen.add(s.id);
    samples.push({
      id: s.id,
      name: clean(s.name, "Sample"),
      source: s.source === "elevenlabs" ? "elevenlabs" : "upload",
      prompt: typeof s.prompt === "string" ? s.prompt.slice(0, 400) : undefined,
      mime: typeof s.mime === "string" ? s.mime : "audio/mpeg",
      bytes: num(s.bytes, 0, Number.MAX_SAFE_INTEGER, 0),
      createdAt: num(s.createdAt, 0, Number.MAX_SAFE_INTEGER, 0),
    });
  }
  return { version: 1, samples };
}

export const addSample = (p: SamplerProject, sample: SampleMeta): SamplerProject => ({ ...p, samples: [...p.samples, sample] });

export const renameSample = (p: SamplerProject, id: string, name: string): SamplerProject => ({ ...p, samples: p.samples.map((s) => (s.id === id ? { ...s, name: clean(name, s.name) } : s)) });

export const removeSample = (p: SamplerProject, id: string): SamplerProject => ({ ...p, samples: p.samples.filter((s) => s.id !== id) });

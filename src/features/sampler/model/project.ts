import { noteToMidi } from "@/features/sound/engine/notes";
import { INSTRUMENT_PREFIX, type SampleMeta, type SamplerInstrument, type SamplerProject } from "./types";

export const emptyProject = (): SamplerProject => ({ version: 1, samples: [], instruments: [] });

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

/** Loads whatever was saved. Anything malformed is dropped and pads that point at a missing sample are removed. */
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
  const instruments: SamplerInstrument[] = [];
  const ids = new Set<string>();
  for (const i of Array.isArray(r.instruments) ? r.instruments : []) {
    if (!i || typeof i.id !== "string" || ids.has(i.id)) continue;
    ids.add(i.id);
    const pads: Record<string, string> = {};
    for (const [note, sid] of Object.entries(i.pads ?? {})) if (noteToMidi(note) !== null && typeof sid === "string" && seen.has(sid)) pads[note] = sid;
    instruments.push({ id: i.id, label: clean(i.label, "Instrument"), pads, attack: num(i.attack, 0, 2, 0), release: num(i.release, 0.02, 5, 0.3) });
  }
  return { version: 1, samples, instruments };
}

export const addSample = (p: SamplerProject, sample: SampleMeta): SamplerProject => ({ ...p, samples: [...p.samples, sample] });

export const renameSample = (p: SamplerProject, id: string, name: string): SamplerProject => ({ ...p, samples: p.samples.map((s) => (s.id === id ? { ...s, name: clean(name, s.name) } : s)) });

/** Removes a sample and every pad that used it. */
export const removeSample = (p: SamplerProject, id: string): SamplerProject => ({
  ...p,
  samples: p.samples.filter((s) => s.id !== id),
  instruments: p.instruments.map((i) => ({ ...i, pads: Object.fromEntries(Object.entries(i.pads).filter(([, sid]) => sid !== id)) })),
});

export function addInstrument(p: SamplerProject, label: string, id: string): SamplerProject {
  return { ...p, instruments: [...p.instruments, { id, label: clean(label, "Instrument"), pads: {}, attack: 0, release: 0.3 }] };
}

export const removeInstrument = (p: SamplerProject, id: string): SamplerProject => ({ ...p, instruments: p.instruments.filter((i) => i.id !== id) });

const patchInstrument = (p: SamplerProject, id: string, fn: (i: SamplerInstrument) => SamplerInstrument): SamplerProject => ({ ...p, instruments: p.instruments.map((i) => (i.id === id ? fn(i) : i)) });

export const renameInstrument = (p: SamplerProject, id: string, label: string) => patchInstrument(p, id, (i) => ({ ...i, label: clean(label, i.label) }));

export const setEnvelope = (p: SamplerProject, id: string, attack: number, release: number) =>
  patchInstrument(p, id, (i) => ({ ...i, attack: num(attack, 0, 2, i.attack), release: num(release, 0.02, 5, i.release) }));

/** Puts a sample on a note of an instrument. An invalid note or unknown sample changes nothing. */
export function setPad(p: SamplerProject, instrumentId: string, note: string, sampleId: string): SamplerProject {
  if (noteToMidi(note) === null || !p.samples.some((s) => s.id === sampleId)) return p;
  return patchInstrument(p, instrumentId, (i) => ({ ...i, pads: { ...i.pads, [note]: sampleId } }));
}

export const clearPad = (p: SamplerProject, instrumentId: string, note: string) =>
  patchInstrument(p, instrumentId, (i) => ({ ...i, pads: Object.fromEntries(Object.entries(i.pads).filter(([n]) => n !== note)) }));

/** Moves a pad to another note (swapping if the target is taken). */
export function movePad(p: SamplerProject, instrumentId: string, from: string, to: string): SamplerProject {
  if (from === to || noteToMidi(to) === null) return p;
  return patchInstrument(p, instrumentId, (i) => {
    const sid = i.pads[from];
    if (!sid) return i;
    const pads = { ...i.pads };
    delete pads[from];
    if (pads[to]) pads[from] = pads[to];
    pads[to] = sid;
    return { ...i, pads };
  });
}

/** The first note from C3 upward (a semitone at a time, then wrapping down) that has no pad. */
export function nextFreeNote(pads: Record<string, string>, names: readonly string[] = NOTE_RANGE): string {
  const free = names.find((n) => !pads[n]);
  return free ?? names[names.length - 1];
}

const SHARPS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
/** C3 to B5, the notes a pad can be put on in the editor. */
export const NOTE_RANGE: readonly string[] = Array.from({ length: 36 }, (_, i) => `${SHARPS[i % 12]}${3 + Math.floor(i / 12)}`);

/** A note written in a file name, e.g. "pad_F#3.wav" -> "F#3". null when there is none. */
export function guessNote(fileName: string): string | null {
  const m = /(?:^|[^A-Za-z])([A-Ga-g])([#b]?)(-?\d)(?:[^0-9]|$)/.exec(fileName.replace(/\.[^.]+$/, ""));
  if (!m) return null;
  const note = `${m[1].toUpperCase()}${m[2]}${m[3]}`;
  return noteToMidi(note) === null ? null : note;
}

/** The id the sound engine knows an instrument by. */
export const engineId = (instrumentId: string) => `${INSTRUMENT_PREFIX}${instrumentId}`;

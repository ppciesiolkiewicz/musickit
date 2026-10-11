/**
 * Instrument inputs: a controller (what you play: Piano, Scale Piano, Soundboard) and a sound generator (what makes the sound:
 * the built-in sampled Piano catalogue, or the Sampler). Pure: the saved state and its repair, which note sounds, what the
 * injected voice must play, and the move from the old `extra` and `scalepiano` strips. Imports nothing outside src/lib/looper.
 */

export type Controller = "piano" | "scalepiano" | "soundboard";
export const CONTROLLERS: Controller[] = ["piano", "scalepiano", "soundboard"];
export const CONTROLLER_NAMES: Record<Controller, string> = { piano: "Piano", scalepiano: "Scale Piano", soundboard: "Soundboard" };

export type Generator =
  /** an instrument id of the app's sound engine; `padNotes[i]` is the note pad i plays on a Soundboard */
  | { kind: "piano"; instrument: string; padNotes: number[] }
  /** `root` is the MIDI note `sample` sounds at; `padSamples[i]` is the sample of pad i (a sample id of the app's library) */
  | { kind: "sampler"; root: number; sample?: string; padSamples: (string | null)[] };

export interface InstrumentState {
  controller: Controller;
  /** Scale Piano settings, kept while another controller is chosen: key (0 = C), scale id, octave of the bottom row */
  root: number;
  scale: string;
  octave: number;
  /** Soundboard pad count */
  pads: number;
  generator: Generator;
}

/** What the injected voice plays: a built-in instrument, one sample tuned across the keys, or one sample per pad (unpitched). */
export type VoiceSpec =
  | { kind: "piano"; instrument: string }
  | { kind: "pitched"; sample: string | null; root: number }
  | { kind: "pads"; samples: (string | null)[] };

/** Soundboard pad i plays MIDI note PAD_BASE + i */
export const PAD_BASE = 36;
export const MIN_PADS = 1;
export const MAX_PADS = 32;
export const DEFAULT_PADS = 8;
const DEFAULT_INSTRUMENT = "PIANO";
const MAX_ID = 64;

/** The computer keys of the pads, in pad order: number row, then the Q, A and Z rows. */
export const PAD_KEYS: string[] = [
  ..."1234567890".split("").map((d) => `Digit${d}`),
  ..."QWERTYUIOPASDFGHJKLZXCVBNM".split("").map((c) => `Key${c}`),
];

const int = (v: unknown, lo: number, hi: number, fallback: number) => (Number.isInteger(v) ? Math.max(lo, Math.min(hi, v as number)) : fallback);
const shortId = (v: unknown): string | undefined => (typeof v === "string" && v && v.length <= MAX_ID ? v : undefined);
const isNote = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 127;
const isSample = (v: unknown): v is string | null => v === null || shortId(v) !== undefined;
const resize = <T>(a: unknown, n: number, fill: (i: number) => T, ok: (v: unknown) => v is T): T[] =>
  Array.from({ length: n }, (_, i) => (Array.isArray(a) && ok(a[i]) ? a[i] : fill(i)));
const defaultPadNote = (i: number) => 60 + i;

export function defaultGenerator(kind: Generator["kind"], pads: number): Generator {
  return kind === "sampler"
    ? { kind, root: 60, padSamples: Array.from({ length: pads }, () => null) }
    : { kind, instrument: DEFAULT_INSTRUMENT, padNotes: Array.from({ length: pads }, (_, i) => defaultPadNote(i)) };
}

function clampGenerator(raw: unknown, pads: number): Generator {
  const g = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  if (g.kind === "sampler") {
    const sample = shortId(g.sample);
    return { kind: "sampler", root: isNote(g.root) ? g.root : 60, ...(sample ? { sample } : {}), padSamples: resize(g.padSamples, pads, () => null, isSample) };
  }
  if (g.kind === "piano") return { kind: "piano", instrument: shortId(g.instrument) ?? DEFAULT_INSTRUMENT, padNotes: resize(g.padNotes, pads, defaultPadNote, isNote) };
  return defaultGenerator("piano", pads);
}

/** Repairs anything saved or asked for: unknown controller → piano, unknown generator → piano/PIANO, pad arrays sized to `pads`. */
export function clampInstrument(raw: unknown): InstrumentState {
  const s = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const controller = CONTROLLERS.includes(s.controller as Controller) ? (s.controller as Controller) : "piano";
  const root = Number.isInteger(s.root) ? (((s.root as number) % 12) + 12) % 12 : 0;
  const scale = typeof s.scale === "string" && s.scale ? s.scale : "major";
  const pads = int(s.pads, MIN_PADS, MAX_PADS, DEFAULT_PADS);
  return { controller, root, scale, octave: int(s.octave, 0, 6, 3), pads, generator: clampGenerator(s.generator, pads) };
}

export const DEFAULT_INSTRUMENT_STATE: InstrumentState = clampInstrument({});

/** Another generator kind starts fresh (nothing of a piano applies to a sampler); the same kind is kept as it is. */
export const withGenerator = (s: InstrumentState, kind: Generator["kind"]): InstrumentState =>
  s.generator.kind === kind ? s : { ...s, generator: defaultGenerator(kind, s.pads) };

/** The note the voice gets for a played note: keys pass through; a Soundboard pad plays its note on a piano, or stays a pad note for the sampler. null = no such pad. */
export function soundingNote(s: InstrumentState, midi: number): number | null {
  if (s.controller !== "soundboard") return midi;
  const i = midi - PAD_BASE;
  if (!Number.isInteger(i) || i < 0 || i >= s.pads) return null;
  return s.generator.kind === "piano" ? s.generator.padNotes[i] : midi;
}

export function voiceSpec(s: InstrumentState): VoiceSpec {
  const g = s.generator;
  if (g.kind === "piano") return { kind: "piano", instrument: g.instrument };
  return s.controller === "soundboard" ? { kind: "pads", samples: [...g.padSamples] } : { kind: "pitched", sample: g.sample ?? null, root: g.root };
}

/** The pad a computer key plays, or null. */
export function padIndexOf(code: string, pads: number): number | null {
  const i = PAD_KEYS.indexOf(code);
  return i >= 0 && i < pads ? i : null;
}

function fromScalePiano(raw: unknown): InstrumentState {
  const sp = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  // instruments made on the old sampler page (`user:…`) are gone
  const instrument = typeof sp.instrument === "string" && sp.instrument && !sp.instrument.startsWith("user:") ? sp.instrument : DEFAULT_INSTRUMENT;
  return clampInstrument({ controller: "scalepiano", root: sp.root, scale: sp.scale, octave: sp.octave, generator: { kind: "piano", instrument } });
}

/**
 * Old saves had a keyboard strip (`extra`, no source id) and Scale Piano strips (`scalepiano`, settings in `musickit.looper.scalePianos`).
 * They become `instrument` strips with the same strip ids (so patch links and buses still match); the keyboard gets a new source id.
 * Returns null when there is nothing to move, so it runs once.
 */
export function migrateSaves(o: { inputs: unknown; scalePianos: unknown; instruments: unknown }): { inputs: Record<string, unknown>[]; instruments: Record<string, InstrumentState> } | null {
  if (!Array.isArray(o.inputs)) return null;
  const inputs = o.inputs.filter((s): s is Record<string, unknown> => !!s && typeof s === "object");
  if (!inputs.some((s) => s.kind === "scalepiano" || s.kind === "extra")) return null;
  const old = (o.scalePianos && typeof o.scalePianos === "object" ? o.scalePianos : {}) as Record<string, unknown>;
  const instruments: Record<string, InstrumentState> = {};
  if (o.instruments && typeof o.instruments === "object") for (const [k, v] of Object.entries(o.instruments)) instruments[k] = clampInstrument(v);
  const taken = [...Object.keys(old), ...Object.keys(instruments), ...inputs.map((s) => String(s.sourceId ?? ""))];
  let n = Math.max(0, ...taken.map((k) => Number(k.replace(/\D/g, "")) || 0));
  const out = inputs.map((s) => {
    if (s.kind === "scalepiano" && typeof s.sourceId === "string") {
      instruments[s.sourceId] = fromScalePiano(old[s.sourceId]);
      return { ...s, kind: "instrument" };
    }
    if (s.kind === "extra") {
      const sourceId = `p${++n}`;
      instruments[sourceId] = clampInstrument({ controller: "piano" });
      return { ...s, kind: "instrument", sourceId };
    }
    return s;
  });
  return { inputs: out, instruments };
}

/**
 * A video config file (`videos/*.json`), parsed and checked. Pure data in, plain `VideoConfig` out; a bad field throws a
 * `VideoConfigError` whose message starts with the field's path, so a typo never renders silently wrong.
 */
import { Note } from "@tonaljs/tonal";
import { MELODY_BEATS, sanitiseSubject, type FrameRect, type Subject } from "@/features/stage";
import { MAX_BPM, MIN_BPM } from "@/features/instruments/jam/clock";
import { VOICES, buildLadder, type Voice } from "@/features/theory/singing";
import { STAGES, parseTune } from "@/features/theory/singingMelodies";

export type FormatId = "16x9" | "9x16";

/** The pixel size of each output format. */
export const FORMATS: Record<FormatId, { width: number; height: number }> = {
  "16x9": { width: 1920, height: 1080 },
  "9x16": { width: 1080, height: 1920 },
};

export const FPS = 30;

/** One timeline entry: a tune (notation), sung `times` times after a countdown. */
export interface VideoTune {
  tune: string;
  label?: string;
  times: number;
  caption: string;
}

export interface VideoConfig {
  /** used in the output file name */
  name: string;
  tonicPc: number;
  /** a singing scale slug `buildLadder` accepts, e.g. "major-ionian" */
  scale: string;
  bpm: number;
  voice: Voice;
  /** in paint order (the order of the config's "layers" object) */
  layers: { id: string; subject: Subject }[];
  /** layer id → rect, for each format the config names */
  formats: Partial<Record<FormatId, Record<string, FrameRect>>>;
  timeline: VideoTune[];
}

/** A bad config; the message starts with the path of the field at fault. */
export class VideoConfigError extends Error {
  /** just the message, so printing the error (and `assert.throws` with a regex) starts with the path, not "Error: " */
  toString(): string {
    return this.message;
  }
}

const fail = (path: string, msg: string): never => {
  throw new VideoConfigError(`${path}: ${msg}`);
};

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

const BEATS_PER_BAR = 4;
const BOOK = STAGES.flatMap((s) => s.tunes);

function parseRect(raw: unknown, path: string): FrameRect {
  if (!isObject(raw)) return fail(path, "expected { x, y, w, h }");
  const n = (k: string): number => {
    const v = raw[k];
    return typeof v === "number" && Number.isFinite(v) ? v : fail(`${path}.${k}`, "expected a number");
  };
  const [x, y, w, h] = [n("x"), n("y"), n("w"), n("h")];
  if (x < 0 || y < 0) return fail(path, "x and y must not be negative");
  if (w <= 0 || h <= 0) return fail(path, "w and h must be above 0");
  if (x + w > 1 + 1e-9 || y + h > 1 + 1e-9) return fail(path, "rect runs outside the frame (x + w and y + h must be at most 1)");
  return { x, y, w, h };
}

function parseTimelineEntry(raw: unknown, path: string): VideoTune {
  if (!isObject(raw)) return fail(path, "expected an object");
  let tune: string;
  let label = typeof raw.label === "string" ? raw.label : undefined;
  if (typeof raw.tune === "number") {
    if (!Number.isInteger(raw.tune) || raw.tune < 1) return fail(`${path}.tune`, "a book number is a positive whole number");
    const found = BOOK[raw.tune - 1];
    if (found === undefined) return fail(`${path}.tune`, `no book tune ${raw.tune} (the book has ${BOOK.length})`);
    tune = found;
    label ??= `book ${raw.tune}`;
  } else if (typeof raw.tune === "string") {
    tune = raw.tune;
  } else return fail(`${path}.tune`, "expected notation or a book number");
  try {
    const notes = parseTune(tune);
    if (!notes.length) return fail(`${path}.tune`, "no notes");
    const last = notes[notes.length - 1];
    const beats = last.at + last.beats;
    if (Math.abs(beats / BEATS_PER_BAR - Math.round(beats / BEATS_PER_BAR)) > 1e-9) return fail(`${path}.tune`, `${beats} beats is not whole bars of ${BEATS_PER_BAR}`);
  } catch (e) {
    if (e instanceof VideoConfigError) throw e;
    return fail(`${path}.tune`, e instanceof Error ? e.message : "unreadable tune");
  }
  const times = raw.times;
  if (typeof times !== "number" || !Number.isInteger(times) || times < 1 || times > 16) return fail(`${path}.times`, "expected a whole number from 1 to 16");
  if (raw.caption !== undefined && typeof raw.caption !== "string") return fail(`${path}.caption`, "expected text");
  return { tune, ...(label !== undefined ? { label } : {}), times, caption: raw.caption ?? "Get ready" };
}

/** Parses and checks a config; `pluginIds` are the creator's panel ids that a `plugin` layer may name. Throws `VideoConfigError`. */
export function parseVideoConfig(raw: unknown, pluginIds: string[]): VideoConfig {
  if (!isObject(raw)) return fail("config", "expected an object");

  if (typeof raw.name !== "string" || !/^[a-z0-9-]+$/.test(raw.name)) return fail("name", "required: lower-case letters, digits and dashes");
  const name = raw.name;

  const tonicPc = typeof raw.key === "string" ? Note.chroma(raw.key) : undefined;
  if (tonicPc === undefined || Number.isNaN(tonicPc)) return fail("key", 'expected a note name like "C", "F#" or "Bb"');

  if (typeof raw.voice !== "string" || !Object.hasOwn(VOICES, raw.voice)) return fail("voice", `required, one of ${Object.keys(VOICES).join(", ")}`);
  const voice = raw.voice as Voice;

  if (typeof raw.scale !== "string" || buildLadder(raw.scale, tonicPc, VOICES[voice]) === null) return fail("scale", "not a singing scale (e.g. major-ionian)");
  const scale = raw.scale;

  const bpm = raw.bpm;
  if (typeof bpm !== "number" || !Number.isInteger(bpm) || bpm < MIN_BPM || bpm > MAX_BPM) return fail("bpm", `expected a whole number from ${MIN_BPM} to ${MAX_BPM}`);

  if (!isObject(raw.layers) || !Object.keys(raw.layers).length) return fail("layers", "expected an object of layers keyed by id");
  const layers = Object.entries(raw.layers).map(([id, layer]) => {
    const subject = isObject(layer) ? sanitiseSubject(layer.subject, pluginIds) : null;
    if (!subject) return fail(`layers.${id}.subject`, "not a known widget");
    // the stage drops a bad `beats` for its default; a video says so instead of rendering a different size
    if (subject.kind === "melody" && isObject(layer) && isObject(layer.subject) && layer.subject.beats !== undefined && subject.beats === undefined)
      return fail(`layers.${id}.subject.beats`, `expected a whole number from ${MELODY_BEATS.min} to ${MELODY_BEATS.max}`);
    return { id, subject };
  });
  if (layers.filter((l) => l.subject.kind === "melody").length !== 1) return fail("layers", "one melody layer is required");

  if (!isObject(raw.formats) || !Object.keys(raw.formats).length) return fail("formats", "name at least one format (16x9 or 9x16)");
  const formats: VideoConfig["formats"] = {};
  for (const [fmt, def] of Object.entries(raw.formats)) {
    if (!Object.hasOwn(FORMATS, fmt)) return fail(`formats.${fmt}`, "no such format (16x9 or 9x16)");
    const rects = isObject(def) && isObject(def.layers) ? def.layers : fail(`formats.${fmt}.layers`, "expected an object of rects keyed by layer id");
    for (const id of Object.keys(rects)) if (!layers.some((l) => l.id === id)) fail(`formats.${fmt}.${id}`, "no such layer");
    formats[fmt as FormatId] = Object.fromEntries(layers.map((l) => [l.id, rects[l.id] === undefined ? fail(`formats.${fmt}.${l.id}`, "missing rect") : parseRect(rects[l.id], `formats.${fmt}.${l.id}`)]));
  }

  if (!Array.isArray(raw.timeline) || !raw.timeline.length) return fail("timeline", "expected at least one tune");
  const timeline = raw.timeline.map((e, i) => parseTimelineEntry(e, `timeline[${i}]`));

  return { name, tonicPc, scale, bpm, voice, layers, formats, timeline };
}

import { parseChordQuery } from "@/lib/chordKit/chordSearch";
import { parseKeySlug } from "@/features/theory/keySlug";
import { findPentatonic } from "@/features/theory/pentatonics";
import { findModePage } from "@/features/theory/scales";
import { VOICES, type Voice } from "@/features/theory/singing";
import { pickChoices, pickTune, type MelodyPick } from "@/features/theory/melodyPick";
import { BOOK, RUNS, RUN_STAGES, STAGES, type BookTune, type Stage } from "@/features/theory/singingMelodies";
import { isRunId, isTuneId } from "@/features/exercises/basics/choices";
import { INTERVAL_DIRS, type IntervalDir } from "@/features/exercises/basics/interval-singer/asks";
import { STRING_DRILLS, type StringDrill } from "@/features/exercises/basics/string-singer/strings";
import { BREATH_DRILLS, LIMITS as BREATH_LIMITS, type BreathDrill } from "@/features/exercises/basics/breathwork/breaths";
import { strumPattern } from "@/features/exercises/basics/strum-along/blocks";
import { COMPONENT_DOCS, shortDoc, type ComponentDoc } from "@/features/exercises/docs";
import type { PlayAlongShape } from "@/features/exercises/play-along/play-along.props";
import { expandShape } from "@/features/exercises/shapes";
import { MAX_BPM as BACKING_MAX_BPM, MIN_BPM as BACKING_MIN_BPM, MAX_NUMERALS, PARTS, PROGRESSIONS, STYLES, TONICS, cleanNumerals, numeralOfChord, type Part as BackingPart } from "@/features/backing/model";
import { degreeSemis } from "@/features/exercises/timeline/degrees";
import { isSingingLabels, type SingingLabels } from "@/features/theory/labels";
import type { Degree, Voicing } from "@/features/exercises/timeline/types";
import { layersOf, othersOf, type Others } from "@/features/exercises/cues/visibility";
import { parsePlacement, type Placement } from "@/features/exercises/cues/placement";
import type { CatalogueEntry } from "./catalogue";
import type { Area } from "./concepts";
import type { Level } from "./types";
import { migrateTool, toolFromLink } from "./migrate";
import { notePc } from "./noteText";

/**
 * The one file that says what an exercise is made of. Think of it as an MCP server for the plan: every block and every
 * tool has a name, a description and an input schema. The tools are the learning components of src/features/exercises:
 * their description and props come from `COMPONENT_DOCS` (the components' JSDoc), `TOOLS` only parses. To add a tool:
 * the component with its `@component` doc, its entry in `TOOLS`, a view in ui/ExerciseTool.tsx, a test.
 *
 * An exercise is a linear list of sections, shown in order:
 *   heading  a small title            text  a paragraph       list  numbered steps
 *   tool     one of `TOOLS`, set up
 * Links to attunr pages are not sections: they sit in the exercise's two slots, `learnBefore` and `exploreMore` (migrate.ts).
 */

/* ---------------------------------------------------------------- the tools */

export type BandPart = "click" | "drone" | "drums" | "bass";
export const BAND_PARTS: BandPart[] = ["click", "drone", "drums", "bass"];
/** How a band part sits in its tool: "on" starts playing and can be switched off, "off" starts silent and can be switched on, "always" plays and cannot be switched off. A part left out is not offered. */
export type PartMode = "on" | "off" | "always";
export const PART_MODES: PartMode[] = ["on", "off", "always"];
export type BandParts = Partial<Record<BandPart, PartMode>>;
export type BackingParts = Partial<Record<BackingPart, PartMode>>;

type View = "tab" | "notes" | "neck";
type Under = "chords" | "drone" | "none";

/**
 * A tool as stored: `type` names the component (src/features/exercises), the rest are its props, parsed: keys as pitch
 * classes, degrees as semitones above the root (major-relative, not scale-aware) except where the view reads the
 * degree strings itself (`arpeggio-neck` `part`, `guitar-play-along` `enable` and `highlight`). A guitar-play-along keeps its checked shape, never events.
 */
export type PlanTool =
  | { type: "scale-neck"; scale: string; key: number; boxes?: number[]; /** the whole neck above the boxes, a box tapped lights up on it */ neck?: boolean; /** false: no boxes (the neck alone) */ positions?: boolean; /** pitch classes from outside the scale */ add?: number[]; placement?: Placement } & Marks
  | { type: "position-neck"; scale: string; key: number; positions?: number[]; placement?: Placement; /** strings 1-6, 6 = low E */ cross?: { from: number; to: number; string?: number }; add?: number[]; outside?: "muted" | "hidden"; picker?: boolean } & Marks
  | { type: "chord-shapes"; chords: string[]; voicing?: Voicing }
  | { type: "staff"; scale: string; key: number; voice: Voice; /** semitones above the key: only these are on the staff */ notes?: number[]; /** also the notes under the lowest Do */ under?: boolean; mic?: boolean; /** its own backing, started with the mic */ drone?: boolean; click?: boolean; bpm?: number; labels?: SingingLabels } & Marks
  | { type: "backing-band"; bpm: number; key: number; /** the parts offered and how; never empty */ parts: BandParts }
  | { type: "note-finder"; query: string }
  | { type: "interval-ears"; query: string; /** intervals may span more than an octave */ wide?: boolean }
  | { type: "arpeggio-neck"; chord: string; boxes?: number[]; part?: Degree[]; placement?: Placement } & Marks
  | { type: "melody-singer"; tune: number; key: number; voice?: Voice; chords?: false; metronome?: true }
  | { type: "run-singer"; run: number; voice?: Voice; chords?: false; metronome?: true }
  | { type: "string-singer"; drill?: StringDrill; metronome?: false }
  | { type: "breathwork"; drill?: BreathDrill; from?: number; to?: number; seconds?: number; rounds?: number }
  | { type: "interval-singer"; key: number; /** more keys to pick Do from, the first `key`; absent: only `key` */ keys?: number[]; voice?: Voice; /** semitones from Do, 1-12 */ intervals?: number[]; dir?: IntervalDir; dot?: false }
  | { type: "guitar-play-along"; shape: PlayAlongShape; bpm: number; repeats?: number; view?: View; enable?: Degree[]; highlight?: Degree[]; others?: "muted" | "hidden"; under?: Under }
  | { type: "strum-along"; chords: string[]; bpm: number; per?: "bar" | "beat"; beats?: number; pattern?: string }
  | { type: "backing-track"; /** a backing tracks progression id; absent: `numerals` */ progression?: string; /** the lesson's own chords as numerals in `key` (pasted chords are read into numerals at parse) */ numerals?: string[]; key: number; /** a backing tracks style id; none: the progression's own, ballad for numerals */ style?: string; /** none: the style's tempo */ bpm?: number; /** the parts offered and how; absent: drums, bass and keys all "on" */ parts?: BackingParts }
  /* stubs: a placeholder view until the real components exist; strings are numbered 1-6, 6 = low E */
  | { type: "finger-pattern"; fingers: string; fret: number; strings?: number[]; show?: "finger" | "pick"; bpm: number }
  | { type: "picking-drill"; strokes: string; notesPerString: number; strings?: number[]; skip?: boolean; bpm: number }
  | { type: "legato-trill"; fingers: string; string: number; fret: number; bpm: number };

export type ToolName = PlanTool["type"];

/**
 * Which notes may be played (`enable`, absent: all), which of them stand out (`highlight`), which fade or go: semitones
 * above the key root (the chord root on `arpeggio-neck`); `others` is the state of the notes not enabled. See `noteState`.
 */
export interface Marks { enable?: number[]; highlight?: number[]; mute?: number[]; hide?: number[]; others?: Exclude<Others, "normal"> }

/** What a parse says besides the tool: why it gave none (`why`, set by `no`), and what it changed or defaulted (`notes`, "had no key; used A."). Both are written beside the logic that causes them. */
interface Diag { why?: string; notes: string[]; /** a plan this app saved: its lists are read as they are, nothing is noted */ stored?: boolean }

interface ToolSpec {
  /** the input checked: null when the tool can't be shown, with `d.why` set (`no`). Description and schema are the component's doc (`docOf`). */
  parse(t: Record<string, unknown>, d: Diag): PlanTool | null;
}

/** Null, saying why: `return no(d, "no key")`. */
const no = (d: Diag, why: string): null => {
  d.why = why;
  return null;
};
/** A missing or unreadable value, as a reason: `no key`, `unreadable key "x"`. */
const bad = (what: string, v: unknown): string => (v == null || v === "" ? `no ${what}` : `unreadable ${what} ${JSON.stringify(v)?.slice(0, 40)}`);
/** A value the AI left out or got wrong, replaced by `used`: a note, unless it was just left out and `quiet` (an optional prop with a documented default). */
const defaulted = (d: Diag, what: string, v: unknown, range: string, used: string | number, quiet = false) => {
  if (v == null || v === "") { if (!quiet) d.notes.push(`had no ${what}; used ${used}.`); }
  else d.notes.push(`had ${what} ${JSON.stringify(v)?.slice(0, 40)}${range ? ` (${range})` : ""}; used ${used}.`);
};

const int = (v: unknown, lo: number, hi: number): number | null => {
  const n = Number(v);
  return Number.isInteger(n) && n >= lo && n <= hi ? n : null;
};
/** An integer in lo..hi, else `fallback` with a note (`defaulted`). */
const intOr = (d: Diag, what: string, v: unknown, lo: number, hi: number, fallback: number, quiet = false): number => {
  const n = int(v, lo, hi);
  if (n !== null) return n;
  defaulted(d, what, v, `not a whole number ${lo}-${hi}`, fallback, quiet);
  return fallback;
};
const isScale = (slug: unknown): slug is string => typeof slug === "string" && !!(findPentatonic(slug) || findModePage(slug));
const keyOf = (v: unknown): number | null => (typeof v === "string" || typeof v === "number" ? parseKeySlug(String(v)) : null);
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
/** The chords it can read, at most `max`; the unreadable and the extra are named in `d.notes`. */
const chordList = (v: unknown, max: number, d: Diag) => {
  const all = list(v);
  const ok = all.filter((c): c is string => typeof c === "string" && !!parseChordQuery(c));
  if (ok.length < all.length) d.notes.push(`had chords it couldn't read, left out: ${all.filter((c) => !ok.includes(c as string)).map((c) => JSON.stringify(c)?.slice(0, 20)).join(", ")}.`);
  if (ok.length > max) d.notes.push(`had more than ${max} chords; kept the first ${max}.`);
  return ok.slice(0, max);
};
/** Notes the entries of a list prop that `read` gave null for, named (`"highlight" had entries it could not read (9, "x"); left them out.`); duplicates are no loss, and a stored plan is never noted. */
const lost = (d: Diag, what: string, v: unknown, read: (e: unknown) => unknown): void => {
  const bad = d.stored ? [] : list(v).filter((e) => read(e) === null);
  if (bad.length) d.notes.push(`"${what}" had entries it could not read (${bad.slice(0, 5).map((e) => JSON.stringify(e)?.slice(0, 20)).join(", ")}${bad.length > 5 ? ", …" : ""}); left them out.`);
};
const isChord = (v: unknown): v is string => typeof v === "string" && !!parseChordQuery(v);

export { degreeSemis };
/** Degrees as semitones: the AI's strings ("b3"), or numbers 0-11 kept as they are (stored plans already hold semitones). */
const degreeOf = (d: unknown): number | null => (typeof d === "number" ? int(d, 0, 11) : degreeSemis(d));
const degrees = (v: unknown): number[] => [...new Set(list(v).map(degreeOf).filter((n): n is number => n !== null))].sort((a, b) => a - b);
/** Degree strings the table knows, as written. */
const degreeStrings = (v: unknown): Degree[] => [...new Set(list(v).filter((d): d is string => typeof d === "string" && degreeSemis(d) !== null))];
const voiceOf = (v: unknown): Voice | undefined => (typeof v === "string" && v in VOICES ? (v as Voice) : undefined);
/**
 * Notes to mark, as semitones above `root`: degree strings first ("b3"), else note names as in `add` ("c-sharp"), read
 * against `root`; numbers 0-11 are kept (stored plans hold semitones; pasted numbers are dropped before this).
 */
const markOf = (root: number | null) => (d: unknown): number | null => {
  if (typeof d === "number") return int(d, 0, 11);
  const semi = degreeSemis(d);
  if (semi !== null) return semi;
  const pc = typeof d === "string" && root !== null ? notePc(d) : null;
  return pc === null ? null : (pc - root! + 12) % 12;
};
const marks = (v: unknown, root: number | null): number[] => [...new Set(list(v).map(markOf(root)).filter((n): n is number => n !== null))].sort((a, b) => a - b);
/** Where the box goes; dropped when `boxes` already says (`{ by: "chords" }` is resolved per exercise, `resolveChordPlacement`). */
const placementOf = (t: Record<string, unknown>, boxes: number[]): { placement?: Placement } => {
  const placement = boxes.length ? null : parsePlacement(t.placement);
  return placement ? { placement } : {};
};
/** Two layers: what may be played and what stands out; an older highlight that muted the rest is the enabled set (`layersOf`). */
const layers = <T>(enable: T[], highlight: T[], others: Others | undefined) => {
  const l = layersOf({ enable, highlight, others });
  const rest = l.enable?.length && others !== "normal" ? others : undefined;
  return { ...opt("enable", l.enable ?? []), ...opt("highlight", l.highlight ?? []), ...(rest ? { others: rest } : {}) };
};
const marksOf = (t: Record<string, unknown>, root: number | null, d: Diag): Marks => {
  for (const k of ["enable", "highlight", "mute", "hide"]) lost(d, k, t[k], markOf(root));
  // `others` is the state of what isn't enabled: kept only with an `enable`, so a stored tool reads back the same
  return { ...layers(marks(t.enable, root), marks(t.highlight, root), othersOf(t.others)), ...opt("mute", marks(t.mute, root)), ...opt("hide", marks(t.hide, root)) };
};
const boxOf = (b: unknown) => int(b, 1, 5);
/** Boxes or positions 1-5, as written; the ones it can't read are noted under `what`. */
const boxesOf = (v: unknown, d: Diag, what = "boxes") => {
  lost(d, what, v, boxOf);
  return [...new Set(list(v).map(boxOf).filter((b): b is number => b !== null))].sort((a, b) => a - b);
};
const opt = <K extends string, V>(k: K, v: V[]): { [P in K]?: V[] } => (v.length ? ({ [k]: v } as { [P in K]: V[] }) : {});
const bool = <K extends string>(k: K, v: unknown): { [P in K]?: boolean } => (typeof v === "boolean" ? ({ [k]: v } as { [P in K]: boolean }) : {});
/** A backing band's parts: a map of part to mode, or a list (each "on", as plans wrote it before modes); none: the click alone. */
export function bandParts(v: unknown, d?: Diag): BandParts {
  const out: BandParts = {};
  if (d) lostParts(d, v, BAND_PARTS);
  if (Array.isArray(v)) for (const p of v) if (BAND_PARTS.includes(p as BandPart)) out[p as BandPart] = "on";
  if (v && typeof v === "object" && !Array.isArray(v))
    for (const p of BAND_PARTS) {
      const m = (v as Record<string, unknown>)[p];
      if (PART_MODES.includes(m as PartMode)) out[p] = m as PartMode;
    }
  return Object.keys(out).length ? out : { click: "on" };
}

/** Notes the `parts` entries it can't read: a part it doesn't know, or a mode that isn't on, off or always. */
const lostParts = (d: Diag, v: unknown, known: readonly string[]): void => {
  const bad = Array.isArray(v) ? v.filter((p) => !known.includes(p as string)) : v && typeof v === "object" ? Object.entries(v).filter(([p, m]) => !known.includes(p) || !PART_MODES.includes(m as PartMode)).map(([p, m]) => ({ [p]: m })) : [];
  if (bad.length && !d.stored) d.notes.push(`"parts" had entries it could not read (${bad.slice(0, 5).map((e) => JSON.stringify(e)?.slice(0, 20)).join(", ")}); left them out.`);
};

/**
 * A backing track's parts: a map of part to mode, or, as plans wrote it before modes, `mute` (those "off", the rest "on").
 * Null when every part plays "on", the default, so a plain track stores no `parts`.
 */
export function backingParts(v: unknown, mute?: unknown, d?: Diag): BackingParts | null {
  const out: BackingParts = {};
  if (d) { lostParts(d, v, PARTS); lost(d, "mute", mute, (p) => (PARTS.includes(p as BackingPart) ? p : null)); }
  if (v && typeof v === "object" && !Array.isArray(v))
    for (const p of PARTS) {
      const m = (v as Record<string, unknown>)[p];
      if (PART_MODES.includes(m as PartMode)) out[p] = m as PartMode;
    }
  if (!Object.keys(out).length) for (const p of PARTS) out[p] = list(mute).includes(p) ? "off" : "on";
  return PARTS.every((p) => out[p] === "on") ? null : out;
}

/** The scale and key a neck tool needs; null, saying why. */
const scaleKey = (t: Record<string, unknown>, d: Diag): { scale: string; key: number } | null => {
  const key = keyOf(t.key);
  if (!isScale(t.scale)) return no(d, t.scale == null ? "no scale" : `unknown scale ${JSON.stringify(t.scale)?.slice(0, 40)}`);
  return key === null ? no(d, bad("key", t.key)) : { scale: t.scale, key };
};
/** The notes from outside the scale, at most 4 (more is noted). */
const addOf = (t: Record<string, unknown>, d: Diag): number[] => {
  lost(d, "add", t.add, keyOf);
  const add = [...new Set(list(t.add).map(keyOf).filter((n): n is number => n !== null))];
  if (add.length > 4) d.notes.push(`had ${add.length} add notes; kept the first 4.`);
  return add.slice(0, 4);
};

const scaleNeck = (t: Record<string, unknown>, d: Diag): PlanTool | null => {
  const sk = scaleKey(t, d);
  if (!sk) return null;
  const { scale, key } = sk;
  const add = addOf(t, d);
  const boxes = boxesOf(t.boxes, d);
  return { type: "scale-neck", scale, key, ...opt("boxes", boxes), ...(t.neck === true ? { neck: true } : {}), ...(t.positions === false ? { positions: false } : {}), ...opt("add", add), ...placementOf(t, boxes), ...marksOf(t, key, d) };
};

/** Two different positions 1-5 and maybe a string 1-6 to cross on; null when not. */
const crossOf = (v: unknown): { from: number; to: number; string?: number } | null => {
  if (!v || typeof v !== "object") return null;
  const c = v as Record<string, unknown>;
  const from = int(c.from, 1, 5), to = int(c.to, 1, 5), string = int(c.string, 1, 6);
  return from !== null && to !== null && from !== to ? { from, to, ...(string !== null ? { string } : {}) } : null;
};

const positionNeck = (t: Record<string, unknown>, d: Diag): PlanTool | null => {
  const sk = scaleKey(t, d);
  if (!sk) return null;
  const { scale, key } = sk;
  const add = addOf(t, d);
  const cross = crossOf(t.cross);
  const positions = boxesOf(t.positions, d, "positions");
  const outside = t.outside === "muted" || t.outside === "hidden" ? { outside: t.outside as "muted" | "hidden" } : {};
  return {
    type: "position-neck", scale, key, ...opt("positions", positions), ...(cross ? { cross } : placementOf(t, positions)),
    ...opt("add", add), ...outside, ...bool("picker", t.picker), ...marksOf(t, key, d),
  };
};

/** The game's settings, as the query string its view reads; a stored tool keeps its query. */
const query = (t: Record<string, unknown>, keys: string[]): string => {
  if (typeof t.query === "string" && keys.every((k) => t[k] == null)) return t.query;
  const q = new URLSearchParams();
  for (const k of keys) if (t[k] != null) q.set(k, Array.isArray(t[k]) ? (t[k] as unknown[]).join(",") : String(t[k]));
  return q.toString();
};

/** Tools parsed from a `pick` that matched no tune exactly; kept off the tool so it is never stored. */
const INEXACT_PICKS = new WeakSet<object>();
/** Whether a parsed tool's `pick` had to be relaxed to find a tune. */
export const pickWasInexact = (tool: PlanTool): boolean => INEXACT_PICKS.has(tool);

const pickOf = (v: unknown): MelodyPick | null => {
  if (!v || typeof v !== "object") return null;
  const p = v as Record<string, unknown>;
  const index = typeof p.index === "number" && Number.isFinite(p.index) ? p.index : undefined;
  return { ...(typeof p.difficulty === "string" ? { difficulty: p.difficulty } : {}), ...(typeof p.stage === "string" ? { stage: p.stage } : {}), ...(index !== undefined ? { index } : {}) };
};

/** A singer tool with the tune given by number, or by a `pick` (resolved here, never stored). A tune needs its key; a run spans the voice, so takes none. */
const singer = (t: Record<string, unknown>, d: Diag, field: "tune" | "run", ok: (n: unknown) => boolean, book: BookTune[]): PlanTool | null => {
  const key = keyOf(t.key);
  if (key === null && field === "tune") return no(d, bad("key", t.key));
  let n = t[field];
  let exact = true;
  const pick = ok(n) ? null : pickOf(t.pick);
  if (pick) {
    const found = pickTune(book, pick);
    if (found) { n = found.n; exact = found.exact; }
  }
  if (!ok(n)) return no(d, pick || t.pick != null ? `no ${field} matched the pick` : n == null ? `no ${field} number or pick` : `unknown ${field} ${JSON.stringify(n)?.slice(0, 20)}`);
  const voice = voiceOf(t.voice);
  // chords are on unless turned off, the metronome off unless turned on, so only the change is kept
  const rest = { ...(voice ? { voice } : {}), ...(t.chords === false ? { chords: false as const } : {}), ...(t.metronome === true ? { metronome: true as const } : {}) };
  const tool: PlanTool = field === "tune" ? { type: "melody-singer", tune: n as number, key: key!, ...rest } : { type: "run-singer", run: n as number, ...rest };
  if (!exact) INEXACT_PICKS.add(tool);
  return tool;
};

/** 2 to 4 (or exactly `n`) different fingers 1-4, as the AI wrote them: "1324" or 1324. */
const fingersOf = (v: unknown, min: number, max: number): string | null => {
  const f = typeof v === "number" || typeof v === "string" ? String(v) : "";
  return /^[1-4]+$/.test(f) && new Set(f).size === f.length && f.length >= min && f.length <= max ? f : null;
};
/** Strings 1-6, low E first; none left means all. */
const stringsOf = (v: unknown, d: Diag) => {
  const read = (n: unknown) => int(n, 1, 6);
  lost(d, "strings", v, read);
  return opt("strings", [...new Set(list(v).map(read).filter((n): n is number => n !== null))].sort((a, b) => b - a));
};
const stubBpm = (d: Diag, v: unknown) => intOr(d, "bpm", v, 40, 200, 80);

const VIEWS: View[] = ["tab", "notes", "neck"];
const UNDERS: Under[] = ["chords", "drone", "none"];

/** The reason fingers can't be used: what was written and what is allowed. */
const badFingers = (v: unknown, min: number, max: number) => `fingers ${JSON.stringify(v)?.slice(0, 20) ?? "missing"} must be ${min === max ? max : `${min}-${max}`} different fingers from 1 to 4`;
/** The voice, tenor (the prompt's default) when none or an unknown one is written. */
const voiceOrTenor = (d: Diag, v: unknown): Voice => {
  const voice = voiceOf(v);
  if (!voice) defaulted(d, "voice", v, "not a voice", "tenor");
  return voice ?? "tenor";
};

const PARSERS: { [N in ToolName]: ToolSpec } = {
  "scale-neck": { parse: scaleNeck },
  "position-neck": { parse: positionNeck },
  "chord-shapes": {
    parse(t, d) {
      const chords = chordList(t.chords, 8, d);
      return chords.length ? { type: "chord-shapes", chords, ...(t.voicing === "barre" || t.voicing === "open" ? { voicing: t.voicing } : {}) } : no(d, "no chord it could read");
    },
  },
  staff: {
    parse(t, d) {
      const sk = scaleKey(t, d);
      if (!sk) return null;
      const { scale, key } = sk;
      const notes = degrees(t.notes);
      lost(d, "notes", t.notes, degreeOf);
      const voice = voiceOrTenor(d, t.voice);
      // the click's tempo is optional (default 60): only a wrong one is noted
      const bpm = t.click === true ? intOr(d, "bpm", t.bpm, 30, 240, 60, true) : 0;
      return { type: "staff", scale, key, voice, ...(notes.length > 1 ? { notes } : {}), ...(t.under === true ? { under: true } : {}), ...marksOf(t, key, d), ...bool("mic", t.mic), ...(t.drone === true ? { drone: true } : {}), ...(t.click === true ? { click: true, bpm } : {}), ...(isSingingLabels(t.labels) ? { labels: t.labels } : {}) };
    },
  },
  "backing-band": {
    parse(t, d) {
      const bpm = intOr(d, "bpm", t.bpm, 30, 240, 80);
      const key = keyOf(t.key);
      if (key === null) defaulted(d, "key", t.key, "not a key", "A");
      return { type: "backing-band", bpm, key: key ?? 9, parts: bandParts(t.parts, d) };
    },
  },
  "note-finder": { parse: (t) => ({ type: "note-finder", query: query(t, ["mode", "strings", "from", "to"]) }) },
  "interval-ears": {
    parse(t) {
      const wide = t.wide === true || (typeof t.query === "string" && /(^|&)wide=1/.test(t.query));
      const q = query({ ...t, wide: undefined }, ["level", "set", "dir", "kind"]);
      const full = wide && !/(^|&)wide=1/.test(q) ? (q ? `${q}&wide=1` : "wide=1") : q;
      return { type: "interval-ears", query: full, ...(wide ? { wide } : {}) };
    },
  },
  "arpeggio-neck": {
    parse(t, d) {
      if (!isChord(t.chord)) return no(d, bad("chord", t.chord));
      const boxes = boxesOf(t.boxes, d).slice(0, 2);
      lost(d, "part", t.part, degreeSemis);
      return { type: "arpeggio-neck", chord: t.chord, ...opt("boxes", boxes), ...opt("part", degreeStrings(t.part)), ...placementOf(t, boxes), ...marksOf(t, parseChordQuery(t.chord)!.rootPc, d) };
    },
  },
  "melody-singer": { parse: (t, d) => singer(t, d, "tune", isTuneId, BOOK) },
  "run-singer": { parse: (t, d) => singer(t, d, "run", isRunId, RUNS) },
  breathwork: {
    parse(t) {
      // "farinelli" is the default, so only another drill is kept; counts for farinelli, seconds and rounds for the rest
      const drill = BREATH_DRILLS.includes(t.drill as BreathDrill) ? (t.drill as BreathDrill) : "farinelli";
      const [fromLo, fromHi] = BREATH_LIMITS.from;
      if (drill === "farinelli") {
        const from = int(t.from, fromLo, fromHi);
        const to = int(t.to, Math.max(from ?? fromLo, BREATH_LIMITS.to[0]), BREATH_LIMITS.to[1]);
        return { type: "breathwork", ...(from !== null ? { from } : {}), ...(to !== null ? { to } : {}) };
      }
      const seconds = int(t.seconds, ...BREATH_LIMITS.seconds);
      const rounds = int(t.rounds, ...BREATH_LIMITS.rounds);
      return { type: "breathwork", drill, ...(seconds !== null ? { seconds } : {}), ...(rounds !== null ? { rounds } : {}) };
    },
  },
  "string-singer": {
    parse(t) {
      // "strings" is the default, so only another drill is kept
      const drill = STRING_DRILLS.includes(t.drill as StringDrill) && t.drill !== "strings" ? { drill: t.drill as StringDrill } : {};
      // the metronome is on unless turned off
      return { type: "string-singer", ...drill, ...(t.metronome === false ? { metronome: false as const } : {}) };
    },
  },
  "interval-singer": {
    parse(t, d) {
      const voice = voiceOf(t.voice);
      lost(d, "intervals", t.intervals, (v) => int(v, 1, 12));
      lost(d, "keys", t.keys, keyOf);
      const intervals = [...new Set(list(t.intervals).map((v) => int(v, 1, 12)).filter((n): n is number => n !== null))].sort((a, b) => a - b).slice(0, 12);
      const dir = INTERVAL_DIRS.includes(t.dir as IntervalDir) && t.dir !== "up" ? { dir: t.dir as IntervalDir } : {};
      // the dot shows unless turned off
      // "random" (as key or keys) is all twelve; a list of keys keeps its first as the key
      const all = t.key === "random" || t.keys === "random";
      const listed = all ? Array.from({ length: 12 }, (_, k) => k) : list(t.keys).map(keyOf).filter((n): n is number => n !== null);
      const key = (all ? null : keyOf(t.key)) ?? listed[0] ?? 0;
      // the key is optional (default C): only a wrong one is noted
      if (!all && keyOf(t.key) === null) defaulted(d, "key", t.key, "not a key", TONICS[key], true);
      const keys = [...new Set([key, ...listed])];
      return { type: "interval-singer", key, ...(keys.length > 1 ? { keys } : {}), ...(voice ? { voice } : {}), ...opt("intervals", intervals), ...dir, ...(t.dot === false ? { dot: false as const } : {}) };
    },
  },
  "guitar-play-along": {
    parse(t, d) {
      if (!t.shape || typeof t.shape !== "object") return no(d, "no shape");
      for (const k of ["enable", "highlight"]) lost(d, k, t[k], degreeSemis);
      const shape = { ...(t.shape as Record<string, unknown>) };
      // bpm and repeats belong on the guitar-play-along; inside the shape they are a fallback
      const own = int(t.bpm, 30, 240) ?? int(shape.bpm, 30, 240);
      if (own === null) defaulted(d, "bpm", t.bpm ?? shape.bpm, "not a whole number 30-240", 80);
      const bpm = own ?? 80;
      const repeats = int(t.repeats, 1, 50) ?? int(shape.repeats, 1, 50);
      if (repeats === null && t.repeats != null) d.notes.push(`had repeats ${JSON.stringify(t.repeats)?.slice(0, 20)} (not a whole number 1-50); left it out.`);
      delete shape.bpm;
      delete shape.repeats;
      if (!expandShape({ ...shape, bpm, ...(repeats !== null ? { repeats } : {}) })) return no(d, `its shape ${JSON.stringify(shape.shape) ?? "(no shape field)"} does not expand (a field is missing or out of range)`);
      return {
        type: "guitar-play-along", bpm, shape: shape as unknown as PlayAlongShape,
        ...(repeats !== null ? { repeats } : {}),
        ...(VIEWS.includes(t.view as View) ? { view: t.view as View } : {}),
        ...layers(degreeStrings(t.enable), degreeStrings(t.highlight), othersOf(t.others)),
        ...(UNDERS.includes(t.under as Under) ? { under: t.under as Under } : {}),
      };
    },
  },
  "backing-track": {
    parse(t, d) {
      const progression = typeof t.progression === "string" ? t.progression.trim().toLowerCase() : "";
      const curated = PROGRESSIONS.some((p) => p.id === progression);
      const chords = curated ? [] : chordList(t.chords, MAX_NUMERALS, d);
      const key = keyOf(t.key) ?? (chords.length ? parseChordQuery(chords[0])!.rootPc : null);
      if (key === null) return no(d, "no key, and no chord to read it from");
      // the lesson's own chords are kept as numerals in the key, so moving the key moves them
      const numerals = curated ? null : chords.length ? cleanNumerals(chords.map((c) => numeralOfChord(c, TONICS[key]))) : cleanNumerals(t.numerals);
      if (!curated && !numerals) return no(d, progression ? `unknown progression ${JSON.stringify(progression)} and no chord it could read` : "no known progression and no chord it could read");
      const style = typeof t.style === "string" && STYLES.some((x) => x.id === t.style) ? t.style : null;
      if (t.style != null && !style) d.notes.push(`had an unknown style ${JSON.stringify(t.style)?.slice(0, 20)}; used the progression's own.`);
      const n = Number(t.bpm);
      const bpm = t.bpm !== undefined && Number.isFinite(n) ? Math.min(BACKING_MAX_BPM, Math.max(BACKING_MIN_BPM, Math.round(n))) : null;
      if (bpm !== null && bpm !== n) defaulted(d, "bpm", t.bpm, `${BACKING_MIN_BPM}-${BACKING_MAX_BPM}`, bpm);
      else if (bpm === null && t.bpm != null) d.notes.push(`had bpm ${JSON.stringify(t.bpm)?.slice(0, 20)}, not a number; used the style's tempo.`);
      const parts = backingParts(t.parts, t.mute, d);
      return {
        type: "backing-track", ...(curated ? { progression } : { numerals: numerals! }), key,
        ...(style ? { style } : {}), ...(bpm !== null ? { bpm } : {}), ...(parts ? { parts } : {}),
      };
    },
  },
  "strum-along": {
    parse(t, d) {
      const chords = chordList(t.chords, 16, d);
      if (!chords.length) return no(d, "no chord it could read");
      const beats = int(t.beats, 2, 6);
      const strokes = typeof t.pattern === "string" && t.pattern.trim() ? strumPattern(t.pattern, beats ?? 4) : null;
      if (typeof t.pattern === "string" && t.pattern.trim() && !strokes) d.notes.push(`had a pattern that doesn't fill the bar evenly; left it out.`);
      return {
        type: "strum-along", chords, bpm: intOr(d, "bpm", t.bpm, 30, 240, 80),
        ...(t.per === "bar" || t.per === "beat" ? { per: t.per } : {}),
        ...(beats !== null && beats !== 4 ? { beats } : {}),
        ...(strokes ? { pattern: strokes.map((b) => b.join(" ")).join(" | ") } : {}),
      };
    },
  },
  "finger-pattern": {
    parse: (t, d) => {
      const fingers = fingersOf(t.fingers, 2, 4);
      if (!fingers) return no(d, badFingers(t.fingers, 2, 4));
      return { type: "finger-pattern", fingers, fret: intOr(d, "fret", t.fret, 1, 12, 1, true), ...stringsOf(t.strings, d), ...(t.show === "finger" || t.show === "pick" ? { show: t.show } : {}), bpm: stubBpm(d, t.bpm) };
    },
  },
  "picking-drill": {
    parse: (t, d) => {
      const strokes = typeof t.strokes === "string" && /^[du]{1,8}$/i.test(t.strokes) ? t.strokes.toUpperCase() : null;
      if (!strokes) return no(d, `strokes ${JSON.stringify(t.strokes)?.slice(0, 20) ?? "missing"} must be 1-8 letters, each d or u`);
      return { type: "picking-drill", strokes, notesPerString: intOr(d, "notesPerString", t.notesPerString, 1, 4, 4, true), ...stringsOf(t.strings, d), ...bool("skip", t.skip), bpm: stubBpm(d, t.bpm) };
    },
  },
  "legato-trill": {
    parse: (t, d) => {
      const fingers = fingersOf(t.fingers, 2, 2), string = int(t.string, 1, 6), fret = int(t.fret, 1, 12);
      if (!fingers) return no(d, badFingers(t.fingers, 2, 2));
      if (string === null) return no(d, `${bad("string", t.string)} (1-6)`);
      if (fret === null) return no(d, `${bad("fret", t.fret)} (1-12)`);
      return { type: "legato-trill", fingers, string, fret, bpm: stubBpm(d, t.bpm) };
    },
  },
};

/** The tools' parsers; the diagnosis is optional for callers that only want the tool (`parseToolDiag` wants it). */
export const TOOLS = Object.fromEntries(Object.entries(PARSERS).map(([k, p]) => [k, { parse: (t: Record<string, unknown>, d: Diag = { notes: [] }) => p.parse(t, d) }])) as { [N in ToolName]: { parse(t: Record<string, unknown>, d?: Diag): PlanTool | null } };

/** Degree lists that a stored plan may hold as semitone numbers. */
const DEGREE_LISTS = ["enable", "highlight", "mute", "hide", "notes"] as const;

/** A tool parsed, with what the parse had to say (`parseToolDiag`): `dropped` names what was left out and why, `notes` what was changed or defaulted. */
export interface ToolParse { tool: PlanTool | null; dropped?: string; notes: string[] }

/**
 * `parseTool` with its diagnosis. When the tool can't be shown `dropped` reads "a scale-neck (unknown scale "x")" or
 * "a tool of unknown type "y""; `notes` are things the parse changed ("backing-band had no key; used A."), each starting with the tool's type.
 */
export function parseToolDiag(raw: unknown, opts: { stored?: boolean } = {}): ToolParse {
  if (!raw || typeof raw !== "object") return { tool: null, dropped: "a tool that isn't an object", notes: [] };
  const t = { ...migrateTool(raw as Record<string, unknown>) };
  const numbers: string[] = [];
  if (!opts.stored)
    for (const k of DEGREE_LISTS)
      if (Array.isArray(t[k])) {
        const nums = (t[k] as unknown[]).filter((d) => typeof d === "number");
        if (nums.length) numbers.push(`"${k}" had numbers (${nums.slice(0, 5).join(", ")}${nums.length > 5 ? ", …" : ""}); write degrees as strings ("3", "b7"); left them out.`);
        t[k] = (t[k] as unknown[]).filter((d) => typeof d !== "number");
      }
  const spec = typeof t.type === "string" && Object.hasOwn(PARSERS, t.type) ? PARSERS[t.type as ToolName] : null;
  if (!spec) return { tool: null, dropped: t.type == null ? "a tool with no type" : `a tool of unknown type ${JSON.stringify(t.type)?.slice(0, 40)}`, notes: [] };
  const d: Diag = { notes: [...numbers], ...(opts.stored ? { stored: true } : {}) };
  const tool = spec.parse(t, d);
  const notes = d.notes.map((n) => `${t.type} ${n}`);
  return tool ? { tool, notes } : { tool, dropped: `${/^[aeiou]/.test(t.type as string) ? "an" : "a"} ${t.type} (${d.why ?? "it can't be shown"})`, notes };
}

/**
 * One tool from the AI's JSON or a stored plan (old names migrated first), checked: null when it can't be shown (`parseToolDiag` says why).
 * Numbers in degree lists (`enable`, `highlight`, `notes`) are semitones only with `stored` (a plan this app saved, or an old
 * `sing`); from pasted input they are dropped, since the AI writing `3` means the 3rd, not 3 semitones.
 */
export const parseTool = (raw: unknown, opts: { stored?: boolean } = {}): PlanTool | null => parseToolDiag(raw, opts).tool;

/* ---------------------------------------------------------------- the sections */

export type Section =
  | { type: "heading"; text: string; minutes?: number; /** pitch classes the student can move the step's tools to, the first the one they are written in (transpose.ts) */ keys?: number[] }
  | { type: "text"; text: string }
  | { type: "list"; items: string[] }
  | { type: "tool"; tool: PlanTool };

const str = (v: unknown, max: number): string => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** The longest a heading, a text and a list item may be, and the most items in a list: cut beyond (`parseSection` says so), and told to the AI by the schemas below. */
export const MAX_HEADING = 100, MAX_TEXT = 700, MAX_ITEM = 240, MAX_ITEMS = 8;
const STR = { type: "string" };
const strMax = (maxLength: number) => ({ type: "string", maxLength });
const SECTIONS: { type: Section["type"]; description: string; properties: Record<string, unknown>; required: string[] }[] = [
  { type: "heading", description: "A short title inside the exercise (\"Warm-up\", \"Now with the 7th\").", properties: { text: strMax(MAX_HEADING), minutes: { type: "integer", minimum: 1, maximum: 60, description: "starts a timed block of this many minutes" }, keys: { type: "array", items: STR, minItems: 2, maxItems: 3, description: "2-3 keys as notes (\"d\", \"b-flat\"), the first the key the block's tools are written in: the student taps a key and every tool in the block moves to it, so one drill is sung or played in each key" } }, required: ["text"] },
  { type: "text", description: "A paragraph of plain instructions.", properties: { text: strMax(MAX_TEXT) }, required: ["text"] },
  { type: "list", description: "Numbered steps the student follows.", properties: { items: { type: "array", items: strMax(MAX_ITEM), minItems: 1, maxItems: MAX_ITEMS } }, required: ["items"] },
  { type: "tool", description: "One of the tools below, shown here, in order, already set up. A tool shows what the text just before it talks about.", properties: { tool: { type: "object", description: "{\"type\": <tool name>, …input}" } }, required: ["tool"] },
];

/** Exercise tags the AI may set; the page shows them as chips. "multi-octave" is also added by a wide ears tool. */
export const EXERCISE_TAGS: Record<string, string> = {
  "multi-octave": "intervals or melodies that span more than an octave",
  ear: "mostly listening",
  sing: "mostly singing",
  rhythm: "mostly timing",
  technique: "mostly hands",
  theory: "mostly knowing",
  improv: "mostly making it up",
  song: "mostly a piece of music",
};

/** The most kind tags the AI may set on an exercise (the prompt says 1 to 3). */
export const MAX_TAGS = 3;

/** The kind tags the AI wrote that we know (each once, in order) and the ones it wrote that we don't. */
export function askedTags(raw: unknown): { known: string[]; unknown: string[] } {
  const all = [...new Set(list(raw).filter((t): t is string => typeof t === "string"))];
  return { known: all.filter((t) => Object.hasOwn(EXERCISE_TAGS, t)), unknown: all.filter((t) => !Object.hasOwn(EXERCISE_TAGS, t)) };
}

/** The tags an exercise gets: the first 3 of what the AI set that we know, plus the ones its tools imply (added after the cut, so an implied tag is never the one dropped). */
export function exerciseTags(raw: unknown, sections: Section[]): string[] {
  const tags = new Set(askedTags(raw).known.slice(0, MAX_TAGS));
  for (const s of sections) if (s.type === "tool" && s.tool.type === "interval-ears" && s.tool.wide) tags.add("multi-octave");
  return [...tags];
}

/** The level and area tags every exercise carries (the page shows them as chips before the kind tags). */
export const EXERCISE_LEVELS: Level[] = ["new", "beginner", "intermediate", "advanced"];
export const EXERCISE_AREAS: Area[] = ["guitar", "voice", "theory"];

/** The exercise's level and area as the AI set them; an unknown one is left out. */
export function exerciseLevelArea(e: { level?: unknown; area?: unknown }): { level?: Level; area?: Area } {
  const level = EXERCISE_LEVELS.find((l) => l === e.level);
  const area = EXERCISE_AREAS.find((a) => a === e.area);
  return { ...(level ? { level } : {}), ...(area ? { area } : {}) };
}

/**
 * `{ by: "chords" }` placements, resolved from the exercise's first chord tool (a chord-shapes or strum-along, else a
 * guitar-play-along with chords): open voicing → next to the open chords; barre → near the first chord's root on the low E string. No chord
 * tool: the placement goes.
 */
export function resolveChordPlacement(sections: Section[]): Section[] {
  const chordTool = sections.flatMap((s) => (s.type === "tool" ? [s.tool] : [])).map((t) => {
    if (t.type === "chord-shapes") return { chords: t.chords, voicing: t.voicing };
    if (t.type === "strum-along") return { chords: t.chords, voicing: undefined };
    if (t.type !== "guitar-play-along") return null;
    const sh = t.shape as { chords?: (string | { chord?: string })[]; voicing?: Voicing };
    const chords = (sh.chords ?? []).map((c) => (typeof c === "string" ? c : c.chord)).filter((c): c is string => !!c && !!parseChordQuery(c));
    return chords.length ? { chords, voicing: sh.voicing } : null;
  }).find((c) => c !== null);
  const resolved: Placement | null = !chordTool ? null
    : chordTool.voicing === "barre" ? { by: "fret", fret: (parseChordQuery(chordTool.chords[0])!.rootPc - 4 + 12) % 12 }
    : { by: "open" };
  return sections.map((s) => {
    if (s.type !== "tool" || (s.tool.type !== "scale-neck" && s.tool.type !== "arpeggio-neck" && s.tool.type !== "position-neck") || s.tool.placement?.by !== "chords") return s;
    const tool = { ...s.tool };
    if (resolved) tool.placement = resolved;
    else delete tool.placement;
    return { type: "tool", tool };
  });
}

/** A heading's 2-3 different keys, in order; null when fewer than two can be read. */
const keysOf = (v: unknown): number[] | null => {
  const keys = [...new Set(list(v).map(keyOf).filter((k): k is number => k !== null))].slice(0, 3);
  return keys.length >= 2 ? keys : null;
};

/** A section parsed, with what the parse had to say: `dropped` names what was left out and why, `notes` what was cut or changed. */
export interface SectionParse { section: Section | null; dropped?: string; notes: string[] }

/** `str`, noting a cut ("a text was cut at 700 characters.") in `notes`. */
const strNoted = (v: unknown, max: number, what: string, notes: string[]): string => {
  const out = str(v, max);
  if (typeof v === "string" && v.trim().length > max) notes.push(`${what} was cut at ${max} characters.`);
  return out;
};

/** One section from the AI's JSON, checked, with its diagnosis: what was cut, and why a section was left out. */
export function parseSectionDiag(raw: unknown): SectionParse {
  const s = (raw ?? {}) as Record<string, unknown>;
  const notes: string[] = [];
  const out = (section: Section): SectionParse => ({ section, notes });
  const empty = (what: string): SectionParse => ({ section: null, dropped: `${what} (it was empty)`, notes });
  switch (s.type) {
    case "heading":
    case "text": {
      const text = strNoted(s.text, s.type === "heading" ? MAX_HEADING : MAX_TEXT, s.type === "heading" ? "a heading" : "a text", notes);
      if (!text) return empty(`a ${s.type}`);
      if (s.type === "text") return out({ type: "text", text });
      const m = Math.round(Number(s.minutes));
      const keys = keysOf(s.keys);
      const unread = list(s.keys).filter((k) => keyOf(k) === null);
      if (unread.length) notes.push(`a heading's "keys" had entries it could not read (${unread.slice(0, 5).map((k) => JSON.stringify(k)?.slice(0, 20)).join(", ")}); left them out.`);
      return out({ type: "heading", text, ...(s.minutes != null && Number.isFinite(m) ? { minutes: Math.min(60, Math.max(1, m)) } : {}), ...(keys ? { keys } : {}) });
    }
    case "list": {
      const asked = list(s.items);
      const items = asked.map((i) => strNoted(i, MAX_ITEM, "a list item", notes)).filter(Boolean);
      if (items.length > MAX_ITEMS) notes.push(`a list was cut at ${MAX_ITEMS} items.`);
      return items.length ? out({ type: "list", items: items.slice(0, MAX_ITEMS) }) : empty("a list");
    }
    case "tool": {
      const p = parseToolDiag(s.tool);
      notes.push(...p.notes);
      return p.tool ? out({ type: "tool", tool: p.tool }) : { section: null, dropped: p.dropped, notes };
    }
  }
  return { section: null, dropped: s.type == null ? "a section with no type" : `a section of unknown type ${JSON.stringify(s.type)?.slice(0, 40)}`, notes };
}

/** One section from the AI's JSON, checked; null when empty or not showable. */
export const parseSection = (raw: unknown): Section | null => parseSectionDiag(raw).section;

/* ---------------------------------------------------------------- what the prompt says */

const schema = (properties: Record<string, unknown>, required: string[] = []) => JSON.stringify({ type: "object", properties, ...(required.length ? { required } : {}) });

/** The blocks an exercise is made of, as the prompt lists them: name, what it is, input schema. */
export function sectionInterface(): string[] {
  return SECTIONS.map((s) => `- ${s.type} : ${s.description}\n  inputSchema: ${schema({ type: { const: s.type }, ...s.properties }, ["type", ...s.required])}`);
}

const pickLine = (what: string, stages: Stage[]) => `${what} is chosen with pick {difficulty?, stage?, index?} (index from 0, wraps; no tune number). ${pickChoices(stages)}`;
/** A tool's description, with the singer tools' choices spliced in. */
function describe(d: ComponentDoc): string {
  const text = d.description.replace(/\s+/g, " ");
  if (d.name === "melody-singer") return `${text} ${pickLine("Tune", STAGES)}`;
  if (d.name === "run-singer") return `${text} ${pickLine("Run", RUN_STAGES)}`;
  return text;
}
const propLine = (indent: string) => (p: OfferedParam) => `${indent}${p.name}${p.required ? "" : "?"}: ${p.type}${p.description ? ` (${p.description})` : ""}`;
const TOOL_DOCS = () => COMPONENT_DOCS.filter((d) => d.kind !== "shape");
const SHAPE_DOCS = () => COMPONENT_DOCS.filter((d) => d.kind === "shape");

/** The tools, as an MCP server would list them: name, description, props; guitar-play-along's shapes listed under it. */
export function toolInterface(): string[] {
  return TOOL_DOCS().map((d) => {
    const lines = [`- ${d.name} : ${describe(d)}`, "  props:", ...d.props.map(propLine("    "))];
    if (d.name === "guitar-play-along") {
      lines.push("  shapes (the \"shape\" object; its \"shape\" field names it):");
      for (const s of SHAPE_DOCS()) lines.push(`    * ${s.name} : ${describe(s)}`, ...s.props.map(propLine("        ")));
    }
    return lines.join("\n");
  });
}

export interface OfferedParam { name: string; type: string; required: boolean; description: string }
export interface OfferedItem { name: string; description: string; short: string; params: OfferedParam[] }

const offered = (d: ComponentDoc): OfferedItem => ({ name: d.name, description: describe(d), short: shortDoc(d), params: d.props });
const sectionParams = (properties: Record<string, unknown>, required: string[]): OfferedParam[] =>
  Object.entries(properties).map(([name, raw]) => {
    const p = raw as { type?: string; items?: { type?: string }; description?: string };
    return { name, type: p.type === "array" ? `${p.items?.type ?? "any"}[]` : p.type ?? "any", required: required.includes(name), description: p.description ?? "" };
  });

/** What the prompt offers the AI, for the debug view: the same `COMPONENT_DOCS` the prompt renders. */
export function offeredInterface(entries: CatalogueEntry[]): { sections: OfferedItem[]; tools: OfferedItem[]; shapes: OfferedItem[]; links: string[] } {
  return {
    sections: SECTIONS.map((s) => ({ name: s.type, description: s.description, short: `${s.type}: ${s.description}`, params: sectionParams(s.properties, s.required) })),
    tools: TOOL_DOCS().map(offered),
    shapes: SHAPE_DOCS().map(offered),
    links: linkResources(entries).map((l) => l.replace(/^- /, "")),
  };
}

/**
 * The pages a link (in `learnBefore` / `exploreMore`) may go to, as resources: URI templates with their values, not one line per page. The page list
 * comes from the catalogue, so a new page or scale shows up here without touching the prompt.
 */
export function linkResources(entries: CatalogueEntry[]): string[] {
  const scales = entries.filter((e) => e.href.startsWith("/theory/scales/"));
  const course = entries.filter((e) => e.href.startsWith("/course/"));
  const pages = entries.filter((e) => !scales.includes(e) && !course.includes(e) && e.href !== "/course");
  const stages = new Map<string, { label: string; sections: string[] }>();
  for (const c of course) {
    const [, , stage, section] = c.href.split("/");
    const at = stages.get(stage) ?? { label: c.desc.replace(/^Course /, ""), sections: [] };
    at.sections.push(section);
    stages.set(stage, at);
  }
  return [
    `- pages : ${pages.map((p) => `${p.href} (${p.label.toLowerCase()})`).join(", ")}`,
    `- /theory/scales/{scale}/{key} : scale ∈ ${scales.map((s) => s.href.split("/")[3]).join(", ")}; key is a note (a, f-sharp, b-flat)`,
    ...[...stages].map(([n, s]) => `- /course/${n}/{section} : ${s.label}; section ∈ ${s.sections.join(", ")}`),
  ];
}

/* ---------------------------------------------------------------- plans from before sections */

/**
 * An exercise written before sections (how / steps / tools, each tool with its `step`) as sections: text, then each
 * step followed by its tools. Its `link` becomes a tool when it stands for one; otherwise it is a link (`linkSlots`).
 */
export function legacySections(e: { how?: string; steps?: string[]; tools?: StoredTool[]; link?: string }): Section[] {
  const out: Section[] = [];
  const linked = toolFromLink(e.link);
  const tools: StoredTool[] = e.tools ?? (linked ? [linked] : []);
  const tool = (t: StoredTool): Section[] => {
    const p = parseTool(t, { stored: true });
    return p ? [{ type: "tool", tool: p }] : [];
  };
  tools.filter((t) => !t.step).forEach((t) => out.push(...tool(t))); // a band keeping time goes first
  if (e.how) out.push({ type: "text", text: e.how });
  if (e.steps?.length) {
    e.steps.forEach((text, i) => {
      out.push({ type: "text", text: `${i + 1}. ${text}` });
      tools.filter((t) => t.step === i + 1).forEach((t) => out.push(...tool(t)));
    });
  }
  return out;
}

/** A tool as a stored plan holds it: today's `PlanTool`, or an older one (`scale`, `comp`, …) that `parseTool` migrates. */
export type StoredTool = (PlanTool | { type: string; [k: string]: unknown }) & { step?: number };

/**
 * What an exercise shows, in order: its sections, or, for a plan stored before sections, what its old fields stand for.
 * Stored tools are parsed again, so a tool saved under an old name shows as its component; an old `link` section is
 * left out (it is in "Explore more", `linkSlots`).
 */
export const sectionsOf = (e: { sections?: Section[]; how?: string; steps?: string[]; tools?: StoredTool[]; link?: string }): Section[] =>
  e.sections
    ? e.sections.flatMap((s): Section[] => {
        if ((s.type as string) === "link") return [];
        if (s.type !== "tool") return [s];
        const tool = parseTool(s.tool, { stored: true });
        return tool ? [{ type: "tool", tool }] : [];
      })
    : legacySections(e);

import { parseChordQuery } from "@/lib/chordKit/chordSearch";
import { parseKeySlug } from "@/features/theory/keySlug";
import { findPentatonic } from "@/features/theory/pentatonics";
import { findModePage } from "@/features/theory/scales";
import { VOICES, type Voice } from "@/features/theory/singing";
import { pickChoices, pickTune, type MelodyPick } from "@/features/theory/melodyPick";
import { BOOK, RUNS, RUN_STAGES, STAGES, type BookTune, type Stage } from "@/features/theory/singingMelodies";
import { isRunId, isTuneId } from "@/features/exercises/basics/choices";
import { COMPONENT_DOCS, shortDoc, type ComponentDoc } from "@/features/exercises/docs";
import type { PlayAlongShape } from "@/features/exercises/play-along/play-along.props";
import { expandShape } from "@/features/exercises/shapes";
import { degreeSemis } from "@/features/exercises/timeline/degrees";
import type { Degree, Voicing } from "@/features/exercises/timeline/types";
import { othersOf, type Others } from "@/features/exercises/cues/visibility";
import { parsePlacement, type Placement } from "@/features/exercises/cues/placement";
import { checkLink, type CatalogueEntry } from "./catalogue";
import { migrateTool } from "./migrate";
import { notePc } from "./noteText";

/**
 * The one file that says what an exercise is made of. Think of it as an MCP server for the plan: every block and every
 * tool has a name, a description and an input schema. The tools are the learning components of src/features/exercises:
 * their description and props come from `COMPONENT_DOCS` (the components' JSDoc), `TOOLS` only parses. To add a tool:
 * the component with its `@component` doc, its entry in `TOOLS`, a view in ui/ExerciseTool.tsx, a test.
 *
 * An exercise is a linear list of sections, shown in order:
 *   heading  a small title            text  a paragraph       list  numbered steps
 *   tool     one of `TOOLS`, set up   link  an attunr page to open
 */

/* ---------------------------------------------------------------- the tools */

export type BandPart = "click" | "drone" | "drums" | "bass";
export const BAND_PARTS: BandPart[] = ["click", "drone", "drums", "bass"];

type View = "tab" | "notes" | "neck";
type Under = "chords" | "drone" | "none";

/**
 * A tool as stored: `type` names the component (src/features/exercises), the rest are its props, parsed: keys as pitch
 * classes, degrees as semitones above the root (major-relative, not scale-aware) except where the view reads the
 * degree strings itself (`arpeggio-neck` `part`, `play-along` `highlight`). A play-along keeps its checked shape, never events.
 */
export type PlanTool =
  | { type: "scale-neck"; scale: string; key: number; boxes?: number[]; /** pitch classes from outside the scale */ add?: number[]; placement?: Placement } & Marks
  | { type: "chord-shapes"; chords: string[]; voicing?: Voicing }
  | { type: "staff"; scale: string; key: number; voice: Voice; /** semitones above the key: only these are on the staff */ notes?: number[]; mic?: boolean } & Marks
  | { type: "click-drone"; bpm: number; key: number; click?: boolean; drone?: boolean }
  | { type: "backing-band"; bpm: number; key: number; parts: BandPart[] }
  | { type: "note-finder"; query: string }
  | { type: "interval-ears"; query: string; /** intervals may span more than an octave */ wide?: boolean }
  | { type: "arpeggio-neck"; chord: string; boxes?: number[]; part?: Degree[]; placement?: Placement } & Marks
  | { type: "melody-singer"; tune: number; key: number; voice?: Voice }
  | { type: "run-singer"; run: number; key: number; voice?: Voice }
  | { type: "play-along"; shape: PlayAlongShape; bpm: number; repeats?: number; view?: View; highlight?: Degree[]; others?: "muted" | "hidden"; under?: Under }
  /* stubs: a placeholder view until the real components exist; strings are numbered 1-6, 6 = low E */
  | { type: "finger-pattern"; fingers: string; fret: number; strings?: number[]; bpm: number }
  | { type: "picking-drill"; strokes: string; notesPerString: number; strings?: number[]; skip?: boolean; bpm: number }
  | { type: "legato-trill"; fingers: string; string: number; fret: number; bpm: number };

export type ToolName = PlanTool["type"];

/** Which notes stand out, fade or go: semitones above the key root (the chord root on `arpeggio-neck`). See `noteState`. */
export interface Marks { highlight?: number[]; mute?: number[]; hide?: number[]; others?: Others }

interface ToolSpec {
  /** the input checked: null when the tool can't be shown. Description and schema are the component's doc (`docOf`). */
  parse(t: Record<string, unknown>): PlanTool | null;
}

const int = (v: unknown, lo: number, hi: number): number | null => {
  const n = Number(v);
  return Number.isInteger(n) && n >= lo && n <= hi ? n : null;
};
const isScale = (slug: unknown): slug is string => typeof slug === "string" && !!(findPentatonic(slug) || findModePage(slug));
const keyOf = (v: unknown): number | null => (typeof v === "string" || typeof v === "number" ? parseKeySlug(String(v)) : null);
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const chordList = (v: unknown, max: number) => list(v).filter((c): c is string => typeof c === "string" && !!parseChordQuery(c)).slice(0, max);
const isChord = (v: unknown): v is string => typeof v === "string" && !!parseChordQuery(v);

export { degreeSemis };
/** Degrees as semitones: the AI's strings ("b3"), or numbers 0-11 kept as they are (stored plans already hold semitones). */
const degrees = (v: unknown): number[] =>
  [...new Set(list(v).map((d) => (typeof d === "number" ? int(d, 0, 11) : degreeSemis(d))).filter((n): n is number => n !== null))].sort((a, b) => a - b);
/** Degree strings the table knows, as written. */
const degreeStrings = (v: unknown): Degree[] => [...new Set(list(v).filter((d): d is string => typeof d === "string" && degreeSemis(d) !== null))];
const voiceOf = (v: unknown): Voice | undefined => (typeof v === "string" && v in VOICES ? (v as Voice) : undefined);
/**
 * Notes to mark, as semitones above `root`: degree strings first ("b3"), else note names as in `add` ("c-sharp"), read
 * against `root`; numbers 0-11 are kept (stored plans hold semitones; pasted numbers are dropped before this).
 */
const marks = (v: unknown, root: number | null): number[] =>
  [...new Set(list(v).map((d) => {
    if (typeof d === "number") return int(d, 0, 11);
    const semi = degreeSemis(d);
    if (semi !== null) return semi;
    const pc = typeof d === "string" && root !== null ? notePc(d) : null;
    return pc === null ? null : (pc - root! + 12) % 12;
  }).filter((n): n is number => n !== null))].sort((a, b) => a - b);
/** Where the box goes; dropped when `boxes` already says (`{ by: "chords" }` is resolved per exercise, `resolveChordPlacement`). */
const placementOf = (t: Record<string, unknown>, boxes: number[]): { placement?: Placement } => {
  const placement = boxes.length ? null : parsePlacement(t.placement);
  return placement ? { placement } : {};
};
const marksOf = (t: Record<string, unknown>, root: number | null): Marks => {
  const highlight = marks(t.highlight, root);
  // `others` is the state of what isn't highlighted: without a highlight it would only fade or blank the whole view
  const others = highlight.length ? othersOf(t.others) : undefined;
  return { ...opt("highlight", highlight), ...opt("mute", marks(t.mute, root)), ...opt("hide", marks(t.hide, root)), ...(others ? { others } : {}) };
};
const boxesOf = (v: unknown) => [...new Set(list(v).map((b) => int(b, 1, 5)).filter((b): b is number => b !== null))].sort((a, b) => a - b);
const opt = <K extends string, V>(k: K, v: V[]): { [P in K]?: V[] } => (v.length ? ({ [k]: v } as { [P in K]: V[] }) : {});
const bool = <K extends string>(k: K, v: unknown): { [P in K]?: boolean } => (typeof v === "boolean" ? ({ [k]: v } as { [P in K]: boolean }) : {});

const scaleNeck = (t: Record<string, unknown>): PlanTool | null => {
  const key = keyOf(t.key);
  if (!isScale(t.scale) || key === null) return null;
  const add = [...new Set(list(t.add).map(keyOf).filter((n): n is number => n !== null))].slice(0, 4);
  const boxes = boxesOf(t.boxes);
  return { type: "scale-neck", scale: t.scale, key, ...opt("boxes", boxes), ...opt("add", add), ...placementOf(t, boxes), ...marksOf(t, key) };
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

/** A singer tool with the tune given by number, or by a `pick` (resolved here, never stored). */
const singer = (t: Record<string, unknown>, field: "tune" | "run", ok: (n: unknown) => boolean, book: BookTune[]): PlanTool | null => {
  const key = keyOf(t.key);
  if (key === null) return null;
  let n = t[field];
  let exact = true;
  const pick = ok(n) ? null : pickOf(t.pick);
  if (pick) {
    const found = pickTune(book, pick);
    if (found) { n = found.n; exact = found.exact; }
  }
  if (!ok(n)) return null;
  const voice = voiceOf(t.voice);
  const tool: PlanTool = field === "tune" ? { type: "melody-singer", tune: n as number, key, ...(voice ? { voice } : {}) } : { type: "run-singer", run: n as number, key, ...(voice ? { voice } : {}) };
  if (!exact) INEXACT_PICKS.add(tool);
  return tool;
};

/** 2 to 4 (or exactly `n`) different fingers 1-4, as the AI wrote them: "1324" or 1324. */
const fingersOf = (v: unknown, min: number, max: number): string | null => {
  const f = typeof v === "number" || typeof v === "string" ? String(v) : "";
  return /^[1-4]+$/.test(f) && new Set(f).size === f.length && f.length >= min && f.length <= max ? f : null;
};
/** Strings 1-6, low E first; none left means all. */
const stringsOf = (v: unknown) => opt("strings", [...new Set(list(v).map((n) => int(n, 1, 6)).filter((n): n is number => n !== null))].sort((a, b) => b - a));
const stubBpm = (v: unknown) => int(v, 40, 200) ?? 80;

const VIEWS: View[] = ["tab", "notes", "neck"];
const UNDERS: Under[] = ["chords", "drone", "none"];

export const TOOLS: { [N in ToolName]: ToolSpec } = {
  "scale-neck": { parse: scaleNeck },
  "chord-shapes": {
    parse(t) {
      const chords = chordList(t.chords, 8);
      return chords.length ? { type: "chord-shapes", chords, ...(t.voicing === "barre" || t.voicing === "open" ? { voicing: t.voicing } : {}) } : null;
    },
  },
  staff: {
    parse(t) {
      const key = keyOf(t.key);
      if (!isScale(t.scale) || key === null) return null;
      const notes = degrees(t.notes);
      return { type: "staff", scale: t.scale, key, voice: voiceOf(t.voice) ?? "baritone", ...(notes.length > 1 ? { notes } : {}), ...marksOf(t, key), ...bool("mic", t.mic) };
    },
  },
  "click-drone": {
    parse: (t) => ({ type: "click-drone", bpm: int(t.bpm, 30, 240) ?? 80, key: keyOf(t.key) ?? 9, ...bool("click", t.click), ...bool("drone", t.drone) }),
  },
  "backing-band": {
    parse(t) {
      const parts = list(t.parts).filter((p): p is BandPart => BAND_PARTS.includes(p as BandPart));
      return { type: "backing-band", bpm: int(t.bpm, 30, 240) ?? 80, key: keyOf(t.key) ?? 9, parts: parts.length ? [...new Set(parts)] : ["click"] };
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
    parse(t) {
      if (!isChord(t.chord)) return null;
      const boxes = boxesOf(t.boxes).slice(0, 2);
      return { type: "arpeggio-neck", chord: t.chord, ...opt("boxes", boxes), ...opt("part", degreeStrings(t.part)), ...placementOf(t, boxes), ...marksOf(t, parseChordQuery(t.chord)!.rootPc) };
    },
  },
  "melody-singer": { parse: (t) => singer(t, "tune", isTuneId, BOOK) },
  "run-singer": { parse: (t) => singer(t, "run", isRunId, RUNS) },
  "play-along": {
    parse(t) {
      if (!t.shape || typeof t.shape !== "object") return null;
      const shape = { ...(t.shape as Record<string, unknown>) };
      // bpm and repeats belong on the play-along; inside the shape they are a fallback
      const bpm = int(t.bpm, 30, 240) ?? int(shape.bpm, 30, 240) ?? 80;
      const repeats = int(t.repeats, 1, 50) ?? int(shape.repeats, 1, 50);
      delete shape.bpm;
      delete shape.repeats;
      if (!expandShape({ ...shape, bpm, ...(repeats !== null ? { repeats } : {}) })) return null;
      const highlight = degreeStrings(t.highlight);
      const others = othersOf(t.others);
      return {
        type: "play-along", bpm, shape: shape as unknown as PlayAlongShape,
        ...(repeats !== null ? { repeats } : {}),
        ...(VIEWS.includes(t.view as View) ? { view: t.view as View } : {}),
        // a play-along has no "normal": what isn't highlighted is muted or hidden
        ...opt("highlight", highlight), ...(others && others !== "normal" ? { others } : {}),
        ...(UNDERS.includes(t.under as Under) ? { under: t.under as Under } : {}),
      };
    },
  },
  "finger-pattern": {
    parse: (t) => {
      const fingers = fingersOf(t.fingers, 2, 4);
      return fingers ? { type: "finger-pattern", fingers, fret: int(t.fret, 1, 12) ?? 1, ...stringsOf(t.strings), bpm: stubBpm(t.bpm) } : null;
    },
  },
  "picking-drill": {
    parse: (t) => {
      const strokes = typeof t.strokes === "string" && /^[du]{1,8}$/i.test(t.strokes) ? t.strokes.toUpperCase() : null;
      return strokes ? { type: "picking-drill", strokes, notesPerString: int(t.notesPerString, 1, 4) ?? 4, ...stringsOf(t.strings), ...bool("skip", t.skip), bpm: stubBpm(t.bpm) } : null;
    },
  },
  "legato-trill": {
    parse: (t) => {
      const fingers = fingersOf(t.fingers, 2, 2), string = int(t.string, 1, 6), fret = int(t.fret, 1, 12);
      return fingers && string !== null && fret !== null ? { type: "legato-trill", fingers, string, fret, bpm: stubBpm(t.bpm) } : null;
    },
  },
};

/** Degree lists that a stored plan may hold as semitone numbers. */
const DEGREE_LISTS = ["highlight", "mute", "hide", "notes"] as const;

/**
 * One tool from the AI's JSON or a stored plan (old names migrated first), checked: null when it can't be shown.
 * Numbers in degree lists (`highlight`, `notes`) are semitones only with `stored` (a plan this app saved, or an old
 * `sing`); from pasted input they are dropped, since the AI writing `3` means the 3rd, not 3 semitones.
 */
export function parseTool(raw: unknown, opts: { stored?: boolean } = {}): PlanTool | null {
  if (!raw || typeof raw !== "object") return null;
  const t = { ...migrateTool(raw as Record<string, unknown>) };
  if (!opts.stored) for (const k of DEGREE_LISTS) if (Array.isArray(t[k])) t[k] = (t[k] as unknown[]).filter((d) => typeof d !== "number");
  const spec = typeof t.type === "string" && Object.hasOwn(TOOLS, t.type) ? TOOLS[t.type as ToolName] : null;
  return spec ? spec.parse(t) : null;
}

/* ---------------------------------------------------------------- the sections */

export type Section =
  | { type: "heading"; text: string; minutes?: number }
  | { type: "text"; text: string }
  | { type: "list"; items: string[] }
  | { type: "tool"; tool: PlanTool }
  | { type: "link"; href: string };

const str = (v: unknown, max: number): string => (typeof v === "string" ? v.trim().slice(0, max) : "");

const STR = { type: "string" };
const SECTIONS: { type: Section["type"]; description: string; properties: Record<string, unknown>; required: string[] }[] = [
  { type: "heading", description: "A short title inside the exercise (\"Warm-up\", \"Now with the 7th\").", properties: { text: STR, minutes: { type: "integer", minimum: 1, maximum: 60, description: "starts a timed block of this many minutes" } }, required: ["text"] },
  { type: "text", description: "A paragraph of plain instructions.", properties: { text: STR }, required: ["text"] },
  { type: "list", description: "Numbered steps the student follows.", properties: { items: { type: "array", items: STR, minItems: 1, maxItems: 8 } }, required: ["items"] },
  { type: "tool", description: "One of the tools below, shown here, in order, already set up. A tool shows what the text just before it talks about.", properties: { tool: { type: "object", description: "{\"type\": <tool name>, …input}" } }, required: ["tool"] },
  { type: "link", description: "An \"Open page\" link to an attunr page for more (see the pages). Optional; never invent one.", properties: { href: STR }, required: ["href"] },
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

/** The tags an exercise gets: what the AI set that we know, plus the ones its tools imply. */
export function exerciseTags(raw: unknown, sections: Section[]): string[] {
  const tags = new Set(list(raw).filter((t): t is string => typeof t === "string" && Object.hasOwn(EXERCISE_TAGS, t)));
  for (const s of sections) if (s.type === "tool" && s.tool.type === "interval-ears" && s.tool.wide) tags.add("multi-octave");
  return [...tags].slice(0, 4);
}

/**
 * `{ by: "chords" }` placements, resolved from the exercise's first chord tool (a chord-shapes, else a play-along with
 * chords): open voicing → next to the open chords; barre → near the first chord's root on the low E string. No chord
 * tool: the placement goes.
 */
export function resolveChordPlacement(sections: Section[]): Section[] {
  const chordTool = sections.flatMap((s) => (s.type === "tool" ? [s.tool] : [])).map((t) => {
    if (t.type === "chord-shapes") return { chords: t.chords, voicing: t.voicing };
    if (t.type !== "play-along") return null;
    const sh = t.shape as { chords?: (string | { chord?: string })[]; voicing?: Voicing };
    const chords = (sh.chords ?? []).map((c) => (typeof c === "string" ? c : c.chord)).filter((c): c is string => !!c && !!parseChordQuery(c));
    return chords.length ? { chords, voicing: sh.voicing } : null;
  }).find((c) => c !== null);
  const resolved: Placement | null = !chordTool ? null
    : chordTool.voicing === "barre" ? { by: "fret", fret: (parseChordQuery(chordTool.chords[0])!.rootPc - 4 + 12) % 12 }
    : { by: "open" };
  return sections.map((s) => {
    if (s.type !== "tool" || (s.tool.type !== "scale-neck" && s.tool.type !== "arpeggio-neck") || s.tool.placement?.by !== "chords") return s;
    const tool = { ...s.tool };
    if (resolved) tool.placement = resolved;
    else delete tool.placement;
    return { type: "tool", tool };
  });
}

/** One section from the AI's JSON, checked; null when empty or not showable. `pages` are the attunr pages a link may go to. */
export function parseSection(raw: unknown, pages: CatalogueEntry[]): Section | null {
  const s = (raw ?? {}) as Record<string, unknown>;
  switch (s.type) {
    case "heading":
    case "text": {
      const text = str(s.text, s.type === "heading" ? 100 : 700);
      if (!text) return null;
      const m = Math.round(Number(s.minutes));
      return s.type === "heading" && s.minutes != null && Number.isFinite(m) ? { type: "heading", text, minutes: Math.min(60, Math.max(1, m)) } : { type: s.type, text };
    }
    case "list": {
      const items = list(s.items).map((i) => str(i, 240)).filter(Boolean).slice(0, 8);
      return items.length ? { type: "list", items } : null;
    }
    case "tool": {
      const tool = parseTool(s.tool);
      return tool ? { type: "tool", tool } : null;
    }
    case "link": {
      const href = checkLink(s.href, pages);
      return href ? { type: "link", href } : null;
    }
  }
  return null;
}

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

/** The tools, as an MCP server would list them: name, description, props; play-along's shapes listed under it. */
export function toolInterface(): string[] {
  return TOOL_DOCS().map((d) => {
    const lines = [`- ${d.name} : ${describe(d)}`, "  props:", ...d.props.map(propLine("    "))];
    if (d.name === "play-along") {
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
 * The pages a link may go to, as resources: URI templates with their values, not one line per page. The page list
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

/** The tool an older plan's link stands for (a scale page, the notes or ears game, the metronome); null for any other page. */
export function toolFromLink(link: string | undefined): PlanTool | null {
  if (!link) return null;
  const [pathPart, rest = ""] = link.split("?");
  const path = pathPart.split("#")[0].replace(/\/$/, "");
  const query = rest.split("#")[0];
  const scale = path.match(/^\/theory\/scales\/([a-z0-9-]+)\/([a-z-]+)$/);
  if (scale) {
    const key = parseKeySlug(scale[2]);
    return key !== null && isScale(scale[1]) ? { type: "scale-neck", scale: scale[1], key } : null;
  }
  if (path === "/theory/notes") return { type: "note-finder", query };
  if (path === "/theory/ears") return { type: "interval-ears", query, ...(/(^|&)wide=1/.test(query) ? { wide: true } : {}) };
  if (path === "/theory/metronome-drone") return { type: "backing-band", bpm: 80, key: 9, parts: ["click"] };
  return null;
}

/** An exercise written before sections (how / steps / tools, each tool with its `step`) as sections: text, then each step followed by its tools. */
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
  if (e.link && (e.tools || !toolFromLink(e.link))) out.push({ type: "link", href: e.link });
  return out;
}

/** A tool as a stored plan holds it: today's `PlanTool`, or an older one (`scale`, `comp`, …) that `parseTool` migrates. */
export type StoredTool = (PlanTool | { type: string; [k: string]: unknown }) & { step?: number };

/**
 * What an exercise shows, in order: its sections, or, for a plan stored before sections, what its old fields stand for.
 * Stored tools are parsed again, so a tool saved under an old name shows as its component.
 */
export const sectionsOf = (e: { sections?: Section[]; how?: string; steps?: string[]; tools?: StoredTool[]; link?: string }): Section[] =>
  e.sections
    ? e.sections.flatMap((s): Section[] => {
        if (s.type !== "tool") return [s];
        const tool = parseTool(s.tool, { stored: true });
        return tool ? [{ type: "tool", tool }] : [];
      })
    : legacySections(e);

/**
 * The palette's widget families: one row each (Pentatonic boxes, Scale positions, CAGED, Arpeggio...), curated here. A family
 * makes a widget from its main props (`controls`: boxes, scale, shapes, chord), reads them back from a widget on the stage and
 * names it in one line ("Major pentatonic · C major · positions 1, 2"). Most families are a learning component of the AI plan (a
 * `tool` subject); CAGED and 3 notes per string wrap the stage's own subjects, which the components can't express. The props a
 * family doesn't list are its component's other props (`docOf(tool).props`). Pure: no React. Imports only types from subject.ts,
 * which takes its tool names from here.
 */
import { keyContext, type KeyChoice } from "@/features/creator/model/key";
import { docOf, type PropDoc } from "@/features/exercises/docs";
import { TOOLS, type PlanTool, type ToolName } from "@/features/plan/model/tools";
import { FAMILIES as SCALE_FAMILIES, makeKeyContext, modeAlias, shortModeName, tonicName } from "@/features/theory/theory";
import { PENTATONICS, findPentatonic } from "@/features/theory/pentatonics";
import { MODE_PAGES, findModePage } from "@/features/theory/scales";
import { VOICES, type Voice } from "@/features/theory/singing";
import { parseChordQuery } from "@/lib/chordKit/chordSearch";
import { CAGED_LETTERS, type CagedLetter, type CagedQuality } from "@/lib/chordKit/caged";
import { POSITION_COUNT } from "@/lib/chordKit/scalePositions";
import type { PaletteGroup, Subject } from "./subject";
import { toolKey } from "./toolKey";

export type FamilyValue = string | number | number[] | string[];
/** A family's main props by control name: `{ scale: "minor-pentatonic", boxes: [1, 2] }`. */
export type FamilyValues = Record<string, FamilyValue>;

/** One main prop: toggles (`multi`), a pick of one (`choice`) or typed text. */
export interface FamilyControl {
  name: string;
  label: string;
  kind: "choice" | "multi" | "text";
  options?: { value: string | number; label: string }[];
  /** a `multi` that keeps at most this many (the component drops the rest) */
  max?: number;
  /** a `multi` option that stands alone: ticking it clears the others, ticking another clears it (CAGED's Overview) */
  alone?: string | number;
  default: FamilyValue;
}

export interface Family {
  id: string;
  title: string;
  /** words a search finds it by */
  words: string[];
  /** the palette section and subsection it sits under */
  group: PaletteGroup;
  sub?: string;
  /** the learning component it makes; absent for the stage's own subjects (CAGED, 3 notes per string) */
  tool?: ToolName;
  /** a new widget in `key`; missing values take the control's default, or the key's (its scale, its chord) */
  make(values: FamilyValues, key: KeyChoice): Subject;
  controls: FamilyControl[];
  /** the widget's main props, or null when it is not this family's */
  read(s: Subject): FamilyValues | null;
  /** "Major pentatonic · C major · positions 1, 2" */
  describe(s: Subject): string;
}

/** CAGED comes in major and minor: a key whose third is minor (Dorian, Aeolian, harmonic minor…) uses the minor shapes. */
export function cagedQualityOf(key: KeyChoice): CagedQuality {
  return keyContext({ ...key, tonicPc: key.tonicPc ?? 0 })?.steps[2] === 3 ? "minor" : "major";
}

/* ---------------------------------------------------------------- names */

/** A row's text in parts: what it is, its key, its main props. */
interface Parts {
  name: string;
  key: string | null;
  detail: string | null;
}

/** "major", "minor", "Dorian", "Phrygian dominant": the everyday name of a mode. */
const modeText = (family: number, mode: number) => modeAlias(family, mode)?.toLowerCase() ?? shortModeName(SCALE_FAMILIES[family].names[mode]);
/** "D Dorian", or only the mode when there is no tonic. */
const keyText = (pc: number | null, scale: string) => (pc === null ? scale : `${tonicName(pc)} ${scale}`);
/** "A minor", "D Dorian", "Dorian": a key as the families name it (the palette's family rows too). */
export const keyChoiceText = (k: KeyChoice) => keyText(k.tonicPc, modeText(k.family, k.mode));
/** "positions 1, 2", "position 1"; none: null */
const numbered = (word: string, ns: number[] | undefined) => (ns?.length ? `${word}${ns.length > 1 ? (word.endsWith("x") ? "es" : "s") : ""} ${ns.join(", ")}` : null);
const pentQuality = (slug: string): "major" | "minor" => (makeKeyContext(0, 0, findPentatonic(slug)!.host).steps[2] === 3 ? "minor" : "major");
/** a scale slug in words: "minor", "Dorian", "minor pentatonic" */
const scaleText = (slug: string) => {
  const page = findModePage(slug);
  return page ? modeText(page.familyIndex, page.modeIndex) : (findPentatonic(slug)?.name.toLowerCase() ?? slug);
};

/* ---------------------------------------------------------------- values */

const nums = (v: FamilyValue | undefined): number[] | null =>
  Array.isArray(v) ? [...new Set((v as unknown[]).map(Number).filter((n) => Number.isInteger(n)))].sort((a, b) => a - b) : null;
const strs = (v: FamilyValue | undefined): string[] => (Array.isArray(v) ? (v as unknown[]).map(String) : typeof v === "string" ? [v] : []);
const str = (v: FamilyValue | undefined): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
const numberOptions = (n: number) => range(n).map((value) => ({ value, label: String(value) }));
const boxesControl = (count: number, label = "Boxes"): FamilyControl => ({ name: "boxes", label, kind: "multi", options: numberOptions(count), default: [1] });

const tonicOf = (key: KeyChoice) => key.tonicPc ?? 0;
/** the key's chords, C major when it has no tonic */
const chordsOf = (key: KeyChoice) => keyContext({ ...key, tonicPc: tonicOf(key) })!.chords;
/** the key's own mode as a scale slug */
const modeSlug = (key: KeyChoice) => (MODE_PAGES.find((m) => m.familyIndex === key.family && m.modeIndex === key.mode) ?? MODE_PAGES[0]).slug;
const isScaleSlug = (v: string | null): v is string => v !== null && !!(findPentatonic(v) || findModePage(v));
const isChord = (v: string | null): v is string => v !== null && !!parseChordQuery(v);

/** The tool as the plan parses it, so a made widget is exactly what a saved one reads back as. */
function toolSubject(raw: Record<string, unknown>): Subject {
  const tool = TOOLS[raw.type as ToolName].parse(raw);
  if (!tool) throw new Error(`families: ${String(raw.type)} made an invalid tool`);
  return { kind: "tool", tool };
}

type ToolOf<N extends ToolName> = Extract<PlanTool, { type: N }>;
const toolOf = <N extends ToolName>(s: Subject, type: N): ToolOf<N> | null => (s.kind === "tool" && s.tool.type === type ? (s.tool as ToolOf<N>) : null);
/** A tool's boxes as its control shows them: absent is what the component draws then (`shown`), or none when a placement picks the box (so an update keeps it). */
const boxesRead = (t: { boxes?: number[]; placement?: unknown }, shown: number[]): number[] => t.boxes ?? (t.placement ? [] : shown);
const join = (p: Parts) => [p.name, p.key, p.detail].filter(Boolean).join(" · ");

/** A family from its parts: `describe` joins what `parts` says. */
function family(f: Omit<Family, "describe"> & { parts(s: Subject): Parts }): Family & { parts(s: Subject): Parts } {
  return { ...f, describe: (s) => join(f.parts(s)) };
}

/* ---------------------------------------------------------------- the families */

const pentScale = (s: Subject) => {
  const t = toolOf(s, "scale-neck");
  return t && findPentatonic(t.scale) ? t : null;
};
const modeScale = (s: Subject) => {
  const t = toolOf(s, "scale-neck");
  return t && findModePage(t.scale) ? t : null;
};

const pentatonic = family({
  id: "pentatonic",
  title: "Pentatonic boxes",
  words: ["pentatonic", "pent", "boxes", "box", "position", "pos", "scale", "blues"],
  group: "scale",
  sub: "On the fretboard",
  tool: "scale-neck",
  controls: [
    { name: "scale", label: "Scale", kind: "choice", options: PENTATONICS.map((p) => ({ value: p.slug, label: p.name })), default: "minor-pentatonic" },
    boxesControl(POSITION_COUNT.pentatonic),
  ],
  make(v, key) {
    const chosen = str(v.scale);
    const scale = chosen && findPentatonic(chosen) ? chosen : cagedQualityOf(key) === "minor" ? "minor-pentatonic" : "major-pentatonic";
    return toolSubject({ type: "scale-neck", scale, key: tonicOf(key), boxes: nums(v.boxes) ?? [1] });
  },
  read(s) {
    const t = pentScale(s);
    return t ? { scale: t.scale, boxes: boxesRead(t, range(POSITION_COUNT.pentatonic)) } : null;
  },
  parts(s) {
    const t = pentScale(s)!;
    return { name: findPentatonic(t.scale)!.name, key: keyText(t.key, pentQuality(t.scale)), detail: numbered("position", t.boxes) };
  },
});

const scalePositions = family({
  id: "scale-positions",
  title: "Scale positions",
  words: ["scale", "positions", "position", "pos", "boxes", "box", "mode", "modes"],
  group: "scale",
  sub: "On the fretboard",
  tool: "scale-neck",
  controls: [
    { name: "scale", label: "Scale", kind: "choice", options: MODE_PAGES.map((m) => ({ value: m.slug, label: m.name })), default: MODE_PAGES[0].slug },
    boxesControl(POSITION_COUNT.scale, "Positions"),
  ],
  make(v, key) {
    const chosen = str(v.scale);
    const scale = chosen && findModePage(chosen) ? chosen : modeSlug(key);
    return toolSubject({ type: "scale-neck", scale, key: tonicOf(key), boxes: nums(v.boxes) ?? [1] });
  },
  read(s) {
    const t = modeScale(s);
    return t ? { scale: t.scale, boxes: boxesRead(t, range(POSITION_COUNT.scale)) } : null;
  },
  parts(s) {
    const t = modeScale(s)!;
    return { name: "Scale positions", key: keyText(t.key, scaleText(t.scale)), detail: numbered("position", t.boxes) };
  },
});

/** The learning components frame five positions only, so 3 notes per string stays the stage's `position` subject: one of seven. */
const threeNps = family({
  id: "three-nps",
  title: "3 notes per string",
  words: ["3", "three", "notes", "per", "string", "3nps", "nps", "position", "pos"],
  group: "scale",
  sub: "On the fretboard",
  controls: [{ name: "position", label: "Position", kind: "choice", options: numberOptions(POSITION_COUNT["3nps"]), default: 1 }],
  make(v, key) {
    const n = Number(v.position);
    const index = Number.isInteger(n) && n >= 1 && n <= POSITION_COUNT["3nps"] ? n - 1 : 0;
    return { kind: "position", positionKind: "3nps", index, key };
  },
  read: (s) => (s.kind === "position" && s.positionKind === "3nps" ? { position: s.index + 1 } : null),
  parts(s) {
    const p = s as Extract<Subject, { kind: "position" }>;
    return { name: "3 notes per string", key: keyChoiceText(p.key), detail: `position ${p.index + 1}` };
  },
});

const OVERVIEW = "overview";
const caged = family({
  id: "caged",
  title: "CAGED",
  words: ["caged", "shape", "shapes", "box", "boxes", "fretboard", "neck", ...CAGED_LETTERS.map((l) => l.toLowerCase())],
  group: "caged",
  controls: [
    {
      name: "shapes", label: "Shapes", kind: "multi", alone: OVERVIEW, default: [OVERVIEW],
      options: [{ value: OVERVIEW, label: "Overview" }, ...CAGED_LETTERS.map((l) => ({ value: l, label: `${l} shape` }))],
    },
  ],
  make(v, key) {
    const picked = strs(v.shapes);
    const shapes = CAGED_LETTERS.filter((l) => picked.includes(l));
    // no letter is the overview: the five boxes on the whole neck. One letter is the single `shape` older widgets (and builds) have
    if (shapes.length === 1) return { kind: "caged", key, shape: shapes[0] };
    return shapes.length ? { kind: "caged", key, shape: null, shapes } : { kind: "caged", key, shape: null };
  },
  read(s) {
    if (s.kind !== "caged") return null;
    const shapes: string[] = s.shapes?.length ? s.shapes : s.shape ? [s.shape] : [OVERVIEW];
    return { shapes };
  },
  parts(s) {
    const c = s as Extract<Subject, { kind: "caged" }>;
    const letters: CagedLetter[] = c.shapes?.length ? c.shapes : c.shape ? [c.shape] : [];
    const detail = letters.length ? `${letters.join(", ")} shape${letters.length > 1 ? "s" : ""}` : "whole neck";
    return { name: "CAGED", key: keyText(c.key.tonicPc, cagedQualityOf(c.key)), detail };
  },
});

/** the plan's `arpeggio-neck` takes boxes 1 to 5, one or two neighbours (its parse keeps the first two) */
const ARPEGGIO_BOXES = 5;
const ARPEGGIO_MAX_BOXES = 2;
const arpeggio = family({
  id: "arpeggio",
  title: "Arpeggio",
  words: ["arpeggio", "arpeggios", "arp", "arps", "chord", "box", "boxes"],
  group: "chords",
  sub: "In the key",
  tool: "arpeggio-neck",
  controls: [
    { name: "chord", label: "Chord", kind: "text", default: "" },
    { ...boxesControl(ARPEGGIO_BOXES), label: "Boxes (one, or two neighbours)", max: ARPEGGIO_MAX_BOXES },
  ],
  make(v, key) {
    const typed = str(v.chord);
    return toolSubject({ type: "arpeggio-neck", chord: isChord(typed) ? typed : chordsOf(key)[0].triadName, boxes: nums(v.boxes) ?? [1] });
  },
  read(s) {
    const t = toolOf(s, "arpeggio-neck");
    return t ? { chord: t.chord, boxes: boxesRead(t, [1]) } : null;
  },
  parts(s) {
    const t = toolOf(s, "arpeggio-neck")!;
    return { name: "Arpeggio", key: t.chord, detail: numbered("box", t.boxes) };
  },
});

const chordShapes = family({
  id: "chord-shapes",
  title: "Chord shapes",
  words: ["chord", "chords", "shapes", "diagrams", "diagram", "fingering", "open", "barre"],
  group: "chords",
  tool: "chord-shapes",
  controls: [
    { name: "chords", label: "Chords", kind: "text", default: "" },
    { name: "voicing", label: "Voicing", kind: "choice", options: [{ value: "open", label: "Open" }, { value: "barre", label: "Barre" }], default: "open" },
  ],
  make(v, key) {
    const typed = strs(v.chords).flatMap((c) => c.split(/[\s,]+/)).filter((c) => isChord(c));
    // none typed: the key's I, IV and V
    const chords = typed.length ? typed : [0, 3, 4].map((d) => chordsOf(key)[d].triadName);
    return toolSubject({ type: "chord-shapes", chords, ...(v.voicing === "barre" ? { voicing: "barre" } : {}) });
  },
  read(s) {
    const t = toolOf(s, "chord-shapes");
    return t ? { chords: t.chords.join(" "), voicing: t.voicing ?? "open" } : null;
  },
  parts(s) {
    const t = toolOf(s, "chord-shapes")!;
    return { name: "Chord shapes", key: null, detail: [t.chords.join(", "), t.voicing === "barre" ? "barre" : null].filter(Boolean).join(" · ") };
  },
});

const VOICE_IDS = Object.keys(VOICES) as Voice[];
const staff = family({
  id: "staff",
  title: "Staff",
  words: ["staff", "notation", "sing", "singing", "voice", "notes"],
  group: "scale",
  sub: "Notes",
  tool: "staff",
  controls: [
    {
      name: "scale", label: "Scale", kind: "choice", default: MODE_PAGES[0].slug,
      options: [...MODE_PAGES.map((m) => ({ value: m.slug, label: m.name })), ...PENTATONICS.map((p) => ({ value: p.slug, label: p.name }))],
    },
    { name: "voice", label: "Voice", kind: "choice", options: VOICE_IDS.map((v) => ({ value: v, label: VOICES[v].label })), default: "baritone" },
  ],
  make(v, key) {
    const chosen = str(v.scale);
    const voice = VOICE_IDS.find((x) => x === v.voice) ?? "baritone";
    return toolSubject({ type: "staff", scale: isScaleSlug(chosen) ? chosen : modeSlug(key), key: tonicOf(key), voice });
  },
  read(s) {
    const t = toolOf(s, "staff");
    return t ? { scale: t.scale, voice: t.voice } : null;
  },
  parts(s) {
    const t = toolOf(s, "staff")!;
    return { name: "Staff", key: keyText(t.key, scaleText(t.scale)), detail: t.voice };
  },
});

const ALL = [pentatonic, scalePositions, threeNps, caged, arpeggio, chordShapes, staff];

/** The palette's families, in its order. */
export const FAMILIES: Family[] = ALL;

const familyWithParts = (s: Subject) => ALL.find((f) => f.read(s) !== null) ?? null;

/** The family a widget belongs to, or null (a fretboard, the camera, a tool no family offers). */
export const familyOf = (s: Subject): Family | null => familyWithParts(s);

/** The widget's row text, "Major pentatonic · C major · positions 1, 2"; null outside the families. */
export const describeSubject = (s: Subject): string | null => familyOf(s)?.describe(s) ?? null;

/** The row text in parts, for the widget's name (`subjectName`, without the key) and title. */
export const describeParts = (s: Subject): Parts | null => familyWithParts(s)?.parts(s) ?? null;

/**
 * The widget with new main props, in the same key with the same pins. A tool keeps every prop outside its family's controls
 * (`add`, `highlight`, `placement`, an arpeggio's `part`, a staff's `mic`...); the main props are made afresh.
 */
export function updateSubject(s: Subject, values: FamilyValues): Subject {
  const f = familyOf(s);
  if (!f) return s;
  const given = { ...values };
  // a cleared or mistyped chord keeps the one the widget has, never the key's
  if ("chord" in given && !isChord(str(given.chord))) delete given.chord;
  const merged = { ...f.read(s), ...given };
  if (s.kind === "tool") {
    // only the tonic is real here: a tool's scale is a main prop (read above), so a `make` never needs the mode. One that fell
    // back to the key's quality would get major.
    const made = f.make(merged, { tonicPc: toolKey(s.tool), family: 0, mode: 0 });
    if (made.kind !== "tool") return s;
    const kept: Record<string, unknown> = { ...s.tool };
    for (const c of f.controls) delete kept[c.name];
    const tool = toolSubject({ ...kept, ...made.tool });
    return s.pinned ? ({ ...tool, pinned: s.pinned } as Subject) : tool;
  }
  if (!("key" in s)) return s;
  const made = f.make(merged, s.key);
  return s.pinned ? ({ ...made, pinned: s.pinned } as Subject) : made;
}

/* ---------------------------------------------------------------- step two: the controls' values */

type OptionValue = string | number;

/**
 * The values step two starts from in `key`: what the family makes there (the key's scale, its chord, box 1). "Add another"
 * starts with no toggle ticked; adding with none ticked takes the family's default (`addableValues`).
 */
export function stepValues(f: Family, key: KeyChoice, another = false): FamilyValues {
  const values = f.read(f.make({}, key)) ?? {};
  if (!another) return values;
  const cleared: FamilyValues = { ...values };
  for (const c of f.controls) if (c.kind === "multi") cleared[c.name] = [];
  return cleared;
}

/** The values to make a widget from: a toggle with nothing ticked is left out, so the family's default stands. */
export function addableValues(values: FamilyValues): FamilyValues {
  return Object.fromEntries(Object.entries(values).filter(([, v]) => !(Array.isArray(v) && v.length === 0)));
}

const ticked = (v: FamilyValue | undefined): OptionValue[] => (Array.isArray(v) ? [...v] : v === undefined || v === "" ? [] : [v]);

/**
 * A `multi` control's value with one option toggled: off when it was on; on otherwise, clearing the stand-alone option (or every
 * other when it is the stand-alone one), and dropping the oldest ticked beyond `max`.
 */
export function toggleOption(c: FamilyControl, current: FamilyValue | undefined, value: OptionValue): OptionValue[] {
  const now = ticked(current);
  if (now.includes(value)) return now.filter((v) => v !== value);
  if (c.alone !== undefined && value === c.alone) return [value];
  const next = [...now.filter((v) => v !== c.alone), value];
  return c.max !== undefined && next.length > c.max ? next.slice(next.length - c.max) : next;
}

/** The options "All" ticks (the stand-alone one aside), or null when the control has no "All" (it keeps fewer than all). */
export function allOptions(c: FamilyControl): OptionValue[] | null {
  if (c.kind !== "multi" || !c.options) return null;
  const all = c.options.map((o) => o.value).filter((v) => v !== c.alone);
  return c.max !== undefined && c.max < all.length ? null : all;
}

/** Every option "All" would tick is ticked. */
export function isAll(c: FamilyControl, current: FamilyValue | undefined): boolean {
  const all = allOptions(c);
  const now = ticked(current);
  return !!all && all.every((v) => now.includes(v));
}

/** "All" toggled: every option, or none when all were ticked. */
export const toggleAll = (c: FamilyControl, current: FamilyValue | undefined): OptionValue[] => (isAll(c, current) ? [] : (allOptions(c) ?? ticked(current)));

/* ---------------------------------------------------------------- step two: "More", the component's other props */

/**
 * The family's other props, from its component's docs: everything but the main controls and `key` (the master sets it). None for
 * the stage's own subjects (CAGED, 3 notes per string).
 */
export function moreProps(f: Family): PropDoc[] {
  if (!f.tool) return [];
  const main = new Set([...f.controls.map((c) => c.name), "key", "type"]);
  return (docOf(f.tool)?.props ?? []).filter((p) => !main.has(p.name));
}

/** A tool widget's other props as the "More" fields show them, JSON text by prop name (only the props it has). */
export function moreValues(s: Subject, f: Family): Record<string, string> {
  if (s.kind !== "tool") return {};
  const tool = s.tool as Record<string, unknown>;
  return Object.fromEntries(moreProps(f).flatMap((p) => (tool[p.name] === undefined ? [] : [[p.name, JSON.stringify(tool[p.name])]])));
}

/**
 * A "More" field's text as a prop value: JSON (`["b3", "5"]`, `{"by":"root","string":5}`, `true`), or a bare word as a string
 * (`muted`); blank is no value (the prop is taken off). Anything else is not valid.
 */
export function parseMoreText(text: string): { ok: true; value: unknown } | { ok: false } {
  const t = text.trim();
  if (!t) return { ok: true, value: undefined };
  try {
    return { ok: true, value: JSON.parse(t) };
  } catch {
    return /^[\w#-]+$/.test(t) ? { ok: true, value: t } : { ok: false };
  }
}

/**
 * The widget with its other props set (`undefined` takes one off), parsed as the plan parses a tool, its pins kept. `dropped`
 * names the props given a value that the parse threw away (a placement beside boxes, a degree it doesn't know). Not a tool: as is.
 */
export function withMore(s: Subject, more: Record<string, unknown>): { subject: Subject; dropped: string[] } {
  if (s.kind !== "tool") return { subject: s, dropped: [] };
  const raw: Record<string, unknown> = { ...s.tool };
  for (const [name, value] of Object.entries(more)) {
    if (value === undefined) delete raw[name];
    else raw[name] = value;
  }
  const given = Object.keys(more).filter((n) => more[n] !== undefined);
  const tool = TOOLS[s.tool.type].parse(raw);
  if (!tool) return { subject: s, dropped: given };
  const parsed = tool as Record<string, unknown>;
  const subject: Subject = s.pinned ? { kind: "tool", tool, pinned: s.pinned } : { kind: "tool", tool };
  return { subject, dropped: given.filter((n) => parsed[n] === undefined) };
}

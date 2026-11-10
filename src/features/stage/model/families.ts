/**
 * The palette's widget families: one row each (Scale, CAGED, Arpeggio, Chord shapes, Staff, Melody), curated here. A family makes a widget
 * from its main props (`controls`: key, scale, what to show, boxes, shapes, chord), reads them back from a widget on the stage and
 * names it in one line ("Scale · C major · neck, positions 1–2"). Most families are a learning component of the AI plan (a `tool`
 * subject); CAGED and Arpeggio wrap the stage's own `caged` and `arpeggio` subjects (older `arpeggio-neck` tools still read as Arpeggio widgets and are made over when edited). The Scale family is the `scale-neck` tool: the scales page's guitar section,
 * set up by its props; the stage's older neck, overview and position subjects still read as Scale widgets and are made over into the
 * tool when edited. A tool keeps the props a family doesn't list. Pure: no React. Imports only types from subject.ts, which takes its
 * tool names from here.
 */
import { keyContext, type KeyChoice } from "@/features/creator/model/key";
import { TOOLS, type PlanTool, type ToolName } from "@/features/plan/model/tools";
import { DEFAULT_KEY_PC, FAMILIES as SCALE_FAMILIES, modeAlias, shortModeName, tonicName } from "@/features/theory/theory";
import { PENTATONICS, findPentatonic } from "@/features/theory/pentatonics";
import { MODE_PAGES, findModePage } from "@/features/theory/scales";
import { VOICES, type Voice } from "@/features/theory/singing";
import { BOOK, STAGES } from "@/features/theory/singingMelodies";
import { ARP_QUALITIES } from "@/lib/chordKit/arpeggios";
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
  /** options that depend on the other values (an arpeggio's chords, named in its key and scale): `visibleControls` fills `options` from it */
  optionsFor?: (values: FamilyValues) => { value: string | number; label: string }[];
  /** a `multi` that keeps at most this many (the component drops the rest) */
  max?: number;
  /** a `multi` option that stands alone: ticking it clears the others, ticking another clears it (CAGED's Overview) */
  alone?: string | number;
  default: FamilyValue;
  /** shown only for these values (the Scale family's Position only when its positions are shown) */
  when?: (values: FamilyValues) => boolean;
}

export interface Family {
  id: string;
  title: string;
  /** words a search finds it by */
  words: string[];
  /** the palette section and subsection it sits under */
  group: PaletteGroup;
  sub?: string;
  /** the learning component it makes; absent for the stage's own subjects (CAGED) */
  tool?: ToolName;
  /** a new widget in `key`; missing values take the control's default, or the key's (its scale, its chord) */
  make(values: FamilyValues, key: KeyChoice): Subject;
  controls: FamilyControl[];
  /** the widget's main props, or null when it is not this family's */
  read(s: Subject): FamilyValues | null;
  /** the widget with new main props, when the generic `updateSubject` won't do (the Scale family changes the subject's kind) */
  update?(s: Subject, values: FamilyValues): Subject;
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

/* ---------------------------------------------------------------- the Scale family */

const SHOWS = [{ value: "neck", label: "Neck" }, { value: "positions", label: "Positions" }];
const SCALE_OPTIONS = [...MODE_PAGES.map((m) => ({ value: m.slug, label: m.name })), ...PENTATONICS.map((p) => ({ value: p.slug, label: p.name }))];
const KEY_OPTIONS = Array.from({ length: 12 }, (_, pc) => ({ value: pc, label: tonicName(pc) }));
const POSITIONS = POSITION_COUNT.scale;
const atPositions = (v: FamilyValues) => strs(v.show).includes("positions");

/** "1–3, 5": positions in runs */
function runs(ns: number[]): string {
  const out: string[] = [];
  for (let i = 0; i < ns.length; ) {
    let j = i;
    while (j + 1 < ns.length && ns[j + 1] === ns[j] + 1) j++;
    out.push(j > i ? `${ns[i]}–${ns[j]}` : String(ns[i]));
    i = j + 1;
  }
  return out.join(", ");
}

/** a Scale widget's main props; null when it is not one (the intervals, the relative modes and a 3-notes-per-string position are widgets of their own) */
function scaleRead(s: Subject): FamilyValues | null {
  const all = range(POSITIONS);
  const legacy = (key: KeyChoice, scale: string, show: string[], boxes = all): FamilyValues => ({ key: tonicOf(key), scale, show, boxes });
  switch (s.kind) {
    case "tool": {
      const t = toolOf(s, "scale-neck");
      if (!t || !(findPentatonic(t.scale) || findModePage(t.scale))) return null;
      return { key: t.key, scale: t.scale, show: [...(t.neck ? ["neck"] : []), ...(t.positions === false ? [] : ["positions"])], boxes: boxesRead(t, all) };
    }
    case "position":
      if (s.positionKind === "3nps") return null;
      // the old single boxes (Pentatonic box 2, Scale position 3): the neck with that position lit
      return legacy(s.key, s.positionKind === "pentatonic" ? (cagedQualityOf(s.key) === "minor" ? "minor-pentatonic" : "major-pentatonic") : modeSlug(s.key), ["neck", "positions"], [s.index + 1]);
    case "neck":
      return legacy(s.key, modeSlug(s.key), ["neck"]);
    case "section":
      return s.section === "guitar" ? legacy(s.key, modeSlug(s.key), ["neck", "positions"]) : null;
    default:
      return null;
  }
}

/** A Scale widget's key as a `KeyChoice`: a tool's tonic in the mode its slug names (a pentatonic: its host mode). */
function scaleKeyOf(s: Subject): KeyChoice {
  if (s.kind !== "tool") return "key" in s ? s.key : { tonicPc: null, family: 0, mode: 0 };
  const t = toolOf(s, "scale-neck")!;
  const page = findModePage(t.scale);
  return page ? { tonicPc: t.key, family: page.familyIndex, mode: page.modeIndex } : { tonicPc: t.key, family: 0, mode: findPentatonic(t.scale)?.host ?? 0 };
}

function scaleMake(v: FamilyValues, key: KeyChoice): Subject {
  const chosen = str(v.scale);
  const scale = chosen && isScaleSlug(chosen) ? chosen : modeSlug(key);
  const tonic = typeof v.key === "number" && Number.isInteger(v.key) && v.key >= 0 && v.key < 12 ? v.key : tonicOf(key);
  const picked = strs(v.show);
  const neck = picked.includes("neck");
  // nothing shown is the positions, as before; the neck alone has no positions
  const positions = picked.includes("positions") || !neck;
  return toolSubject({
    type: "scale-neck", scale, key: tonic, boxes: nums(v.boxes) ?? range(POSITIONS),
    ...(neck ? { neck: true } : {}), ...(positions ? {} : { positions: false }),
  });
}

/**
 * One Scale widget made afresh from new main props, in its own key, its pins carried: a tool keeps only a pinned tonic (a key
 * picked on the widget pins it); an older widget made over into the tool has its scale as its own, as a tool's scale never
 * followed the master. A scale-neck staying a scale-neck keeps its other props (`add`, `highlight`...).
 */
function scaleUpdate(s: Subject, values: FamilyValues): Subject {
  const current = scaleRead(s);
  if (!current) return s;
  const made = scaleMake({ ...current, ...values }, scaleKeyOf(s));
  if (made.kind !== "tool") return s;
  const pinned: string[] = "pinned" in s ? (s.pinned ?? []) : [];
  const keyPicked = typeof values.key === "number" && values.key !== current.key;
  let tool: Subject = made;
  if (s.kind === "tool") {
    const kept: Record<string, unknown> = { ...s.tool };
    for (const name of ["scale", "boxes", "neck", "positions"]) delete kept[name];
    tool = toolSubject({ ...kept, ...made.tool });
  }
  return pinned.includes("tonic") || keyPicked ? ({ ...tool, pinned: ["tonic"] } as Subject) : tool;
}

function scaleParts(s: Subject): Parts {
  const v = scaleRead(s)!;
  const t = toolOf(s, "scale-neck");
  const key = t ? keyText(t.key, scaleText(t.scale)) : keyChoiceText(scaleKeyOf(s));
  const show = strs(v.show);
  const ns = nums(v.boxes) ?? [];
  const word = ns.length > 1 ? "positions" : "position";
  const positions = !show.includes("positions") ? null : (t && !t.boxes) || ns.length === 0 ? "positions" : ns.length === POSITIONS ? "all positions" : `${word} ${runs(ns)}`;
  return { name: "Scale", key, detail: [show.includes("neck") ? "neck" : null, positions].filter(Boolean).join(", ") || null };
}

const scale = family({
  id: "scale",
  title: "Scale",
  words: ["scale", "scales", "pentatonic", "pent", "blues", "positions", "position", "pos", "boxes", "box", "fretboard", "neck", "whole", "overview", "guitar", "mode", "modes"],
  group: "scale",
  tool: "scale-neck",
  controls: [
    { name: "key", label: "Key", kind: "choice", options: KEY_OPTIONS, default: 0 },
    { name: "scale", label: "Scale", kind: "choice", options: SCALE_OPTIONS, default: MODE_PAGES[0].slug },
    { name: "show", label: "Show", kind: "multi", options: SHOWS, default: ["positions"] },
    { ...boxesControl(POSITIONS, "Position"), default: range(POSITIONS), when: atPositions },
  ],
  make: scaleMake,
  read: scaleRead,
  update: scaleUpdate,
  parts: scaleParts,
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

/* ---------------------------------------------------------------- the Arpeggio family */

const ARP_KINDS = [{ value: "triad", label: "Scale triad" }, { value: "seventh", label: "Scale 7th" }, { value: "ninth", label: "Scale 9th" }];
const ARP_TYPES = [...ARP_KINDS, ...ARP_QUALITIES.map((q) => ({ value: q.id, label: q.label }))];
const typeText = (type: string) => ARP_TYPES.find((t) => t.value === type)?.label ?? type;
/** the strings a position's root can sit on, low to high: guitar numbering, as the arpeggios page counts them */
export const ARP_ROOT_STRINGS = [6, 5, 4, 3, 2];
const ORDINAL: Record<number, string> = { 6: "6th", 5: "5th", 4: "4th", 3: "3rd", 2: "2nd" };
const ARP_SCALES = MODE_PAGES.map((m) => ({ value: m.slug, label: m.name }));
/** The Key control's value: what the widget draws, the site's default key when it has no root yet. */
const arpTonic = (key: KeyChoice) => key.tonicPc ?? DEFAULT_KEY_PC;

/** The chords of the key the values name, to start the arpeggio on: "V · G". */
function arpDegreeOptions(v: FamilyValues) {
  const page = findModePage(str(v.scale) ?? "");
  const tonicPc = typeof v.key === "number" ? v.key : DEFAULT_KEY_PC;
  const ctx = keyContext({ tonicPc, family: page?.familyIndex ?? 0, mode: page?.modeIndex ?? 0 })!;
  return ctx.chords.map((c) => ({ value: c.degree, label: `${c.roman} · ${ctx.names[c.degree]}` }));
}

/** An older arpeggio widget (`arpeggio-neck`, a typed chord in one or two boxes) as these controls: the chord's root as the key, on I, the nearest type. */
function arpLegacyValues(t: ToolOf<"arpeggio-neck">): FamilyValues {
  const q = parseChordQuery(t.chord);
  const semis = q?.semis ?? [0, 4, 7];
  const overlap = (qs: number[]) => qs.filter((n) => semis.includes(n)).length - qs.filter((n) => !semis.includes(n)).length;
  const nearest = ARP_QUALITIES.reduce((best, x) => (overlap(x.semis) > overlap(best.semis) ? x : best));
  const fromBoxes = t.boxes?.map((b) => 7 - b).filter((n) => ARP_ROOT_STRINGS.includes(n)) ?? [];
  const placed = t.placement?.by === "root" ? [t.placement.string] : [];
  const roots = fromBoxes.length ? fromBoxes : placed.length ? placed : [6];
  return { key: q?.rootPc ?? 0, scale: semis.includes(3) ? "natural-minor-aeolian" : MODE_PAGES[0].slug, degree: 0, type: nearest.id, show: ["positions"], roots };
}

function arpRead(s: Subject): FamilyValues | null {
  if (s.kind === "arpeggio") {
    const slug = MODE_PAGES.find((m) => m.familyIndex === s.key.family && m.modeIndex === s.key.mode)?.slug ?? MODE_PAGES[0].slug;
    return { key: arpTonic(s.key), scale: slug, degree: s.degree, type: s.type, show: [...(s.neck ? ["neck"] : []), ...(s.positions === false ? [] : ["positions"])], roots: s.roots ?? ARP_ROOT_STRINGS };
  }
  const t = toolOf(s, "arpeggio-neck");
  return t ? arpLegacyValues(t) : null;
}

function arpMake(v: FamilyValues, key: KeyChoice): Subject {
  const page = findModePage(str(v.scale) ?? "");
  const family = page ? page.familyIndex : key.family;
  const mode = page ? page.modeIndex : key.mode;
  // the Key control shows the default for a key with no root: left there it stays no root, so the widget follows the master once it is set
  const picked = typeof v.key === "number" && Number.isInteger(v.key) && v.key >= 0 && v.key < 12 ? v.key : null;
  const tonicPc = picked === null || picked === arpTonic(key) ? key.tonicPc : picked;
  const degree = typeof v.degree === "number" && Number.isInteger(v.degree) && v.degree >= 0 && v.degree <= 6 ? v.degree : 0;
  const type = ARP_TYPES.find((t) => t.value === v.type)?.value ?? "seventh";
  const show = strs(v.show);
  const neck = show.includes("neck");
  const roots = ARP_ROOT_STRINGS.filter((n) => nums(v.roots)?.includes(n));
  return {
    kind: "arpeggio", key: { tonicPc, family, mode }, degree, type,
    // nothing shown is the positions, as on the Scale family
    ...(neck ? { neck: true } : {}), ...(neck && !show.includes("positions") ? { positions: false } : {}),
    ...(roots.length ? { roots } : { roots: ARP_ROOT_STRINGS }),
  };
}

/**
 * New main props in the widget's own key. A key or scale picked here pins that part, as on the widget's tags. An older widget is
 * made over only when something really changed (closing its editor must not turn a G9 into the nearest type); its scale was never
 * the master's, so it stays pinned.
 */
function arpUpdate(s: Subject, values: FamilyValues): Subject {
  const current = arpRead(s);
  if (!current) return s;
  const merged = { ...current, ...values };
  const legacy = s.kind === "tool";
  if (legacy && JSON.stringify(merged) === JSON.stringify(current)) return s;
  const page = findModePage(str(current.scale) ?? "");
  const own: KeyChoice = s.kind === "arpeggio" ? s.key : { tonicPc: current.key as number, family: page?.familyIndex ?? 0, mode: page?.modeIndex ?? 0 };
  const made = arpMake(merged, own);
  const pins = new Set<"tonic" | "scale">("pinned" in s ? (s.pinned ?? []) : []);
  if (merged.key !== current.key) pins.add("tonic");
  if (legacy || merged.scale !== current.scale) pins.add("scale");
  return pins.size ? ({ ...made, pinned: [...pins] } as Subject) : made;
}

function arpParts(s: Subject): Parts {
  const t = toolOf(s, "arpeggio-neck");
  if (t) return { name: "Arpeggio", key: t.chord, detail: numbered("box", t.boxes) };
  const a = s as Extract<Subject, { kind: "arpeggio" }>;
  const roman = keyContext({ ...a.key, tonicPc: arpTonic(a.key) })!.chords[a.degree].roman;
  const roots = a.roots ?? ARP_ROOT_STRINGS;
  const where = a.positions === false ? null : roots.length === ARP_ROOT_STRINGS.length ? "all positions" : `root on ${roots.map((n) => ORDINAL[n]).join(", ")}`;
  return { name: "Arpeggio", key: keyChoiceText(a.key), detail: [`${roman} ${typeText(a.type)}`, a.neck ? "neck" : null, where].filter(Boolean).join(", ") };
}

const arpeggio = family({
  id: "arpeggio",
  title: "Arpeggio",
  words: ["arpeggio", "arpeggios", "arp", "arps", "chord", "box", "boxes", "root", "string"],
  group: "chords",
  sub: "In the key",
  controls: [
    { name: "key", label: "Key", kind: "choice", options: KEY_OPTIONS, default: DEFAULT_KEY_PC },
    { name: "scale", label: "Scale", kind: "choice", options: ARP_SCALES, default: MODE_PAGES[0].slug },
    { name: "degree", label: "On", kind: "choice", optionsFor: arpDegreeOptions, default: 0 },
    { name: "type", label: "Type", kind: "choice", options: ARP_TYPES, default: "seventh" },
    { name: "show", label: "Show", kind: "multi", options: SHOWS, default: ["positions"] },
    { name: "roots", label: "Root on", kind: "multi", options: ARP_ROOT_STRINGS.map((n) => ({ value: n, label: `${ORDINAL[n]} string` })), default: ARP_ROOT_STRINGS, when: atPositions },
  ],
  make: arpMake,
  read: arpRead,
  update: arpUpdate,
  parts: arpParts,
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

/* ---------------------------------------------------------------- the Melody family */

/** The book's stages (a melody's name) and their tunes, in book order. */
const MELODY_STAGES = STAGES.map((st) => ({ id: st.id, title: st.title, tunes: BOOK.filter((t) => t.stage.id === st.id).map((t) => t.n) }));

/** Where a tune sits: its stage and its place in it (from 1); null for a number outside the book. */
export function melodyPlace(n: number): { stage: string; title: string; index: number; count: number } | null {
  for (const st of MELODY_STAGES) {
    const i = st.tunes.indexOf(n);
    if (i >= 0) return { stage: st.id, title: st.title, index: i + 1, count: st.tunes.length };
  }
  return null;
}

/** The tune a stage and a place in it name (a place past the end is its last tune); the book's first for an unknown stage. */
export function melodyTune(stage: string, index: number): number {
  const st = MELODY_STAGES.find((x) => x.id === stage) ?? MELODY_STAGES[0];
  return st.tunes[Math.min(Math.max(Math.trunc(index) || 1, 1), st.tunes.length) - 1];
}

/** The tune after `n` in the book, back to the first after the last. */
export function nextMelody(n: number): number {
  const i = BOOK.findIndex((t) => t.n === n);
  return BOOK[(i + 1) % BOOK.length].n;
}

/** "Do Re Mi 3" */
export const melodyLabel = (n: number): string => {
  const p = melodyPlace(n);
  return p ? `${p.title} ${p.index}` : `Melody ${n}`;
};

function melodyMake(v: FamilyValues, key: KeyChoice): Subject {
  const tonic = typeof v.key === "number" && Number.isInteger(v.key) && v.key >= 0 && v.key < 12 ? v.key : tonicOf(key);
  const voice = VOICE_IDS.find((x) => x === v.voice) ?? "baritone";
  const tune = melodyTune(str(v.stage) ?? MELODY_STAGES[0].id, typeof v.index === "number" ? v.index : 1);
  return toolSubject({ type: "melody-singer", tune, key: tonic, voice });
}

function melodyRead(s: Subject): FamilyValues | null {
  const t = toolOf(s, "melody-singer");
  const p = t && melodyPlace(t.tune);
  return t && p ? { key: t.key, stage: p.stage, index: p.index, voice: t.voice ?? "baritone" } : null;
}

const melody = family({
  id: "melody",
  title: "Melody",
  words: ["melody", "melodies", "tune", "tunes", "song", "sing", "singing", "voice", "sight", "solfege", "do", "re", "mi"],
  group: "scale",
  tool: "melody-singer",
  controls: [
    { name: "key", label: "Key", kind: "choice", options: KEY_OPTIONS, default: 0 },
    { name: "stage", label: "Melody", kind: "choice", options: MELODY_STAGES.map((st) => ({ value: st.id, label: st.title })), default: MELODY_STAGES[0].id },
    {
      name: "index", label: "Number", kind: "choice", default: 1,
      optionsFor: (v) => numberOptions((MELODY_STAGES.find((st) => st.id === v.stage) ?? MELODY_STAGES[0]).tunes.length),
    },
    { name: "voice", label: "Voice", kind: "choice", options: VOICE_IDS.map((v) => ({ value: v, label: VOICES[v].label })), default: "baritone" },
  ],
  make: melodyMake,
  read: melodyRead,
  update(s, values) {
    const t = toolOf(s, "melody-singer");
    const current = melodyRead(s);
    if (!t || !current) return s;
    const merged = { ...current, ...values };
    // a new melody starts at its first tune unless a number was picked with it
    if (values.stage !== undefined && values.stage !== current.stage && values.index === undefined) merged.index = 1;
    const made = melodyMake(merged, { tonicPc: t.key, family: 0, mode: 0 });
    if (made.kind !== "tool") return s;
    // its other props (chords off, the metronome) stay
    const tool = toolSubject({ ...t, ...made.tool });
    const keyPicked = merged.key !== current.key;
    return s.kind === "tool" && (s.pinned || keyPicked) ? ({ ...tool, pinned: ["tonic"] } as Subject) : tool;
  },
  parts(s) {
    const t = toolOf(s, "melody-singer")!;
    return { name: "Melody", key: keyText(t.key, "major"), detail: [melodyLabel(t.tune), t.voice].filter(Boolean).join(", ") };
  },
});

const ALL = [scale, caged, arpeggio, chordShapes, staff, melody];

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
  if (f.update) return f.update(s, values);
  const merged = { ...f.read(s), ...values };
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

/** The values a family's add form starts from in `key`: what the family makes there (the key's scale, its chord, box 1). */
export function stepValues(f: Family, key: KeyChoice): FamilyValues {
  return f.read(f.make({}, key)) ?? {};
}

/** The controls shown for these values (a control with `when` only where it applies). */
export const visibleControls = (f: Family, values: FamilyValues): FamilyControl[] =>
  f.controls.filter((c) => !c.when || c.when(values)).map((c) => (c.optionsFor ? { ...c, options: c.optionsFor(values) } : c));

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

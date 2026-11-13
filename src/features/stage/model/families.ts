/**
 * The palette's widget families: one row each, curated here: Scale, CAGED, Arpeggio, Chord shapes, Staff, Melody, the theory panels
 * (Relative modes … Tunings, Sus & extensions) and the practice tools (Backing band … Strum along). A family makes a widget from its
 * main props (`controls`: key, scale, what to show, boxes, shapes, chord, level, tempo), reads them back from a widget on the stage
 * and names it in one line ("Scale · C major · neck, positions 1–2"). Every family makes a learning component of the AI plan (a
 * `tool` subject): CAGED the `caged-neck`, Arpeggio the `arpeggio-neck` on the chord its values name (`arpChordSymbol`), a theory
 * panel its own tool in the key it is added in. The Scale family is the `scale-neck` tool: the scales page's guitar section,
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
import { ARP_QUALITIES, arpTypeOf } from "@/lib/chordKit/arpeggios";
import { parseChordQuery } from "@/lib/chordKit/chordSearch";
import { CAGED_LETTERS, type CagedQuality } from "@/lib/chordKit/caged";
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

/** a Scale widget's main props; null when it is not one */
function scaleRead(s: Subject): FamilyValues | null {
  const t = toolOf(s, "scale-neck");
  if (!t || !(findPentatonic(t.scale) || findModePage(t.scale))) return null;
  return { key: t.key, scale: t.scale, show: [...(t.neck ? ["neck"] : []), ...(t.positions === false ? [] : ["positions"])], boxes: boxesRead(t, range(POSITIONS)) };
}

/** A Scale widget's key as a `KeyChoice`: a tool's tonic in the mode its slug names (a pentatonic: its host mode). */
function scaleKeyOf(s: Subject): KeyChoice {
  return toolKeyChoice(toolOf(s, "scale-neck")!);
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

/** A tool's key as a `KeyChoice`: its tonic in the mode its scale slug names (a pentatonic: its host mode). */
const toolKeyChoice = (t: { key: number; scale: string }): KeyChoice => {
  const page = findModePage(t.scale);
  return page ? { tonicPc: t.key, family: page.familyIndex, mode: page.modeIndex } : { tonicPc: t.key, family: 0, mode: findPentatonic(t.scale)?.host ?? 0 };
};

const caged = family({
  id: "caged",
  title: "CAGED",
  words: ["caged", "shape", "shapes", "box", "boxes", "fretboard", "neck", ...CAGED_LETTERS.map((l) => l.toLowerCase())],
  group: "caged",
  tool: "caged-neck",
  controls: [
    {
      name: "shapes", label: "Shapes", kind: "multi", alone: OVERVIEW, default: [OVERVIEW],
      options: [{ value: OVERVIEW, label: "Overview" }, ...CAGED_LETTERS.map((l) => ({ value: l, label: `${l} shape` }))],
    },
  ],
  make(v, key) {
    const picked = strs(v.shapes);
    // no letter is the overview: the five shapes on the whole neck
    return toolSubject({ type: "caged-neck", key: tonicOf(key), scale: modeSlug(key), shapes: CAGED_LETTERS.filter((l) => picked.includes(l)) });
  },
  read(s) {
    const t = toolOf(s, "caged-neck");
    return t ? { shapes: t.shapes?.length ? [...t.shapes] : [OVERVIEW] } : null;
  },
  // the shapes change; the key and its scale (major or minor shapes) stay the widget's own
  update(s, values) {
    const t = toolOf(s, "caged-neck");
    if (!t) return s;
    const picked = strs(values.shapes ?? (t.shapes ?? []));
    const tool = toolSubject({ ...t, shapes: CAGED_LETTERS.filter((l) => picked.includes(l)) });
    return "pinned" in s && s.pinned ? ({ ...tool, pinned: s.pinned } as Subject) : tool;
  },
  parts(s) {
    const t = toolOf(s, "caged-neck")!;
    const letters = t.shapes ?? [];
    const detail = letters.length ? `${letters.join(", ")} shape${letters.length > 1 ? "s" : ""}` : "whole neck";
    return { name: "CAGED", key: keyText(t.key, cagedQualityOf(toolKeyChoice(t))), detail };
  },
});

/* ---------------------------------------------------------------- the Arpeggio family */

const ARP_KINDS = [{ value: "triad", label: "Scale triad" }, { value: "seventh", label: "Scale 7th" }, { value: "ninth", label: "Scale 9th" }];
const ARP_TYPES = [...ARP_KINDS, ...ARP_QUALITIES.map((q) => ({ value: q.id, label: q.label }))];
/** the strings a position's root can sit on, low to high: guitar numbering, as the arpeggios page counts them */
export const ARP_ROOT_STRINGS = [6, 5, 4, 3, 2];
const ORDINAL: Record<number, string> = { 6: "6th", 5: "5th", 4: "4th", 3: "3rd", 2: "2nd" };
const ARP_SCALES = MODE_PAGES.map((m) => ({ value: m.slug, label: m.name }));
/** a quality's chord symbol after the root, as `parseChordQuery` reads it */
const QUALITY_SUFFIX: Record<string, string> = { maj: "", min: "m", dim: "dim", aug: "aug", maj7: "maj7", "7": "7", m7: "m7", m7b5: "m7b5", dim7: "dim7", mmaj7: "mMaj7" };
/** a scale 7th's 9th: maj7 → maj9, m7 → m9, 7 → 9; others have no 9th here and stay the 7th */
const NINTH: Record<string, string> = { maj7: "maj9", m7: "m9", "7": "9" };

/** The chords of the key the values name, to start the arpeggio on: "V · G". */
function arpDegreeOptions(v: FamilyValues) {
  const page = findModePage(str(v.scale) ?? "");
  const tonicPc = typeof v.key === "number" ? v.key : DEFAULT_KEY_PC;
  const ctx = keyContext({ tonicPc, family: page?.familyIndex ?? 0, mode: page?.modeIndex ?? 0 })!;
  return ctx.chords.map((c) => ({ value: c.degree, label: `${c.roman} · ${ctx.names[c.degree]}` }));
}

/**
 * The chord symbol the Arpeggio family's values name: the scale's own triad, 7th or 9th on `degree` (0-6) of `key`, or an
 * `ARP_QUALITIES` quality on that degree's root ("Dm", "Dm7", "Dm9", "Gm").
 */
export function arpChordSymbol(key: KeyChoice, degree: number, type: string): string {
  const ctx = keyContext({ ...key, tonicPc: key.tonicPc ?? DEFAULT_KEY_PC })!;
  const ch = ctx.chords[Math.min(Math.max(Math.round(degree), 0), 6)];
  if (type === "triad") return ch.triadName;
  if (type === "seventh") return ch.seventhName;
  if (type === "ninth") return NINTH[ch.seventh] ? `${ch.root}${NINTH[ch.seventh]}` : ch.seventhName;
  return `${ch.root}${QUALITY_SUFFIX[type] ?? ""}`;
}

/** The `ARP_QUALITIES` quality closest to a chord's notes (G9 → 7): most notes shared, fewest added. */
function nearestQuality(semis: number[]): string {
  const pcs = semis.map((n) => ((n % 12) + 12) % 12);
  const score = (qs: number[]) => qs.filter((n) => pcs.includes(n)).length - qs.filter((n) => !pcs.includes(n)).length;
  return ARP_QUALITIES.reduce((best, x) => (score(x.semis) > score(best.semis) ? x : best)).id;
}

/** An arpeggio widget's values: the chord's root as the key, in major or minor by its 3rd, on I, its type. */
function arpRead(s: Subject): FamilyValues | null {
  const t = toolOf(s, "arpeggio-neck");
  if (!t) return null;
  const q = parseChordQuery(t.chord);
  const minor = !!q?.semis.includes(3);
  return {
    key: q?.rootPc ?? 0, scale: minor ? "natural-minor-aeolian" : MODE_PAGES[0].slug, degree: 0, type: arpTypeOf(t.chord) ?? nearestQuality(q?.semis ?? [0, 4, 7]),
    show: t.show ?? ["positions"], roots: t.roots ?? ARP_ROOT_STRINGS,
  };
}

function arpMake(v: FamilyValues, key: KeyChoice): Subject {
  const page = findModePage(str(v.scale) ?? "");
  const tonicPc = typeof v.key === "number" && Number.isInteger(v.key) && v.key >= 0 && v.key < 12 ? v.key : tonicOf(key);
  const own: KeyChoice = { tonicPc, family: page ? page.familyIndex : key.family, mode: page ? page.modeIndex : key.mode };
  const degree = typeof v.degree === "number" && Number.isInteger(v.degree) && v.degree >= 0 && v.degree <= 6 ? v.degree : 0;
  const type = ARP_TYPES.find((t) => t.value === v.type)?.value ?? "seventh";
  // nothing shown is the positions, as on the Scale family
  const show = NECK_SHOWS.filter((x) => strs(v.show).includes(x));
  const roots = ARP_ROOT_STRINGS.filter((n) => nums(v.roots)?.includes(n));
  return toolSubject({ type: "arpeggio-neck", chord: arpChordSymbol(own, degree, type), show: show.length ? show : ["positions"], ...(roots.length && roots.length < ARP_ROOT_STRINGS.length ? { roots } : {}) });
}
const NECK_SHOWS = ["neck", "positions"];

/**
 * New main props: the chord made afresh, the tool's other props kept. Nothing really changed (closing the editor) leaves it as it
 * is, so a typed G9 never turns into the nearest type; a key picked here pins the tonic.
 */
function arpUpdate(s: Subject, values: FamilyValues): Subject {
  const current = arpRead(s);
  if (!current || s.kind !== "tool") return s;
  const merged = { ...current, ...values };
  if (JSON.stringify(merged) === JSON.stringify(current)) return s;
  // only what it shows changed: the chord stays exactly as written (G9 stays G9, C#m keeps its spelling)
  if (["key", "scale", "degree", "type"].every((k) => JSON.stringify(merged[k]) === JSON.stringify(current[k]))) {
    const { show: _s, roots: _r, ...rest } = s.tool as Record<string, unknown>;
    void _s; void _r;
    const show = NECK_SHOWS.filter((x) => strs(merged.show).includes(x));
    const roots = ARP_ROOT_STRINGS.filter((n) => nums(merged.roots)?.includes(n));
    const tool = toolSubject({ ...rest, show: show.length ? show : ["positions"], ...(roots.length && roots.length < ARP_ROOT_STRINGS.length ? { roots } : {}) });
    return s.pinned ? ({ ...tool, pinned: s.pinned } as Subject) : tool;
  }
  const made = arpMake(merged, { tonicPc: current.key as number, family: 0, mode: 0 });
  if (made.kind !== "tool") return s;
  const { show: _show, roots: _roots, ...kept } = s.tool as Record<string, unknown>;
  void _show; void _roots;
  const tool = toolSubject({ ...kept, ...made.tool });
  const pinned = s.pinned ?? (merged.key !== current.key ? ["tonic"] : undefined);
  return pinned ? ({ ...tool, pinned } as Subject) : tool;
}

function arpParts(s: Subject): Parts {
  const t = toolOf(s, "arpeggio-neck")!;
  const roots = t.roots ?? ARP_ROOT_STRINGS;
  const where = t.show ? [t.show.includes("neck") ? "neck" : null, !t.show.includes("positions") ? null : roots.length === ARP_ROOT_STRINGS.length ? "all positions" : `root on ${roots.map((n) => ORDINAL[n]).join(", ")}`] : [numbered("box", t.boxes)];
  return { name: "Arpeggio", key: t.chord, detail: where.filter(Boolean).join(", ") || null };
}

const arpeggio = family({
  id: "arpeggio",
  title: "Arpeggio",
  words: ["arpeggio", "arpeggios", "arp", "arps", "chord", "box", "boxes", "root", "string"],
  group: "chords",
  sub: "In the key",
  tool: "arpeggio-neck",
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

/* ---------------------------------------------------------------- the theory panels */

type PanelTool = Extract<PlanTool, { key: number; scale: string }>;

/**
 * A theory panel as a family: a tool in the key it is added in, with no controls of its own (the chord circle has On). Its key
 * and scale are the widget's: they follow the master as any tool's key does.
 */
function panel(id: Extract<ToolName, "relative-modes" | "mode-intervals" | "key-chords" | "triads" | "progressions" | "circle-of-fifths" | "piano-keys" | "improvisation" | "tunings" | "chord-circle">, title: string, words: string[], group: PaletteGroup, sub?: string, controls: FamilyControl[] = []) {
  return family({
    id, title, words, group, ...(sub ? { sub } : {}), tool: id, controls,
    make: (v, key) => toolSubject({ type: id, key: tonicOf(key), scale: modeSlug(key), ...(id === "chord-circle" ? { degree: typeof v.degree === "number" ? v.degree : 1 } : {}) }),
    read(s): FamilyValues | null {
      const t = toolOf(s, id);
      if (!t) return null;
      return t.type === "chord-circle" ? { degree: t.degree } : {};
    },
    // the controls change; the key and the scale stay the widget's own
    update(s, values) {
      const t = toolOf(s, id);
      if (!t) return s;
      const tool = toolSubject({ ...t, ...(t.type === "chord-circle" && typeof values.degree === "number" ? { degree: values.degree } : {}) });
      return "pinned" in s && s.pinned ? ({ ...tool, pinned: s.pinned } as Subject) : tool;
    },
    parts(s) {
      const t = toolOf(s, id) as PanelTool;
      const roman = t.type === "chord-circle" ? keyContext(toolKeyChoice(t))?.chords[t.degree - 1]?.roman : null;
      return { name: title, key: keyText(t.key, scaleText(t.scale)), detail: roman ?? null };
    },
  });
}

const DEGREES = Array.from({ length: 7 }, (_, i) => ({ value: i + 1, label: ["I", "II", "III", "IV", "V", "VI", "VII"][i] }));
const PANELS = [
  panel("relative-modes", "Relative modes", ["relative", "relatives", "modes", "mode", "same", "notes"], "scale"),
  panel("mode-intervals", "Intervals of the mode", ["intervals", "interval", "mode", "degrees", "formula", "notes"], "scale"),
  panel("key-chords", "Chords in the key", ["chords", "chord", "every", "diatonic", "in", "key"], "chords", "In the key"),
  panel("triads", "Triads", ["triads", "triad", "inversions", "inversion"], "chords", "In the key"),
  panel("progressions", "Progressions", ["progressions", "progression", "chords"], "chords", "In the key"),
  panel("chord-circle", "Sus & extensions", ["sus", "extensions", "extension", "bubble", "bubbles", "add9"], "chords", "Sus & extensions", [{ name: "degree", label: "On", kind: "choice", options: DEGREES, default: 1 }]),
  panel("circle-of-fifths", "Circle of fifths", ["circle", "fifths", "keys", "neighbours"], "theory"),
  panel("piano-keys", "Piano keys", ["piano", "keys", "keyboard"], "theory"),
  panel("improvisation", "Improvisation", ["improvisation", "improvise", "improv", "motive", "rhythm"], "theory"),
  panel("tunings", "Tunings", ["tunings", "tuning", "open", "drop"], "theory"),
];

/* ---------------------------------------------------------------- the practice tools */

const LEVELS = ["new", "beginner", "intermediate", "advanced"].map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }));
const TEMPOS = [50, 60, 70, 80, 90, 100, 120].map((value) => ({ value, label: `${value} bpm` }));
const levelControl: FamilyControl = { name: "level", label: "Level", kind: "choice", options: LEVELS, default: "beginner" };
const tempoControl = (d: number): FamilyControl => ({ name: "bpm", label: "Tempo", kind: "choice", options: TEMPOS, default: d });
const BAND_PART_OPTIONS = [{ value: "click", label: "Click" }, { value: "drone", label: "Drone" }, { value: "drums", label: "Drums" }, { value: "bass", label: "Bass" }];
/** I, V, vi and IV of the key, as chord names: a strum-along's chords when none are typed */
const fourChords = (key: KeyChoice) => [0, 4, 5, 3].map((d) => chordsOf(key)[d].triadName);

/**
 * A plan-only tool as a family: made from the parser's defaults and the few controls it has (the rest are the parser's), so a
 * teacher picks a level or a tempo and the tool sets itself up from it.
 */
function practice(id: Extract<ToolName, "backing-band" | "note-finder" | "interval-ears" | "string-singer" | "interval-singer" | "breathwork" | "finger-pattern" | "picking-drill" | "legato-trill" | "strum-along">, title: string, words: string[], controls: FamilyControl[], base: (key: KeyChoice) => Record<string, unknown>, detail: (t: PlanTool) => string | null) {
  return family({
    id, title, words, group: "practice", tool: id, controls,
    make(v, key) {
      const own = Object.fromEntries(controls.flatMap((c) => (v[c.name] === undefined ? [] : [[c.name, c.name === "parts" ? Object.fromEntries(strs(v.parts).map((p) => [p, "on"])) : v[c.name]]])));
      return toolSubject({ type: id, ...Object.fromEntries(controls.map((c) => [c.name, c.name === "parts" ? Object.fromEntries((c.default as string[]).map((p) => [p, "on"])) : c.default])), ...base(key), ...own });
    },
    read(s) {
      const t = toolOf(s, id) as Record<string, unknown> | null;
      if (!t) return null;
      return Object.fromEntries(controls.map((c) => [c.name, c.name === "parts" ? Object.keys((t.parts as object) ?? {}) : ((t[c.name] as FamilyValue | undefined) ?? c.default)]));
    },
    // only the controls changed are written; the tool keeps the rest (a strum-along's chords, a band part's mode, a trill's string)
    update(s, values) {
      const t = toolOf(s, id) as Record<string, unknown> | null;
      if (!t) return s;
      const old = (t.parts ?? {}) as Record<string, string>;
      const changed = controls.flatMap((c) => (values[c.name] === undefined ? [] : [[c.name, c.name === "parts" ? Object.fromEntries(strs(values.parts).map((p) => [p, old[p] ?? "on"])) : values[c.name]]]));
      const tool = toolSubject({ ...t, ...Object.fromEntries(changed) });
      return "pinned" in s && s.pinned ? ({ ...tool, pinned: s.pinned } as Subject) : tool;
    },
    parts: (s) => ({ name: title, key: null, detail: detail(toolOf(s, id)!) }),
  });
}

const lvl = (t: PlanTool) => ("level" in t && t.level ? LEVELS.find((l) => l.value === t.level)!.label.toLowerCase() : null);
const PRACTICE = [
  practice("backing-band", "Backing band", ["backing", "band", "metronome", "click", "drone", "drums", "bass", "tempo"], [{ name: "parts", label: "Parts", kind: "multi", options: BAND_PART_OPTIONS, default: ["click", "drone"] }, tempoControl(80)], (key) => ({ key: tonicOf(key) }), (t) => (t.type === "backing-band" ? `${Object.keys(t.parts).join(", ")} · ${t.bpm} bpm` : null)),
  practice("note-finder", "Note finder", ["note", "finder", "find", "notes", "fretboard", "game"], [levelControl], () => ({}), lvl),
  practice("interval-ears", "Interval ears", ["interval", "intervals", "ears", "ear", "hear", "game"], [levelControl], () => ({}), lvl),
  practice("string-singer", "Sing the strings", ["sing", "strings", "open", "string", "singer"], [levelControl], () => ({}), lvl),
  practice("interval-singer", "Sing intervals", ["sing", "interval", "intervals", "singer", "do"], [levelControl], (key) => ({ key: tonicOf(key) }), lvl),
  practice("breathwork", "Breathwork", ["breath", "breathing", "breathwork", "exhale"], [levelControl], () => ({}), lvl),
  practice("finger-pattern", "Finger pattern", ["finger", "fingers", "pattern", "dexterity", "technique"], [levelControl, tempoControl(60)], () => ({}), lvl),
  practice("picking-drill", "Picking drill", ["picking", "pick", "alternate", "drill", "technique"], [levelControl, tempoControl(60)], () => ({}), lvl),
  practice("legato-trill", "Legato trill", ["legato", "trill", "hammer", "pull", "technique"], [levelControl, tempoControl(60)], () => ({ string: 3, fret: 5 }), lvl),
  practice("strum-along", "Strum along", ["strum", "strumming", "chords", "rhythm"], [tempoControl(80)], (key) => ({ chords: fourChords(key) }), (t) => (t.type === "strum-along" ? `${t.chords.join(", ")} · ${t.bpm} bpm` : null)),
];

const ALL = [scale, caged, arpeggio, chordShapes, staff, melody, ...PANELS, ...PRACTICE];

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

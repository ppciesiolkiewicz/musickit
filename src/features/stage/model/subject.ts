/**
 * What a stage widget shows: its subject. Plain data (saved, recorded in the widget track, replayed), no React.
 * Key-aware subjects carry their own key. The Key & scale widget is the master: a widget follows it, except for the parts of its key
 * changed on the widget itself (`pinned`). A widget pinned to Dorian keeps Dorian when the master scale changes but still moves to a
 * new master root, so modes of one root can be compared side by side. Chord diagrams never move.
 */
import { EMPTY_KEY, keyContext, modeName, sanitiseKey, type KeyChoice } from "@/features/creator/model/key";
import { tonicName } from "@/features/theory";
import { CAGED_LETTERS, formsFor, type CagedLetter, type CagedQuality } from "@/lib/chordKit/caged";
import type { PositionKind } from "@/lib/chordKit/scalePositions";

/** Every chord in the key · Modes with the same notes · Scale on guitar */
export type ScaleSection = "chords" | "relatives" | "guitar";

/** The parts of a widget's key changed on the widget: the master no longer moves them. */
export type KeyPart = "tonic" | "scale";

interface Keyed {
  key: KeyChoice;
  pinned?: KeyPart[];
}

export type Subject =
  | { kind: "chord"; symbol: string }
  /** a cheatsheet panel: its compact view, or with `full` the whole theory page */
  | ({ kind: "plugin"; plugin: string; full?: boolean } & Keyed)
  | ({ kind: "position"; positionKind: PositionKind; index: number } & Keyed)
  /** the metronome: click, drone, drums and bass */
  | ({ kind: "band" } & Keyed)
  | ({ kind: "section"; section: ScaleSection } & Keyed)
  /** one chord of the key (degree 0..6) with the sus and extension chords around it: one circle diagram */
  | ({ kind: "bubble"; degree: number } & Keyed)
  /** the scale's notes on the whole neck */
  | ({ kind: "neck" } & Keyed)
  /** the five CAGED boxes on the whole neck (no shape), or one box: its chord, arpeggio, pentatonic and scale */
  | ({ kind: "caged"; shape: CagedLetter | null } & Keyed)
  | { kind: "key" }
  | { kind: "tuner" }
  /** the microphone: the notes it hears light up on the pinned and selected widgets */
  | { kind: "mic" }
  | { kind: "logo" }
  | { kind: "url" }
  | { kind: "camera" }
  | { kind: "screen" };

export type StudioCommand = "camera-corner" | "camera-full" | "camera-off" | "screen-share" | "screen-corner" | "screen-full" | "screen-stop" | "clear";

export interface PaletteResult {
  id: string;
  label: string;
  detail: string;
  group: PaletteGroup;
  /** a subsection inside the group ("On the fretboard"), shown as a smaller heading */
  sub?: string;
  action: { type: "add"; subject: Subject } | { type: "command"; command: StudioCommand };
}

/** The palette's categories, in the order it lists them, with the name on each separator. */
export const PALETTE_GROUPS = {
  setup: "Key and sound",
  scale: "Scale",
  chords: "Chords",
  caged: "CAGED",
  theory: "Theory",
  pages: "Cheatsheet pages",
  brand: "Brand",
  studio: "Studio",
} as const;
export type PaletteGroup = keyof typeof PALETTE_GROUPS;

export const SECTIONS: Record<ScaleSection, string> = {
  chords: "Chords in the key",
  relatives: "Modes with the same notes",
  guitar: "Fretboard positions",
};

/** The creator plugins' titles, for names that need no React (the registry itself holds components). */
export const PLUGIN_TITLES: Record<string, string> = {
  scale: "Scale",
  chords: "Chords",
  circle: "Circle of fifths",
  keys: "Keys",
  progressions: "Progressions",
  modes: "Modes",
  triads: "Triads",
  caged: "CAGED",
  arpeggios: "Arpeggios",
  improv: "Improvisation",
  tunings: "Tunings",
};

/** A compact panel's name on the stage, where it sits beside other widgets. */
const PANEL_NAMES: Record<string, string> = { ...PLUGIN_TITLES, scale: "Scale notes", keys: "Piano keys", caged: "CAGED overview" };

const POSITION_KINDS: PositionKind[] = ["pentatonic", "scale", "3nps"];
const POSITION_NAMES: Record<PositionKind, string> = { pentatonic: "Pentatonic box", scale: "Scale position", "3nps": "3 notes per string, position" };
const DEGREE_ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];

export const isKeyed = (s: Subject): s is Extract<Subject, Keyed> => "key" in s;

export function keyOf(s: Subject): KeyChoice | null {
  return isKeyed(s) ? s.key : null;
}

/** The subject in another key, nothing pinned or unpinned; subjects without a key (chord, logo, url, camera, screen, tuner, microphone, the Key widget) come back as they are. */
export function withKey(s: Subject, key: KeyChoice): Subject {
  return isKeyed(s) ? { ...s, key } : s;
}

const sameScale = (a: KeyChoice, b: KeyChoice) => a.family === b.family && a.mode === b.mode;

/** The subject after the master Key & scale changed to `master`: every part of its key that is not pinned follows. */
export function withMaster(s: Subject, master: KeyChoice): Subject {
  if (!isKeyed(s)) return s;
  const pinned = s.pinned ?? [];
  const tonicPc = pinned.includes("tonic") ? s.key.tonicPc : master.tonicPc;
  const scale = pinned.includes("scale") ? s.key : master;
  return { ...s, key: { tonicPc, family: scale.family, mode: scale.mode } };
}

/** The subject's key changed on the widget: the parts that changed are pinned, so the master leaves them alone from now on. */
export function withOwnKey(s: Subject, key: KeyChoice): Subject {
  if (!isKeyed(s)) return s;
  const pins = new Set(s.pinned ?? []);
  if (key.tonicPc !== s.key.tonicPc) pins.add("tonic");
  if (!sameScale(key, s.key)) pins.add("scale");
  return { ...s, key, pinned: [...pins] };
}

/** Back to following the master in everything. */
export function followMaster(s: Subject, master: KeyChoice): Subject {
  if (!isKeyed(s)) return s;
  const { pinned: _pinned, ...rest } = s;
  void _pinned;
  return withMaster(rest as Subject, master);
}

/** A new widget picked with a key of its own ("g dorian fretboard"): what differs from the master is pinned. */
export function pinAgainst(s: Subject, master: KeyChoice): Subject {
  if (!isKeyed(s)) return s;
  const pins: KeyPart[] = [];
  if (s.key.tonicPc !== master.tonicPc) pins.push("tonic");
  if (!sameScale(s.key, master)) pins.push("scale");
  return pins.length ? { ...s, pinned: pins } : s;
}

/** A control rather than something to look at: it sets, plays or listens to something for the lesson (the master key, the metronome, the tuner, the microphone). */
export const isControl = (s: Subject): boolean => s.kind === "key" || s.kind === "band" || s.kind === "tuner" || s.kind === "mic";

/** A page rather than a single widget: a whole cheatsheet page, or a scale-page section with parts to pick from (Fretboard positions, Chords in the key). */
export const isPage = (s: Subject): boolean => (s.kind === "plugin" && s.full === true) || (s.kind === "section" && s.section !== "relatives");

/** Which widget a subject is, whatever its key: the palette ticks a row when a widget with the same identity is on the stage. */
export function subjectIdentity(s: Subject): string {
  if (!isKeyed(s)) return JSON.stringify(s);
  const { key: _key, pinned: _pinned, ...rest } = s;
  void _key;
  void _pinned;
  return JSON.stringify(rest);
}

/** CAGED comes in major and minor: a key whose third is minor (Dorian, Aeolian, harmonic minor…) uses the minor shapes. */
export function cagedQualityOf(key: KeyChoice): CagedQuality {
  return keyContext({ ...key, tonicPc: key.tonicPc ?? 0 })?.steps[2] === 3 ? "minor" : "major";
}

const ROOT_STRING: Record<number, string> = { 6: "low E", 5: "A", 4: "D", 3: "G", 1: "high e" };

/** "E shape (root on low E)": which string a CAGED shape's root sits on is the same in major and minor. */
export function cagedShapeName(letter: CagedLetter): string {
  const rs = formsFor("major").find((f) => f.letter === letter)?.rs ?? 6;
  return `${letter} shape (root on ${ROOT_STRING[rs]})`;
}

/** What the widget is, without its key: "Fretboard", "Pentatonic box 2", "CAGED E shape (root on low E)". */
export function subjectName(s: Subject): string {
  switch (s.kind) {
    case "chord":
      return `${s.symbol} chord`;
    case "plugin":
      return s.full ? `${PLUGIN_TITLES[s.plugin] ?? s.plugin} page` : PANEL_NAMES[s.plugin] ?? s.plugin;
    case "position":
      return `${POSITION_NAMES[s.positionKind]} ${s.index + 1}`;
    case "band":
      return "Metronome";
    case "section":
      return SECTIONS[s.section];
    case "bubble": {
      const ch = keyContext({ ...s.key, tonicPc: s.key.tonicPc ?? 0 })?.chords[s.degree];
      return `Sus & extensions · ${ch?.roman ?? DEGREE_ROMAN[s.degree]}`;
    }
    case "neck":
      return "Fretboard";
    case "caged":
      return s.shape === null ? "CAGED fretboard" : `CAGED ${cagedShapeName(s.shape)}`;
    case "key":
      return "Key & scale";
    case "tuner":
      return "Tuner";
    case "mic":
      return "Microphone";
    case "logo":
      return "Logo";
    case "url":
      return "Site address";
    case "camera":
      return "Camera";
    case "screen":
      return "Screen share";
  }
}

/** The widget's scale as its title shows it ("Dorian", CAGED "minor"), with the root only when it is pinned off the master's ("G Dorian"). */
export function keyLabel(s: Subject): string | null {
  if (!isKeyed(s)) return null;
  const root = s.pinned?.includes("tonic") && s.key.tonicPc !== null ? `${tonicName(s.key.tonicPc)} ` : "";
  if (s.kind === "band") return root ? root.trim() : null;
  return `${root}${s.kind === "caged" ? cagedQualityOf(s.key) : modeName(s.key)}`;
}

/** The widget's title: its name and its scale, never the master's root ("Fretboard · Dorian"). */
export function subjectTitle(s: Subject): string {
  const label = keyLabel(s);
  return label ? `${subjectName(s)} · ${label}` : subjectName(s);
}

const obj = (v: unknown): Record<string, unknown> | null => (typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
const keyFrom = (v: unknown): KeyChoice => (obj(v) ? sanitiseKey(v) : EMPTY_KEY);

/** The key and the pinned parts of a saved key-aware subject. */
function keyedFrom(o: Record<string, unknown>): Keyed {
  const pinned = Array.isArray(o.pinned) ? (["tonic", "scale"] as const).filter((p) => (o.pinned as unknown[]).includes(p)) : [];
  return pinned.length ? { key: keyFrom(o.key), pinned } : { key: keyFrom(o.key) };
}

/** A saved or recorded subject, or null when it is not one we can show (an unknown plugin, a missing field). */
export function sanitiseSubject(raw: unknown, pluginIds: string[]): Subject | null {
  const o = obj(raw);
  if (!o) return null;
  switch (o.kind) {
    case "chord":
      return typeof o.symbol === "string" && o.symbol.trim() ? { kind: "chord", symbol: o.symbol.trim() } : null;
    case "plugin":
      if (typeof o.plugin !== "string" || !pluginIds.includes(o.plugin)) return null;
      return o.full === true ? { kind: "plugin", plugin: o.plugin, full: true, ...keyedFrom(o) } : { kind: "plugin", plugin: o.plugin, ...keyedFrom(o) };
    case "position": {
      const kind = POSITION_KINDS.find((k) => k === o.positionKind);
      const index = o.index;
      if (!kind || typeof index !== "number" || !Number.isInteger(index) || index < 0 || index > 6) return null;
      return { kind: "position", positionKind: kind, index, ...keyedFrom(o) };
    }
    case "band":
      return { kind: "band", ...keyedFrom(o) };
    case "section": {
      // the old single "Sus and extensions" section is now one widget per chord: it comes back as the first
      if (o.section === "sus") return { kind: "bubble", degree: 0, ...keyedFrom(o) };
      const section = (Object.keys(SECTIONS) as ScaleSection[]).find((k) => k === o.section);
      return section ? { kind: "section", section, ...keyedFrom(o) } : null;
    }
    case "bubble":
      return typeof o.degree === "number" && Number.isInteger(o.degree) && o.degree >= 0 && o.degree <= 6 ? { kind: "bubble", degree: o.degree, ...keyedFrom(o) } : null;
    case "neck":
      return { kind: "neck", ...keyedFrom(o) };
    case "caged": {
      if (o.shape !== null && o.shape !== undefined && !CAGED_LETTERS.includes(o.shape as CagedLetter)) return null;
      return { kind: "caged", shape: (o.shape as CagedLetter | undefined) ?? null, ...keyedFrom(o) };
    }
    case "key":
    case "tuner":
    case "mic":
    case "logo":
    case "url":
    case "camera":
    case "screen":
      return { kind: o.kind };
    default:
      return null;
  }
}

/**
 * What a stage widget shows: its subject. Plain data (saved, recorded in the widget track, replayed), no React.
 * Key-aware subjects carry their own key. The Key widget moves them all to a new root note (`withTonic`) and leaves each one's
 * scale or mode alone, so a lesson can show A Dorian beside A Phrygian and move both to C at once. Chord diagrams never move.
 */
import { EMPTY_KEY, keyContext, keyTitle, sanitiseKey, type KeyChoice } from "@/features/creator/model/key";
import { tonicName } from "@/features/theory";
import { CAGED_LETTERS, formsFor, type CagedLetter, type CagedQuality } from "@/lib/chordKit/caged";
import type { PositionKind } from "@/lib/chordKit/scalePositions";

/** Every chord in the key · Modes with the same notes · Scale on guitar */
export type ScaleSection = "chords" | "relatives" | "guitar";

export type Subject =
  | { kind: "chord"; symbol: string }
  | { kind: "plugin"; plugin: string; key: KeyChoice }
  | { kind: "position"; key: KeyChoice; positionKind: PositionKind; index: number }
  | { kind: "band"; key: KeyChoice }
  | { kind: "section"; section: ScaleSection; key: KeyChoice }
  /** one chord of the key (degree 0..6) with the sus and extension chords around it: one circle diagram */
  | { kind: "bubble"; key: KeyChoice; degree: number }
  /** the scale's notes on the whole neck */
  | { kind: "neck"; key: KeyChoice }
  /** the five CAGED boxes on the whole neck (no shape), or one box: its chord, arpeggio, pentatonic and scale */
  | { kind: "caged"; key: KeyChoice; shape: CagedLetter | null }
  | { kind: "key" }
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
  action: { type: "add"; subject: Subject } | { type: "command"; command: StudioCommand };
}

/** The palette's categories, in the order it lists them, with the name on each separator. */
export const PALETTE_GROUPS = {
  theory: "Key and theory",
  scale: "Scale",
  position: "Positions",
  caged: "CAGED",
  chord: "Chords",
  audio: "Sound",
  brand: "Brand",
  studio: "Studio",
} as const;
export type PaletteGroup = keyof typeof PALETTE_GROUPS;

export const SECTIONS: Record<ScaleSection, string> = {
  chords: "Every chord",
  relatives: "Modes with the same notes",
  guitar: "Scale on guitar",
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
  improv: "Improv",
  tunings: "Tunings",
};

const POSITION_KINDS: PositionKind[] = ["pentatonic", "scale", "3nps"];
const POSITION_NAMES: Record<PositionKind, string> = { pentatonic: "pentatonic box", scale: "position", "3nps": "3 notes per string" };

export function keyOf(s: Subject): KeyChoice | null {
  return "key" in s ? s.key : null;
}

/** The subject in another key; subjects without a key (chord, logo, url, camera, screen, the Key widget) come back as they are. */
export function withKey(s: Subject, key: KeyChoice): Subject {
  return "key" in s ? { ...s, key } : s;
}

/** The subject on another root note, its scale or mode kept: what the Key widget does. Subjects without a key come back as they are. */
export function withTonic(s: Subject, tonicPc: number | null): Subject {
  return "key" in s ? { ...s, key: { ...s.key, tonicPc } } : s;
}

/** CAGED comes in major and minor: a key whose third is minor (Dorian, Aeolian, harmonic minor…) uses the minor shapes. */
export function cagedQualityOf(key: KeyChoice): CagedQuality {
  return keyContext({ ...key, tonicPc: key.tonicPc ?? 0 })?.steps[2] === 3 ? "minor" : "major";
}

const ROOT_STRING: Record<number, string> = { 6: "low E", 5: "A", 4: "D", 3: "G", 1: "high e" };

/** "E shape, root on low E": which string a CAGED shape's root sits on is the same in major and minor. */
export function cagedShapeName(letter: CagedLetter): string {
  const rs = formsFor("major").find((f) => f.letter === letter)?.rs ?? 6;
  return `${letter} shape, root on ${ROOT_STRING[rs]}`;
}

const DEGREE_ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];
const cagedKeyName = (key: KeyChoice) => (key.tonicPc === null ? "" : ` · ${tonicName(key.tonicPc)} ${cagedQualityOf(key)}`);

export function subjectTitle(s: Subject): string {
  switch (s.kind) {
    case "chord":
      return `${s.symbol} chord`;
    case "plugin":
      return s.key.tonicPc === null ? PLUGIN_TITLES[s.plugin] ?? s.plugin : `${keyTitle(s.key)} · ${PLUGIN_TITLES[s.plugin] ?? s.plugin}`;
    case "position":
      return `${keyTitle(s.key)} · ${POSITION_NAMES[s.positionKind]} ${s.index + 1}`;
    case "band":
      return s.key.tonicPc === null ? "Drone" : `Drone · ${tonicName(s.key.tonicPc)}`;
    case "section":
      return s.key.tonicPc === null ? SECTIONS[s.section] : `${SECTIONS[s.section]} · ${keyTitle(s.key)}`;
    case "bubble": {
      const ch = keyContext(s.key)?.chords[s.degree];
      return ch ? `${ch.roman} ${ch.triadName} sus and extensions · ${keyTitle(s.key)}` : `${DEGREE_ROMAN[s.degree]} sus and extensions`;
    }
    case "neck":
      return s.key.tonicPc === null ? "Scale fretboard" : `Scale fretboard · ${keyTitle(s.key)}`;
    case "caged":
      return `${s.shape === null ? "CAGED fretboard" : `CAGED ${cagedShapeName(s.shape)}`}${cagedKeyName(s.key)}`;
    case "key":
      return "Key";
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

const obj = (v: unknown): Record<string, unknown> | null => (typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
const keyFrom = (v: unknown): KeyChoice => (obj(v) ? sanitiseKey(v) : EMPTY_KEY);

/** A saved or recorded subject, or null when it is not one we can show (an unknown plugin, a missing field). */
export function sanitiseSubject(raw: unknown, pluginIds: string[]): Subject | null {
  const o = obj(raw);
  if (!o) return null;
  switch (o.kind) {
    case "chord":
      return typeof o.symbol === "string" && o.symbol.trim() ? { kind: "chord", symbol: o.symbol.trim() } : null;
    case "plugin":
      return typeof o.plugin === "string" && pluginIds.includes(o.plugin) ? { kind: "plugin", plugin: o.plugin, key: keyFrom(o.key) } : null;
    case "position": {
      const kind = POSITION_KINDS.find((k) => k === o.positionKind);
      const index = o.index;
      if (!kind || typeof index !== "number" || !Number.isInteger(index) || index < 0 || index > 6) return null;
      return { kind: "position", key: keyFrom(o.key), positionKind: kind, index };
    }
    case "band":
      return { kind: "band", key: keyFrom(o.key) };
    case "section": {
      // the old single "Sus and extensions" section is now one widget per chord: it comes back as the first
      if (o.section === "sus") return { kind: "bubble", key: keyFrom(o.key), degree: 0 };
      const section = (Object.keys(SECTIONS) as ScaleSection[]).find((k) => k === o.section);
      return section ? { kind: "section", section, key: keyFrom(o.key) } : null;
    }
    case "bubble":
      return typeof o.degree === "number" && Number.isInteger(o.degree) && o.degree >= 0 && o.degree <= 6 ? { kind: "bubble", key: keyFrom(o.key), degree: o.degree } : null;
    case "neck":
      return { kind: "neck", key: keyFrom(o.key) };
    case "caged": {
      if (o.shape !== null && o.shape !== undefined && !CAGED_LETTERS.includes(o.shape as CagedLetter)) return null;
      return { kind: "caged", key: keyFrom(o.key), shape: (o.shape as CagedLetter | undefined) ?? null };
    }
    case "key":
    case "logo":
    case "url":
    case "camera":
    case "screen":
      return { kind: o.kind };
    default:
      return null;
  }
}

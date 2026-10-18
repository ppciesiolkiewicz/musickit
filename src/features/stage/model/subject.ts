/**
 * What a stage widget shows: its subject. Plain data (saved, recorded in the widget track, replayed), no React.
 * Key-aware subjects carry their own key; the Key widget re-keys them all at once (`withKey`), chord diagrams never.
 */
import { EMPTY_KEY, keyTitle, sanitiseKey, type KeyChoice } from "@/features/creator/model/key";
import { tonicName } from "@/features/theory";
import type { PositionKind } from "@/lib/chordKit/scalePositions";

/** Every chord in the key · Sus and extension chords · Modes with the same notes · Scale on guitar */
export type ScaleSection = "chords" | "sus" | "relatives" | "guitar";

export type Subject =
  | { kind: "chord"; symbol: string }
  | { kind: "plugin"; plugin: string; key: KeyChoice }
  | { kind: "position"; key: KeyChoice; positionKind: PositionKind; index: number }
  | { kind: "band"; key: KeyChoice }
  | { kind: "section"; section: ScaleSection; key: KeyChoice }
  | { kind: "key" }
  | { kind: "camera" }
  | { kind: "screen" };

export type StudioCommand = "camera-corner" | "camera-full" | "camera-off" | "screen-share" | "screen-corner" | "screen-full" | "screen-stop" | "clear";

export interface PaletteResult {
  id: string;
  label: string;
  detail: string;
  group: "chord" | "scale" | "position" | "theory" | "audio" | "studio";
  action: { type: "add"; subject: Subject } | { type: "command"; command: StudioCommand };
}

export const SECTIONS: Record<ScaleSection, string> = {
  chords: "Every chord",
  sus: "Sus and extensions",
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

/** The subject in another key; subjects without a key (chord, camera, screen, the Key widget) come back as they are. */
export function withKey(s: Subject, key: KeyChoice): Subject {
  return "key" in s ? { ...s, key } : s;
}

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
    case "key":
      return "Key";
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
      const section = (Object.keys(SECTIONS) as ScaleSection[]).find((k) => k === o.section);
      return section ? { kind: "section", section, key: keyFrom(o.key) } : null;
    }
    case "key":
    case "camera":
    case "screen":
      return { kind: o.kind };
    default:
      return null;
  }
}

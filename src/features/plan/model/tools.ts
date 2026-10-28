import { parseChordQuery } from "@/lib/chordKit/chordSearch";
import { parseKeySlug } from "@/features/theory/keySlug";
import { findPentatonic } from "@/features/theory/pentatonics";
import { findModePage } from "@/features/theory/scales";
import { VOICES, type Voice } from "@/features/theory/singing";

/**
 * What an exercise shows on the plan page, set up by the AI so the player only plays: no settings to touch.
 * A small set on purpose, one per kind of practice:
 *   scale   a scale or pentatonic on the neck, only the boxes the exercise is about
 *   chords  chord shapes to play (tap one to hear it)
 *   sing    the notes of a scale on a staff, with the microphone's pitch on it
 *   band    click, drone, drums, bass: folded to one Play that plays only the chosen parts
 *   notes   the fretboard-notes game, on the strings and frets given
 *   ears    the interval / chord ear-training game, at the level given
 * To add one: a type here, its parsing in `parseTool`, a line in `TOOL_DOCS` (what the prompt tells the AI) and a view in ui/ExerciseTool.tsx.
 */
export type BandPart = "click" | "drone" | "drums" | "bass";
export const BAND_PARTS: BandPart[] = ["click", "drone", "drums", "bass"];

export type PlanTool =
  | { type: "scale"; scale: string; key: number; boxes?: number[] }
  | { type: "chords"; chords: string[] }
  | { type: "sing"; scale: string; key: number; voice: Voice }
  | { type: "band"; bpm: number; key: number; parts: BandPart[] }
  | { type: "notes"; query: string }
  | { type: "ears"; query: string };

/** What the prompt says about each tool: its JSON and what it shows. */
export const TOOL_DOCS: string[] = [
  `{ "type": "scale", "scale": "minor-pentatonic", "key": "a", "boxes": [1, 2] } : the scale's positions on the guitar neck; "boxes" (1-5) limits it to the ones the exercise is about. "scale" is a scale slug from the pages list (major-ionian, dorian, minor-pentatonic, minor-blues…), "key" a note (c, f-sharp, b-flat).`,
  `{ "type": "chords", "chords": ["G", "C", "D", "Em"] } : a chord shape for each, to play (names like A, Am, E7, Cmaj7, Dsus4, F#m).`,
  `{ "type": "sing", "scale": "major-ionian", "key": "c", "voice": "baritone" } : the scale on a staff with live pitch from the microphone, for singing exercises. voice: soprano, mezzo, alto, tenor, baritone, bass.`,
  `{ "type": "band", "bpm": 70, "key": "a", "parts": ["click", "drone"] } : metronome, drone, drums and bass in a key; "parts" are the ones that play (any of click, drone, drums, bass). Use it for anything played in time or over a drone.`,
  `{ "type": "notes", "strings": "E,A", "from": 0, "to": 12, "mode": "find" } : the fretboard-notes game. mode find (find a named note), every (all of them), name (name a lit dot); strings from E,A,D,G,B,e.`,
  `{ "type": "ears", "level": 2, "kind": "interval", "dir": "up" } : ear training. level 1-6 (1: 5th and octave … 6: all twelve) or "set": [3, 4, 7] semitones; kind interval|chord; dir up|down|together.`,
];

const int = (v: unknown, lo: number, hi: number): number | null => {
  const n = Number(v);
  return Number.isInteger(n) && n >= lo && n <= hi ? n : null;
};
const isScale = (slug: unknown): slug is string => typeof slug === "string" && !!(findPentatonic(slug) || findModePage(slug));
const keyOf = (v: unknown): number | null => (typeof v === "string" || typeof v === "number" ? parseKeySlug(String(v)) : null);

/** One tool from the AI's JSON, checked: null when it can't be shown (unknown scale, no valid chord…). */
export function parseTool(raw: unknown): PlanTool | null {
  const t = (raw ?? {}) as Record<string, unknown>;
  switch (t.type) {
    case "scale": {
      const key = keyOf(t.key);
      if (!isScale(t.scale) || key === null) return null;
      const boxes = Array.isArray(t.boxes) ? [...new Set(t.boxes.map((b) => int(b, 1, 5)).filter((b): b is number => b !== null))].sort() : [];
      return { type: "scale", scale: t.scale, key, ...(boxes.length ? { boxes } : {}) };
    }
    case "chords": {
      const chords = (Array.isArray(t.chords) ? t.chords : []).filter((c): c is string => typeof c === "string" && !!parseChordQuery(c)).slice(0, 8);
      return chords.length ? { type: "chords", chords } : null;
    }
    case "sing": {
      const key = keyOf(t.key);
      if (!isScale(t.scale) || key === null) return null;
      const voice = typeof t.voice === "string" && t.voice in VOICES ? (t.voice as Voice) : "baritone";
      return { type: "sing", scale: t.scale, key, voice };
    }
    case "band": {
      const parts = (Array.isArray(t.parts) ? t.parts : []).filter((p): p is BandPart => BAND_PARTS.includes(p as BandPart));
      return { type: "band", bpm: int(t.bpm, 30, 240) ?? 80, key: keyOf(t.key) ?? 9, parts: parts.length ? [...new Set(parts)] : ["click"] };
    }
    case "notes": {
      const q = new URLSearchParams();
      for (const k of ["mode", "strings", "from", "to"]) if (t[k] != null) q.set(k, String(t[k]));
      return { type: "notes", query: q.toString() };
    }
    case "ears": {
      const q = new URLSearchParams();
      if (t.level != null) q.set("level", String(t.level));
      if (Array.isArray(t.set)) q.set("set", t.set.join(","));
      if (t.dir != null) q.set("dir", String(t.dir));
      if (t.kind != null) q.set("kind", String(t.kind));
      return { type: "ears", query: q.toString() };
    }
  }
  return null;
}

/**
 * The tool an older plan's link stands for (before exercises carried tools): a scale page, the notes or ears game,
 * or the metronome. Null for any other page.
 */
export function toolFromLink(link: string | undefined): PlanTool | null {
  if (!link) return null;
  const [pathPart, rest = ""] = link.split("?");
  const path = pathPart.split("#")[0].replace(/\/$/, "");
  const query = rest.split("#")[0];
  const scale = path.match(/^\/theory\/scales\/([a-z0-9-]+)\/([a-z-]+)$/);
  if (scale) {
    const key = parseKeySlug(scale[2]);
    return key !== null && isScale(scale[1]) ? { type: "scale", scale: scale[1], key } : null;
  }
  if (path === "/theory/notes") return { type: "notes", query };
  if (path === "/theory/ears") return { type: "ears", query };
  if (path === "/theory/metronome-drone") return { type: "band", bpm: 80, key: 9, parts: ["click"] };
  return null;
}

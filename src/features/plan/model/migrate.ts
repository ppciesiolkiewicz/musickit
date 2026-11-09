import { parseChordQuery } from "@/lib/chordKit/chordSearch";
import { keySlug, parseKeySlug } from "@/features/theory/keySlug";
import { findPentatonic } from "@/features/theory/pentatonics";
import { findModePage } from "@/features/theory/scales";
import type { PlanTool } from "./tools";

/** Old tool names (plans pasted or stored before the learning components) to the component that replaced each. */
const RENAMED: Record<string, string> = {
  scale: "scale-neck",
  chords: "chord-shapes",
  band: "backing-band",
  notes: "note-finder",
  ears: "interval-ears",
  "play-along": "guitar-play-along",
};

/**
 * A tool as an older plan wrote it, in today's names and props; anything else is returned unchanged. `sing` becomes a
 * `staff` with the mic (its stored `notes`/`highlight` are already semitones and are read as such), `comp` a
 * `guitar-play-along` progression on the neck, `click-drone` a `backing-band` with its click and drone, `chord-backing` (chords for a singer) a `backing-track` on its chords with a
 * gentle style and the bass off. Pure; `parseTool` calls it first so old and new plans parse alike.
 */
export function migrateTool(raw: Record<string, unknown>): Record<string, unknown> {
  const type = raw.type;
  if (typeof type !== "string") return raw;
  if (Object.hasOwn(RENAMED, type)) return { ...raw, type: RENAMED[type] };
  if (type === "sing") return { ...raw, type: "staff", mic: true };
  if (type === "click-drone") {
    const { click, drone, ...rest } = raw;
    return { parts: { ...(click !== false ? { click: "on" } : {}), ...(drone !== false ? { drone: "on" } : {}) }, ...rest, type: "backing-band" };
  }
  if (type === "chord-backing") {
    const out: Record<string, unknown> = { style: "ballad", parts: { drums: "on", bass: "off", keys: "on" }, ...raw, type: "backing-track" };
    delete out.backing; // its piano patterns: the style plays the keys now
    return out;
  }
  if (type === "comp") {
    const chords = Array.isArray(raw.chords) ? raw.chords.filter((c): c is string => typeof c === "string") : [];
    const beats = [2, 3, 4].includes(Number(raw.beats)) ? Number(raw.beats) : 4;
    const root = chords.map((c) => parseChordQuery(c)).find((c) => c)?.rootPc;
    const shape: Record<string, unknown> = {
      shape: "progression",
      key: keySlug(root ?? 0),
      chords,
      bars: Math.max(1, Math.ceil((chords.length * beats) / 4)),
      beatsPerChord: beats,
    };
    if (Array.isArray(raw.patterns) && raw.patterns.length) shape.backing = raw.patterns;
    return { type: "guitar-play-along", bpm: raw.bpm ?? 80, view: "neck", shape };
  }
  return raw;
}

/** The tool an older plan's link stands for (a scale page, the notes or ears game, the metronome); null for any other page. */
export function toolFromLink(link: string | undefined): PlanTool | null {
  if (!link) return null;
  const [pathPart, rest = ""] = link.split("?");
  const path = pathPart.split("#")[0].replace(/\/$/, "");
  const query = rest.split("#")[0];
  const scale = path.match(/^\/theory\/scales\/([a-z0-9-]+)\/([a-z-]+)$/);
  if (scale) {
    const key = parseKeySlug(scale[2]);
    return key !== null && (findPentatonic(scale[1]) || findModePage(scale[1])) ? { type: "scale-neck", scale: scale[1], key } : null;
  }
  if (path === "/theory/notes") return { type: "note-finder", query };
  if (path === "/theory/ears") return { type: "interval-ears", query, ...(/(^|&)wide=1/.test(query) ? { wide: true } : {}) };
  if (path === "/theory/metronome-drone") return { type: "backing-band", bpm: 80, key: 9, parts: { click: "on" } };
  return null;
}

/** An exercise's links: "Learn before" (prerequisite lessons, shown on top) and "Explore more" (going deeper, at the bottom). */
export interface LinkSlots { learnBefore: string[]; exploreMore: string[] }

/** At most this many links per slot. */
export const SLOT_MAX = 3;

/**
 * The links of a stored exercise, in today's two slots. Older plans kept them elsewhere, and those go to "Explore more":
 * a `link` section (the bottom of the exercise), or the `link` field from before sections when it didn't stand for a tool
 * (`toolFromLink`; with `tools` set it never did). A link in both slots stays in "Learn before".
 */
export function linkSlots(e: { learnBefore?: unknown; exploreMore?: unknown; sections?: unknown; tools?: unknown; link?: unknown }): LinkSlots {
  const hrefs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((h): h is string => typeof h === "string" && h !== "") : []);
  const fromSections = Array.isArray(e.sections) ? e.sections.flatMap((s) => (s?.type === "link" && typeof s.href === "string" ? [s.href] : [])) : [];
  const link = typeof e.link === "string" && e.link && !Array.isArray(e.sections) && (e.tools || !toolFromLink(e.link)) ? [e.link] : [];
  const learnBefore = [...new Set(hrefs(e.learnBefore))].slice(0, SLOT_MAX);
  const exploreMore = [...new Set([...hrefs(e.exploreMore), ...fromSections, ...link])].filter((h) => !learnBefore.includes(h)).slice(0, SLOT_MAX);
  return { learnBefore, exploreMore };
}

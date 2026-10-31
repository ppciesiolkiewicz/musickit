import { parseChordQuery } from "@/lib/chordKit/chordSearch";
import { keySlug } from "@/features/theory/keySlug";

/** Old tool names (plans pasted or stored before the learning components) to the component that replaced each. */
const RENAMED: Record<string, string> = {
  scale: "scale-neck",
  chords: "chord-shapes",
  band: "backing-band",
  notes: "note-finder",
  ears: "interval-ears",
};

/**
 * A tool as an older plan wrote it, in today's names and props; anything else is returned unchanged. `sing` becomes a
 * `staff` with the mic (its stored `notes`/`highlight` are already semitones and are read as such), `comp` a
 * `play-along` progression on the neck. Pure; `parseTool` calls it first so old and new plans parse alike.
 */
export function migrateTool(raw: Record<string, unknown>): Record<string, unknown> {
  const type = raw.type;
  if (typeof type !== "string") return raw;
  if (Object.hasOwn(RENAMED, type)) return { ...raw, type: RENAMED[type] };
  if (type === "sing") return { ...raw, type: "staff", mic: true };
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
    return { type: "play-along", bpm: raw.bpm ?? 80, view: "neck", shape };
  }
  return raw;
}

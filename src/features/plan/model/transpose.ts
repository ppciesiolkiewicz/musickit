import { parseChordQuery } from "@/lib/chordKit/chordSearch";
import { keySlug, parseKeySlug } from "@/features/theory/keySlug";
import { TONICS } from "@/features/theory/theory";
import { pcName } from "@/lib/practice/noteGame";
import type { PlanTool, Section } from "./tools";

/**
 * Moving a step to another key: the step's heading lists `keys`, the student picks one, and every tool in the step moves
 * by the same number of semitones (picked key − first key). Degrees (`enable`, `notes`, `{{3}}`) are relative to the key,
 * so they stay; keys, chord names and pitch classes move.
 */

const pc = (n: number) => ((n % 12) + 12) % 12;
/** A root as chord names write it ("Bb", "F#"), from the app's key spelling. */
const rootName = (p: number) => TONICS[pc(p)].name.replace("♭", "b").replace("♯", "#");

/** A chord name moved by `by` semitones, its suffix and slash bass kept ("Dm7" +3 → "Fm7", "G/B" +2 → "A/C#"); unreadable: as it was. */
export function transposeChord(name: string, by: number): string {
  const q = parseChordQuery(name);
  const m = /^\s*([A-Ga-g])([#b♯♭]?)(.*?)(?:\/([A-Ga-g][#b♯♭]?))?\s*$/.exec(name);
  if (!q || !m) return name;
  const root = rootName(q.rootPc + by);
  const bass = m[4] ? parseKeySlug(m[4]) : null;
  // the bass spelled the way the root leans: sharps under A, flats under B♭ or F
  return root + m[3] + (bass !== null ? `/${pcName(bass + by, root.includes("b") || root === "F").replace("♭", "b").replace("♯", "#")}` : "");
}

/** A guitar-play-along shape moved: every `key` slug, `chord` name and `chords` list, at any depth (two-scales' `a` and `b`). */
function transposeShape(v: unknown, by: number): unknown {
  if (Array.isArray(v)) return v.map((x) => transposeShape(x, by));
  if (!v || typeof v !== "object") return v;
  const out: Record<string, unknown> = {};
  for (const [k, x] of Object.entries(v)) {
    const key = k === "key" ? parseKeySlug(String(x)) : null;
    if (key !== null) out[k] = keySlug(pc(key + by));
    else if (k === "chord" && typeof x === "string") out[k] = transposeChord(x, by);
    else if (k === "chords" && Array.isArray(x)) out[k] = x.map((c) => (typeof c === "string" ? transposeChord(c, by) : transposeShape(c, by)));
    else out[k] = transposeShape(x, by);
  }
  return out;
}

/** Whether a tool has a key to move: the ones that don't (a note finder, an ear game, a run over the voice) stay as they are. */
export function canTranspose(tool: PlanTool): boolean {
  return !["note-finder", "interval-ears", "run-singer", "string-singer", "tuning-ears", "finger-pattern", "picking-drill", "legato-trill"].includes(tool.type);
}

/** A tool moved up by `by` semitones (0: the same tool). */
export function transposeTool(tool: PlanTool, by: number): PlanTool {
  const d = pc(by);
  if (!d) return tool;
  switch (tool.type) {
    case "scale-neck":
    case "position-neck":
      return { ...tool, key: pc(tool.key + d), ...(tool.add ? { add: tool.add.map((a) => pc(a + d)) } : {}) };
    case "staff":
    case "click-drone":
    case "backing-band":
    case "melody-singer":
      return { ...tool, key: pc(tool.key + d) };
    case "interval-singer":
      return { ...tool, key: pc(tool.key + d), ...(tool.keys ? { keys: tool.keys.map((k) => pc(k + d)) } : {}) };
    case "chord-backing":
      return { ...tool, chords: tool.chords.map((c) => transposeChord(c, d)), ...(tool.key !== undefined ? { key: pc(tool.key + d) } : {}) };
    case "chord-shapes":
    case "strum-along":
      return { ...tool, chords: tool.chords.map((c) => transposeChord(c, d)) };
    case "arpeggio-neck":
      return { ...tool, chord: transposeChord(tool.chord, d) };
    case "guitar-play-along":
      return { ...tool, shape: transposeShape(tool.shape, d) as typeof tool.shape };
    default:
      return tool;
  }
}

/** The sections of a step moved from its first key to `to`: its tools only (text stays; its `{{3}}` dots read the moved tools). */
export function transposeStep(sections: Section[], keys: number[], to: number): Section[] {
  const by = keys.length ? to - keys[0] : 0;
  return sections.map((s) => (s.type === "tool" ? { type: "tool", tool: transposeTool(s.tool, by) } : s));
}

/** The key a tool is written in, when it has one to compare with a step's first key. */
const writtenKey = (t: PlanTool): number | null => ("key" in t && typeof t.key === "number" ? t.key : null);

/** What's wrong with the steps that list `keys`: a tool that can't move, or a first key that isn't the one the tools are written in. */
export function keyWarnings(sections: Section[]): string[] {
  const out: string[] = [];
  sections.forEach((h, head) => {
    if (h.type !== "heading" || !h.keys) return;
    const next = sections.findIndex((s, i) => i > head && s.type === "heading");
    const tools = sections.slice(head + 1, next < 0 ? undefined : next).flatMap((s) => (s.type === "tool" ? [s.tool] : []));
    const stuck = tools.filter((t) => !canTranspose(t)).map((t) => t.type);
    if (stuck.length) out.push(`"${h.text}" lists keys, but ${[...new Set(stuck)].join(", ")} can't change key.`);
    const first = tools.map(writtenKey).find((k) => k !== null);
    if (first !== undefined && first !== h.keys[0]) out.push(`"${h.text}": its first key should be the key its tools are written in.`);
  });
  return out;
}

import { parseChordQuery } from "@/lib/chordKit/chordSearch";
import { COMP_PATTERNS, isCompPattern, type CompPattern } from "@/lib/practice/comping";
import { parseKeySlug } from "@/features/theory/keySlug";
import { findPentatonic } from "@/features/theory/pentatonics";
import { findModePage } from "@/features/theory/scales";
import { VOICES, type Voice } from "@/features/theory/singing";
import { checkLink, type CatalogueEntry } from "./catalogue";

/**
 * The one file that says what an exercise is made of. Think of it as an MCP server for the plan: every block and every
 * tool has a name, a description and an input schema; the prompt's interface section is generated from them, and the
 * pasted reply is checked against the same specs. To add a tool: its entry in `TOOLS` (schema + parse), a view in
 * ui/ExerciseTool.tsx, a test. Nothing else lists tools.
 *
 * An exercise is a linear list of sections, shown in order:
 *   heading  a small title            text  a paragraph       list  numbered steps
 *   tool     one of `TOOLS`, set up   link  an attunr page to open
 */

/* ---------------------------------------------------------------- the tools */

export type BandPart = "click" | "drone" | "drums" | "bass";
export const BAND_PARTS: BandPart[] = ["click", "drone", "drums", "bass"];

export type PlanTool =
  | { type: "scale"; scale: string; key: number; boxes?: number[]; /** notes from outside the scale the exercise plays too (pitch classes) */ add?: number[]; /** semitones above the key that stand out; the rest are dimmed */ highlight?: number[] }
  | { type: "chords"; chords: string[] }
  | { type: "sing"; scale: string; key: number; voice: Voice; /** semitones above the key: only these notes are on the staff */ notes?: number[]; highlight?: number[] }
  | { type: "band"; bpm: number; key: number; parts: BandPart[] }
  | { type: "comp"; chords: string[]; patterns: CompPattern[]; bpm: number; beats: number }
  | { type: "notes"; query: string }
  | { type: "ears"; query: string; /** intervals may span more than an octave */ wide?: boolean };

export type ToolName = PlanTool["type"];

interface ToolSpec {
  description: string;
  /** JSON Schema of the input, as in MCP's `inputSchema` (the `type` discriminator is added) */
  properties: Record<string, unknown>;
  required?: string[];
  /** the input checked: null when the tool can't be shown */
  parse(t: Record<string, unknown>): PlanTool | null;
}

const int = (v: unknown, lo: number, hi: number): number | null => {
  const n = Number(v);
  return Number.isInteger(n) && n >= lo && n <= hi ? n : null;
};
const isScale = (slug: unknown): slug is string => typeof slug === "string" && !!(findPentatonic(slug) || findModePage(slug));
const keyOf = (v: unknown): number | null => (typeof v === "string" || typeof v === "number" ? parseKeySlug(String(v)) : null);
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const chordList = (v: unknown, max: number) => list(v).filter((c): c is string => typeof c === "string" && !!parseChordQuery(c)).slice(0, max);

const DEGREE_SEMIS: Record<string, number> = { "1": 0, r: 0, b2: 1, "2": 2, b3: 3, "3": 4, "4": 5, "#4": 6, b5: 6, "5": 7, "#5": 8, b6: 8, "6": 9, bb7: 9, b7: 10, "7": 11 };
/** A scale degree as the AI writes it ("1", "b3", "♭7", "#4") in semitones above the key, null when unknown. */
export function degreeSemis(v: unknown): number | null {
  if (typeof v !== "string" && typeof v !== "number") return null;
  const s = String(v).trim().toLowerCase().replace(/♭/g, "b").replace(/♯/g, "#");
  return s in DEGREE_SEMIS ? DEGREE_SEMIS[s] : null;
}
const degrees = (v: unknown): number[] => [...new Set(list(v).map(degreeSemis).filter((n): n is number => n !== null))].sort((a, b) => a - b);
const DEGREES = { type: "array", items: { type: "string" }, maxItems: 7 };
const SCALE = { type: "string", description: "a scale slug from the scale pages: major-ionian, dorian, minor-pentatonic, minor-blues, …" };
const KEY = { type: "string", description: "a note: c, f-sharp, b-flat" };

export const TOOLS: { [N in ToolName]: ToolSpec } = {
  scale: {
    description: "A scale or pentatonic on the guitar neck, as boxes (positions). \"boxes\" (1-5) limits it to the ones the exercise is about; \"add\" puts notes from outside the scale into the boxes (a passing note, the 3rd over a 7 chord); \"highlight\" makes the notes the exercise is about stand out (chord tones: [\"1\",\"3\",\"5\",\"b7\"]) and dims the rest. Tap a note to hear it.",
    properties: { scale: SCALE, key: KEY, boxes: { type: "array", items: { type: "integer", minimum: 1, maximum: 5 } }, add: { type: "array", items: { type: "string" }, maxItems: 4, description: "notes outside the scale, e.g. [\"c#\"]" }, highlight: { ...DEGREES, description: "degrees to stand out: 1 b2 2 b3 3 4 #4 5 b6 6 b7 7" } },
    required: ["scale", "key"],
    parse(t) {
      const key = keyOf(t.key);
      if (!isScale(t.scale) || key === null) return null;
      const boxes = [...new Set(list(t.boxes).map((b) => int(b, 1, 5)).filter((b): b is number => b !== null))].sort();
      const add = [...new Set(list(t.add).map(keyOf).filter((n): n is number => n !== null))].slice(0, 4);
      const highlight = degrees(t.highlight);
      return { type: "scale", scale: t.scale, key, ...(boxes.length ? { boxes } : {}), ...(add.length ? { add } : {}), ...(highlight.length ? { highlight } : {}) };
    },
  },
  chords: {
    description: "A chord shape for each chord, in order; tap one to strum it.",
    properties: { chords: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 8, description: "A, Am, E7, Cmaj7, Dsus4, F#m" } },
    required: ["chords"],
    parse(t) {
      const chords = chordList(t.chords, 8);
      return chords.length ? { type: "chords", chords } : null;
    },
  },
  sing: {
    description: "The notes on a staff in the voice's range, with live pitch from the microphone. With \"notes\" only those degrees are shown (the chord tones of A7 over A: [\"1\",\"3\",\"5\",\"b7\"]) instead of the whole scale; \"highlight\" keeps the scale but dims all but those degrees. Use it for short, focused singing, not as a whole exercise (see the rules).",
    properties: { scale: SCALE, key: KEY, voice: { enum: Object.keys(VOICES) }, notes: { ...DEGREES, description: "show only these degrees" }, highlight: DEGREES },
    required: ["scale", "key"],
    parse(t) {
      const key = keyOf(t.key);
      if (!isScale(t.scale) || key === null) return null;
      const voice = typeof t.voice === "string" && t.voice in VOICES ? (t.voice as Voice) : "baritone";
      const notes = degrees(t.notes);
      const highlight = degrees(t.highlight);
      return { type: "sing", scale: t.scale, key, voice, ...(notes.length > 1 ? { notes } : {}), ...(highlight.length ? { highlight } : {}) };
    },
  },
  band: {
    description: "A play-along band in a key: metronome, drone, drums and bass; \"parts\" are the ones that play. Use it for anything played in time or over a drone.",
    properties: { bpm: { type: "integer", minimum: 30, maximum: 240 }, key: KEY, parts: { type: "array", items: { enum: BAND_PARTS } } },
    required: ["bpm", "key", "parts"],
    parse(t) {
      const parts = list(t.parts).filter((p): p is BandPart => BAND_PARTS.includes(p as BandPart));
      return { type: "band", bpm: int(t.bpm, 30, 240) ?? 80, key: keyOf(t.key) ?? 9, parts: parts.length ? [...new Set(parts)] : ["click"] };
    },
  },
  comp: {
    description: `A chord progression played for the student, to play along with or to hear: as arpeggios or comping. "patterns" are the ways offered (the first plays first; the student can switch): ${COMP_PATTERNS.map((p) => `${p.id} (${p.desc})`).join("; ")}. Each chord takes "beats" beats (a bar), the progression loops, and the chord shape being played is shown. Use it for "play this progression as arpeggios", comping, hearing how a progression sounds.`,
    properties: { chords: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 8 }, patterns: { type: "array", items: { enum: COMP_PATTERNS.map((p) => p.id) }, minItems: 1, maxItems: 4 }, bpm: { type: "integer", minimum: 40, maximum: 200 }, beats: { type: "integer", minimum: 2, maximum: 4, description: "beats per chord, default 4" } },
    required: ["chords", "patterns"],
    parse(t) {
      const chords = chordList(t.chords, 8);
      const patterns = [...new Set(list(t.patterns).filter(isCompPattern))].slice(0, 4);
      if (!chords.length) return null;
      return { type: "comp", chords, patterns: patterns.length ? patterns : ["arp-up"], bpm: int(t.bpm, 40, 200) ?? 80, beats: int(t.beats, 2, 4) ?? 4 };
    },
  },
  notes: {
    description: "The fretboard-notes game. mode: find (find a named note), every (all of them), name (name a lit dot).",
    properties: { mode: { enum: ["find", "every", "name"] }, strings: { type: "string", description: "from E,A,D,G,B,e as \"E,A\"" }, from: { type: "integer", minimum: 0, maximum: 12 }, to: { type: "integer", minimum: 0, maximum: 12 } },
    parse(t) {
      const q = new URLSearchParams();
      for (const k of ["mode", "strings", "from", "to"]) if (t[k] != null) q.set(k, String(t[k]));
      return { type: "notes", query: q.toString() };
    },
  },
  ears: {
    description: "Ear training: name the interval or chord quality heard. Intervals stay inside one octave; \"wide\": true also plays them an octave wider (a 9th for a 2nd) and tags the exercise multi-octave: use it only when compound intervals are the point. The steps must name the same intervals as \"set\".",
    properties: { kind: { enum: ["interval", "chord"] }, level: { type: "integer", minimum: 1, maximum: 6, description: "1: P5 and octave … 6: all twelve" }, set: { type: "array", items: { type: "integer", minimum: 1, maximum: 12 }, description: "exact intervals in semitones, replaces level: m3 3, M3 4, P4 5, P5 7, m7 10" }, dir: { enum: ["up", "down", "together"] }, wide: { type: "boolean" } },
    parse(t) {
      const q = new URLSearchParams();
      if (t.level != null) q.set("level", String(t.level));
      if (Array.isArray(t.set)) q.set("set", t.set.join(","));
      if (t.dir != null) q.set("dir", String(t.dir));
      if (t.kind != null) q.set("kind", String(t.kind));
      const wide = t.wide === true;
      if (wide) q.set("wide", "1");
      return { type: "ears", query: q.toString(), ...(wide ? { wide } : {}) };
    },
  },
};

/** One tool from the AI's JSON, checked: null when it can't be shown (unknown scale, no valid chord…). */
export function parseTool(raw: unknown): PlanTool | null {
  const t = (raw ?? {}) as Record<string, unknown>;
  const spec = typeof t.type === "string" && Object.hasOwn(TOOLS, t.type) ? TOOLS[t.type as ToolName] : null;
  return spec ? spec.parse(t) : null;
}

/* ---------------------------------------------------------------- the sections */

export type Section =
  | { type: "heading"; text: string }
  | { type: "text"; text: string }
  | { type: "list"; items: string[] }
  | { type: "tool"; tool: PlanTool }
  | { type: "link"; href: string };

const str = (v: unknown, max: number): string => (typeof v === "string" ? v.trim().slice(0, max) : "");

const STR = { type: "string" };
const SECTIONS: { type: Section["type"]; description: string; properties: Record<string, unknown>; required: string[] }[] = [
  { type: "heading", description: "A short title inside the exercise (\"Warm-up\", \"Now with the 7th\").", properties: { text: STR }, required: ["text"] },
  { type: "text", description: "A paragraph of plain instructions.", properties: { text: STR }, required: ["text"] },
  { type: "list", description: "Numbered steps the student follows.", properties: { items: { type: "array", items: STR, minItems: 1, maxItems: 8 } }, required: ["items"] },
  { type: "tool", description: "One of the tools below, shown here, in order, already set up. A tool shows what the text just before it talks about.", properties: { tool: { type: "object", description: "{\"type\": <tool name>, …input}" } }, required: ["tool"] },
  { type: "link", description: "An \"Open page\" link to an attunr page for more (see the pages). Optional; never invent one.", properties: { href: STR }, required: ["href"] },
];

/** Exercise tags the AI may set; the page shows them as chips. "multi-octave" is also added by a wide ears tool. */
export const EXERCISE_TAGS: Record<string, string> = {
  "multi-octave": "intervals or melodies that span more than an octave",
  ear: "mostly listening",
  sing: "mostly singing",
  rhythm: "mostly timing",
  technique: "mostly hands",
  theory: "mostly knowing",
  improv: "mostly making it up",
  song: "mostly a piece of music",
};

/** The tags an exercise gets: what the AI set that we know, plus the ones its tools imply. */
export function exerciseTags(raw: unknown, sections: Section[]): string[] {
  const tags = new Set(list(raw).filter((t): t is string => typeof t === "string" && Object.hasOwn(EXERCISE_TAGS, t)));
  for (const s of sections) if (s.type === "tool" && s.tool.type === "ears" && s.tool.wide) tags.add("multi-octave");
  return [...tags].slice(0, 4);
}

/** One section from the AI's JSON, checked; null when empty or not showable. `pages` are the attunr pages a link may go to. */
export function parseSection(raw: unknown, pages: CatalogueEntry[]): Section | null {
  const s = (raw ?? {}) as Record<string, unknown>;
  switch (s.type) {
    case "heading":
    case "text": {
      const text = str(s.text, s.type === "heading" ? 100 : 700);
      return text ? { type: s.type, text } : null;
    }
    case "list": {
      const items = list(s.items).map((i) => str(i, 240)).filter(Boolean).slice(0, 8);
      return items.length ? { type: "list", items } : null;
    }
    case "tool": {
      const tool = parseTool(s.tool);
      return tool ? { type: "tool", tool } : null;
    }
    case "link": {
      const href = checkLink(s.href, pages);
      return href ? { type: "link", href } : null;
    }
  }
  return null;
}

/* ---------------------------------------------------------------- what the prompt says */

const schema = (properties: Record<string, unknown>, required: string[] = []) => JSON.stringify({ type: "object", properties, ...(required.length ? { required } : {}) });

/** The blocks an exercise is made of, as the prompt lists them: name, what it is, input schema. */
export function sectionInterface(): string[] {
  return SECTIONS.map((s) => `- ${s.type} : ${s.description}\n  inputSchema: ${schema({ type: { const: s.type }, ...s.properties }, ["type", ...s.required])}`);
}

/** The tools, as an MCP server would list them: name, description, inputSchema. */
export function toolInterface(): string[] {
  return (Object.entries(TOOLS) as [ToolName, ToolSpec][]).map(([name, t]) => `- ${name} : ${t.description}\n  inputSchema: ${schema({ type: { const: name }, ...t.properties }, ["type", ...(t.required ?? [])])}`);
}

/**
 * The pages a link may go to, as resources: URI templates with their values, not one line per page. The page list
 * comes from the catalogue, so a new page or scale shows up here without touching the prompt.
 */
export function linkResources(entries: CatalogueEntry[]): string[] {
  const scales = entries.filter((e) => e.href.startsWith("/theory/scales/"));
  const course = entries.filter((e) => e.href.startsWith("/course/"));
  const pages = entries.filter((e) => !scales.includes(e) && !course.includes(e) && e.href !== "/course");
  const stages = new Map<string, { label: string; sections: string[] }>();
  for (const c of course) {
    const [, , stage, section] = c.href.split("/");
    const at = stages.get(stage) ?? { label: c.desc.replace(/^Course /, ""), sections: [] };
    at.sections.push(section);
    stages.set(stage, at);
  }
  return [
    `- pages : ${pages.map((p) => `${p.href} (${p.label.toLowerCase()})`).join(", ")}`,
    `- /theory/scales/{scale}/{key} : scale ∈ ${scales.map((s) => s.href.split("/")[3]).join(", ")}; key is a note (a, f-sharp, b-flat)`,
    ...[...stages].map(([n, s]) => `- /course/${n}/{section} : ${s.label}; section ∈ ${s.sections.join(", ")}`),
  ];
}

/* ---------------------------------------------------------------- plans from before sections */

/** The tool an older plan's link stands for (a scale page, the notes or ears game, the metronome); null for any other page. */
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

/** An exercise written before sections (how / steps / tools, each tool with its `step`) as sections: text, then each step followed by its tools. */
export function legacySections(e: { how?: string; steps?: string[]; tools?: (PlanTool & { step?: number })[]; link?: string }): Section[] {
  const out: Section[] = [];
  const linked = toolFromLink(e.link);
  const tools: (PlanTool & { step?: number })[] = e.tools ?? (linked ? [linked] : []);
  const tool = (t: PlanTool): Section => ({ type: "tool", tool: t });
  tools.filter((t) => !t.step).forEach((t) => out.push(tool(t))); // a band keeping time goes first
  if (e.how) out.push({ type: "text", text: e.how });
  if (e.steps?.length) {
    e.steps.forEach((text, i) => {
      out.push({ type: "text", text: `${i + 1}. ${text}` });
      tools.filter((t) => t.step === i + 1).forEach((t) => out.push(tool(t)));
    });
  }
  if (e.link && (e.tools || !toolFromLink(e.link))) out.push({ type: "link", href: e.link });
  return out;
}

/** What an exercise shows, in order: its sections, or, for a plan stored before sections, what its old fields stand for. */
export const sectionsOf = (e: { sections?: Section[]; how?: string; steps?: string[]; tools?: (PlanTool & { step?: number })[]; link?: string }): Section[] => e.sections ?? legacySections(e);

import { keySlug, parseKeySlug } from "@/features/theory/keySlug";
import { readRiff, writeRiff, type RiffNote } from "@/features/exercises/riffs/riff";
import { isGenre, type Genre } from "@/features/library/seed/genres";

/*
 * A riff lives in a seed block (`src/features/library/seed/blocks`), as the `riff` shape of its guitar-play-along tool. The
 * riff maker lists those blocks, opens the riff of one and writes it back into the file; the words of the block are not its.
 */

/** A seed block that holds a riff, as the riff maker lists it. */
export interface RiffBlock {
  /** the block's id: its file name */
  id: string;
  title: string;
  genre: Genre | null;
  /** the amp model the riff is heard through in the riff maker, by its name there (a `.nam` file's name); null for none */
  amp: string | null;
  /** switched off: every choice is a draft, so no plan gets the block */
  draft: boolean;
  /** the path steps its choices practise */
  steps: string[];
  /** the key note as a pitch class, C = 0 */
  tonic: number;
  /** the scale the riff maker draws on the neck, by its name there */
  scale: string;
  bpm: number;
  notes: RiffNote[];
}

/** What the riff maker writes into a block. `amp` left out keeps the block's amp; null takes it away. */
export interface RiffEdit { tonic: number; scale: string; bpm: number; notes: RiffNote[]; amp?: string | null }

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

/** Every guitar-play-along tool with a riff shape under a value, in file order. */
function riffTools(v: unknown, out: Obj[] = []): Obj[] {
  if (Array.isArray(v)) v.forEach((x) => riffTools(x, out));
  else if (isObj(v)) {
    if (v.type === "guitar-play-along" && isObj(v.shape) && v.shape.shape === "riff") out.push(v);
    else Object.values(v).forEach((x) => riffTools(x, out));
  }
  return out;
}

/** The riff of a seed block file; null when it holds none, an `error` when its riff can't be read. */
export function riffBlockOf(file: unknown): RiffBlock | { error: string } | null {
  if (!isObj(file) || !isObj(file.exercise)) return null;
  const tool = riffTools(file.exercise)[0];
  if (!tool) return null;
  const shape = tool.shape as Obj;
  const tonic = parseKeySlug(typeof shape.key === "string" ? shape.key : null);
  const read = readRiff(shape.notes);
  if (tonic === null) return { error: "its riff has no key" };
  if ("error" in read) return { error: `its riff can't be read: ${read.error}` };
  const choices = (Array.isArray(file.choices) ? file.choices : []).filter(isObj);
  return {
    id: String(file.id),
    title: String(file.exercise.title ?? file.id).replace(/(\s+#[\w-]+)+\s*$/, ""),
    genre: isGenre(file.genre) ? file.genre : null,
    amp: typeof file.amp === "string" && file.amp ? file.amp : null,
    draft: choices.length > 0 && choices.every((c) => c.draft === true),
    steps: [...new Set(choices.flatMap((c) => (Array.isArray(c.steps) ? c.steps.filter((s): s is string => typeof s === "string") : [])))],
    tonic,
    scale: typeof shape.scale === "string" ? shape.scale : "Aeolian",
    bpm: typeof tool.bpm === "number" ? tool.bpm : 80,
    notes: read.notes,
  };
}

/** What is wrong with an edit (empty when it is sound). */
export function checkEdit(e: unknown): string[] {
  if (!isObj(e)) return ["not an object"];
  const out: string[] = [];
  if (typeof e.tonic !== "number" || !Number.isInteger(e.tonic) || e.tonic < 0 || e.tonic > 11) out.push("the key is a pitch class 0-11");
  if (typeof e.scale !== "string" || !e.scale) out.push("no scale");
  if (typeof e.bpm !== "number" || !Number.isInteger(e.bpm) || e.bpm < 30 || e.bpm > 240) out.push("the tempo is a whole number 30-240");
  if (e.amp !== undefined && e.amp !== null && (typeof e.amp !== "string" || !e.amp.trim() || e.amp.length > 200)) out.push("the amp is a model's name");
  if (!Array.isArray(e.notes)) out.push("no notes");
  else {
    const read = readRiff(writeRiff(e.notes as RiffNote[]));
    if ("error" in read) out.push(read.error);
  }
  return out;
}

/** The file with its `amp` set (right after `genre`, else after `note`) or, for null, taken out; every other key in its place. */
function withAmp(file: Obj, amp: string | null): Obj {
  const out: Obj = {};
  const at = "genre" in file ? "genre" : "note";
  for (const [k, v] of Object.entries(file)) {
    if (k === "amp") continue;
    out[k] = v;
    if (k === at && amp) out.amp = amp;
  }
  if (amp && !("amp" in out)) out.amp = amp;
  return out;
}

/**
 * The block file with the riff written into it, everything else as it was: every riff tool of the block gets the key,
 * scale and notes, the first one the tempo, and a choice whose `moves` has a tempo range starts it at that tempo, the
 * range as wide as before. An edit with an `amp` sets the block's amp (null takes it out). Null when the file holds no riff.
 */
export function withRiff(file: unknown, edit: RiffEdit): Obj | null {
  const next = structuredClone(file) as Obj;
  const tools = isObj(next) && isObj(next.exercise) ? riffTools(next.exercise) : [];
  if (!tools.length) return null;
  const was = typeof tools[0].bpm === "number" ? tools[0].bpm : edit.bpm;
  for (const t of tools) t.shape = { ...(t.shape as Obj), key: keySlug(edit.tonic), scale: edit.scale, notes: writeRiff(edit.notes) };
  tools[0].bpm = edit.bpm;
  for (const c of Array.isArray(next.choices) ? next.choices : []) {
    const range = isObj(c) && isObj(c.moves) && isObj(c.moves.bpm) ? c.moves.bpm : null;
    if (!range || typeof range.from !== "number" || typeof range.to !== "number") continue;
    range.to = Math.min(240, range.to + (edit.bpm - was));
    range.from = edit.bpm;
  }
  return edit.amp === undefined ? next : withAmp(next, edit.amp?.trim() || null);
}

/** A seed block file's text on disk. */
export const blockFileText = (file: unknown): string => `${JSON.stringify(file, null, 2)}\n`;

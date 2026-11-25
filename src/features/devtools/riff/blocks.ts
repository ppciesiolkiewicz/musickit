import { keySlug, parseKeySlug } from "@/features/theory/keySlug";
import { readRiff, writeRiff, type RiffNote } from "@/features/exercises/riffs/riff";
import { isGenre, type Genre } from "@/features/library/seed/genres";
import { toolCells } from "@/features/contentVideos/model/slot";
import { TOOLS, type Cell, type PlanTool } from "@/features/plan/model/tools";

/*
 * A riff lives in a seed block (`src/features/library/seed/blocks`), as the `riff` shape of its guitar-play-along tool. The
 * riff maker lists those blocks and opens the riff of one; its Save writes the riff into the block in the database
 * (`blocks.riff_edit`), the seed keeps it over the file's (`keptRiff`) and `npm run db:pull-riffs` writes it into the file.
 * The words of the block are not the riff maker's.
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
  /** the riff tool's index among the exercise's tool cells in reading order, sections flattened (as `toolCells` counts): where the block's own video goes */
  cell: number;
  /** set when the riff shown is one saved in the app: when (ISO), who (null once the account is gone), and whether the seed file holds it yet */
  edited?: { at: string; by: string | null; inFile: boolean };
  /** the block's own video for the riff's cell, when it has one */
  video?: RiffVideo;
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
  const cell = Array.isArray(file.exercise.cells) ? toolCells(file.exercise.cells as Cell[]).indexOf(tool as never) : -1;
  if (cell < 0) return { error: "its riff isn't in a tool cell" };
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
    cell,
  };
}

/** The riffs of a list of seed block files, sorted by id. A block whose riff can't be read is left out and named in `problems`. */
export function riffsOf(blocks: unknown[]): { riffs: RiffBlock[]; problems: string[] } {
  const riffs: RiffBlock[] = [];
  const problems: string[] = [];
  for (const b of blocks) {
    const r = riffBlockOf(b);
    if (r && "error" in r) problems.push(`${isObj(b) ? String(b.id) : "a block"}: ${r.error}`);
    else if (r) riffs.push(r);
  }
  return { riffs: riffs.sort((a, b) => a.id.localeCompare(b.id)), problems: problems.sort() };
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

/**
 * The block file with a riff saved in the app over its own (`withRiff`), as the seed stores it and `db:pull-riffs`
 * writes it; null when the saved riff doesn't pass `checkEdit` or the file holds no riff.
 */
export function keptRiff<T>(file: T, edit: unknown): T | null {
  if (checkEdit(edit).length) return null;
  return withRiff(file, edit as RiffEdit) as T | null;
}

/** Whether the block file already holds a riff saved in the app (so `db:pull-riffs` has nothing to write for it). */
export function riffInFile(file: unknown, edit: unknown): boolean {
  const kept = keptRiff(file, edit);
  return kept !== null && blockFileText(kept) === blockFileText(file);
}

/** A riff block's own video, as the riff maker names it: its title, and whether the riff has changed since it was recorded. */
export interface RiffVideo { id: string; title: string; changed: boolean }

/**
 * Whether a riff has changed since its video was recorded. A video with an overlay (`content_videos.overlay`, a copy of
 * the tool as drawn over the camera) is compared by its riff's key, scale and notes; the tempo is left out, since the
 * overlay keeps its own clock. A video with none (an exported take, or one the old Take panel saved) is compared by time: changed when the riff
 * was saved in the app after the video was made.
 */
export function riffChangedSince(riff: Pick<RiffBlock, "tonic" | "scale" | "notes">, video: { overlay: unknown; createdAt: Date }, editedAt: Date | null): boolean {
  const tool = isObj(video.overlay) ? video.overlay.tool : null;
  if (isObj(tool)) {
    const was = riffBlockOf({ id: "video", exercise: { cells: [{ type: "tool", tool }] } });
    if (was && !("error" in was)) return was.tonic !== riff.tonic || was.scale !== riff.scale || JSON.stringify(writeRiff(was.notes)) !== JSON.stringify(writeRiff(riff.notes));
  }
  return editedAt !== null && editedAt.getTime() > video.createdAt.getTime();
}

/**
 * The riff in the editor as the guitar-play-along tool a block holds: what the riff maker draws over the camera and saves
 * with a take, unsaved edits included. Read as a stored plan's tool is; null when the riff can't be played (no notes).
 */
export function riffTool(edit: RiffEdit): PlanTool | null {
  const raw = { type: "guitar-play-along", shape: { shape: "riff", key: keySlug(edit.tonic), scale: edit.scale, notes: writeRiff(edit.notes) }, bpm: edit.bpm };
  return TOOLS["guitar-play-along"].parse(raw, { notes: [], stored: true });
}

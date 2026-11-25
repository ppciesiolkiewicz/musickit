import type { NeckRead } from "@/features/neckFx";
import type { Burned } from "../client/burn";
import type { Overlay } from "./overlay";

/** What a take is kept under: the block's cell it was opened from, else the tool. The ticked steps never count. A structural type, so this file needs no UI module. */
export const takeKey = (target: { tool: string; block: { id: string; cell: number } | null }): string =>
  target.block ? `${target.block.id}:${target.block.cell}` : `tool:${target.tool}`;

/** One frame Read the neck read, at `t` seconds into the take. */
export interface TakeLog { neck?: NeckRead[] }

/** A take kept in this browser (IndexedDB), one per target, until it is saved for players. */
export interface KeptTake {
  /** the take key */
  id: string;
  at: number;
  blob: Blob;
  type: string;
  seconds: number;
  width: number;
  height: number;
  /** the content video's id, given once before the first upload */
  videoId?: string;
  /** the file is in the store: the next save sends only the row */
  fileUp: boolean;
  /** the row is saved too */
  saved: boolean;
  overlay: Overlay | null;
  /** Export with overlay: the take with what was drawn over it burned in */
  burned: Burned | null;
  /** recorded to the click: seconds into the take where beat 1 fell, the tempo and the expected bars */
  click?: { downbeat: number; bpm: number; bars: number };
  log?: TakeLog;
}

const num = (x: unknown, or = 0): number => (typeof x === "number" && Number.isFinite(x) ? x : or);

function readBurned(x: unknown): Burned | null {
  if (!x || typeof x !== "object") return null;
  const b = x as Record<string, unknown>;
  if (!(b.blob instanceof Blob)) return null;
  return { blob: b.blob, type: typeof b.type === "string" ? b.type : b.blob.type, width: num(b.width), height: num(b.height), seconds: num(b.seconds) };
}

/** A stored record as a kept take: a new one, or an old riff Take panel record (`uploaded`, `withOverlay`, `downbeat`/`bpm`/`bars`). Null when it holds no video. */
export function readKeptTake(raw: unknown): KeptTake | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || !(r.blob instanceof Blob)) return null;
  const take: KeptTake = {
    id: r.id,
    at: num(r.at),
    blob: r.blob,
    type: typeof r.type === "string" ? r.type : r.blob.type,
    seconds: num(r.seconds),
    width: num(r.width),
    height: num(r.height),
    fileUp: r.fileUp === true,
    saved: r.saved === true || r.uploaded === true,
    overlay: r.overlay && typeof r.overlay === "object" ? (r.overlay as Overlay) : null,
    burned: readBurned(r.burned ?? r.withOverlay),
  };
  if (typeof r.videoId === "string") take.videoId = r.videoId;
  const click = (r.click && typeof r.click === "object" ? r.click : r) as Record<string, unknown>;
  if (typeof click.downbeat === "number" && typeof click.bpm === "number" && typeof click.bars === "number") {
    take.click = { downbeat: click.downbeat, bpm: click.bpm, bars: click.bars };
  }
  if (r.log && typeof r.log === "object") take.log = r.log as TakeLog;
  return take;
}

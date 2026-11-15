import { sha256Hex } from "@/lib/sha256";
import type { Area } from "./concepts";
import type { Cell } from "./tools";
import type { Block, Level, PlanExercise } from "./types";

/** What a block is, for its id: its content and the tags that say what it practises. Never minutes, why, links or slot ids. */
export interface BlockKey {
  content: Block;
  area?: Area;
  topic?: string;
  concepts?: string[];
  level?: Level;
  tags?: string[];
}

/** Cells without the editor's ids, sections too (the ids say nothing about what the block is). */
export function withoutCellIds(cells: Cell[]): Cell[] {
  return cells.map((c) => {
    const { id: _id, ...rest } = c as Cell & { id?: string };
    void _id;
    return (rest.type === "section" ? { ...rest, cells: withoutCellIds(rest.cells) } : rest) as Cell;
  });
}

/** JSON with object keys sorted at every depth and `undefined` properties dropped; arrays keep their order. */
export function canonicalJson(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map((x) => (x === undefined ? "null" : canonicalJson(x))).join(",")}]`;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    const parts = Object.keys(o)
      .sort()
      .filter((k) => o[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${canonicalJson(o[k])}`);
    return `{${parts.join(",")}}`;
  }
  return JSON.stringify(v) ?? "null";
}

const text = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
/** The string items of a list, sorted and de-duplicated; absent when there are none or it is not a list (a stored plan is not re-validated here). */
const words = (v: unknown): string[] | undefined => {
  if (!Array.isArray(v)) return undefined;
  const out = [...new Set(v.filter((x): x is string => typeof x === "string"))].sort();
  return out.length ? out : undefined;
};

/** The key an exercise's block id is made of. Never throws on damaged meta: only what is text counts. */
export function blockKeyOf(e: PlanExercise): BlockKey {
  const content: Block = { title: e.title, ...(e.choice ? { choice: e.choice } : {}), cells: withoutCellIds(e.cells) };
  const area = text(e.area) as Area | undefined;
  const topic = text(e.topic);
  const level = text(e.level) as Level | undefined;
  const concepts = words(e.concepts);
  const tags = words(e.tags);
  return {
    content,
    ...(area !== undefined ? { area } : {}),
    ...(topic !== undefined ? { topic } : {}),
    ...(concepts ? { concepts } : {}),
    ...(level !== undefined ? { level } : {}),
    ...(tags ? { tags } : {}),
  };
}

/** 128 bits of the key's SHA-256, lowercase hex. The browser and the server compute the same one. */
export const blockIdOf = (key: BlockKey): string => sha256Hex(canonicalJson(key)).slice(0, 32);

export const isBlockId = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{32}$/.test(v);

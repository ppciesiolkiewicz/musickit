import type { Cell } from "@/features/plan/model/tools";
import { toolCells, toolKeyOf } from "../model/slot";
import { bytewise, cellsOf, newestFirst, takeSteps, type ContentVideoRepo, type ContentVideoRow, type Lost, type Pointers } from "./repo";
import type { BlockVideos } from "./rules";

/** A block as the memory repo holds it; `videos` is written on these objects. */
export interface MemoryBlock { id: string; kind: "curated" | "hashed"; content: { cells: Cell[] }; videos?: BlockVideos | null }

const copy = (r: ContentVideoRow): ContentVideoRow => ({ ...r, steps: r.steps ? [...r.steps] : null, createdAt: new Date(r.createdAt) });

/**
 * The content videos over plain rows: the readable statement of the rules the Postgres implementation must keep. `create`
 * reads, checks and writes with no `await` in between, so two saves at once run one after the other, as the Postgres lock
 * makes them.
 */
export function memoryContentVideoRepo(blocks: MemoryBlock[]): ContentVideoRepo {
  const rows: ContentVideoRow[] = [];
  const find = (id: string) => rows.find((r) => r.id === id);

  const pointersOf = (id: string): Pointers => {
    const row = find(id);
    const cells = blocks
      .filter((b) => b.kind === "curated")
      .flatMap((b) => cellsOf(b.videos).filter(([, v]) => v === id).map(([cell]) => ({ blockId: b.id, cell })))
      .sort((a, b) => bytewise(a.blockId, b.blockId) || a.cell - b.cell);
    return { tool: row?.tool ? { tool: row.tool, steps: row.steps ? [...row.steps] : null } : null, cells };
  };

  return {
    async create(row, target) {
      if (find(row.id) || rows.some((r) => r.blobPath === row.blobPath)) return { ok: false, reason: "taken" };
      if (target.kind === "cell") {
        const block = blocks.find((b) => b.id === target.blockId && b.kind === "curated");
        if (!block) return { ok: false, reason: "no-block" };
        const cells = Array.isArray(block.content?.cells) ? block.content.cells : [];
        const there = toolCells(cells);
        if (target.cell >= there.length || toolKeyOf(there[target.cell]) !== target.tool) return { ok: false, reason: "no-cell" };
        block.videos = { ...block.videos, cells: { ...block.videos?.cells, [String(target.cell)]: row.id } };
        rows.push({ ...copy(row), tool: null, steps: null });
        return { ok: true, lost: [] };
      }
      const lost: Lost[] = [];
      for (const other of [...rows].sort((a, b) => bytewise(a.id, b.id))) {
        if (other.tool !== target.tool) continue;
        const taken = takeSteps(other, target);
        if (!taken) continue;
        other.steps = taken.steps;
        if (taken.emptied) other.tool = null;
        lost.push({ id: other.id, title: other.title, steps: taken.lost, emptied: taken.emptied });
      }
      rows.push({ ...copy(row), tool: target.tool, steps: target.steps ? [...target.steps] : null });
      return { ok: true, lost };
    },
    async retarget(id, target) {
      const r = find(id);
      if (!r) return { ok: false, reason: "no-video" };
      if (!r.madeFor.startsWith("tool:") || (target && r.madeFor !== `tool:${target.tool}`)) return { ok: false, reason: "not-tool" };
      const lost: Lost[] = [];
      if (target) {
        for (const other of [...rows].sort((a, b) => bytewise(a.id, b.id))) {
          if (other === r || other.tool !== target.tool) continue;
          const taken = takeSteps(other, target);
          if (!taken) continue;
          other.steps = taken.steps;
          if (taken.emptied) other.tool = null;
          lost.push({ id: other.id, title: other.title, steps: taken.lost, emptied: taken.emptied });
        }
      }
      r.tool = target ? target.tool : null;
      r.steps = target?.steps ? [...target.steps] : null;
      return { ok: true, row: copy(r), lost };
    },
    async get(id) {
      const r = find(id);
      return r ? copy(r) : null;
    },
    async list() {
      return rows.map(copy).sort(newestFirst);
    },
    async edit(id, to) {
      const r = find(id);
      if (!r) return null;
      r.title = to.title;
      r.note = to.note;
      return copy(r);
    },
    async pointers(id) {
      return pointersOf(id);
    },
    async remove(id) {
      const r = find(id);
      if (!r) return null;
      const pointers = pointersOf(id);
      if (pointers.tool || pointers.cells.length) return { ok: false, pointers };
      rows.splice(rows.indexOf(r), 1);
      return { ok: true, row: copy(r) };
    },
    async forLookup(blockIds, tools) {
      const own: Record<string, Record<number, string>> = {};
      for (const b of blocks) {
        if (b.kind !== "curated" || !blockIds.includes(b.id)) continue;
        const cells = cellsOf(b.videos);
        if (cells.length) own[b.id] = Object.fromEntries(cells);
      }
      const held = new Set(Object.values(own).flatMap((c) => Object.values(c)));
      return { own, rows: rows.filter((r) => (r.tool !== null && tools.includes(r.tool)) || held.has(r.id)).map(copy).sort(newestFirst) };
    },
  };
}

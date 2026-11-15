import { gridLayers, type Stage } from "@/features/stage/model/layers";
import type { Subject } from "@/features/stage/model/subject";
import { parseToolDiag, type Cell } from "@/features/plan/model/tools";
import type { Block } from "@/features/plan/model/types";

/**
 * A note is one block. This module is what the notes creator, a shared note's page and the studio's Share as a note agree on:
 * the empty note, turning a stage or a palette subject into cells, and how a note's page splits it. Pure: no React, no storage.
 */

export const EMPTY_NOTE: Block = { title: "", cells: [] };

/** A short id for a cell the editor makes. */
export const newCellId = (): string => Math.random().toString(36).slice(2, 10).padEnd(6, "0");

/** A palette subject as a note's cell: a tool, text, the headphones notice, a video; anything else (a chord box, the camera) has none. */
export function cellFromSubject(s: Subject): Cell | null {
  switch (s.kind) {
    case "tool":
      return { type: "tool", tool: s.tool };
    case "text":
      return { type: "text", text: s.text };
    case "headphones":
      return { type: "notice", notice: "headphones" };
    case "video": {
      const raw = s.video.source === "library" ? { type: "video", video: s.video.id } : { type: "video", ref: s.video };
      const tool = parseToolDiag(raw, { stored: true }).tool;
      return tool ? { type: "tool", tool } : null;
    }
    default:
      return null;
  }
}

/** The studio's stage as a note: its widgets in the grid's order, each as a cell where it has one. */
export function blockFromStage(stage: Stage): Block {
  const cells = gridLayers(stage).flatMap((l) => {
    const c = cellFromSubject(l.subject);
    return c ? [c] : [];
  });
  return { title: "", cells };
}

/** A note as its page draws it: the title, the first cell as the line under it when it is a text, and the rest as the body. */
export function notePageParts(block: Block): { title: string | null; intro: string | null; body: Block } {
  const first = block.cells[0];
  const intro = first?.type === "text" && first.text.trim() ? first.text : null;
  return { title: block.title.trim() || null, intro, body: { ...block, cells: intro === null ? block.cells : block.cells.slice(1) } };
}

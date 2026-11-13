import { gridLayers, type Stage } from "@/features/stage/model/layers";
import type { Subject } from "@/features/stage/model/subject";
import { parseBlock } from "@/features/plan/model/config";
import { parseToolDiag, type Cell } from "@/features/plan/model/tools";
import type { Block } from "@/features/plan/model/types";

/**
 * A note is one block. This module is what the notes creator, a shared link and the studio's Share as a note agree on: the
 * link codec, the empty note, and turning a stage or a palette subject into cells. Pure: no React, no storage.
 */

export const EMPTY_NOTE: Block = { title: "", cells: [] };

const toBase64Url = (bytes: Uint8Array): string => {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromBase64Url = (s: string): Uint8Array => {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

/** The block as a short URL-safe string: `b` deflated, or `c` plain JSON where the browser can't deflate. */
export async function encodeNote(block: Block): Promise<string> {
  const plain = new TextEncoder().encode(JSON.stringify(block));
  if (typeof CompressionStream === "undefined") return `c${toBase64Url(plain)}`;
  return `b${toBase64Url(await pipe(plain, new CompressionStream("deflate-raw")))}`;
}

/** A link's note: the block, `old` for a link made before notes were blocks (`z`, `j`), or an error. */
export async function decodeNote(s: string): Promise<{ block: Block } | { old: true } | { error: string }> {
  if (s[0] === "z" || s[0] === "j") return { old: true };
  try {
    const bytes = fromBase64Url(s.slice(1));
    const plain = s[0] === "b" ? await pipe(bytes, new DecompressionStream("deflate-raw")) : s[0] === "c" ? bytes : null;
    if (!plain) return { error: "not a note" };
    return { block: parseBlock(JSON.parse(new TextDecoder().decode(plain)), { draft: true }).block };
  } catch {
    return { error: "the link is broken" };
  }
}

/** The note in a URL hash (`#note=…`), or null. */
export function noteFromHash(hash: string): string | null {
  const m = /^#note=(.+)$/.exec(hash);
  return m ? m[1] : null;
}

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

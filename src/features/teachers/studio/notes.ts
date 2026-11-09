import { sanitiseStage, type Stage, type Subject } from "@/features/stage";

/** Widgets a note cannot hold: they need the camera, the screen or the microphone, which a shared link cannot carry. */
const LIVE = new Set<Subject["kind"]>(["camera", "screen", "mic", "tuner"]);
export const isLive = (s: Subject): boolean => LIVE.has(s.kind);

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

/** The stage as a short URL-safe string: its layers and key (no selection, no live widgets), deflated when the browser can. */
export async function encodeNote(stage: Stage): Promise<string> {
  const plain = new TextEncoder().encode(JSON.stringify({ layers: stage.layers.filter((l) => !isLive(l.subject)), key: stage.key, layout: stage.layout, order: stage.order }));
  if (typeof CompressionStream === "undefined") return `j${toBase64Url(plain)}`;
  return `z${toBase64Url(await pipe(plain, new CompressionStream("deflate-raw")))}`;
}

/** The stage in a note string, or null when it is not one. Sanitised like a saved stage, and without live widgets. */
export async function decodeNote(note: string, pluginIds: string[]): Promise<Stage | null> {
  try {
    const bytes = fromBase64Url(note.slice(1));
    const plain = note[0] === "z" ? await pipe(bytes, new DecompressionStream("deflate-raw")) : note[0] === "j" ? bytes : null;
    if (!plain) return null;
    const stage = sanitiseStage(JSON.parse(new TextDecoder().decode(plain)), pluginIds);
    return { ...stage, layers: stage.layers.filter((l) => !isLive(l.subject)) };
  } catch {
    return null;
  }
}

/** The note in a URL hash (`#note=…`), or null. */
export function noteFromHash(hash: string): string | null {
  const m = /^#note=([A-Za-z0-9_-]+)$/.exec(hash);
  return m ? m[1] : null;
}

import { EMPTY_STAGE, gridLayers, sanitiseStage, type Stage, type Subject } from "@/features/stage";

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

/** The notes creator has one layout: the grid with One per row on. Every stage it opens or loads (saved, shared, typed as JSON) is put on it. */
export const notesStart = (saved: Stage): Stage => ({ ...saved, layout: "grid", gridAuto: true });

/** The stage as a short URL-safe string: its layers and key (no selection, no live widgets), deflated when the browser can. */
export async function encodeNote(stage: Stage): Promise<string> {
  const plain = new TextEncoder().encode(JSON.stringify({ layers: stage.layers.filter((l) => !isLive(l.subject)), key: stage.key, layout: stage.layout, order: stage.order, gridAuto: stage.gridAuto }));
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

/** A stage of widgets in reading order, laid out as the notes creator does with One per row on. Their ids are `w1`, `w2`…; on the grid a widget's `rect` is not read. */
export function noteOf(subjects: Subject[], key: Stage["key"]): Stage {
  const layers = subjects.map((subject, z) => ({ id: `w${z + 1}`, subject, rect: { x: 0.1, y: 0.1, w: 0.8, h: 0.8 }, visible: true, z }));
  return { ...EMPTY_STAGE, layers, key, layout: "grid", order: layers.map((l) => l.id), gridAuto: true };
}

/**
 * The note as text to read and change in one piece (the notes creator's **Edit as JSON**): its key and its widgets in page order, each
 * the widget's subject as it is saved. What a program driving the page writes instead of dragging: no ids, places or sizes.
 */
export const noteText = (stage: Stage): string => JSON.stringify({ key: stage.key, widgets: gridLayers(stage).filter((l) => !isLive(l.subject)).map((l) => l.subject) }, null, 2);

/**
 * The stage a note's text describes, sanitised like a saved one, and the widgets that could not be read (`left`: "3 (kind chord)",
 * counted from 1); or what is wrong with the text as a whole.
 */
export function readNoteText(text: string, pluginIds: string[]): { stage: Stage; left: string[] } | { error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { error: `Not JSON: ${e instanceof Error ? e.message : "it could not be read"}` };
  }
  const o = typeof raw === "object" && raw !== null && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
  if (!o || !Array.isArray(o.widgets)) return { error: 'It needs a "widgets" list: { "key": …, "widgets": [ … ] }' };
  const widgets = o.widgets as unknown[];
  const made = noteOf(widgets as Subject[], EMPTY_STAGE.key);
  const stage = sanitiseStage({ ...made, key: o.key }, pluginIds);
  const kept = stage.layers.filter((l) => !isLive(l.subject));
  const left = made.layers.flatMap((l, i) => {
    if (kept.some((k) => k.id === l.id)) return [];
    const w = widgets[i];
    const kind = typeof w === "object" && w !== null && typeof (w as { kind?: unknown }).kind === "string" ? (w as { kind: string }).kind : "?";
    return [`${i + 1} (kind ${kind})`];
  });
  return { stage: { ...stage, layers: kept, order: (stage.order ?? []).filter((id) => kept.some((k) => k.id === id)) }, left };
}

/**
 * A note's header, when its opening text starts with a `# ` title: the title, the paragraph straight after it (the line about the
 * note, if there is one) and the note without them, for a page that draws them as its own header (a preset's page). A note that opens
 * with anything else has no header and its `body` is the note as it was.
 */
export function noteHeader(stage: Stage): { title: string | null; intro: string | null; body: Stage } {
  const first = gridLayers(stage)[0];
  const lines = first?.subject.kind === "text" ? first.subject.text.split("\n") : [];
  const title = /^#\s+(\S.*)$/.exec(lines[0]?.trimEnd() ?? "")?.[1].trim() ?? null;
  if (!first || title === null) return { title: null, intro: null, body: stage };
  let at = 1;
  const skipBlank = () => { while (at < lines.length && !lines[at].trim()) at++; };
  skipBlank();
  const para: string[] = [];
  // a heading there starts the note's body: only a plain paragraph is the header's line
  if (at < lines.length && !/^#{1,3}\s+\S/.test(lines[at])) while (at < lines.length && lines[at].trim()) para.push(lines[at++].trim());
  skipBlank();
  const text = lines.slice(at).join("\n");
  return { title, intro: para.length ? para.join(" ") : null, body: { ...stage, layers: stage.layers.map((l) => (l.id === first.id ? { ...l, subject: { kind: "text", text } } : l)) } };
}

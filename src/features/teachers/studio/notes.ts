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

/** How the notes creator opens without a shared note: an empty grid starts with One per row on. A stage with widgets, or on Free, stays as it was left. */
export const notesStart = (saved: Stage): Stage => (saved.layers.length === 0 && saved.layout === "grid" ? { ...saved, gridAuto: true } : saved);

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

/** The note without its opening `# ` title, for a page whose own header shows it (a preset's page). A note that opens with anything else is as it was. */
export function withoutTitle(stage: Stage): Stage {
  const first = gridLayers(stage)[0];
  if (first?.subject.kind !== "text" || !/^#\s+\S/.test(first.subject.text)) return stage;
  const text = first.subject.text.replace(/^#\s+.*\n*/, "");
  return { ...stage, layers: stage.layers.map((l) => (l.id === first.id ? { ...l, subject: { kind: "text", text } } : l)) };
}

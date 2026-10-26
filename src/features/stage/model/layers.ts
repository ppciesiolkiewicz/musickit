/**
 * The stage's layers: what is in the 16:9 frame, where, and in what paint order. Rectangles are fractions of the frame (0..1),
 * never pixels, so the same data renders at any size and can be recorded and replayed. Pure: no React, no DOM, no ids made here.
 */
import { EMPTY_KEY, sanitiseKey, type KeyChoice } from "@/features/creator/model/key";
import { sanitiseSubject, withMaster, type Subject } from "./subject";

export interface FrameRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * A zoom into a layer's content: `zoom` (1 = all of it) and the content point shown in the middle (`cx`, `cy`, fractions of the
 * content). The layer's rect does not change; only what it shows.
 */
export interface View {
  zoom: number;
  cx: number;
  cy: number;
}

export const DEFAULT_VIEW: View = { zoom: 1, cx: 0.5, cy: 0.5 };
export const MAX_ZOOM = 6;

export interface Layer {
  id: string;
  subject: Subject;
  rect: FrameRect;
  visible: boolean;
  /** missing = not zoomed */
  view?: View;
  /** where a widget made to fill the frame goes back to; missing = not filling it */
  restore?: FrameRect;
  /** paint order: a higher z is drawn over a lower one. The stage keeps them 0..n-1 */
  z: number;
  /** pinned: drawn over every widget that is not, and the microphone lights the notes it hears on it; missing = not pinned */
  onTop?: true;
}

/** Array order is the Layers list order (the order they were added), never changed by painting; `z` is paint order. `key` is the Key widget's choice. */
export interface Stage {
  layers: Layer[];
  selected: string | null;
  key: KeyChoice;
}

export const EMPTY_STAGE: Stage = { layers: [], selected: null, key: EMPTY_KEY };

/** The layers bottom to top, as they are painted. */
export const paintOrder = (layers: Layer[]): Layer[] => [...layers].sort((a, b) => a.z - b.z);

/** The z a layer is drawn at among `count` layers: a pinned layer sits over every layer that is not, in its own z order. */
export const drawZ = (l: Layer, count: number): number => l.z + (l.onTop ? count : 0);

/** Give the layers the paint order `bottomUp` (their ids, bottom first), keeping the list order. */
function restack(layers: Layer[], bottomUp: Layer[]): Layer[] {
  const z = new Map(bottomUp.map((l, i) => [l.id, i]));
  return layers.map((l) => (z.get(l.id) === l.z ? l : { ...l, z: z.get(l.id) ?? l.z }));
}

/** smallest widget, as a fraction of the frame's width and height */
export const MIN_SIZE = 0.08;
/** at least this much of a widget stays inside the frame, so it can always be grabbed back */
export const KEEP_IN = 0.04;
/** each new widget lands this far below and right of one already in its spot */
const OFFSET = 0.03;

export const FULL: FrameRect = { x: 0, y: 0, w: 1, h: 1 };
/** the camera's corner preset: portrait, bottom right */
export const CAMERA_CORNER: FrameRect = { x: 0.78, y: 0.52, w: 0.2, h: 0.45 };
/** the screen share's minimized place: bottom left, clear of the camera's corner */
export const SCREEN_CORNER: FrameRect = { x: 0.02, y: 0.52, w: 0.4, h: 0.45 };

const SINGLE = new Set<Subject["kind"]>(["camera", "screen", "key", "tuner", "mic", "logo", "url"]);

/** The brand marks sit in the top-right corner, the logo over the site address, and never move: they can only be shown or hidden. */
const FIXED: Partial<Record<Subject["kind"], FrameRect>> = {
  logo: { x: 0.83, y: 0.03, w: 0.15, h: 0.1 },
  url: { x: 0.8, y: 0.135, w: 0.18, h: 0.06 },
};

/** The fixed place of a brand mark, or null for a widget that can be moved. */
export const fixedRect = (s: Subject): FrameRect | null => FIXED[s.kind] ?? null;

export function clampRect(r: FrameRect): FrameRect {
  const w = Math.min(1, Math.max(MIN_SIZE, r.w));
  const h = Math.min(1, Math.max(MIN_SIZE, r.h));
  const x = Math.min(1 - KEEP_IN, Math.max(KEEP_IN - w, r.x));
  const y = Math.min(1 - KEEP_IN, Math.max(KEEP_IN - h, r.y));
  return { x, y, w, h };
}

export type Corner = "nw" | "ne" | "sw" | "se";

/** Drag one corner by (dx, dy); the opposite corner stays put, and the widget never gets smaller than MIN_SIZE (it does not flip). */
export function resizeFrom(r: FrameRect, corner: Corner, dx: number, dy: number): FrameRect {
  const left = corner === "nw" || corner === "sw";
  const top = corner === "nw" || corner === "ne";
  const w = Math.max(MIN_SIZE, r.w + (left ? -dx : dx));
  const h = Math.max(MIN_SIZE, r.h + (top ? -dy : dy));
  return clampRect({ x: left ? r.x + r.w - w : r.x, y: top ? r.y + r.h - h : r.y, w, h });
}

/** the frame's width over its height */
export const FRAME_ASPECT = 16 / 9;

/**
 * A size `w` wide (a fraction of the frame) with the shape of content `aspect` (its width over its height, in pixels),
 * made bigger to MIN_SIZE or smaller to fit the frame, keeping the shape.
 */
function shapedSize(w: number, aspect: number): { w: number; h: number } {
  const ratio = aspect / FRAME_ASPECT; // w / h in frame fractions
  let h = w / ratio;
  const grow = Math.max(1, MIN_SIZE / w, MIN_SIZE / h);
  w *= grow;
  h *= grow;
  const shrink = Math.max(1, w, h);
  return { w: w / shrink, h: h / shrink };
}

/** The rect with the shape of its content (`aspect`, width over height in pixels): as wide as it was where it fits, top-left corner in place. */
export function withAspect(r: FrameRect, aspect: number): FrameRect {
  return clampRect({ x: r.x, y: r.y, ...shapedSize(r.w, aspect) });
}

/** Whether a rect already has the content's shape (to within half a percent). */
export const hasAspect = (r: FrameRect, aspect: number): boolean => Math.abs((r.w * FRAME_ASPECT) / r.h / aspect - 1) < 0.005;

/** Like `resizeFrom`, but the widget keeps its content's shape: whichever way the corner moved more decides the size. */
export function resizeKeepingShape(r: FrameRect, corner: Corner, dx: number, dy: number, aspect: number): FrameRect {
  const free = resizeFrom(r, corner, dx, dy);
  const sw = free.w / r.w, sh = free.h / r.h;
  const { w, h } = shapedSize(r.w * (Math.abs(sw - 1) >= Math.abs(sh - 1) ? sw : sh), aspect);
  const left = corner === "nw" || corner === "sw";
  const top = corner === "nw" || corner === "ne";
  return clampRect({ x: left ? r.x + r.w - w : r.x, y: top ? r.y + r.h - h : r.y, w, h });
}

/** The biggest rect of the content's shape that fits the frame, centred; the whole frame when the shape is not known. */
export function fillRect(aspect: number | null): FrameRect {
  if (aspect === null) return FULL;
  const { w, h } = shapedSize(1, aspect);
  return { x: (1 - w) / 2, y: (1 - h) / 2, w, h };
}

export function clampView(v: View): View {
  const zoom = Math.min(MAX_ZOOM, Math.max(1, v.zoom));
  const half = 0.5 / zoom;
  return { zoom, cx: Math.min(1 - half, Math.max(half, v.cx)), cy: Math.min(1 - half, Math.max(half, v.cy)) };
}

/** Zoom by `factor` around the pointer at (px, py), fractions of the layer: the content under the pointer stays under it. */
export function zoomAt(v: View, factor: number, px: number, py: number): View {
  const zoom = Math.min(MAX_ZOOM, Math.max(1, v.zoom * factor));
  const ux = v.cx + (px - 0.5) / v.zoom, uy = v.cy + (py - 0.5) / v.zoom;
  return clampView({ zoom, cx: ux - (px - 0.5) / zoom, cy: uy - (py - 0.5) / zoom });
}

/** Move a zoomed view by (dx, dy), fractions of the content; it stops at the content's edges. */
export const panView = (v: View, dx: number, dy: number): View => clampView({ ...v, cx: v.cx + dx, cy: v.cy + dy });

function baseRect(s: Subject): FrameRect {
  switch (s.kind) {
    case "chord":
      return { x: 0.05, y: 0.08, w: 0.22, h: 0.42 };
    case "plugin":
    case "position":
      return { x: 0.05, y: 0.08, w: 0.5, h: 0.42 };
    case "band":
      return { x: 0.02, y: 0.66, w: 0.34, h: 0.3 };
    case "section":
    case "bubble":
      return { x: 0.05, y: 0.08, w: 0.5, h: 0.5 };
    case "neck":
    case "caged":
      return { x: 0.05, y: 0.08, w: 0.7, h: 0.42 };
    case "key":
      return { x: 0.02, y: 0.02, w: 0.42, h: 0.16 };
    case "tuner":
      return { x: 0.48, y: 0.03, w: 0.3, h: 0.42 };
    case "mic":
      return { x: 0.48, y: 0.5, w: 0.3, h: 0.36 };
    case "logo":
    case "url":
      return fixedRect(s)!;
    case "camera":
      return CAMERA_CORNER;
    case "screen":
      return FULL;
  }
}

/** Where a new widget goes: its kind's spot, moved down and right past any widget already sitting exactly there. */
export function defaultRect(s: Subject, existing: Layer[]): FrameRect {
  let r = baseRect(s);
  if (s.kind === "camera" || s.kind === "screen" || fixedRect(s)) return r;
  const taken = (c: FrameRect) => existing.some((l) => Math.abs(l.rect.x - c.x) < 1e-6 && Math.abs(l.rect.y - c.y) < 1e-6);
  for (let i = 0; i < 20 && taken(r); i++) r = { ...r, x: r.x + OFFSET, y: r.y + OFFSET };
  return clampRect(r);
}

export type StageAction =
  | { type: "add"; layer: Layer }
  | { type: "addSubject"; id: string; subject: Subject }
  | { type: "remove"; id: string }
  | { type: "move"; id: string; dx: number; dy: number }
  | { type: "resize"; id: string; dw: number; dh: number }
  | { type: "setRect"; id: string; rect: FrameRect }
  | { type: "setView"; id: string; view: View }
  /** fill the frame (keeping the content's shape, when known), or go back to where it was */
  | { type: "toggleFill"; id: string; aspect: number | null }
  | { type: "swap"; id: string; subject: Subject }
  | { type: "toggle"; id: string }
  /** pin a widget over the others (and to the microphone), or let it go */
  | { type: "togglePin"; id: string }
  | { type: "raise"; id: string }
  | { type: "lower"; id: string }
  | { type: "select"; id: string | null }
  | { type: "clear" }
  | { type: "setStageKey"; key: KeyChoice };

const edit = (s: Stage, id: string, f: (l: Layer) => Layer): Stage => ({ ...s, layers: s.layers.map((l) => (l.id === id ? f(l) : l)) });
/** the same, but a fixed brand mark keeps its place, size and zoom */
const place = (s: Stage, id: string, f: (l: Layer) => Layer): Stage => edit(s, id, (l) => (fixedRect(l.subject) ? l : f(l)));
/** a layer moved or resized by hand: a filling widget stays where it is put, with no place to go back to */
const unfill = (l: Layer): Layer => {
  const { restore, ...rest } = l;
  return restore ? rest : l;
};

export function stageReducer(s: Stage, a: StageAction): Stage {
  switch (a.type) {
    case "add":
      return s.layers.some((l) => l.id === a.layer.id) ? s : { ...s, layers: [...s.layers, { ...a.layer, rect: clampRect(a.layer.rect), z: s.layers.length }] };
    case "addSubject":
      return addSubject(s, a.id, a.subject);
    case "remove": {
      const rest = s.layers.filter((l) => l.id !== a.id);
      return { ...s, layers: restack(rest, paintOrder(rest)), selected: s.selected === a.id ? null : s.selected };
    }
    case "move":
      return place(s, a.id, (l) => ({ ...unfill(l), rect: clampRect({ ...l.rect, x: l.rect.x + a.dx, y: l.rect.y + a.dy }) }));
    case "resize":
      return place(s, a.id, (l) => ({ ...unfill(l), rect: clampRect({ ...l.rect, w: l.rect.w + a.dw, h: l.rect.h + a.dh }) }));
    case "setRect":
      return place(s, a.id, (l) => ({ ...unfill(l), rect: clampRect(a.rect) }));
    case "setView":
      return place(s, a.id, (l) => ({ ...l, view: clampView(a.view) }));
    case "toggleFill":
      return place(s, a.id, ({ restore, ...l }) => (restore ? { ...l, rect: restore } : { ...l, rect: fillRect(a.aspect), restore: l.rect }));
    case "swap":
      return edit(s, a.id, (l) => ({ ...l, subject: a.subject }));
    case "toggle":
      return edit(s, a.id, (l) => ({ ...l, visible: !l.visible }));
    case "togglePin":
      return edit(s, a.id, ({ onTop, ...l }) => (onTop ? l : { ...l, onTop: true }));
    case "raise": {
      const bottomUp = paintOrder(s.layers);
      const l = bottomUp.find((x) => x.id === a.id);
      return l ? { ...s, layers: restack(s.layers, [...bottomUp.filter((x) => x.id !== a.id), l]) } : s;
    }
    case "lower": {
      const bottomUp = paintOrder(s.layers);
      const i = bottomUp.findIndex((x) => x.id === a.id);
      if (i <= 0) return s;
      [bottomUp[i - 1], bottomUp[i]] = [bottomUp[i], bottomUp[i - 1]];
      return { ...s, layers: restack(s.layers, bottomUp) };
    }
    case "select": {
      if (a.id === null) return { ...s, selected: null };
      const l = s.layers.find((x) => x.id === a.id);
      if (!l) return s;
      // a selected widget comes to the top (its z, never its place in the list); the camera and screen share keep theirs under the widgets
      const raise = l.z < s.layers.length - 1 && l.subject.kind !== "camera" && l.subject.kind !== "screen";
      return { ...s, selected: a.id, layers: raise ? stageReducer(s, { type: "raise", id: a.id }).layers : s.layers };
    }
    case "clear":
      return { ...s, layers: [], selected: null };
    case "setStageKey":
      // the master Key & scale: every widget follows it, except the parts of its key pinned on the widget
      return { ...s, key: a.key, layers: s.layers.map((l) => ({ ...l, subject: withMaster(l.subject, a.key) })) };
  }
}

/**
 * Add a widget for a subject and select it. A camera, screen, Key & scale, tuner, microphone, logo or url widget that already exists is selected instead of doubled.
 * The screen goes to the bottom, the camera just above the screen; widgets always sit above both.
 */
export function addSubject(s: Stage, id: string, subject: Subject): Stage {
  if (SINGLE.has(subject.kind)) {
    const existing = s.layers.find((l) => l.subject.kind === subject.kind);
    if (existing) return { ...s, selected: existing.id };
  }
  const layer: Layer = { id, subject, rect: defaultRect(subject, s.layers), visible: true, z: s.layers.length };
  const below = paintOrder(s.layers);
  let bottomUp: Layer[];
  if (subject.kind === "screen") bottomUp = [layer, ...below];
  else if (subject.kind === "camera") {
    const at = below.findIndex((l) => l.subject.kind === "screen") + 1;
    bottomUp = [...below.slice(0, at), layer, ...below.slice(at)];
  } else bottomUp = [...below, layer];
  const layers = [...s.layers, layer];
  return { ...s, layers: restack(layers, bottomUp), selected: id };
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** A saved stage, or the empty stage. Bad layers are dropped one by one; rects come back inside the frame. */
export function sanitiseStage(raw: unknown, pluginIds: string[]): Stage {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return EMPTY_STAGE;
  const o = raw as Record<string, unknown>;
  const layers: Layer[] = [];
  for (const item of Array.isArray(o.layers) ? o.layers : []) {
    if (typeof item !== "object" || item === null) continue;
    const l = item as Record<string, unknown>;
    if (typeof l.id !== "string" || !l.id || layers.some((x) => x.id === l.id)) continue;
    const subject = sanitiseSubject(l.subject, pluginIds);
    if (!subject || (SINGLE.has(subject.kind) && layers.some((x) => x.subject.kind === subject.kind))) continue;
    const r = typeof l.rect === "object" && l.rect !== null ? (l.rect as Record<string, unknown>) : {};
    const [x, y, w, h] = [num(r.x), num(r.y), num(r.w), num(r.h)];
    if (x === null || y === null || w === null || h === null) continue;
    const v = typeof l.view === "object" && l.view !== null ? (l.view as Record<string, unknown>) : null;
    const [zoom, cx, cy] = v ? [num(v.zoom), num(v.cx), num(v.cy)] : [null, null, null];
    const view = zoom !== null && cx !== null && cy !== null ? clampView({ zoom, cx, cy }) : undefined;
    // a brand mark saved somewhere else (before they were fixed) goes back to its corner
    const fixed = fixedRect(subject);
    const back = typeof l.restore === "object" && l.restore !== null ? (l.restore as Record<string, unknown>) : null;
    const [bx, by, bw, bh] = back ? [num(back.x), num(back.y), num(back.w), num(back.h)] : [null, null, null, null];
    const restore = !fixed && bx !== null && by !== null && bw !== null && bh !== null ? clampRect({ x: bx, y: by, w: bw, h: bh }) : undefined;
    // a stage saved before z painted in list order
    const z = num(l.z) ?? layers.length;
    layers.push({ id: l.id, subject, rect: fixed ?? clampRect({ x, y, w, h }), visible: l.visible !== false, z, ...(view && !fixed ? { view } : {}), ...(restore ? { restore } : {}), ...(l.onTop === true ? { onTop: true as const } : {}) });
  }
  layers.splice(0, layers.length, ...restack(layers, paintOrder(layers)));
  const selected = typeof o.selected === "string" && layers.some((l) => l.id === o.selected) ? o.selected : null;
  return { layers, selected, key: typeof o.key === "object" && o.key !== null ? sanitiseKey(o.key) : EMPTY_KEY };
}

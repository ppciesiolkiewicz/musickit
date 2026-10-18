/**
 * The stage's layers: what is in the 16:9 frame, where, and in what paint order. Rectangles are fractions of the frame (0..1),
 * never pixels, so the same data renders at any size and can be recorded and replayed. Pure: no React, no DOM, no ids made here.
 */
import { EMPTY_KEY, sanitiseKey, type KeyChoice } from "@/features/creator/model/key";
import { sanitiseSubject, withKey, type Subject } from "./subject";

export interface FrameRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Layer {
  id: string;
  subject: Subject;
  rect: FrameRect;
  visible: boolean;
}

/** Array order is paint order: the last layer is on top. `key` is the Key widget's choice. */
export interface Stage {
  layers: Layer[];
  selected: string | null;
  key: KeyChoice;
}

export const EMPTY_STAGE: Stage = { layers: [], selected: null, key: EMPTY_KEY };

/** smallest widget, as a fraction of the frame's width and height */
export const MIN_SIZE = 0.08;
/** at least this much of a widget stays inside the frame, so it can always be grabbed back */
export const KEEP_IN = 0.04;
/** each new widget lands this far below and right of one already in its spot */
const OFFSET = 0.03;

export const FULL: FrameRect = { x: 0, y: 0, w: 1, h: 1 };
/** the camera's corner preset: portrait, bottom right */
export const CAMERA_CORNER: FrameRect = { x: 0.78, y: 0.52, w: 0.2, h: 0.45 };

const SINGLE = new Set<Subject["kind"]>(["camera", "screen", "key"]);

export function clampRect(r: FrameRect): FrameRect {
  const w = Math.min(1, Math.max(MIN_SIZE, r.w));
  const h = Math.min(1, Math.max(MIN_SIZE, r.h));
  const x = Math.min(1 - KEEP_IN, Math.max(KEEP_IN - w, r.x));
  const y = Math.min(1 - KEEP_IN, Math.max(KEEP_IN - h, r.y));
  return { x, y, w, h };
}

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
      return { x: 0.05, y: 0.08, w: 0.5, h: 0.5 };
    case "key":
      return { x: 0.02, y: 0.02, w: 0.3, h: 0.12 };
    case "camera":
      return CAMERA_CORNER;
    case "screen":
      return FULL;
  }
}

/** Where a new widget goes: its kind's spot, moved down and right past any widget already sitting exactly there. */
export function defaultRect(s: Subject, existing: Layer[]): FrameRect {
  let r = baseRect(s);
  if (s.kind === "camera" || s.kind === "screen") return r;
  const taken = (c: FrameRect) => existing.some((l) => Math.abs(l.rect.x - c.x) < 1e-6 && Math.abs(l.rect.y - c.y) < 1e-6);
  for (let i = 0; i < 20 && taken(r); i++) r = { ...r, x: r.x + OFFSET, y: r.y + OFFSET };
  return clampRect(r);
}

export type StageAction =
  | { type: "add"; layer: Layer }
  | { type: "remove"; id: string }
  | { type: "move"; id: string; dx: number; dy: number }
  | { type: "resize"; id: string; dw: number; dh: number }
  | { type: "setRect"; id: string; rect: FrameRect }
  | { type: "swap"; id: string; subject: Subject }
  | { type: "toggle"; id: string }
  | { type: "raise"; id: string }
  | { type: "lower"; id: string }
  | { type: "select"; id: string | null }
  | { type: "clear" }
  | { type: "setStageKey"; key: KeyChoice };

const edit = (s: Stage, id: string, f: (l: Layer) => Layer): Stage => ({ ...s, layers: s.layers.map((l) => (l.id === id ? f(l) : l)) });

export function stageReducer(s: Stage, a: StageAction): Stage {
  switch (a.type) {
    case "add":
      return s.layers.some((l) => l.id === a.layer.id) ? s : { ...s, layers: [...s.layers, { ...a.layer, rect: clampRect(a.layer.rect) }] };
    case "remove":
      return { ...s, layers: s.layers.filter((l) => l.id !== a.id), selected: s.selected === a.id ? null : s.selected };
    case "move":
      return edit(s, a.id, (l) => ({ ...l, rect: clampRect({ ...l.rect, x: l.rect.x + a.dx, y: l.rect.y + a.dy }) }));
    case "resize":
      return edit(s, a.id, (l) => ({ ...l, rect: clampRect({ ...l.rect, w: l.rect.w + a.dw, h: l.rect.h + a.dh }) }));
    case "setRect":
      return edit(s, a.id, (l) => ({ ...l, rect: clampRect(a.rect) }));
    case "swap":
      return edit(s, a.id, (l) => ({ ...l, subject: a.subject }));
    case "toggle":
      return edit(s, a.id, (l) => ({ ...l, visible: !l.visible }));
    case "raise": {
      const l = s.layers.find((x) => x.id === a.id);
      return l ? { ...s, layers: [...s.layers.filter((x) => x.id !== a.id), l] } : s;
    }
    case "lower": {
      const i = s.layers.findIndex((x) => x.id === a.id);
      if (i <= 0) return s;
      const layers = [...s.layers];
      [layers[i - 1], layers[i]] = [layers[i], layers[i - 1]];
      return { ...s, layers };
    }
    case "select":
      return { ...s, selected: a.id === null || s.layers.some((l) => l.id === a.id) ? a.id : s.selected };
    case "clear":
      return { ...s, layers: [], selected: null };
    case "setStageKey":
      return { ...s, key: a.key, layers: s.layers.map((l) => ({ ...l, subject: withKey(l.subject, a.key) })) };
  }
}

/**
 * Add a widget for a subject and select it. A camera, screen or Key widget that already exists is selected instead of doubled.
 * The screen goes to the bottom, the camera just above the screen; widgets always sit above both.
 */
export function addSubject(s: Stage, id: string, subject: Subject): Stage {
  if (SINGLE.has(subject.kind)) {
    const existing = s.layers.find((l) => l.subject.kind === subject.kind);
    if (existing) return { ...s, selected: existing.id };
  }
  const layer: Layer = { id, subject, rect: defaultRect(subject, s.layers), visible: true };
  let layers: Layer[];
  if (subject.kind === "screen") layers = [layer, ...s.layers];
  else if (subject.kind === "camera") {
    const at = s.layers.findIndex((l) => l.subject.kind === "screen") + 1;
    layers = [...s.layers.slice(0, at), layer, ...s.layers.slice(at)];
  } else layers = [...s.layers, layer];
  return { ...s, layers, selected: id };
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
    layers.push({ id: l.id, subject, rect: clampRect({ x, y, w, h }), visible: l.visible !== false });
  }
  const selected = typeof o.selected === "string" && layers.some((l) => l.id === o.selected) ? o.selected : null;
  return { layers, selected, key: typeof o.key === "object" && o.key !== null ? sanitiseKey(o.key) : EMPTY_KEY };
}

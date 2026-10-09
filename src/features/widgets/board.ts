/**
 * Widget layout maths: each widget is a rectangle on a board that it can never leave. Pure functions, no DOM, no ids of any one app.
 * The view is WidgetBoard.tsx. Used by the looper (Mixer and Looping) and the creator (theory plugins).
 */
export interface WidgetRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Bounds {
  w: number;
  h: number;
}

export type Layout = Record<string, WidgetRect>;
/** Where widgets start when nothing is saved. */
export type DefaultLayout = (ids: string[], b: Bounds) => Layout;

export const WIDGET_MIN = { w: 260, h: 140 };

const round = (n: number) => Math.round(n);

/** Keep a rectangle inside the board: at least the minimum size (if the board allows), at most the board's size, fully inside. */
export function clampWidget(r: WidgetRect, b: Bounds, min = WIDGET_MIN): WidgetRect {
  const w = Math.max(Math.min(min.w, b.w), Math.min(r.w, b.w));
  const h = Math.max(Math.min(min.h, b.h), Math.min(r.h, b.h));
  return { w: round(w), h: round(h), x: round(Math.min(Math.max(r.x, 0), b.w - w)), y: round(Math.min(Math.max(r.y, 0), b.h - h)) };
}

export const moveWidget = (r: WidgetRect, dx: number, dy: number, b: Bounds): WidgetRect => clampWidget({ ...r, x: r.x + dx, y: r.y + dy }, b);

/** Resize from the bottom right corner; the top left corner stays put. */
export const resizeWidget = (r: WidgetRect, dw: number, dh: number, b: Bounds): WidgetRect =>
  clampWidget({ ...r, w: Math.min(r.w + dw, b.w - r.x), h: Math.min(r.h + dh, b.h - r.y) }, b);

/** Tile the widgets into a grid that fills the board: as many columns as fit at a comfortable width, equal cells. */
export const tileLayout: DefaultLayout = (ids, b) => {
  const gap = 8;
  const n = Math.max(1, ids.length);
  const cols = Math.max(1, Math.min(n, Math.floor((b.w + gap) / (380 + gap))));
  const rows = Math.ceil(n / cols);
  const w = (b.w - gap * (cols - 1)) / cols;
  const h = (b.h - gap * (rows - 1)) / rows;
  const out: Layout = {};
  ids.forEach((id, i) => {
    out[id] = clampWidget({ x: (i % cols) * (w + gap), y: Math.floor(i / cols) * (h + gap), w, h }, b);
  });
  return out;
};

/** Side by side with the first taking a share of the width (the looper's Mixer and Looping). */
export const splitLayout = (share: number): DefaultLayout => (ids, b) => {
  if (ids.length !== 2) return tileLayout(ids, b);
  const gap = 8;
  const left = Math.round((b.w - gap) * share);
  return {
    [ids[0]]: clampWidget({ x: 0, y: 0, w: left, h: b.h }, b),
    [ids[1]]: clampWidget({ x: left + gap, y: 0, w: b.w - left - gap, h: b.h }, b),
  };
};

/** Saved layouts come back from storage: take what is valid for the ids that exist, fill the rest from the defaults, and fit it all to the board. */
export function sanitiseLayout(raw: unknown, ids: string[], b: Bounds, defaults: DefaultLayout = tileLayout): Layout {
  const d = defaults(ids, b);
  const src = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const out: Layout = {};
  ids.forEach((id) => {
    const r = src[id] as Partial<WidgetRect> | undefined;
    out[id] = r && [r.x, r.y, r.w, r.h].every((n) => typeof n === "number" && Number.isFinite(n)) ? clampWidget(r as WidgetRect, b) : d[id];
  });
  return out;
}

/** Order for stacking: the widget touched last is on top. */
export function raise(order: string[], id: string): string[] {
  return [...order.filter((x) => x !== id), id];
}

export type Corner = "nw" | "ne" | "sw" | "se";

/** Resize from any corner: the opposite corner stays put, and the widget never gets smaller than the minimum. Not bounded: the canvas has no edge. */
export function resizeFromCorner(r: WidgetRect, corner: Corner, dx: number, dy: number, min = WIDGET_MIN): WidgetRect {
  let { x, y, w, h } = r;
  if (corner === "ne" || corner === "se") w = Math.max(min.w, r.w + dx);
  else {
    w = Math.max(min.w, r.w - dx);
    x = r.x + (r.w - w);
  }
  if (corner === "sw" || corner === "se") h = Math.max(min.h, r.h + dy);
  else {
    h = Math.max(min.h, r.h - dy);
    y = r.y + (r.h - h);
  }
  return { x: round(x), y: round(y), w: round(w), h: round(h) };
}

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

/** The first free place for a rectangle of this size inside `area` (scanning rows left to right), clear of `taken`; null when the area has none. */
export function findSpot(taken: WidgetRect[], size: { w: number; h: number }, area: WidgetRect, gap = 12): { x: number; y: number } | null {
  const clear = (x: number, y: number) => taken.every((r) => x + size.w + gap <= r.x || r.x + r.w + gap <= x || y + size.h + gap <= r.y || r.y + r.h + gap <= y);
  for (let y = area.y; y + size.h <= area.y + area.h; y += 24) {
    for (let x = area.x; x + size.w <= area.x + area.w; x += 24) {
      if (clear(x, y)) return { x: Math.round(x), y: Math.round(y) };
    }
  }
  return null;
}

/** How `bandLayout` lays its bands: one under another (each band a row) or side by side (each band a column). */
export interface BandOptions {
  direction: "vertical" | "horizontal";
  /** space between widgets in a band */
  gap?: number;
  /** space between bands */
  bandGap?: number;
  /** wrap a band into more lines when it would grow past this (width of a row, height of a column) */
  wrap?: number;
}

/**
 * Bands of widgets in order: vertical puts each band in a row under the one before, horizontal puts each in a column right of the one before.
 * Each widget keeps its size; a band longer than `wrap` breaks into more lines; every line is centred on the longest one, its widgets aligned to its start.
 */
export function bandLayout(bands: string[][], sizes: Record<string, { w: number; h: number }>, { direction, gap = 24, bandGap = 64, wrap = Infinity }: BandOptions): Layout {
  const v = direction === "vertical";
  // along: the way a line runs (x for rows); across: the way lines stack (y for rows)
  const along = (s: { w: number; h: number }) => (v ? s.w : s.h);
  const across = (s: { w: number; h: number }) => (v ? s.h : s.w);
  const lines: { ids: string[]; len: number; thick: number; band: number }[] = [];
  bands.forEach((band, bi) => {
    let cur: (typeof lines)[number] | null = null;
    band.forEach((id) => {
      const s = sizes[id];
      if (!s) return;
      if (!cur || (cur.ids.length && cur.len + gap + along(s) > wrap)) lines.push((cur = { ids: [], len: 0, thick: 0, band: bi }));
      cur.len += (cur.ids.length ? gap : 0) + along(s);
      cur.thick = Math.max(cur.thick, across(s));
      cur.ids.push(id);
    });
  });
  const longest = Math.max(0, ...lines.map((l) => l.len));
  const out: Layout = {};
  let pos = 0;
  lines.forEach((l, i) => {
    if (i) pos += lines[i - 1].band === l.band ? gap : bandGap;
    let a = (longest - l.len) / 2;
    l.ids.forEach((id) => {
      const s = sizes[id];
      // widgets of a line share its top (a row) or its left edge (a column)
      out[id] = { x: round(v ? a : pos), y: round(v ? pos : a), w: round(s.w), h: round(s.h) };
      a += along(s) + gap;
    });
    pos += l.thick;
  });
  return out;
}

/** Zoom and offset that show all of these rectangles in a view of size `b`, with a margin; null when there are none. */
export function fitView(rs: WidgetRect[], b: Bounds, zoom: { min: number; max: number }, margin = 16): { zoom: number; x: number; y: number } | null {
  if (!rs.length) return null;
  const x0 = Math.min(...rs.map((r) => r.x)), y0 = Math.min(...rs.map((r) => r.y));
  const x1 = Math.max(...rs.map((r) => r.x + r.w)), y1 = Math.max(...rs.map((r) => r.y + r.h));
  const z = Math.min(zoom.max, Math.max(zoom.min, Math.min(1.5, (b.w - 2 * margin) / (x1 - x0), (b.h - 2 * margin) / (y1 - y0))));
  return { zoom: z, x: (b.w - (x1 - x0) * z) / 2 - x0 * z, y: (b.h - (y1 - y0) * z) / 2 - y0 * z };
}

/**
 * Slide widgets along their line (x for a row, y for a column) so each one's centre is as near its `want` as it can be without two
 * overlapping: the line keeps its order, and a widget that would run into the one before it is pushed on. Widgets without a want stay put.
 */
export function alignLine(layout: Layout, ids: string[], want: Record<string, number>, direction: "vertical" | "horizontal", gap = 24): Layout {
  const v = direction === "vertical";
  const out: Layout = { ...layout };
  let end = -Infinity;
  ids.filter((id) => out[id]).forEach((id) => {
    const r = out[id];
    const len = v ? r.w : r.h;
    const start = Math.max(end + gap, want[id] === undefined ? (v ? r.x : r.y) : want[id] - len / 2);
    out[id] = v ? { ...r, x: round(start) } : { ...r, y: round(start) };
    end = start + len;
  });
  return out;
}

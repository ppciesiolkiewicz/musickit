/**
 * Widget layout maths for the looper page: each section is a rectangle on a board that it can never leave.
 * Pure functions, no DOM. The UI is components/looper/WidgetBoard.tsx.
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

export type WidgetId = "mixer" | "looping";
export const WIDGET_IDS: WidgetId[] = ["mixer", "looping"];
export const WIDGET_TITLES: Record<WidgetId, string> = { mixer: "Mixer", looping: "Looping" };

/** Mixer on the left, the looping stage on the right. */
export function defaultWidgets(b: Bounds): Record<WidgetId, WidgetRect> {
  const gap = 8;
  const left = Math.round((b.w - gap) * 0.42);
  return {
    mixer: clampWidget({ x: 0, y: 0, w: left, h: b.h }, b),
    looping: clampWidget({ x: left + gap, y: 0, w: b.w - left - gap, h: b.h }, b),
  };
}

/** Saved layouts come back from storage: take what is valid, fill the rest from the defaults, and fit it all to the board. */
export function sanitiseWidgets(raw: unknown, b: Bounds): Record<WidgetId, WidgetRect> {
  const d = defaultWidgets(b);
  const src = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const out = { ...d };
  WIDGET_IDS.forEach((id) => {
    const r = src[id] as Partial<WidgetRect> | undefined;
    if (r && [r.x, r.y, r.w, r.h].every((n) => typeof n === "number" && Number.isFinite(n))) out[id] = clampWidget(r as WidgetRect, b);
  });
  return out;
}

/** Order for stacking: the widget touched last is on top. */
export function raise(order: WidgetId[], id: WidgetId): WidgetId[] {
  return [...order.filter((x) => x !== id), id];
}

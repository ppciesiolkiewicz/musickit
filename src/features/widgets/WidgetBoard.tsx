"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from "react";
import Icon from "@/components/Icon";
import InfoTip from "@/components/InfoTip";
import { WIDGET_MIN, raise, tileLayout, type Bounds, type DefaultLayout, type Layout, type WidgetRect } from "./board";

export interface BoardWidget {
  id: string;
  title: ReactNode;
  node: ReactNode;
  /** shows a close button in the header */
  onClose?: () => void;
}

/** The canvas has no real edge: widgets can go anywhere within this generous range (negative too), and you zoom out to see far. */
export const WORLD: Bounds = { w: 40000, h: 30000 };
const LIMIT = 20000;
const inRange = (r: WidgetRect, min = WIDGET_MIN): WidgetRect => ({
  w: Math.round(Math.min(Math.max(r.w, min.w), LIMIT)),
  h: Math.round(Math.min(Math.max(r.h, min.h), LIMIT)),
  x: Math.round(Math.min(Math.max(r.x, -LIMIT), LIMIT)),
  y: Math.round(Math.min(Math.max(r.y, -LIMIT), LIMIT)),
});
export const ZOOM = { min: 0.15, max: 2 };

interface View {
  zoom: number;
  x: number;
  y: number;
}

const clampZoom = (z: number) => Math.min(ZOOM.max, Math.max(ZOOM.min, z));

/**
 * A canvas holding widgets. It fills the space it is given (the viewport below its top edge), and the widgets sit on a much larger
 * world that you zoom (buttons, Ctrl/Cmd and the wheel) and pan (wheel, or drag empty space). Each widget is dragged by its grip header and
 * resized from the corner. The layout and the view are remembered under `storageKey`. Raise `resetSignal` to put everything back.
 */
export default function WidgetBoard({ widgets, storageKey, defaults = tileLayout, resetSignal = 0, flush = false }: {
  widgets: BoardWidget[];
  storageKey: string;
  /** kept for older callers; the canvas always fills the space */
  height?: number;
  resizableHeight?: boolean;
  defaults?: DefaultLayout;
  resetSignal?: number;
  /** no border, rounded corners or bottom gap: the canvas meets the window edges */
  flush?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [vp, setVp] = useState<Bounds | null>(null);
  const [top, setTop] = useState(0);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [order, setOrder] = useState<string[]>([]);
  const [view, setView] = useState<View>({ zoom: 1, x: 0, y: 0 });
  const viewRef = useRef(view) as { current: View };
  viewRef.current = view;
  const drag = useRef<{ id: string; mode: "move" | "size" | "pan"; px: number; py: number; start: { x: number; y: number; w: number; h: number } } | null>(null);
  const ids = widgets.map((w) => w.id);
  const idKey = ids.join("|");

  const save = useCallback((l: Layout | null, v: View) => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ layout: l, view: v }));
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  // saved view
  useEffect(() => {
    try {
      const j = JSON.parse(window.localStorage.getItem(storageKey) ?? "null")?.view;
      if (j && [j.zoom, j.x, j.y].every((n: unknown) => typeof n === "number" && Number.isFinite(n))) setView({ zoom: clampZoom(j.zoom), x: j.x, y: j.y });
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  // the canvas fills the window below its top edge
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const measure = () => {
      const t = Math.max(0, Math.round(el.getBoundingClientRect().top + window.scrollY));
      setTop(t);
      setVp({ w: Math.round(el.clientWidth), h: Math.max(420, Math.round(window.innerHeight - el.getBoundingClientRect().top - (flush ? 0 : 8))) });
    };
    measure();
    window.addEventListener("resize", measure);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      window.removeEventListener("resize", measure);
      ro.disconnect();
    };
  }, []);

  // widgets that have no saved place start tiled to the screen at 100%
  useEffect(() => {
    if (!vp || vp.w < 1) return;
    const screen: DefaultLayout = (list) => defaults(list, vp);
    setLayout((cur) => {
      let raw: unknown = cur;
      if (!raw) {
        try {
          raw = JSON.parse(window.localStorage.getItem(storageKey) ?? "null")?.layout ?? null;
        } catch {
          raw = null;
        }
      }
      const idList = idKey ? idKey.split("|") : [];
      const d = screen(idList, vp);
      const src = typeof raw === "object" && raw !== null ? (raw as Record<string, Partial<WidgetRect> | undefined>) : {};
      const out: Layout = {};
      idList.forEach((id) => {
        const r = src[id];
        out[id] = r && [r.x, r.y, r.w, r.h].every((n) => typeof n === "number" && Number.isFinite(n)) ? inRange(r as WidgetRect) : d[id];
      });
      // a widget that is new while the canvas is already showing others appears where you are looking, not at its tile
      if (cur) {
        const v = viewRef.current;
        let n = 0;
        idList.forEach((id) => {
          if (cur[id]) return out[id] = cur[id];
          const r = out[id];
          const w = Math.min(r.w, Math.max(WIDGET_MIN.w, Math.round((vp.w - 48) / v.zoom)));
          const h = Math.min(r.h, Math.max(WIDGET_MIN.h, Math.round((vp.h - 48) / v.zoom)));
          out[id] = { w, h, x: Math.round(-v.x / v.zoom + 24 + n * 28), y: Math.round(-v.y / v.zoom + 24 + n * 28) };
          n++;
        });
      }
      return out;
    });
    setOrder((o) => [...o.filter((x) => idKey.split("|").includes(x)), ...idKey.split("|").filter((x) => !o.includes(x))]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vp?.w === undefined, idKey, storageKey]);

  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!vp) return;
    const l = defaults(idKey ? idKey.split("|") : [], vp);
    const v = { zoom: 1, x: 0, y: 0 };
    setLayout(l);
    setView(v);
    save(l, v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal]);

  const zoomAt = useCallback((factor: number, cx?: number, cy?: number) => {
    const el = host.current;
    const v = viewRef.current;
    const z = clampZoom(+(v.zoom * factor).toFixed(3));
    const px = cx ?? (el ? el.clientWidth / 2 : 0);
    const py = cy ?? (vp ? vp.h / 2 : 0);
    // keep the point under the cursor fixed
    const next = { zoom: z, x: px - ((px - v.x) / v.zoom) * z, y: py - ((py - v.y) / v.zoom) * z };
    setView(next);
    return next;
  }, [vp]);

  // wheel: Ctrl/Cmd zooms at the pointer, a plain wheel over empty canvas pans. (Not passive, so it can stop the page scrolling.)
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.defaultPrevented) return;
      const overWidget = (e.target as HTMLElement).closest("[data-widget]");
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const r = el.getBoundingClientRect();
        const next = zoomAt(Math.exp(-Math.max(-60, Math.min(60, e.deltaY)) * 0.0012), e.clientX - r.left, e.clientY - r.top);
        save(layoutRef.current, next);
      } else if (!overWidget) {
        e.preventDefault();
        const v = viewRef.current;
        const next = { ...v, x: v.x - e.deltaX, y: v.y - e.deltaY };
        setView(next);
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt, save]);
  const layoutRef = useRef<Layout | null>(null) as { current: Layout | null };
  layoutRef.current = layout;

  const begin = (id: string, mode: "move" | "size") => (e: RPointerEvent) => {
    if (!layout || !layout[id]) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { id, mode, px: e.clientX, py: e.clientY, start: layout[id] };
    setOrder((o) => raise(o, id));
  };
  const beginPan = (e: RPointerEvent) => {
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).dataset.canvas) return;
    if (e.button !== 0 && e.button !== 1) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { id: "", mode: "pan", px: e.clientX, py: e.clientY, start: { x: viewRef.current.x, y: viewRef.current.y, w: 0, h: 0 } };
  };
  const move = (e: RPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.px, dy = e.clientY - d.py;
    if (d.mode === "pan") {
      setView((v) => ({ ...v, x: d.start.x + dx, y: d.start.y + dy }));
      return;
    }
    const z = viewRef.current.zoom;
    const next = inRange(d.mode === "move" ? { ...d.start, x: d.start.x + dx / z, y: d.start.y + dy / z } : { ...d.start, w: d.start.w + dx / z, h: d.start.h + dy / z });
    setLayout((l) => (l ? { ...l, [d.id]: next } : l));
  };
  const end = () => {
    if (!drag.current) return;
    drag.current = null;
    save(layoutRef.current, viewRef.current);
  };

  /** Zoom and move so that every widget is in view. */
  const fitAll = () => {
    if (!layout || !vp) return;
    const rs = widgets.map((w) => layout[w.id]).filter(Boolean);
    if (!rs.length) return;
    const x0 = Math.min(...rs.map((r) => r.x)), y0 = Math.min(...rs.map((r) => r.y));
    const x1 = Math.max(...rs.map((r) => r.x + r.w)), y1 = Math.max(...rs.map((r) => r.y + r.h));
    const z = clampZoom(Math.min(1.5, (vp.w - 32) / (x1 - x0), (vp.h - 32) / (y1 - y0)));
    const v = { zoom: z, x: (vp.w - (x1 - x0) * z) / 2 - x0 * z, y: (vp.h - (y1 - y0) * z) / 2 - y0 * z };
    setView(v);
    save(layout, v);
  };
  const tbtn = "grid h-6 min-w-6 place-items-center rounded-md border border-slate-700/80 bg-slate-900/90 px-1 text-[10px] text-slate-300 hover:border-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";
  void top;

  return (
    <div
      ref={host}
      className={`relative w-full touch-none select-none overflow-hidden bg-slate-950/60 ${flush ? "" : "rounded-xl border border-slate-800"}`}
      style={{ height: vp?.h ?? 600, backgroundImage: "radial-gradient(circle, #1e293b 1px, transparent 1px)", backgroundSize: `${24 * view.zoom}px ${24 * view.zoom}px`, backgroundPosition: `${view.x}px ${view.y}px` }}
      onPointerDown={beginPan}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div className="absolute right-2 top-2 z-[1000] flex items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
        <InfoTip label="Canvas help">
          <p><b>Zoom:</b> the minus and plus buttons, or Ctrl (Cmd) and the mouse wheel or a trackpad pinch. The fit button shows every widget.</p>
          <p><b>Move around:</b> the wheel or two-finger scroll, or drag empty space.</p>
          <p><b>Widgets:</b> drag a title to move one, the corner to resize it. The canvas is much bigger than the screen, so zoom out to place more.</p>
        </InfoTip>
        <button type="button" className={tbtn} onClick={() => { const v = zoomAt(1 / 1.25); save(layout, v); }} title="Zoom out" aria-label="Zoom out"><Icon name="minus" size={12} /></button>
        <button type="button" className={`${tbtn} w-12 tabular-nums`} onClick={() => { const v = { zoom: 1, x: 0, y: 0 }; setView(v); save(layout, v); }} title="Back to 100%" aria-label="Zoom to 100%">{Math.round(view.zoom * 100)}%</button>
        <button type="button" className={tbtn} onClick={() => { const v = zoomAt(1.25); save(layout, v); }} title="Zoom in" aria-label="Zoom in"><Icon name="plus" size={12} /></button>
        <button type="button" className={tbtn} onClick={fitAll} title="Show every widget" aria-label="Fit all widgets"><Icon name="layout-dashboard" size={12} /></button>
      </div>
      <div data-canvas="1" className="absolute left-0 top-0" style={{ width: 0, height: 0, overflow: "visible", transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`, transformOrigin: "0 0" }}>
        {layout &&
          widgets.map((w) => {
            const r = layout[w.id] ?? inRange({ x: 0, y: 0, w: 380, h: 260 });
            return (
              <div data-widget="1" key={w.id} className="absolute flex select-text flex-col overflow-hidden rounded-xl border border-slate-600 bg-slate-950 shadow-lg shadow-black/40" style={{ left: r.x, top: r.y, width: r.w, height: r.h, zIndex: 1 + Math.max(0, order.indexOf(w.id)) }}>
                <div
                  className="flex h-7 shrink-0 cursor-grab touch-none select-none items-center gap-1.5 border-b border-slate-700 bg-slate-900 px-2 text-xs text-slate-300 active:cursor-grabbing"
                  onPointerDown={begin(w.id, "move")}
                  onPointerMove={move}
                  onPointerUp={end}
                  onPointerCancel={end}
                  title="Drag to move"
                >
                  <Icon name="grip" size={14} className="text-slate-500" />
                  <span className="min-w-0 truncate font-medium text-slate-100">{w.title}</span>
                  {w.onClose && (
                    <button type="button" className="ml-auto grid h-5 w-5 place-items-center rounded text-slate-400 hover:text-slate-100" onPointerDown={(e) => e.stopPropagation()} onClick={w.onClose} title="Close" aria-label={`Close ${typeof w.title === "string" ? w.title : "widget"}`}>
                      <Icon name="x" size={14} />
                    </button>
                  )}
                </div>
                <div className="min-h-0 flex-1 touch-auto overflow-auto p-1" onPointerDown={(e) => { e.stopPropagation(); setOrder((o) => raise(o, w.id)); }}>{w.node}</div>
                <div
                  className="absolute bottom-0 right-0 h-5 w-5 cursor-nwse-resize touch-none"
                  style={{ background: "linear-gradient(135deg, transparent 50%, #64748b 50%, #64748b 56%, transparent 56%, transparent 66%, #64748b 66%, #64748b 72%, transparent 72%)" }}
                  onPointerDown={begin(w.id, "size")}
                  onPointerMove={move}
                  onPointerUp={end}
                  onPointerCancel={end}
                  role="separator"
                  aria-label={`Resize ${typeof w.title === "string" ? w.title : "widget"}`}
                />
              </div>
            );
          })}
      </div>
    </div>
  );
}

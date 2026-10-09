"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from "react";
import Icon from "../Icon";
import { clampWidget, defaultWidgets, moveWidget, raise, resizeWidget, sanitiseWidgets, WIDGET_IDS, WIDGET_TITLES, type Bounds, type WidgetId, type WidgetRect } from "@/lib/looper/widgets";

const KEY = "musickit.looper.widgets";
type Layout = Record<WidgetId, WidgetRect>;

/**
 * A board holding the looper's sections as widgets. Each is dragged by its grip header and resized from the corner,
 * and can never leave the board. The layout is remembered.
 */
export default function WidgetBoard({ panels, height = 760 }: { panels: Record<WidgetId, ReactNode>; height?: number }) {
  const host = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [order, setOrder] = useState<WidgetId[]>(WIDGET_IDS);
  const drag = useRef<{ id: WidgetId; mode: "move" | "size"; px: number; py: number; start: WidgetRect } | null>(null);

  const save = useCallback((l: Layout) => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(l));
    } catch {
      /* ignore */
    }
  }, []);

  // measure the board; keep every widget inside it when it changes size
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const measure = () => setBounds({ w: Math.round(el.clientWidth), h: Math.round(el.clientHeight) });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!bounds || bounds.w < 1) return;
    setLayout((cur) => {
      if (cur) return { mixer: clampWidget(cur.mixer, bounds), looping: clampWidget(cur.looping, bounds) };
      let raw: unknown = null;
      try {
        raw = JSON.parse(window.localStorage.getItem(KEY) ?? "null");
      } catch {
        /* ignore */
      }
      return raw ? sanitiseWidgets(raw, bounds) : defaultWidgets(bounds);
    });
  }, [bounds]);

  const begin = (id: WidgetId, mode: "move" | "size") => (e: RPointerEvent) => {
    if (!layout) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { id, mode, px: e.clientX, py: e.clientY, start: layout[id] };
    setOrder((o) => raise(o, id));
  };
  const move = (e: RPointerEvent) => {
    const d = drag.current;
    if (!d || !bounds) return;
    const dx = e.clientX - d.px, dy = e.clientY - d.py;
    const next = d.mode === "move" ? moveWidget(d.start, dx, dy, bounds) : resizeWidget(d.start, dx, dy, bounds);
    setLayout((l) => (l ? { ...l, [d.id]: next } : l));
  };
  const end = () => {
    if (!drag.current) return;
    drag.current = null;
    setLayout((l) => {
      if (l) save(l);
      return l;
    });
  };
  const reset = () => {
    if (!bounds) return;
    const l = defaultWidgets(bounds);
    setLayout(l);
    save(l);
  };

  return (
    <div ref={host} className="relative w-full overflow-hidden rounded-xl border border-dashed border-slate-800" style={{ height }}>
      {layout &&
        WIDGET_IDS.map((id) => {
          const r = layout[id];
          return (
            <div key={id} className="absolute flex flex-col overflow-hidden rounded-xl border border-slate-600 bg-slate-950 shadow-lg shadow-black/40" style={{ left: r.x, top: r.y, width: r.w, height: r.h, zIndex: 1 + order.indexOf(id) }}>
              <div
                className="flex h-7 shrink-0 cursor-grab touch-none select-none items-center gap-1.5 border-b border-slate-700 bg-slate-900 px-2 text-xs text-slate-300 active:cursor-grabbing"
                onPointerDown={begin(id, "move")}
                onPointerMove={move}
                onPointerUp={end}
                onPointerCancel={end}
                title="Drag to move"
              >
                <Icon name="grip" size={14} className="text-slate-500" />
                <span className="font-medium text-slate-100">{WIDGET_TITLES[id]}</span>
                {id === "mixer" && (
                  <button type="button" className="ml-auto grid h-5 w-5 place-items-center rounded text-slate-400 hover:text-slate-100" onPointerDown={(e) => e.stopPropagation()} onClick={reset} title="Reset the layout" aria-label="Reset the layout">
                    <Icon name="layout-dashboard" size={14} />
                  </button>
                )}
              </div>
              <div className="min-h-0 flex-1 overflow-auto p-1" onPointerDown={() => setOrder((o) => raise(o, id))}>{panels[id]}</div>
              <div
                className="absolute bottom-0 right-0 h-5 w-5 cursor-nwse-resize touch-none"
                style={{ background: "linear-gradient(135deg, transparent 50%, #64748b 50%, #64748b 56%, transparent 56%, transparent 66%, #64748b 66%, #64748b 72%, transparent 72%)" }}
                onPointerDown={begin(id, "size")}
                onPointerMove={move}
                onPointerUp={end}
                onPointerCancel={end}
                role="separator"
                aria-label={`Resize ${WIDGET_TITLES[id]}`}
              />
            </div>
          );
        })}
    </div>
  );
}

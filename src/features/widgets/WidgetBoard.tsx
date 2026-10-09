"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from "react";
import Icon from "@/components/Icon";
import { clampWidget, moveWidget, raise, resizeWidget, sanitiseLayout, tileLayout, type Bounds, type DefaultLayout, type Layout } from "./board";

export interface BoardWidget {
  id: string;
  title: ReactNode;
  node: ReactNode;
  /** shows a close button in the header */
  onClose?: () => void;
}

const MIN_HEIGHT = 300, MAX_HEIGHT = 3000;

/**
 * A board holding widgets. Each is dragged by its grip header and resized from the corner, and can never leave the board.
 * The layout and the board's height are remembered under `storageKey`. Raise `resetSignal` to put everything back in its default place.
 */
export default function WidgetBoard({ widgets, storageKey, height = 720, resizableHeight = false, defaults = tileLayout, resetSignal = 0 }: {
  widgets: BoardWidget[];
  storageKey: string;
  height?: number;
  resizableHeight?: boolean;
  defaults?: DefaultLayout;
  resetSignal?: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [order, setOrder] = useState<string[]>([]);
  const [h, setH] = useState(height);
  const drag = useRef<{ id: string; mode: "move" | "size" | "board"; px: number; py: number; start: { x: number; y: number; w: number; h: number } } | null>(null);
  const ids = widgets.map((w) => w.id);
  const idKey = ids.join("|");

  const save = useCallback((l: Layout | null, boardH: number) => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ layout: l, height: boardH }));
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  // saved height
  useEffect(() => {
    try {
      const j = JSON.parse(window.localStorage.getItem(storageKey) ?? "null");
      if (resizableHeight && typeof j?.height === "number") setH(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, j.height)));
    } catch {
      /* ignore */
    }
  }, [storageKey, resizableHeight]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const measure = () => setBounds({ w: Math.round(el.clientWidth), h: Math.round(el.clientHeight) });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // fit to the board whenever it, or the set of widgets, changes
  useEffect(() => {
    if (!bounds || bounds.w < 1 || bounds.h < 1) return;
    setLayout((cur) => {
      let raw: unknown = cur;
      if (!raw) {
        try {
          raw = JSON.parse(window.localStorage.getItem(storageKey) ?? "null")?.layout ?? null;
        } catch {
          raw = null;
        }
      }
      return sanitiseLayout(raw, idKey ? idKey.split("|") : [], bounds, defaults);
    });
    setOrder((o) => [...o.filter((x) => idKey.split("|").includes(x)), ...idKey.split("|").filter((x) => !o.includes(x))]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bounds, idKey, storageKey]);

  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!bounds) return;
    const l = defaults(idKey ? idKey.split("|") : [], bounds);
    setLayout(l);
    save(l, h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal]);

  const begin = (id: string, mode: "move" | "size") => (e: RPointerEvent) => {
    if (!layout || !layout[id]) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { id, mode, px: e.clientX, py: e.clientY, start: layout[id] };
    setOrder((o) => raise(o, id));
  };
  const beginBoard = (e: RPointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { id: "", mode: "board", px: e.clientX, py: e.clientY, start: { x: 0, y: 0, w: 0, h } };
  };
  const move = (e: RPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.px, dy = e.clientY - d.py;
    if (d.mode === "board") {
      setH(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, d.start.h + dy)));
      return;
    }
    if (!bounds) return;
    const next = d.mode === "move" ? moveWidget(d.start, dx, dy, bounds) : resizeWidget(d.start, dx, dy, bounds);
    setLayout((l) => (l ? { ...l, [d.id]: next } : l));
  };
  const end = () => {
    if (!drag.current) return;
    drag.current = null;
    setLayout((l) => {
      save(l, h);
      return l;
    });
  };

  return (
    <div className="flex flex-col gap-0">
      <div ref={host} className="relative w-full overflow-hidden rounded-xl border border-dashed border-slate-800" style={{ height: h }}>
        {layout &&
          widgets.map((w) => {
            const r = layout[w.id] ?? (bounds ? clampWidget({ x: 0, y: 0, w: 380, h: 260 }, bounds) : null);
            if (!r) return null;
            return (
              <div key={w.id} className="absolute flex flex-col overflow-hidden rounded-xl border border-slate-600 bg-slate-950 shadow-lg shadow-black/40" style={{ left: r.x, top: r.y, width: r.w, height: r.h, zIndex: 1 + Math.max(0, order.indexOf(w.id)) }}>
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
                <div className="min-h-0 flex-1 overflow-auto p-1" onPointerDown={() => setOrder((o) => raise(o, w.id))}>{w.node}</div>
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
      {resizableHeight && (
        <div
          className="mx-auto mt-1 h-2 w-24 cursor-ns-resize touch-none rounded-full bg-slate-700 hover:bg-slate-500"
          onPointerDown={beginBoard}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          role="separator"
          aria-label="Make the board taller or shorter"
          title="Drag to make the board taller or shorter"
        />
      )}
    </div>
  );
}

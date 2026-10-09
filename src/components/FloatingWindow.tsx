"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as RKeyboardEvent, type PointerEvent as RPointerEvent, type ReactNode } from "react";

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const MIN_W = 280, MIN_H = 160, BAR = 36;
type Mode = "move" | "nw" | "ne" | "sw" | "se";

function clamp(r: Rect): Rect {
  const vw = window.innerWidth, vh = window.innerHeight;
  const w = Math.min(Math.max(r.w, MIN_W), vw);
  const h = Math.min(Math.max(r.h, MIN_H), vh);
  return { w, h, x: Math.min(Math.max(r.x, 0), vw - w), y: Math.min(Math.max(r.y, 0), vh - BAR) };
}

/**
 * A floating panel you can drag by its title bar and resize from the corner. Its size and place are remembered.
 * With `fit`, the content is scaled up or down to fill the panel, so resizing the panel resizes what is inside.
 */
export default function FloatingWindow({ title, onClose, children, storageKey, fit = false, initial }: { title: ReactNode; onClose: () => void; children: ReactNode; storageKey: string; fit?: boolean; initial?: { w: number; h: number } }) {
  const [rect, setRect] = useState<Rect | null>(null);
  const drag = useRef<{ mode: Mode; px: number; py: number; start: Rect } | null>(null);

  useLayoutEffect(() => {
    let saved: Rect | null = null;
    try {
      saved = JSON.parse(window.localStorage.getItem(storageKey) ?? "null");
    } catch {
      /* ignore */
    }
    const w = Math.min(initial?.w ?? 760, window.innerWidth - 16);
    const h = Math.min(initial?.h ?? 320, window.innerHeight - 16);
    setRect(clamp(saved ?? { x: Math.max(8, (window.innerWidth - w) / 2), y: initial ? Math.max(8, (window.innerHeight - h) / 2) : Math.max(8, window.innerHeight - 340), w, h }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const save = useCallback(
    (r: Rect) => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(r));
      } catch {
        /* ignore */
      }
    },
    [storageKey],
  );

  useEffect(() => {
    const onResize = () => setRect((r) => (r ? clamp(r) : r));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const begin = (mode: Mode) => (e: RPointerEvent) => {
    if (!rect) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { mode, px: e.clientX, py: e.clientY, start: rect };
  };
  const move = (e: RPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.px, dy = e.clientY - d.py;
    if (d.mode === "move") return setRect(clamp({ ...d.start, x: d.start.x + dx, y: d.start.y + dy }));
    // a corner moves; the opposite corner stays where it was
    const s0 = d.start;
    const west = d.mode === "nw" || d.mode === "sw";
    const north = d.mode === "nw" || d.mode === "ne";
    const w = Math.min(Math.max(west ? s0.w - dx : s0.w + dx, MIN_W), window.innerWidth);
    const h = Math.min(Math.max(north ? s0.h - dy : s0.h + dy, MIN_H), window.innerHeight);
    setRect(clamp({ w, h, x: west ? s0.x + s0.w - w : s0.x, y: north ? s0.y + s0.h - h : s0.y }));
  };
  const end = () => {
    if (drag.current) {
      drag.current = null;
      setRect((r) => {
        if (r) save(r);
        return r;
      });
    }
  };

  // keyboard: arrows move, shift+arrows resize, when the title bar is focused
  const onKey = (e: RKeyboardEvent) => {
    if (!rect || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    e.stopPropagation();
    const step = 20;
    const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
    const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
    const next = clamp(e.shiftKey ? { ...rect, w: rect.w + dx, h: rect.h + dy } : { ...rect, x: rect.x + dx, y: rect.y + dy });
    setRect(next);
    save(next);
  };

  if (!rect) return null;
  return (
    <div role="dialog" aria-label={typeof title === "string" ? title : "Floating panel"} className="fixed z-40 flex flex-col overflow-hidden rounded-xl border border-slate-600 bg-slate-950 shadow-2xl shadow-black/60" style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}>
      <div
        className="flex shrink-0 cursor-grab touch-none select-none items-center gap-2 border-b border-slate-700 bg-slate-900 pl-6 pr-6 text-xs text-slate-300 active:cursor-grabbing focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400"
        style={{ height: BAR }}
        tabIndex={0}
        onPointerDown={begin("move")}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onKeyDown={onKey}
        title="Drag to move. With the keyboard: arrow keys move, Shift + arrows resize."
      >
        <span aria-hidden className="text-slate-500">⠿</span>
        <span className="font-medium text-slate-100">{title}</span>
        <button type="button" className="ml-auto rounded-md border border-slate-700 px-2 py-0.5 text-slate-300 hover:border-slate-500" onPointerDown={(e) => e.stopPropagation()} onClick={onClose} aria-label="Close">✕</button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">{fit ? <Fit>{children}</Fit> : children}</div>
      {(["nw", "ne", "sw", "se"] as const).map((c) => (
        <div
          key={c}
          className={`absolute h-5 w-5 touch-none ${c === "nw" || c === "se" ? "cursor-nwse-resize" : "cursor-nesw-resize"} ${c[0] === "n" ? "top-0" : "bottom-0"} ${c[1] === "w" ? "left-0" : "right-0"}`}
          style={c === "se" ? { background: "linear-gradient(135deg, transparent 50%, #64748b 50%, #64748b 56%, transparent 56%, transparent 66%, #64748b 66%, #64748b 72%, transparent 72%)" } : undefined}
          onPointerDown={begin(c)}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          role="separator"
          aria-label="Resize"
        />
      ))}
    </div>
  );
}

/** Scales its content so it fills the space it is given, keeping its proportions. */
function Fit({ children }: { children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const o = outer.current, i = inner.current;
    if (!o || !i) return;
    const measure = () => {
      const nw = i.offsetWidth, nh = i.offsetHeight;
      if (!nw || !nh) return;
      setScale(Math.min(2.2, Math.max(0.35, Math.min(o.clientWidth / nw, o.clientHeight / nh))));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(o);
    ro.observe(i);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={outer} className="h-full w-full overflow-hidden">
      <div ref={inner} style={{ width: "max-content", transform: `scale(${scale})`, transformOrigin: "top left" }}>{children}</div>
    </div>
  );
}

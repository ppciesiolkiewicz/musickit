"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from "react";
import Icon, { type IconName } from "@/components/Icon";
import InfoTip from "@/components/InfoTip";
import { WIDGET_MIN, boxBetween, findSpot, fitView, raise, resizeFromCorner, tileLayout, widgetsInBox, type Corner, type Bounds, type DefaultLayout, type Layout, type WidgetRect } from "./board";

export interface BoardWidget {
  id: string;
  title: ReactNode;
  node: ReactNode;
  /** shows a close button in the header; also what Delete does to it when it is selected */
  onClose?: () => void;
  /** always drawn under the other widgets (a big one that the rest sit on) */
  back?: boolean;
  /** as tall as its content: it grows and shrinks with it (a section folding), and only its width is resized by hand */
  fit?: boolean;
  /** buttons drawn in the header, right after the title */
  actions?: ReactNode;
  /** when this changes, a smaller widget grows to at least this size (it never shrinks it) */
  minSize?: { w: number; h: number };
}

/** The header (h-7), the body's padding (p-2.5 twice) and the border, around a fitted widget's content. */
const FIT_CHROME = 28 + 20 + 2;

/** One choice of the Auto position menu: where every widget goes. It is given the widgets' current places (for their sizes). */
export interface Arrangement {
  id: string;
  label: string;
  hint?: string;
  icon: IconName;
  layout: (ids: string[], b: Bounds, current: Layout) => Layout;
}

const GRID: Arrangement[] = [{ id: "grid", label: "Grid", hint: "Tiled to fill the screen", icon: "layout-dashboard", layout: (ids, b) => tileLayout(ids, b) }];

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
 * Shift-dragging empty space draws a selection box (adding to the selection); a selected widget's title moves every selected one, and Delete or
 * Backspace closes the selected widgets that have `onClose` (all at once through `onDelete` when given). Escape or a click on empty space clears it.
 */
export default function WidgetBoard({ widgets, storageKey, defaults = tileLayout, resetSignal = 0, flush = false, place = "free", arrangements = GRID, start, fitMargin = 16, onDelete }: {
  widgets: BoardWidget[];
  storageKey: string;
  /** kept for older callers; the canvas always fills the space */
  height?: number;
  resizableHeight?: boolean;
  defaults?: DefaultLayout;
  resetSignal?: number;
  /** no border, rounded corners or bottom gap: the canvas meets the window edges */
  flush?: boolean;
  /** where a widget added later appears: the first free place in view, or the centre of the screen (on top of the others) */
  place?: "free" | "center";
  /** the choices of the Auto position menu (then the view zooms to show them all) */
  arrangements?: Arrangement[];
  /** the arrangement a board with no saved layout starts in, run just as its Auto position button would (then zoomed to show all) */
  start?: string;
  /** the empty space (in screen pixels) left around the widgets when the view zooms to show them all */
  fitMargin?: number;
  /** Delete pressed with these closable widgets selected: remove them in one go (else each one's `onClose` is called) */
  onDelete?: (ids: string[]) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [vp, setVp] = useState<Bounds | null>(null);
  const [top, setTop] = useState(0);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [order, setOrder] = useState<string[]>([]);
  const [view, setView] = useState<View>({ zoom: 1, x: 0, y: 0 });
  const viewRef = useRef(view) as { current: View };
  viewRef.current = view;
  const drag = useRef<{ id: string; mode: "move" | Corner | "pan" | "box"; px: number; py: number; start: { x: number; y: number; w: number; h: number }; group?: Layout; keep?: string[] } | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const selectedRef = useRef(selected) as { current: string[] };
  /** the selection box being dragged, in pixels of the canvas element */
  const [box, setBox] = useState<WidgetRect | null>(null);
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

  // a widget asking for more room (a panel switched to its full view) grows to it, once per change of the request
  const minKey = widgets.map((w) => (w.minSize ? `${w.id}:${w.minSize.w}x${w.minSize.h}` : "")).join("|");
  useEffect(() => {
    setLayout((l) => {
      if (!l) return l;
      let next = null as Layout | null;
      widgets.forEach((w) => {
        const r = l[w.id];
        if (!w.minSize || !r || (r.w >= w.minSize.w && r.h >= w.minSize.h)) return;
        next = next ?? { ...l };
        next[w.id] = inRange({ ...r, w: Math.max(r.w, w.minSize.w), h: w.fit ? r.h : Math.max(r.h, w.minSize.h) });
      });
      if (next) save(next, viewRef.current);
      return next ?? l;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minKey, layout === null]);

  // a board with no saved layout lays itself out again once the fitted widgets know their real height, until the person moves something
  const fresh = useRef(false);
  const relayout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fitIds = widgets.filter((w) => w.fit).map((w) => w.id).join("|");
  useEffect(() => {
    const el = host.current;
    if (!el || !fitIds) return;
    const ro = new ResizeObserver((entries) => {
      const seen: Record<string, number> = {};
      entries.forEach((e) => {
        const id = (e.target as HTMLElement).dataset.fit;
        if (id) seen[id] = Math.round((e.target as HTMLElement).offsetHeight) + FIT_CHROME;
      });
      setLayout((l) => {
        if (!l || !Object.keys(seen).some((id) => l[id] && Math.abs(l[id].h - seen[id]) > 1)) return l;
        const next = { ...l };
        Object.entries(seen).forEach(([id, h]) => { if (next[id]) next[id] = { ...next[id], h: Math.max(h, 40) }; });
        return next;
      });
      if (fresh.current) {
        if (relayout.current) clearTimeout(relayout.current);
        // exactly what the Auto position button does with the start arrangement: place by the real sizes, then show them all
        relayout.current = setTimeout(() => {
          if (fresh.current) arrangeRef.current(startRef.current);
        }, 200);
      }
    });
    el.querySelectorAll<HTMLElement>("[data-fit]").forEach((n) => ro.observe(n));
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitIds, layout === null]);
  // the fresh layout settles within a few seconds; after that only the person moves things
  useEffect(() => {
    if (!fresh.current) return;
    const t = setTimeout(() => (fresh.current = false), 4000);
    return () => clearTimeout(t);
  }, [layout === null]);

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
      if (!cur && (typeof raw !== "object" || raw === null)) fresh.current = true;
      const d = screen(idList, vp);
      const src = typeof raw === "object" && raw !== null ? (raw as Record<string, Partial<WidgetRect> | undefined>) : {};
      const out: Layout = {};
      idList.forEach((id) => {
        const r = src[id];
        out[id] = r && [r.x, r.y, r.w, r.h].every((n) => typeof n === "number" && Number.isFinite(n)) ? inRange(r as WidgetRect) : d[id];
      });
      // a widget that is new while the canvas is already showing others goes to a free place where you are looking
      if (cur) {
        const v = viewRef.current;
        const area: WidgetRect = { x: Math.round(-v.x / v.zoom + 12), y: Math.round(-v.y / v.zoom + 12), w: Math.round((vp.w - 24) / v.zoom), h: Math.round((vp.h - 24) / v.zoom) };
        const taken: WidgetRect[] = idList.filter((id) => cur[id]).map((id) => cur[id]);
        let n = 0;
        idList.forEach((id) => {
          if (cur[id]) return out[id] = cur[id];
          const r = out[id];
          const w = Math.min(r.w, Math.max(WIDGET_MIN.w, Math.round((vp.w - 48) / v.zoom)));
          const h = Math.min(r.h, Math.max(WIDGET_MIN.h, Math.round((vp.h - 48) / v.zoom)));
          const centre = { x: Math.round(area.x - 12 + (vp.w / v.zoom - w) / 2 + n * 28), y: Math.round(area.y - 12 + (vp.h / v.zoom - h) / 2 + n * 28) };
          // a free place in view, else the first free place below everything already on the board (never stacked on top of another)
          const spot = place === "center" ? centre : findSpot(taken, { w, h }, area) ?? findSpot(taken, { w, h }, { x: area.x, y: area.y, w: area.w, h: Math.max(...taken.map((t) => t.y + t.h), area.y) + h + 24 - area.y }) ?? { x: area.x + 12 + n * 28, y: area.y + 12 + n * 28 };
          out[id] = { w, h, ...spot };
          taken.push(out[id]);
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
    // then as the start arrangement's button would: by the real sizes, everything in view
    if (startRef.current) setTimeout(() => arrangeRef.current(startRef.current), 0);
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
  const vpRef = useRef<Bounds | null>(null) as { current: Bounds | null };
  vpRef.current = vp;

  const begin = (id: string, mode: "move" | Corner) => (e: RPointerEvent) => {
    if (!layout || !layout[id]) return;
    e.preventDefault();
    e.stopPropagation();
    fresh.current = false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const sel = selectedRef.current;
    if (mode === "move" && e.shiftKey) setSelected(sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]);
    else if (!sel.includes(id)) setSelected([]);
    // a selected widget's title drags all the selected ones together
    const group = mode === "move" && sel.includes(id) && sel.length > 1 && !e.shiftKey ? Object.fromEntries(sel.filter((x) => layout[x]).map((x) => [x, layout[x]])) : undefined;
    drag.current = { id, mode, px: e.clientX, py: e.clientY, start: layout[id], group };
    setOrder((o) => raise(o, id));
  };
  /** Empty space: Shift with a mouse or pen draws a selection box; otherwise a drag pans. */
  const beginPan = (e: RPointerEvent) => {
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).dataset.canvas) return;
    if (e.button !== 0 && e.button !== 1) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (e.button === 0 && e.shiftKey && e.pointerType !== "touch") {
      const r = e.currentTarget.getBoundingClientRect();
      const keep = selectedRef.current;
      drag.current = { id: "", mode: "box", px: e.clientX, py: e.clientY, start: { x: e.clientX - r.left, y: e.clientY - r.top, w: 0, h: 0 }, keep };
      setSelected(keep);
      return;
    }
    if (selectedRef.current.length) setSelected([]);
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
    if (d.mode === "box") {
      const b = boxBetween(d.start, { x: d.start.x + dx, y: d.start.y + dy });
      setBox(b);
      const v = viewRef.current;
      const hit = layoutRef.current ? widgetsInBox(layoutRef.current, widgets.map((w) => w.id), { x: (b.x - v.x) / z, y: (b.y - v.y) / z, w: b.w / z, h: b.h / z }) : [];
      setSelected([...(d.keep ?? []), ...hit.filter((id) => !d.keep?.includes(id))]);
      return;
    }
    if (d.group) {
      const g = d.group;
      setLayout((l) => (l ? { ...l, ...Object.fromEntries(Object.entries(g).map(([id, r]) => [id, inRange({ ...r, x: r.x + dx / z, y: r.y + dy / z }, { w: 0, h: 0 })])) } : l));
      return;
    }
    const fit = widgets.find((w) => w.id === d.id)?.fit;
    // a fitted widget keeps its height (its content sets it): only the width follows the corner
    const next = inRange(d.mode === "move" ? { ...d.start, x: d.start.x + dx / z, y: d.start.y + dy / z } : fit ? { ...resizeFromCorner(d.start, d.mode, dx / z, 0), y: d.start.y, h: d.start.h } : resizeFromCorner(d.start, d.mode, dx / z, dy / z), fit ? { w: WIDGET_MIN.w, h: 40 } : WIDGET_MIN);
    setLayout((l) => (l ? { ...l, [d.id]: next } : l));
  };
  const end = () => {
    if (!drag.current) return;
    const was = drag.current.mode;
    drag.current = null;
    if (was === "box") setBox(null);
    else save(layoutRef.current, viewRef.current);
  };

  // Delete or Backspace closes the selected widgets, Escape lets go of them. Not while typing.
  const widgetsRef = useRef(widgets) as { current: BoardWidget[] };
  const onDeleteRef = useRef(onDelete) as { current: typeof onDelete };
  // the key and pointer handlers read the latest selection, widgets and onDelete
  useEffect(() => {
    selectedRef.current = selected;
    widgetsRef.current = widgets;
    onDeleteRef.current = onDelete;
  });
  useEffect(() => {
    const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    const down = (e: KeyboardEvent) => {
      if (typing(e.target)) return;
      const sel = selectedRef.current;
      if (!sel.length) return;
      if (e.key === "Escape") setSelected([]);
      else if ((e.key === "Delete" || e.key === "Backspace") && !e.repeat) {
        const gone = widgetsRef.current.filter((w) => w.onClose && sel.includes(w.id));
        if (!gone.length) return;
        e.preventDefault();
        if (onDeleteRef.current) onDeleteRef.current(gone.map((w) => w.id));
        else gone.forEach((w) => w.onClose?.());
        setSelected(sel.filter((id) => !gone.some((w) => w.id === id)));
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  /** Zoom and move so that every widget is in view. */
  const fitAll = (l: Layout | null = layout) => {
    if (!l || !vp) return;
    const v = fitView(widgets.map((w) => l[w.id]).filter(Boolean), vp, ZOOM, fitMargin);
    if (!v) return;
    setView(v);
    save(l, v);
  };
  /** Put every widget where the arrangement says, then show them all. Without one: the start arrangement, or the defaults. */
  const arrange = (a?: Arrangement) => {
    const layout = layoutRef.current;
    if (!layout || !vp) return;
    const placed = a ? a.layout(widgets.map((w) => w.id), vp, layout) : defaults(widgets.map((w) => w.id), vp, layout);
    const l: Layout = { ...layout };
    widgets.forEach((w) => { if (placed[w.id]) l[w.id] = inRange(placed[w.id]); });
    setLayout(l);
    fitAll(l);
  };
  const arrangeRef = useRef(arrange);
  arrangeRef.current = arrange;
  const startRef = useRef<Arrangement | undefined>(undefined);
  startRef.current = arrangements.find((a) => a.id === start);
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    if (!menu) return;
    const close = (e: Event) => {
      if (e.target instanceof Element && e.target.closest("[data-automenu]")) return;
      setMenu(false);
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", key);
    };
  }, [menu]);
  const menuItem = "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-xs text-slate-200 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";
  const tbtn = "grid h-6 min-w-6 place-items-center rounded-md border border-slate-700/80 bg-slate-900/90 px-1 text-[10px] text-slate-300 hover:border-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";
  void top;

  return (
    <div
      ref={host}
      className={`relative w-full touch-none select-none overflow-hidden bg-slate-950/60 ${flush ? "" : "rounded-xl border border-slate-800"}`}
      style={{ height: vp?.h ?? 600, backgroundImage: "radial-gradient(circle, var(--color-slate-800) 1px, transparent 1px)", backgroundSize: `${24 * view.zoom}px ${24 * view.zoom}px`, backgroundPosition: `${view.x}px ${view.y}px` }}
      onPointerDown={beginPan}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div className="absolute right-2 top-2 z-[1000] flex items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
        <InfoTip label="Canvas help">
          <p><b>Zoom:</b> the minus and plus buttons, or Ctrl (Cmd) and the mouse wheel or a trackpad pinch.</p>
          <p><b>Auto position:</b> the last button lines every widget up (choose how) and shows them all, or only zooms to show them where they are.</p>
          <p><b>Move around:</b> drag empty space, or the wheel or two-finger scroll.</p>
          <p><b>Select:</b> hold Shift and drag a box over empty space (it adds to what is selected); Shift-click a title to add or remove one. Drag a selected title to move them all; Delete removes them, Escape or a click on empty space lets go.</p>
          <p><b>Widgets:</b> drag a title to move one, the corner to resize it. The canvas is much bigger than the screen, so zoom out to place more.</p>
        </InfoTip>
        <button type="button" className={tbtn} onClick={() => { const v = zoomAt(1 / 1.25); save(layout, v); }} title="Zoom out" aria-label="Zoom out"><Icon name="minus" size={12} /></button>
        <button type="button" className={`${tbtn} w-12 tabular-nums`} onClick={() => { const v = { zoom: 1, x: 0, y: 0 }; setView(v); save(layout, v); }} title="Back to 100%" aria-label="Zoom to 100%">{Math.round(view.zoom * 100)}%</button>
        <button type="button" className={tbtn} onClick={() => { const v = zoomAt(1.25); save(layout, v); }} title="Zoom in" aria-label="Zoom in"><Icon name="plus" size={12} /></button>
        <div className="relative" data-automenu>
          <button type="button" className={`${tbtn} ${menu ? "!border-sky-500" : ""}`} onClick={() => setMenu((m) => !m)} title="Auto position" aria-label="Auto position" aria-haspopup="menu" aria-expanded={menu}><Icon name="layout-dashboard" size={12} /></button>
          {menu && (
            <div role="menu" aria-label="Auto position" className="absolute right-0 top-7 w-60 rounded-xl border border-slate-700 bg-slate-950 p-1 shadow-xl">
              <div className="px-2 pb-1 pt-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">Auto position</div>
              {arrangements.map((a) => (
                <button key={a.id} type="button" role="menuitem" className={menuItem} onClick={() => { fresh.current = false; arrange(a); setMenu(false); }}>
                  <Icon name={a.icon} size={15} className="mt-0.5 shrink-0 text-slate-400" />
                  <span className="flex min-w-0 flex-col">
                    <span className="font-medium">{a.label}</span>
                    {a.hint && <span className="text-[11px] text-slate-400">{a.hint}</span>}
                  </span>
                </button>
              ))}
              <div className="my-1 border-t border-slate-800" />
              <button type="button" role="menuitem" className={menuItem} onClick={() => { fitAll(); setMenu(false); }}>
                <Icon name="eye" size={15} className="mt-0.5 shrink-0 text-slate-400" />
                <span className="flex min-w-0 flex-col">
                  <span className="font-medium">Show every widget</span>
                  <span className="text-[11px] text-slate-400">Zoom to fit, leave them where they are</span>
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
      <div data-canvas="1" className="absolute left-0 top-0" style={{ width: 0, height: 0, overflow: "visible", transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`, transformOrigin: "0 0" }}>
        {layout &&
          widgets.map((w) => {
            const r = layout[w.id] ?? inRange({ x: 0, y: 0, w: 380, h: 260 });
            return (
              <div data-widget="1" key={w.id} aria-selected={selected.includes(w.id) || undefined} className={`absolute flex select-text flex-col overflow-hidden rounded-xl border bg-slate-950 shadow-lg shadow-black/40 ${selected.includes(w.id) ? "border-sky-400 ring-2 ring-sky-400/60" : "border-slate-600"}`} style={{ left: r.x, top: r.y, width: r.w, height: r.h, zIndex: 1 + (w.back ? 0 : widgets.length) + Math.max(0, order.indexOf(w.id)) }}>
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
                  {w.actions && <span className="flex shrink-0 items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>{w.actions}</span>}
                  {w.onClose && (
                    <button type="button" className="ml-auto grid h-5 w-5 place-items-center rounded text-slate-400 hover:text-slate-100" onPointerDown={(e) => e.stopPropagation()} onClick={w.onClose} title="Close" aria-label={`Close ${typeof w.title === "string" ? w.title : "widget"}`}>
                      <Icon name="x" size={14} />
                    </button>
                  )}
                </div>
                <div className="min-h-0 flex-1 touch-auto overflow-auto p-2.5" onPointerDown={(e) => {
                  e.stopPropagation();
                  // working in a widget that is not selected lets go of the selection, so a later Delete does not surprise
                  if (!selectedRef.current.includes(w.id) && selectedRef.current.length) setSelected([]);
                  // a dialog opened from the widget is drawn elsewhere on the page (a portal) but its events still bubble here: those do not raise it
                  if (e.currentTarget.contains(e.target as Node)) setOrder((o) => raise(o, w.id));
                }}>{w.fit ? <div data-fit={w.id}>{w.node}</div> : w.node}</div>
                {(["nw", "ne", "sw", "se"] as Corner[]).map((c) => (
                  <div
                    key={c}
                    className={`absolute z-10 h-5 w-5 touch-none ${c === "nw" ? "left-0 top-0 cursor-nwse-resize" : c === "se" ? "bottom-0 right-0 cursor-nwse-resize" : c === "ne" ? "right-0 top-0 cursor-nesw-resize" : "bottom-0 left-0 cursor-nesw-resize"}`}
                    style={c === "se" ? { background: "linear-gradient(135deg, transparent 50%, #64748b 50%, #64748b 56%, transparent 56%, transparent 66%, #64748b 66%, #64748b 72%, transparent 72%)" } : undefined}
                    onPointerDown={begin(w.id, c)}
                    onPointerMove={move}
                    onPointerUp={end}
                    onPointerCancel={end}
                    role="separator"
                    aria-label={`Resize ${typeof w.title === "string" ? w.title : "widget"} from the ${c === "nw" ? "top left" : c === "ne" ? "top right" : c === "sw" ? "bottom left" : "bottom right"} corner`}
                  />
                ))}
              </div>
            );
          })}
      </div>
      {box && <div aria-hidden className="pointer-events-none absolute z-[999] rounded-sm border border-sky-400 bg-sky-400/10" style={{ left: box.x, top: box.y, width: box.w, height: box.h }} />}
    </div>
  );
}

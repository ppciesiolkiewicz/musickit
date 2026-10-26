"use client";

import { useEffect, useRef, type PointerEvent as RPointerEvent, type ReactNode } from "react";
import Icon from "@/components/Icon";
import { DEFAULT_VIEW, panView, resizeFrom, zoomAt, type Corner, type FrameRect, type Layer, type Stage, type StageAction } from "./model/layers";

/** pixels a pointer moves inside a widget before it counts as a drag (below that, the click reaches the widget: a strum, a note) */
const DRAG_SLOP = 4;
/** the strip along a widget's top that drags at once */
const GRAB_STRIP = 16;
/** how fast ⌘+scroll and pinch zoom: the factor is e^(-deltaY × this) */
const ZOOM_SPEED = 0.01;

interface Drag {
  id: string;
  mode: "pending" | "move" | Corner;
  px: number;
  py: number;
  start: FrameRect;
  frame: DOMRect;
}

const CORNERS: { c: Corner; cls: string }[] = [
  { c: "nw", cls: "-left-1 -top-1 cursor-nwse-resize" },
  { c: "ne", cls: "-right-1 -top-1 cursor-nesw-resize" },
  { c: "sw", cls: "-bottom-1 -left-1 cursor-nesw-resize" },
  { c: "se", cls: "-bottom-1 -right-1 cursor-nwse-resize" },
];

/**
 * The 16:9 frame: exactly what a recording shows. Each visible layer is placed from its rect, a fraction of the frame,
 * so the frame can be any size. Nothing outside this element is ever recorded (`data-stage-frame` is the capture target).
 *
 * Widgets are moved by dragging (from the top strip at once, from anywhere after a few pixels) and resized from any corner dot.
 * ⌘+scroll or a pinch zooms into a widget around the pointer; a plain scroll pans a zoomed widget. The outline and dots are thin
 * and show only on hover or when selected: they are in the video.
 */
export default function StageFrame({ stage, renderLayer, onAction }: { stage: Stage; renderLayer: (l: Layer) => ReactNode; onAction: (a: StageAction) => void }) {
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const dragged = useRef(false);
  const layersRef = useRef(stage.layers);
  useEffect(() => {
    layersRef.current = stage.layers;
  }, [stage.layers]);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const dx = e.clientX - d.px, dy = e.clientY - d.py;
      if (d.mode === "pending") {
        if (Math.hypot(dx, dy) < DRAG_SLOP) return;
        d.mode = "move";
      }
      dragged.current = true;
      const fx = dx / d.frame.width, fy = dy / d.frame.height;
      const rect = d.mode === "move" ? { ...d.start, x: d.start.x + fx, y: d.start.y + fy } : resizeFrom(d.start, d.mode, fx, fy);
      onAction({ type: "setRect", id: d.id, rect });
    };
    const up = () => {
      drag.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [onAction]);

  // wheel: ⌘+scroll and trackpad pinch (which arrives as ctrl+wheel) zoom the widget under the pointer; a plain scroll pans it when zoomed.
  // Added by hand because React's wheel listener is passive and could not stop the page (or the browser) from zooming.
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const box = (e.target as HTMLElement).closest<HTMLElement>("[data-layer]");
      const layer = box && layersRef.current.find((l) => l.id === box.dataset.layer);
      if (!box || !layer) return;
      const view = layer.view ?? DEFAULT_VIEW;
      const r = box.getBoundingClientRect();
      if (e.metaKey || e.ctrlKey) {
        e.preventDefault();
        // a trackpad sends small steps; a mouse wheel notch is ~100, capped so one notch is a gentle zoom, not a jump
        const step = Math.max(-50, Math.min(50, e.deltaY));
        onAction({ type: "setView", id: layer.id, view: zoomAt(view, Math.exp(-step * ZOOM_SPEED), (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height) });
      } else if (view.zoom > 1) {
        e.preventDefault();
        onAction({ type: "setView", id: layer.id, view: panView(view, e.deltaX / (r.width * view.zoom), e.deltaY / (r.height * view.zoom)) });
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onAction]);

  const start = (e: RPointerEvent, l: Layer, mode: Drag["mode"]) => {
    if (e.button !== 0 || !frame.current) return;
    onAction({ type: "select", id: l.id });
    dragged.current = false;
    const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const fromTop = mode === "pending" && e.clientY - box.top < GRAB_STRIP;
    drag.current = { id: l.id, mode: fromTop ? "move" : mode, px: e.clientX, py: e.clientY, start: l.rect, frame: frame.current.getBoundingClientRect() };
    if (mode !== "pending" || fromTop) e.preventDefault();
  };

  return (
    <div
      ref={frame}
      data-stage-frame
      className="relative aspect-video w-full touch-none select-none overflow-hidden rounded-lg bg-slate-950 ring-1 ring-slate-800"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onAction({ type: "select", id: null });
      }}
    >
      {stage.layers
        .filter((l) => l.visible)
        .map((l) => {
          const selected = stage.selected === l.id;
          const v = l.view ?? DEFAULT_VIEW;
          const show = selected ? "opacity-100" : "opacity-0 group-hover:opacity-100";
          return (
            <div
              key={l.id}
              data-layer={l.id}
              className="group absolute"
              style={{ left: `${l.rect.x * 100}%`, top: `${l.rect.y * 100}%`, width: `${l.rect.w * 100}%`, height: `${l.rect.h * 100}%` }}
              onPointerDown={(e) => start(e, l, "pending")}
              onClickCapture={(e) => {
                // a drag that ends over the widget is not a click on it
                if (dragged.current) {
                  e.stopPropagation();
                  dragged.current = false;
                }
              }}
            >
              <div className="h-full w-full overflow-hidden">
                <div
                  className="h-full w-full"
                  style={v.zoom === 1 ? undefined : { transformOrigin: "0 0", transform: `translate(${(0.5 - v.zoom * v.cx) * 100}%, ${(0.5 - v.zoom * v.cy) * 100}%) scale(${v.zoom})` }}
                >
                  {renderLayer(l)}
                </div>
              </div>
              <div className={`pointer-events-none absolute inset-0 rounded-[3px] ring-2 ring-sky-400/80 transition-opacity ${show}`} />
              {CORNERS.map(({ c, cls }) => (
                <div
                  key={c}
                  title="Drag to resize"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    start(e, l, c);
                  }}
                  className={`absolute h-2 w-2 rounded-full bg-sky-400 transition-opacity ${cls} ${show}`}
                />
              ))}
              {l.subject.kind !== "camera" && l.subject.kind !== "screen" && (
                <button
                  data-chrome
                  type="button"
                  title="Delete the widget"
                  aria-label="Delete the widget"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => onAction({ type: "remove", id: l.id })}
                  className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-md bg-slate-950/80 text-slate-300 opacity-0 ring-1 ring-slate-700 transition-opacity hover:text-rose-300 group-hover:opacity-100"
                >
                  <Icon name="x" size={13} />
                </button>
              )}
            </div>
          );
        })}
    </div>
  );
}

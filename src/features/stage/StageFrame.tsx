"use client";

import { useEffect, useRef, type PointerEvent as RPointerEvent, type ReactNode } from "react";
import type { FrameRect, Layer, Stage, StageAction } from "./model/layers";

/** pixels a pointer moves inside a widget before it counts as a drag (below that, the click reaches the widget: a strum, a note) */
const DRAG_SLOP = 4;
/** the strip along a widget's top that drags at once */
const GRAB_STRIP = 16;

interface Drag {
  id: string;
  mode: "pending" | "move" | "resize";
  px: number;
  py: number;
  start: FrameRect;
  frame: DOMRect;
}

/**
 * The 16:9 frame: exactly what a recording shows. Each visible layer is placed from its rect, a fraction of the frame,
 * so the frame can be any size. Nothing outside this element is ever recorded (`data-stage-frame` is the capture target).
 *
 * Widgets are moved by dragging (from the top strip at once, from anywhere after a few pixels) and resized from the corner dot.
 * The outline and dot are thin and show only on hover or when selected: they are in the video.
 */
export default function StageFrame({ stage, renderLayer, onAction }: { stage: Stage; renderLayer: (l: Layer) => ReactNode; onAction: (a: StageAction) => void }) {
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const dragged = useRef(false);

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
      const rect = d.mode === "move" ? { ...d.start, x: d.start.x + fx, y: d.start.y + fy } : { ...d.start, w: d.start.w + fx, h: d.start.h + fy };
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

  const start = (e: RPointerEvent, l: Layer, mode: Drag["mode"]) => {
    if (e.button !== 0 || !frame.current) return;
    onAction({ type: "select", id: l.id });
    dragged.current = false;
    const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const fromTop = mode === "pending" && e.clientY - box.top < GRAB_STRIP;
    drag.current = { id: l.id, mode: fromTop ? "move" : mode, px: e.clientX, py: e.clientY, start: l.rect, frame: frame.current.getBoundingClientRect() };
    if (fromTop || mode === "resize") e.preventDefault();
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
              {renderLayer(l)}
              <div className={`pointer-events-none absolute inset-0 rounded-[3px] ring-2 ring-sky-400/80 transition-opacity ${selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} />
              <div
                title="Drag to resize"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  start(e, l, "resize");
                }}
                className={`absolute -bottom-1 -right-1 h-2 w-2 cursor-nwse-resize rounded-full bg-sky-400 transition-opacity ${selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
              />
            </div>
          );
        })}
    </div>
  );
}

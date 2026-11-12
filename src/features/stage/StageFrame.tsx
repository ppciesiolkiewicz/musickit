"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent, type ReactNode } from "react";
import GridFrame from "./GridFrame";
import { LayerBody, LayerToolbar, useWidgetZoom } from "./LayerParts";
import { drawZ, fixedRect, hasAspect, layoutOf, resizeFrom, resizeKeepingShape, withAspect, type Corner, type FrameRect, type Layer, type Stage, type StageAction } from "./model/layers";

/** pixels a pointer moves inside a widget before it counts as a drag (below that, the click reaches the widget: a strum, a note) */
const DRAG_SLOP = 4;
/** the strip along a widget's top that drags at once */
const GRAB_STRIP = 16;

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

/** room for the hover toolbar (pin, fill, delete) above or below a widget, as a fraction of the frame's height */
const TOOLBAR_ROOM = 0.06;

/**
 * Where a widget's hover toolbar sits: just outside its top-right corner, so it never covers what the widget shows; under the widget
 * when it touches the frame's top; inside its corner only when it fills the frame's height, and always for the brand marks.
 * The toolbars are drawn over every widget, so a widget in front never hides one.
 */
function toolbarPlace(l: Layer, card: boolean): CSSProperties {
  const right = `${(1 - l.rect.x - l.rect.w) * 100}%`;
  if (card && l.rect.y >= TOOLBAR_ROOM) return { right, bottom: `${(1 - l.rect.y) * 100}%`, paddingBottom: 4 };
  if (card && l.rect.y + l.rect.h <= 1 - TOOLBAR_ROOM) return { right, top: `${(l.rect.y + l.rect.h) * 100}%`, paddingTop: 4 };
  return { right: `calc(${right} + 6px)`, top: `calc(${l.rect.y * 100}% + 6px)` };
}

interface FrameProps {
  stage: Stage;
  renderLayer: (l: Layer) => ReactNode;
  onAction: (a: StageAction) => void;
  keepShape?: boolean;
  /** the widgets' hover toolbar has Pin (default); the notes creator turns it off */
  pin?: boolean;
  /** the grid: widgets grow to their content and never scroll inside (the notes creator, like the note it makes) */
  flow?: boolean;
}

/** The 16:9 frame, in the stage's layout. The two share nothing but how a widget is drawn inside its box (`LayerParts`). */
export default function StageFrame(props: FrameProps) {
  return layoutOf(props.stage) === "grid" ? <GridFrame stage={props.stage} renderLayer={props.renderLayer} onAction={props.onAction} pin={props.pin} flow={props.flow} /> : <FreeFrame {...props} />;
}

/**
 * The free layout's 16:9 frame: exactly what a recording shows. Each visible layer is placed from its rect, a fraction of the frame,
 * so the frame can be any size. Layers are drawn in list order and stacked by their `z`, so bringing one to the top never moves its element
 * (a camera or a screen share keeps playing). Nothing outside this element is ever recorded (`data-stage-frame` is the capture target).
 *
 * Widgets are moved by dragging (from the top strip at once, from anywhere after a few pixels) and resized from any corner dot.
 * ⌘+scroll or a pinch zooms into a widget around the pointer; a plain scroll pans a zoomed widget. The outline and dots are thin
 * and show only on hover or when selected: they are in the video.
 *
 * On hover, a widget's toolbar (pin, fill the frame, delete) shows just outside its top-right corner (`toolbarPlace`).
 * Widgets are opaque cards (the brand marks and the camera and screen excepted). With `keepShape`, each widget's frame takes the
 * shape of what it shows (reported by its FitBox), and a corner drag keeps that shape. Each widget can fill the frame and go back.
 */
function FreeFrame({ stage, renderLayer, onAction, keepShape = true, pin = true }: FrameProps) {
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const dragged = useRef(false);
  const layersRef = useRef(stage.layers);
  useEffect(() => {
    layersRef.current = stage.layers;
  }, [stage.layers]);

  // each widget's content shape (width over height, pixels), as its FitBox reports it; a new shape re-runs the snap below
  const aspects = useRef<Record<string, number>>({});
  const [shapes, setShapes] = useState(0);

  // the widget whose toolbar shows: the one under the pointer, kept a moment so the pointer can cross to its toolbar
  const [hover, setHover] = useState<string | null>(null);
  const leaving = useRef<number | undefined>(undefined);
  const enter = (id: string) => {
    window.clearTimeout(leaving.current);
    setHover(id);
  };
  const leave = () => {
    window.clearTimeout(leaving.current);
    leaving.current = window.setTimeout(() => setHover(null), 150);
  };
  const keepShapeRef = useRef(keepShape);
  useEffect(() => {
    keepShapeRef.current = keepShape;
  }, [keepShape]);
  const onShape = useCallback((id: string, aspect: number) => {
    if (aspects.current[id] === aspect) return;
    aspects.current[id] = aspect;
    setShapes((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!keepShape) return;
    for (const l of stage.layers) {
      const aspect = aspects.current[l.id];
      // a widget filling the frame already has its shape; the brand marks keep their place
      if (!aspect || l.restore || fixedRect(l.subject) || hasAspect(l.rect, aspect)) continue;
      const rect = withAspect(l.rect, aspect);
      // a shape too long for the frame cannot be met: leave it, rather than snapping for ever
      if (Math.abs(rect.w - l.rect.w) + Math.abs(rect.h - l.rect.h) > 1e-6) onAction({ type: "setRect", id: l.id, rect });
    }
  }, [stage.layers, keepShape, shapes, onAction]);

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
      const aspect = keepShapeRef.current ? aspects.current[d.id] : undefined;
      const rect =
        d.mode === "move"
          ? { ...d.start, x: d.start.x + fx, y: d.start.y + fy }
          : aspect
            ? resizeKeepingShape(d.start, d.mode, fx, fy, aspect)
            : resizeFrom(d.start, d.mode, fx, fy);
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

  useWidgetZoom(frame, stage.layers, onAction);

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
          const show = selected ? "opacity-100" : "opacity-0 group-hover:opacity-100";
          // the brand marks have a fixed place: no dragging, no resize dots
          const fixed = !!fixedRect(l.subject);
          const media = l.subject.kind === "camera" || l.subject.kind === "screen";
          // widgets are opaque, so one over another hides it; the brand marks sit see-through over the picture
          const card = !fixed && !media;
          return (
            <div
              key={l.id}
              data-layer={l.id}
              className="group absolute"
              style={{ left: `${l.rect.x * 100}%`, top: `${l.rect.y * 100}%`, width: `${l.rect.w * 100}%`, height: `${l.rect.h * 100}%`, zIndex: drawZ(l, stage.layers.length) }}
              onPointerDown={(e) => (fixed ? onAction({ type: "select", id: l.id }) : start(e, l, "pending"))}
              onPointerEnter={() => enter(l.id)}
              onPointerLeave={leave}
              onClickCapture={(e) => {
                // a drag that ends over the widget is not a click on it
                if (dragged.current) {
                  e.stopPropagation();
                  dragged.current = false;
                }
              }}
            >
              <LayerBody layer={l} card={card} onShape={onShape}>
                {renderLayer(l)}
              </LayerBody>
              <div className={`pointer-events-none absolute inset-0 rounded-[3px] ring-2 ring-sky-400/80 transition-opacity ${show}`} />
              {!fixed && CORNERS.map(({ c, cls }) => (
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
            </div>
          );
        })}
      {(() => {
        // drawn over every widget, so one in front never hides it
        const l = stage.layers.find((x) => x.id === hover && x.visible);
        if (!l || l.subject.kind === "camera" || l.subject.kind === "screen") return null;
        return (
          <LayerToolbar
            layer={l}
            pin={pin}
            filled={!!l.restore}
            onAction={onAction}
            aspect={() => (keepShape ? (aspects.current[l.id] ?? null) : null)}
            className="absolute"
            style={{ ...toolbarPlace(l, !fixedRect(l.subject)), zIndex: 2 * stage.layers.length + 1 }}
            onPointerEnter={() => enter(l.id)}
            onPointerLeave={leave}
          />
        );
      })()}
    </div>
  );
}

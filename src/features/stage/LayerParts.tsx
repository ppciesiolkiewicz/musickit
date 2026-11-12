"use client";

import { useCallback, useEffect, useRef, type CSSProperties, type ReactNode, type RefObject } from "react";
import Icon from "@/components/Icon";
import { DEFAULT_VIEW, fixedRect, panView, zoomAt, type Layer, type StageAction } from "./model/layers";
import { ShapeReport } from "./render/shape";

/** how fast ⌘+scroll and pinch zoom: the factor is e^(-deltaY × this) */
const ZOOM_SPEED = 0.01;

/**
 * Wheel over a widget, in either layout: ⌘+scroll and trackpad pinch (which arrives as ctrl+wheel) zoom it around the pointer; a plain
 * scroll pans it when zoomed. Added by hand because React's wheel listener is passive and could not stop the page (or the browser) from zooming.
 */
export function useWidgetZoom(frame: RefObject<HTMLElement | null>, layers: Layer[], onAction: (a: StageAction) => void) {
  const layersRef = useRef(layers);
  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);
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
  }, [frame, onAction]);
}

/** A widget inside its box: the card, the zoom, and the way its FitBox reports its content's shape (only the free layout listens). */
export function LayerBody({ layer, card, onShape, children }: { layer: Layer; card: boolean; onShape?: (id: string, aspect: number) => void; children: ReactNode }) {
  const v = layer.view ?? DEFAULT_VIEW;
  const { id } = layer;
  const report = useCallback((aspect: number) => onShape?.(id, aspect), [id, onShape]);
  return (
    <div className={`h-full w-full overflow-hidden ${card ? "rounded-xl bg-slate-950" : ""}`}>
      <div className="h-full w-full" style={v.zoom === 1 ? undefined : { transformOrigin: "0 0", transform: `translate(${(0.5 - v.zoom * v.cx) * 100}%, ${(0.5 - v.zoom * v.cy) * 100}%) scale(${v.zoom})` }}>
        <ShapeReport.Provider value={report}>{children}</ShapeReport.Provider>
      </div>
    </div>
  );
}

const TOOL = "flex h-6 w-6 items-center justify-center rounded-md bg-slate-950/80 ring-1 ring-slate-700";

/** A widget's hover toolbar: pin (unless `pin` is false: the notes creator), fill the frame or go back, delete. Brand marks only have delete. Never recorded (`data-chrome`). */
export function LayerToolbar({
  layer: l,
  filled,
  canFill = true,
  pin = true,
  aspect,
  onAction,
  className,
  style,
  onPointerEnter,
  onPointerLeave,
}: {
  layer: Layer;
  filled: boolean;
  /** the grid gives each widget its own size, so there it has no fill button */
  canFill?: boolean;
  /** offer the pin button (the studio); the notes creator has no pinning */
  pin?: boolean;
  /** the content's shape when it is filled, read at the click */
  aspect?: () => number | null;
  onAction: (a: StageAction) => void;
  className: string;
  style?: CSSProperties;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
}) {
  const card = !fixedRect(l.subject);
  return (
    <div data-chrome className={`flex gap-1.5 ${className}`} style={style} onPointerEnter={onPointerEnter} onPointerLeave={onPointerLeave} onPointerDown={(e) => e.stopPropagation()}>
      {card && pin && (
        <button
          type="button"
          title={l.onTop ? "Unpin: let other widgets cover it" : "Pin: keep it over the other widgets, and light the notes the audio input hears on it"}
          aria-label={l.onTop ? "Unpin" : "Pin"}
          aria-pressed={!!l.onTop}
          onClick={() => onAction({ type: "togglePin", id: l.id })}
          className={`${TOOL} hover:text-sky-300 ${l.onTop ? "text-sky-300" : "text-slate-300"}`}
        >
          <Icon name="pin" size={13} />
        </button>
      )}
      {card && canFill && (
        <button
          type="button"
          title={filled ? "Back to its place" : "Fill the frame"}
          aria-label={filled ? "Back to its place" : "Fill the frame"}
          onClick={() => {
            // selecting brings it to the top, over what it now covers
            onAction({ type: "select", id: l.id });
            onAction({ type: "toggleFill", id: l.id, aspect: aspect?.() ?? null });
          }}
          className={`${TOOL} text-slate-300 hover:text-sky-300`}
        >
          <Icon name={filled ? "minimize" : "maximize"} size={13} />
        </button>
      )}
      <button type="button" title="Delete the widget" aria-label="Delete the widget" onClick={() => onAction({ type: "remove", id: l.id })} className={`${TOOL} text-slate-300 hover:text-rose-300`}>
        <Icon name="x" size={13} />
      </button>
    </div>
  );
}

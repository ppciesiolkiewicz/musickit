"use client";

import { DndContext, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent as RMouseEvent, type ReactNode, type TouchEvent as RTouchEvent } from "react";
import { LayerBody, LayerToolbar, useWidgetZoom } from "./LayerParts";
import { GRID_COLUMNS, fixedRect, gridAspect, gridAutoPlace, gridLayers, gridSpan, gridSpanNarrow, type Layer, type Stage, type StageAction } from "./model/layers";
import { isPage, subjectTitle } from "./model/subject";
import { InGrid, ScrollInBox } from "./render/shape";

/** pixels a pointer moves inside a widget before it counts as a drag (below that, the click reaches the widget: a strum, a note) */
const DRAG_SLOP = 4;
/** a finger holds this long before a drag starts: a swipe before that scrolls */
const TOUCH_HOLD_MS = 250;
/** how far a holding finger may wander before the hold counts as a scroll */
const TOUCH_SLOP = 8;
/** The space around and between widgets: in the frame's own width, so a recording looks the same at any size; fixed on a phone-wide frame. */
const SPACING = "gap-[0.6cqw] p-[0.6cqw] @max-[640px]:gap-2 @max-[640px]:p-1";
/** Spans come from the CSS variables an item sets, so the frame's width picks between them. */
const SPAN = "[grid-column:span_var(--span)] @max-[640px]:[grid-column:span_var(--span-narrow)]";
/** With Auto layout on, the share of its columns a widget fills, centred; a phone-wide frame keeps its usual widths. */
const AUTO_WIDTH = "w-[var(--auto-width)] justify-self-center @max-[640px]:w-auto @max-[640px]:justify-self-auto";
/**
 * A page: one screen tall (56.25cqw, less the 2 × 0.6cqw around it), or most of a phone's, with a strip left free on its right where the
 * wheel or a finger still scrolls the frame instead of the page.
 */
const PAGE = "mr-[3cqw] h-[55.05cqw] @max-[640px]:mr-5 @max-[640px]:h-[80svh]";
/** one 16:9 screen's height, in the frame's width */
const SCREEN_CQW = (100 * 9) / 16;
/** long enough for a new widget's content to report its shape */
const SETTLE_MS = 150;
const SHOW = "opacity-0 transition-opacity group-hover:opacity-100 group-data-[selected=true]:opacity-100";

/**
 * Whether a press lands on a control. Read through shadow roots (`composedPath`): a browser extension's popup over a text box
 * (a writing or AI helper) is a custom element whose inside the page sees only as its host, and a drag must not start from it either.
 */
const onControl = (e: Event) =>
  e.composedPath().some((n) => n instanceof Element && (n.matches("button,input,select,textarea,a,[contenteditable]") || n.tagName.includes("-")));

/** A widget's own controls work as controls: a drag never starts from them. */
class WidgetMouseSensor extends MouseSensor {
  static activators = [{ eventName: "onMouseDown" as const, handler: ({ nativeEvent: e }: RMouseEvent) => e.button === 0 && !onControl(e) }];
}

class WidgetTouchSensor extends TouchSensor {
  static activators = [{ eventName: "onTouchStart" as const, handler: ({ nativeEvent: e }: RTouchEvent) => e.touches.length === 1 && !onControl(e) }];
}

function GridItem({ layer: l, selected, aspect, auto, pin, onShape, onAction, children }: { layer: Layer; selected: boolean; aspect: number; auto: boolean; pin: boolean; onShape: (id: string, aspect: number) => void; onAction: (a: StageAction) => void; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: l.id });
  const media = l.subject.kind === "camera" || l.subject.kind === "screen";
  const page = isPage(l.subject);
  const place = auto ? gridAutoPlace(l) : null;
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      role="group"
      aria-label={subjectTitle(l.subject)}
      tabIndex={-1}
      data-layer={l.id}
      data-selected={selected}
      className={`group relative outline-none ${SPAN} ${page ? PAGE : ""} ${place && !page ? AUTO_WIDTH : ""} ${isDragging ? "z-10 opacity-80" : ""}`}
      style={{ "--span": place?.span ?? gridSpan(l), "--span-narrow": gridSpanNarrow(l), "--auto-width": place ? `${place.width * 100}%` : undefined, aspectRatio: page ? undefined : aspect, transform: CSS.Translate.toString(transform), transition } as CSSProperties}
      onPointerDownCapture={() => onAction({ type: "select", id: l.id })}
    >
      <LayerBody layer={l} card={!media} onShape={onShape}>
        <ScrollInBox.Provider value={page}>{children}</ScrollInBox.Provider>
      </LayerBody>
      <div className={`pointer-events-none absolute inset-0 rounded-xl ring-2 ring-sky-400/80 ${SHOW}`} />
      {!media && <LayerToolbar layer={l} filled={false} canFill={false} pin={pin} onAction={onAction} className={`absolute right-1.5 top-1.5 z-10 ${SHOW}`} />}
    </div>
  );
}

/**
 * The grid layout's 16:9 frame: exactly what a recording shows (`data-stage-frame`). A CSS grid of GRID_COLUMNS columns: each widget
 * spans its kind's columns (`gridSpan`) and takes the shape of its content, so nothing is resized by hand; a page (`isPage`) is the
 * frame's width (less a strip that still scrolls the frame) and one screen tall, and scrolls inside itself. On a phone-wide frame the spans,
 * the spacing and a page's height change by container query. Dragging one changes the
 * order (`@dnd-kit`). The frame is at least 16:9 and grows with its widgets, so the page's own scroll goes through them, and a new
 * widget at the end is scrolled into view. The brand marks are not grid items: they keep their corner of the frame's first screen.
 */
export default function GridFrame({ stage, renderLayer, onAction, pin = true }: { stage: Stage; renderLayer: (l: Layer) => ReactNode; onAction: (a: StageAction) => void; /** Pin in the hover toolbar (off in the notes creator) */ pin?: boolean }) {
  const frame = useRef<HTMLDivElement>(null);
  useWidgetZoom(frame, stage.layers, onAction);
  const sensors = useSensors(useSensor(WidgetMouseSensor, { activationConstraint: { distance: DRAG_SLOP } }), useSensor(WidgetTouchSensor, { activationConstraint: { delay: TOUCH_HOLD_MS, tolerance: TOUCH_SLOP } }));

  // each widget's content shape, as its FitBox reports it
  const [shapes, setShapes] = useState<Record<string, number>>({});
  const onShape = useCallback((id: string, aspect: number) => setShapes((s) => (s[id] === aspect ? s : { ...s, [id]: aspect })), []);

  const all = gridLayers(stage);
  const items = all.filter((l) => l.visible);
  const marks = stage.layers.filter((l) => l.visible && fixedRect(l.subject));

  // a new widget goes at the end, which may be below what the frame shows. Only one added now: a stage coming back from storage stays at the top
  const count = useRef(stage.layers.length);
  useEffect(() => {
    const added = stage.layers.length === count.current + 1;
    count.current = stage.layers.length;
    const id = stage.layers[stage.layers.length - 1]?.id;
    if (!added || !id) return;
    window.setTimeout(() => {
      frame.current?.querySelector(`[data-layer="${id}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, SETTLE_MS);
  }, [stage.layers]);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) onAction({ type: "reorder", id: String(active.id), over: String(over.id) });
  };

  return (
    <div
      ref={frame}
      data-stage-frame
      className="relative aspect-video w-full touch-pan-y select-none rounded-lg bg-slate-950 ring-1 ring-slate-800 [container-type:inline-size]"
      onPointerDown={(e) => {
        if (!(e.target as HTMLElement).closest("[data-layer]")) onAction({ type: "select", id: null });
      }}
    >
        <InGrid.Provider value>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map((l) => l.id)} strategy={rectSortingStrategy}>
            <div className={`relative grid items-start ${SPACING}`} style={{ gridTemplateColumns: `repeat(${GRID_COLUMNS}, minmax(0, 1fr))` }}>
              {items.map((l) => (
                <GridItem key={l.id} layer={l} selected={stage.selected === l.id} aspect={shapes[l.id] ?? gridAspect(l)} auto={!!stage.gridAuto} pin={pin} onShape={onShape} onAction={onAction}>
                  {renderLayer(l)}
                </GridItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>
        </InGrid.Provider>
      {marks.map((l) => (
        <div
          key={l.id}
          data-layer={l.id}
          data-selected={stage.selected === l.id}
          className="group absolute z-20"
          style={{ left: `${l.rect.x * 100}%`, width: `${l.rect.w * 100}%`, top: `${l.rect.y * SCREEN_CQW}cqw`, height: `${l.rect.h * SCREEN_CQW}cqw` }}
          onPointerDown={() => onAction({ type: "select", id: l.id })}
        >
          <LayerBody layer={l} card={false}>
            {renderLayer(l)}
          </LayerBody>
          <LayerToolbar layer={l} filled={false} pin={pin} onAction={onAction} className={`absolute right-1.5 top-1.5 ${SHOW}`} />
        </div>
      ))}
    </div>
  );
}

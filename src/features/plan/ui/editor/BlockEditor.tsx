"use client";

import { DndContext, KeyboardSensor, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ReactNode } from "react";
import Icon from "@/components/Icon";
import { DISPLAY } from "@/components/landing/Display";
import { View as ChoiceChips } from "@/features/exercises/basics/choice";
import HeadphonesNotice from "@/features/stage/render/HeadphonesNotice";
import { isOpen } from "../../model/choice";
import { cellLabel, editBlock, pathOf, selectionAfterRemove, type CellPath, type EditAction } from "../../model/editBlock";
import type { Cell, PlainCell, PlanTool, SectionCell } from "../../model/tools";
import type { Block } from "../../model/types";
import { useEditorHost } from "./host";
import KeyHeader from "./KeyHeader";
import TextCell from "./TextCell";
import ToolCell from "./ToolCell";

/** Where a new cell goes: after a cell (by id), right before one (`{ before }`, Add above), at the very start, or (null) at the end. */
export type AddAt = string | { before: string } | "start" | null;

export interface BlockEditorProps {
  /** every cell has an `id` (`withIds`) */
  block: Block;
  onChange: (b: Block) => void;
  selected: string | null;
  onSelect: (id: string | null) => void;
  /** open the palette to add a cell there */
  onAdd: (at: AddAt) => void;
  /** a tool cell's Settings: the host's few controls for it (the notes creator: its family's), or null for none; absent: the `EditorHost`'s */
  toolControls?: (tool: PlanTool, onChange: (tool: PlanTool) => void) => ReactNode | null;
  /** the title and the key bar in the frame; off when a host draws its own (a plan exercise: its meta form) */
  header?: boolean;
}

const gutterButton = "grid size-7 place-items-center rounded-md text-slate-500 hover:bg-slate-800 hover:text-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 disabled:opacity-30";

/**
 * A block written as a notebook: its title and key bar in the outer frame, then one column of cells in reading order, a section
 * a frame of its own with its heading, minutes and chips, its cells indented. Every cell has a gutter: a handle to drag it, Move up
 * and Move down (named with the cell, for a keyboard or a browser AI), and, on hover or focus, Add above, Add below and Delete.
 */
export default function BlockEditor({ block, onChange, selected, onSelect, onAdd, toolControls: own, header = true }: BlockEditorProps) {
  const host = useEditorHost();
  const toolControls = own ?? host.toolControls;
  const act = (a: EditAction) => onChange(editBlock(block, a));
  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const onDragEnd = (e: DragEndEvent) => {
    const from = pathOf(block, String(e.active.id));
    const to = e.over ? pathOf(block, String(e.over.id)) : null;
    if (from && to && e.active.id !== e.over?.id) act({ type: "drop", from, to });
  };

  const frame = (c: Cell, at: CellPath, body: ReactNode) => (
    <CellFrame
      key={c.id}
      id={c.id!}
      label={cellLabel(c)}
      selected={selected === c.id}
      section={c.type === "section"}
      onSelect={() => onSelect(c.id ?? null)}
      onMove={(dir) => act({ type: "move", at, dir })}
      onAddAbove={() => onAdd(c.id ? { before: c.id } : null)}
      onAddBelow={() => onAdd(c.id ?? null)}
      onDelete={() => {
        // the selection moves to the cell beside the one deleted
        if (selected === c.id) onSelect(selectionAfterRemove(block, at));
        act({ type: "remove", at });
      }}
    >
      {body}
    </CellFrame>
  );

  const plain = (c: PlainCell, at: CellPath) => {
    const update = (cell: Cell) => act({ type: "update", at, cell });
    switch (c.type) {
      case "text":
        return frame(c, at, <TextCell text={c.text} label={cellLabel(c)} onChange={(text) => update({ ...c, text })} />);
      case "list":
        return frame(c, at, <ol className="list-decimal space-y-1 pl-5 text-slate-300">{c.items.map((it, i) => <li key={i}>{it}</li>)}</ol>);
      case "notice":
        return frame(c, at, <HeadphonesNotice />);
      case "tool":
        return frame(c, at, <ToolCell tool={c.tool} controls={toolControls?.(c.tool, (tool) => update({ ...c, tool })) ?? null} onChange={(tool) => update({ ...c, tool })} />);
    }
  };

  const section = (s: SectionCell, i: number) =>
    frame(s, [i], (
      <div className="flex flex-col gap-3 rounded-xl border border-slate-700/70 bg-slate-900/30 p-3 sm:p-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
          <input value={s.heading} onChange={(e) => act({ type: "update", at: [i], cell: { ...s, heading: e.target.value } })} placeholder="Heading" aria-label={`Heading of ${cellLabel(s)}`} className="min-w-0 flex-1 bg-transparent text-xl font-semibold tracking-tight text-slate-50 outline-none placeholder:text-slate-600" />
          <label className="flex items-center gap-1.5 text-xs text-slate-400">
            <input type="number" min={1} max={60} value={s.minutes ?? ""} onChange={(e) => {
              const m = Math.round(Number(e.target.value));
              const { minutes: _old, ...rest } = s;
              void _old;
              act({ type: "update", at: [i], cell: e.target.value && Number.isFinite(m) ? { ...rest, minutes: Math.min(60, Math.max(1, m)) } : rest });
            }} aria-label={`Minutes of ${cellLabel(s)}`} className="w-14 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500" />
            min
          </label>
        </div>
        {s.choice && !isOpen(s.choice) && <ChoiceChips options={s.choice.options} label={s.choice.label} value={0} />}
        <SortableContext items={s.cells.map((c) => c.id!)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2 pl-1 sm:pl-3">
            {s.cells.map((c, j) => plain(c, [i, j]))}
            {s.cells.length === 0 && (
              <button type="button" onClick={() => onAdd(s.id ?? null)} className="w-fit rounded-md border border-dashed border-slate-700 px-3 py-1.5 text-sm text-slate-400 hover:border-slate-500 hover:text-slate-200">
                Add a widget to this section
              </button>
            )}
          </div>
        </SortableContext>
      </div>
    ));

  return (
    <article aria-label={block.title || "Untitled note"} className="flex flex-col gap-5">
      {header && <header className="flex flex-col gap-3 border-b border-slate-800 pb-4">
        <input value={block.title} onChange={(e) => act({ type: "title", title: e.target.value })} placeholder="Title" aria-label="Title" className="w-full bg-transparent text-3xl leading-tight text-slate-50 outline-none placeholder:text-slate-600 sm:text-4xl" style={DISPLAY} />
        <KeyHeader value={block.choice && isOpen(block.choice) ? block.choice.open : null} onChange={(value) => act({ type: "key", value })} />
      </header>}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={block.cells.map((c) => c.id!)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-3">{block.cells.map((c, i) => (c.type === "section" ? section(c, i) : plain(c, [i])))}</div>
        </SortableContext>
      </DndContext>
    </article>
  );
}

/** A cell with its gutter: the handle and Move up / Move down always; Add above, Add below and Delete on hover or focus. */
function CellFrame({ id, label, selected, section, onSelect, onMove, onAddAbove, onAddBelow, onDelete, children }: {
  id: string; label: string; selected: boolean; section: boolean;
  onSelect: () => void; onMove: (dir: -1 | 1) => void; onAddAbove: () => void; onAddBelow: () => void; onDelete: () => void; children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onFocusCapture={onSelect}
      onPointerDownCapture={onSelect}
      data-cell={id}
      // a section's own group, so pointing at it never shows its cells' toolbars, nor one of them its toolbar
      className={`${section ? "group/section" : "group/cell"} relative flex gap-1.5 rounded-xl ${isDragging ? "z-10 opacity-80" : ""} ${selected && !section ? "ring-1 ring-sky-500/50" : ""}`}
    >
      <div className="flex shrink-0 flex-col items-center gap-0.5 pt-1" data-chrome>
        <button type="button" ref={setActivatorNodeRef} {...listeners} {...attributes} aria-label={`Drag to move: ${label}`} title="Drag to move" className={`${gutterButton} cursor-grab touch-none`}>
          <Icon name="grip" size={15} />
        </button>
        <button type="button" onClick={() => onMove(-1)} aria-label={`Move up: ${label}`} title="Move up" className={gutterButton}><Icon name="arrow-up" size={14} /></button>
        <button type="button" onClick={() => onMove(1)} aria-label={`Move down: ${label}`} title="Move down" className={gutterButton}><Icon name="arrow-up" size={14} className="rotate-180" /></button>
      </div>
      <div className="min-w-0 flex-1 py-1">{children}</div>
      <div className={`absolute -top-3 right-2 z-10 flex gap-0.5 rounded-lg border border-slate-700 bg-slate-900 p-0.5 opacity-0 shadow-lg transition max-sm:opacity-100 ${section ? "group-hover/section:opacity-100 has-[:focus-visible]:opacity-100" : "group-hover/cell:opacity-100 group-focus-within/cell:opacity-100"}`} data-chrome>
        <button type="button" onClick={onAddAbove} aria-label={`Add above: ${label}`} title="Add above" className={gutterButton}><Icon name="plus" size={13} /><span className="sr-only">Add above</span></button>
        <button type="button" onClick={onAddBelow} aria-label={`Add below: ${label}`} title="Add below" className={gutterButton}><Icon name="plus" size={13} /><span className="sr-only">Add below</span></button>
        <button type="button" onClick={onDelete} aria-label={`Delete: ${label}`} title="Delete" className={`${gutterButton} hover:text-rose-300`}><Icon name="trash" size={13} /></button>
      </div>
    </div>
  );
}

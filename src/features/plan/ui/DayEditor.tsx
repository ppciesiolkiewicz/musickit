"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/Icon";
import { draftWarnings, editDay, exerciseFromDraft, MAX_EXERCISES, metaOf, MIN_EXERCISES, sameExercise, type ExerciseMeta } from "../model/editPlan";
import { insertAt, withIds } from "../model/editBlock";
import { fixRequest } from "../model/fixRequest";
import { randomId } from "../model/exerciseIds";
import type { Cell } from "../model/tools";
import type { Block, PlanExercise, StoredPlan } from "../model/types";
import { BlockEditor, useEditorHost, type AddAt } from "./editor";
import ExerciseMetaForm from "./ExerciseMetaForm";

interface Item { key: string; from: number | null; old: PlanExercise | null; meta: ExerciseMeta; block: Block }

const cellId = () => randomId().slice(0, 8);
const blockOf = (e: PlanExercise): Block => withIds({ title: "", ...(e.choice ? { choice: e.choice } : {}), cells: e.cells }, cellId);
const button = "rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-200 hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40";
const iconButton = "grid size-7 place-items-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-slate-100 disabled:opacity-30";

/** An exercise as it will be saved: the old one itself while nothing in it changed, so its id and stars stay. */
function exerciseOf(it: Item): PlanExercise {
  if (it.old && JSON.stringify(it.meta) === JSON.stringify(metaOf(it.old))) {
    const same = { ...it.old, cells: it.block.cells, ...(it.block.choice ? { choice: it.block.choice } : {}) };
    if (sameExercise(it.old, same)) return it.old;
  }
  return exerciseFromDraft(it.old, it.meta, it.block);
}

/** One warning list's Copy fix request: the paste step's message for the player's AI. */
function CopyFix({ warnings }: { warnings: string[] }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button" className={button} onClick={() => void navigator.clipboard?.writeText(fixRequest(warnings)).then(() => setCopied(true))}>
      {copied ? "Copied" : "Copy fix request"}
    </button>
  );
}

/**
 * A day of the running plan edited in place: its exercises in order, each the block editor under a small form for what the plan
 * knows about it (title with hashtags, minutes, why, links), the paste step's warnings under it. Nothing is saved until Done; an
 * exercise that changed becomes a new one (`editDay`). Cancel leaves the plan as it was.
 */
export default function DayEditor({ plan, day, onDone, onCancel }: { plan: StoredPlan; day: number; onDone: (next: StoredPlan) => void; onCancel: () => void }) {
  const host = useEditorHost();
  const [items, setItems] = useState<Item[]>(() =>
    plan.config.days[day].exercises.map((e, from) => ({ key: e.id ?? `e${from}`, from, old: e, meta: metaOf(e), block: blockOf(e) })),
  );
  const [selected, setSelected] = useState<string | null>(null);
  // the exercise a widget is being picked for, and where in it (Add above / below, a section's button; else after the selected cell)
  const [picking, setPicking] = useState<{ i: number; at: AddAt } | null>(null);
  const [refused, setRefused] = useState<string | null>(null);
  const exercises = useMemo(() => items.map(exerciseOf), [items]);

  const set = (i: number, p: Partial<Item>) => setItems((xs) => xs.map((x, k) => (k === i ? { ...x, ...p } : x)));
  const move = (i: number, dir: -1 | 1) =>
    setItems((xs) => {
      const k = i + dir;
      if (k < 0 || k >= xs.length) return xs;
      const out = xs.slice();
      [out[i], out[k]] = [out[k], out[i]];
      return out;
    });
  const add = () =>
    setItems((xs) => {
      const area = xs[0]?.old?.area;
      const meta: ExerciseMeta = { titleText: `New exercise${area ? ` #${area}` : ""}`, minutes: 10, why: "", learnBefore: [], exploreMore: [] };
      return [...xs, { key: randomId(), from: null, old: null, meta, block: { title: "", cells: [{ type: "text", text: "What to do.", id: cellId() }] } }];
    });
  const insertCell = (i: number, at: AddAt, cell: Cell) => {
    const id = cellId();
    setItems((xs) => xs.map((x, k) => (k === i ? { ...x, block: insertAt(x.block, at, { ...cell, id } as Cell) } : x)));
    setSelected(id);
    // the next widget picked goes after this one
    setPicking((p) => (p ? { ...p, at: id } : p));
  };
  const done = () => {
    const next = editDay(plan, day, { exercises: items.map((it, i) => ({ from: it.from, exercise: exercises[i] })) }, randomId);
    if ("refused" in next) setRefused(next.refused);
    else onDone(next);
  };

  return (
    <div className="flex flex-col gap-5">
      {items.map((it, i) => {
        const warnings = it.old && exercises[i] === it.old ? [] : draftWarnings(exercises[i]);
        return (
          <section key={it.key} aria-label={`Exercise ${i + 1}: ${exercises[i].title}`} className="flex flex-col gap-3 rounded-2xl border border-slate-700/80 bg-slate-900/40 p-3 sm:p-4">
            <div className="flex items-center gap-1">
              <span className="mr-1 grid size-7 shrink-0 place-items-center rounded-full bg-slate-800 text-xs font-semibold text-slate-200">{i + 1}</span>
              <button type="button" className={iconButton} disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move exercise up: ${exercises[i].title}`} title="Move exercise up"><Icon name="arrow-up" size={14} /></button>
              <button type="button" className={iconButton} disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label={`Move exercise down: ${exercises[i].title}`} title="Move exercise down"><Icon name="arrow-up" size={14} className="rotate-180" /></button>
              <button type="button" className={`${button} ml-auto`} disabled={items.length <= MIN_EXERCISES} onClick={() => setItems((xs) => xs.filter((_, k) => k !== i))}>
                Remove exercise
              </button>
            </div>
            <ExerciseMetaForm meta={it.meta} onChange={(meta) => set(i, { meta })} />
            <BlockEditor block={it.block} onChange={(block) => set(i, { block: withIds(block, cellId) })} selected={selected} onSelect={setSelected} onAdd={(at) => setPicking({ i, at })} header={false} />
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={button} onClick={() => setPicking({ i, at: selected })}>Add a widget</button>
              {warnings.length > 0 && <CopyFix warnings={warnings} />}
            </div>
            {warnings.length > 0 && (
              <ul className="list-disc pl-5 text-xs text-amber-300">
                {warnings.map((w) => <li key={w}>{w}</li>)}
              </ul>
            )}
          </section>
        );
      })}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={button} disabled={items.length >= MAX_EXERCISES} onClick={add}>Add an exercise</button>
        <span className="text-xs text-slate-500">A day has {MIN_EXERCISES} to {MAX_EXERCISES} exercises.</span>
        <span className="ml-auto flex gap-2">
          <button type="button" className={button} onClick={onCancel}>Cancel</button>
          <button type="button" onClick={done} className="rounded-md bg-sky-500 px-4 py-1.5 text-sm font-semibold text-slate-950 hover:bg-sky-400">Done</button>
        </span>
      </div>
      {refused && <p className="text-sm text-amber-300">{refused}</p>}
      {picking !== null && host.picker?.({ block: items[picking.i].block, onCell: (cell) => insertCell(picking.i, picking.at, cell), onClose: () => setPicking(null) })}
    </div>
  );
}

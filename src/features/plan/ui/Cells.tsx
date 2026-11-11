"use client";

import { Fragment, useContext, useState, type ReactNode } from "react";
import Icon from "@/components/Icon";
import { SectionAsideContext } from "./SectionAside";
import Explained from "@/components/course/Explained";
import { explain, type Piece } from "@/features/course/glossary";
import { inlineNote, markRuns, noteRootFor, splitNotes, type NoteRoot } from "../model/noteText";
import InlineNote from "./InlineNote";
import type { Cell, Choice, PlainCell, SectionCell } from "../model/tools";
import { applyUnder, isOpen, layoutParts } from "../model/choice";
import ExerciseTool from "./ExerciseTool";
import ToolTour from "@/features/guide/ToolTour";
import { View as ChoiceChips } from "@/features/exercises/basics/choice";
import HeadphonesNotice from "@/features/stage/render/HeadphonesNotice";
import { ExerciseStep, StartExercise } from "@/components/practice/exerciseStep";

/**
 * Explained text with its `{{3}}` / `{{c-sharp}}` notes drawn as dots; a note that can't be read stays as text. A line
 * written `_like this_` is a care line (don't reach for high notes): it sits on a low, half-transparent band of amber.
 */
function NoteText({ pieces, root }: { pieces: Piece[]; root: NoteRoot | null }) {
  const parts = pieces.flatMap((p): (string | Exclude<Piece, string> | { note: string })[] => (typeof p === "string" ? splitNotes(p) : [p]));
  const draw = (part: (typeof parts)[number], key: string) => {
    if (typeof part === "string") return <span key={key}>{part}</span>;
    if ("term" in part) return <Explained key={key} pieces={[part]} />;
    const info = inlineNote(part.note, root);
    return info ? <InlineNote key={key} info={info} /> : <span key={key}>{`{{${part.note}}}`}</span>;
  };
  return markRuns(parts).map((run, i) => {
    const nodes = run.parts.map((part, j) => draw(part, `${i}-${j}`));
    return run.marked ? <CareLine key={i}>{nodes}</CareLine> : <Fragment key={i}>{nodes}</Fragment>;
  });
}

/** A care line in a step: brighter text over a low band of amber, the landing page's highlighter (`Mark`) in the colour of a caution. */
function CareLine({ children }: { children: ReactNode }) {
  return (
    <mark
      className="rounded-[2px] bg-transparent px-0.5 font-medium text-slate-50 [box-decoration-break:clone] [&_.cursor-help]:decoration-slate-200"
      style={{ backgroundImage: "linear-gradient(transparent 62%, color-mix(in oklab, var(--color-amber-400) 40%, transparent) 62%)" }}
    >
      {children}
    </mark>
  );
}

/**
 * A tool framed with its type named above it, in the review view (`SectionAside`), so the boundary between tool and text
 * reads. Its tour button sits at the end of the caption and walks only this frame.
 */
function ToolFrame({ type, children }: { type: string; children: ReactNode }) {
  const [root, setRoot] = useState<HTMLElement | null>(null);
  return (
    <figure ref={setRoot} className="my-1 overflow-hidden rounded-xl border border-slate-600/80 bg-slate-950/60">
      <figcaption className="flex items-center gap-2 border-b border-slate-700/70 bg-slate-800/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-300">
        <span aria-hidden className="size-1.5 rounded-full bg-amber-400" />
        {type.replace(/-/g, " ")}
        <span className="ml-auto normal-case tracking-normal"><ToolTour type={type} root={root} /></span>
      </figcaption>
      <div className="p-2">{children}</div>
    </figure>
  );
}

/** A tool on the plan page, unframed: its tour button on a slim row above it, walking only this tool. */
function ToolBox({ type, children }: { type: string; children: ReactNode }) {
  const [root, setRoot] = useState<HTMLElement | null>(null);
  return (
    <div ref={setRoot} className="flex flex-col gap-1 py-1">
      <div className="flex justify-end"><ToolTour type={type} root={root} /></div>
      {children}
    </div>
  );
}

/** A small button at the end of a step that scrolls back to the top of its exercise (the card around it). */
function ToExerciseTop() {
  return (
    <button
      type="button"
      onClick={(ev) => {
        const card = ev.currentTarget.closest("[data-tour='plan-exercise']") ?? ev.currentTarget.closest("section");
        card?.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
      className="inline-flex items-center gap-1 self-end rounded-md px-2 py-0.5 text-[11px] font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200"
    >
      <Icon name="arrow-up" size={12} />
      Top of exercise
    </button>
  );
}

/** One part of the block as drawn: the block's own cells (no heading), or a section. `from` is where its cells start in the flattened list. */
interface Part { id: string; section: SectionCell | null; choice: Choice | undefined; cells: PlainCell[]; from: number }

/**
 * A block's cells in the order the AI wrote them: paragraphs, numbered steps, notices and tools, top to bottom, with its
 * sections as steps (a heading on a rail, its minutes when it is a timed block). Each step is an `ExerciseStep`: when its
 * tools have more than one kind of thing to start (the mic and a drone, the mic and chords), a "Start exercise" button
 * sits above its first tool. A choice of options (the block's, or a section's own) shows its chips in the step's header:
 * the picked option sets the tools under it (and so the dots in the text), remounting them. An open choice sets its tools
 * and is not drawn. The aside (the review view) addresses cells by their place in the flattened list (`cellsOf`).
 */
export default function Cells({ cells, choice, address = "ex" }: { cells: Cell[]; /** the block's own choice */ choice?: Choice; /** which exercise, for a `SectionAside` */ address?: string }) {
  const aside = useContext(SectionAsideContext);
  // the review view (a host gives asides): frames its tools and rules its steps; the plan page keeps the plain layout
  const framed = !!aside;
  // the option picked per choice ("block", or a section's id), as an index into its options; not picked yet: option 1
  const [picked, setPicked] = useState<Record<string, number>>({});
  const pickOf = (id: string, c: Choice | undefined) => (c && !isOpen(c) ? Math.min(picked[id] ?? 0, c.options.length - 1) : 0);
  const blockAt = pickOf("block", choice);
  // the block's cells in document order: each run of own cells is a part, each section a part; a section's tools follow
  // the block's choice for every part its own choice does not set (`applyUnder`)
  const parts: Part[] = layoutParts(cells).map((p, k) => {
    const id = p.section ? `s${k}` : `own${k}`;
    const own = p.section?.choice;
    return { id, section: p.section, choice: own ?? choice, cells: applyUnder(p.cells, choice, blockAt, own, pickOf(id, own)), from: p.from };
  });
  const flat = parts.flatMap((p) => p.cells);
  // with an aside (a host's comments), each cell carries it; text-like cells shrink to their text so the aside sits at its end
  const withAside = (node: ReactNode, i: number) =>
    aside ? <div key={i} className={`group/sec relative ${flat[i].type === "tool" ? "" : "w-fit max-w-full pr-8"}`}>{node}{aside({ address, index: i, section: flat[i] })}</div> : node;
  // Glossary terms, each marked at its first use in the exercise: texts in order, a list's items one after another.
  const texts = flat.flatMap((s) => (s.type === "text" ? [s.text] : s.type === "list" ? s.items : []));
  const pieces = explain(texts);
  let n = 0;
  // the dots read the part's own (moved) tools first, not a later part's
  const rootAt = (p: Part, i: number) => noteRootFor(p.cells, i - p.from) ?? noteRootFor(flat, i);
  const item = (p: Part, s: PlainCell, i: number) => {
    switch (s.type) {
      case "text":
        // a line break in the text is a new line: what to do, the next thing to try, what to notice
        return <p key={i} className="max-w-3xl whitespace-pre-line text-[15px] leading-relaxed text-slate-300"><NoteText pieces={pieces[n++]} root={rootAt(p, i)} /></p>;
      case "list":
        return (
          <ol key={i} className="max-w-3xl list-decimal space-y-1.5 pl-5 text-[15px] leading-relaxed text-slate-300 marker:font-semibold marker:text-sky-400">
            {s.items.map((_, j) => <li key={j} className="pl-1"><NoteText pieces={pieces[n++]} root={rootAt(p, i)} /></li>)}
          </ol>
        );
      case "notice":
        return <HeadphonesNotice key={i} />;
      case "tool": {
        // a new option remounts the tool, so what it was playing stops
        const key = `${i}-${blockAt}-${p.section?.choice ? pickOf(p.id, p.section.choice) : ""}`;
        return framed
          ? <ToolFrame key={key} type={s.tool.type}><ExerciseTool tool={s.tool} /></ToolFrame>
          : <ToolBox key={key} type={s.tool.type}><ExerciseTool tool={s.tool} /></ToolBox>;
      }
    }
  };
  // the chips of a choice of options sit where the step-choice tool sat: after the text that names the selector, right
  // before the first tool they move ("Use the Key selector below"). A section's own: before its first tool; the block's:
  // before the first tool of the block, in document order.
  const chipRow = (id: string, c: Choice | undefined) => {
    if (!c || isOpen(c)) return null;
    const row = <ChoiceChips options={c.options} label={c.label} value={pickOf(id, c)} onChange={(index) => setPicked((k) => ({ ...k, [id]: index }))} />;
    return framed ? <ToolFrame type="choice">{row}</ToolFrame> : <div className="-mb-1 pt-1">{row}</div>;
  };
  const firstBlockTool = flat.findIndex((c) => c.type === "tool");
  // the part's items: the chips, then "Start exercise" (shown only when there is more than one thing to start), before its first tool
  const items = (p: Part) => {
    const firstTool = p.cells.findIndex((c) => c.type === "tool");
    return p.cells.map((c, j) => {
      const i = p.from + j;
      const node = withAside(item(p, c, i), i);
      if (j !== firstTool) return node;
      return (
        <Fragment key={i}>
          {i === firstBlockTool && chipRow("block", choice)}
          {p.section && chipRow(p.id, p.section.choice)}
          <StartExercise />
          {node}
        </Fragment>
      );
    });
  };
  // framed (the review view): each step after the first starts under a rule, so the parts of a singing exercise read apart
  return (
    <div className={framed ? "flex flex-col" : "flex flex-col gap-7"}>
      {parts.map((p, k) => {
        const rule = framed && k > 0 ? "mt-7 border-t-2 border-slate-700 pt-6" : "";
        if (!p.section) return <div key={p.id} className={rule}><ExerciseStep><div className="flex flex-col gap-3">{items(p)}</div></ExerciseStep></div>;
        return (
          <div key={p.id} className={rule}>
            <ExerciseStep>
              <div className="flex flex-col gap-3">
                <h4 className={`flex items-center gap-2.5 font-semibold text-slate-50 ${framed ? "text-lg" : "text-base"}`}>
                  <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-sky-400 ring-4 ring-sky-400/15" />
                  {p.section.heading}
                  {p.section.minutes && <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-medium tabular-nums text-slate-300">{p.section.minutes} min</span>}
                </h4>
                <div className="ml-[4px] flex flex-col gap-3 border-l border-slate-700/70 pl-5">{items(p)}<ToExerciseTop /></div>
              </div>
            </ExerciseStep>
          </div>
        );
      })}
    </div>
  );
}

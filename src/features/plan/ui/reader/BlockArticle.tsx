"use client";

import { Fragment, useContext, useState, type ReactNode } from "react";
import Icon from "@/components/Icon";
import { DISPLAY } from "@/components/landing/Display";
import { explain } from "@/features/course/glossary";
import { View as ChoiceChips } from "@/features/exercises/basics/choice";
import HeadphonesNotice from "@/features/stage/render/HeadphonesNotice";
import { ExerciseStep, StartExercise } from "@/components/practice/exerciseStep";
import { noteRootFor } from "../../model/noteText";
import { drawnParts, keyBarValue, pickAt, type DrawnPart, type Picks } from "../../model/choice";
import type { Choice, PlainCell } from "../../model/tools";
import type { Block } from "../../model/types";
import ExerciseTool from "../ExerciseTool";
import { CellAsideContext } from "./aside";
import KeyBar from "./KeyBar";
import { NoteText } from "./NoteText";
import ToolFigure from "./ToolFigure";

/**
 * The reader of a block: its title, then its cells as an article (text in a column, tools as figures, each section a step
 * under a thin rule with its heading, minutes and chips). One reader for a note (`page`) and a plan exercise (`card`); it
 * receives a `Block` and plain flags, never what the plan knows about the block.
 */
export type ReaderSize = "page" | "card";

/** Per size: the text column's width and the body text, the title's size. */
const SIZE: Record<ReaderSize, { measure: string; text: string; title: string; heading: string }> = {
  page: { measure: "w-full max-w-2xl", text: "text-base leading-relaxed sm:text-lg", title: "text-3xl leading-tight text-balance sm:text-4xl", heading: "text-xl sm:text-2xl" },
  card: { measure: "w-full max-w-3xl", text: "text-[15px] leading-relaxed", title: "text-xl", heading: "text-lg" },
};

/** A block's title in the display face, as the block stores it (its hashtags already read out). `done` strikes it through. */
export function BlockTitle({ title, size, done = false }: { title: string; size: ReaderSize; done?: boolean }) {
  const Tag = size === "page" ? "h2" : "h3";
  return <Tag className={`${SIZE[size].title} ${done ? "text-slate-400 line-through" : "text-slate-50"}`} style={DISPLAY}>{title}</Tag>;
}

/** A small button at the end of a section that scrolls back to the top of that section (its heading). */
function ToSectionTop() {
  return (
    <button
      type="button"
      onClick={(ev) => ev.currentTarget.closest("[data-plan-section]")?.scrollIntoView({ behavior: "smooth", block: "start" })}
      className="inline-flex items-center gap-1 self-end rounded-md px-2 py-0.5 text-[11px] font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200"
    >
      <Icon name="arrow-up" size={12} />
      Top of section
    </button>
  );
}

/**
 * A block's cells in the order they were written: paragraphs, numbered steps, notices and tools, top to bottom, with its
 * sections as steps (a heading under a rule, its minutes when it is a timed block). Each step is an `ExerciseStep`: when its
 * tools have more than one kind of thing to start, a "Start exercise" button sits above its first tool. A choice of options
 * shows its chips right before the first tool it moves (a section's own in that section, the block's before the block's
 * first tool); the picked option sets the tools under it (and the dots in the text), remounting them. An open choice sets
 * its tools; it is drawn as the key bar only when the host says `keyBar` (a note: a block with no exercise metadata).
 * Under a `CellAsideContext` (the review view) each cell carries the aside and each tool is framed with its type.
 */
export function BlockBody({ block, size, keyBar = false, address = "ex" }: { block: Block; size: ReaderSize; /** draw an open block choice as the key bar */ keyBar?: boolean; /** which block, for a cell aside */ address?: string }) {
  const aside = useContext(CellAsideContext);
  const [picks, setPicks] = useState<Picks>({});
  const { measure, text: textSize, heading } = SIZE[size];
  const look = aside ? "framed" : size === "page" ? "page" : "plain";
  const parts = drawnParts(block, picks);
  const flat = parts.flatMap((p) => p.cells);
  const bar = keyBarValue(block, keyBar);
  // with an aside, each cell carries it; text-like cells shrink to their text so the aside sits at its end
  const withAside = (node: ReactNode, i: number) =>
    aside ? <div key={i} className={`group/sec relative ${flat[i].type === "tool" ? "" : "w-fit max-w-full pr-8"}`}>{node}{aside({ address, index: i, section: flat[i] })}</div> : node;
  // glossary terms, each marked at its first use in the block: texts in order, a list's items one after another
  const pieces = explain(flat.flatMap((s) => (s.type === "text" ? [s.text] : s.type === "list" ? s.items : [])));
  let n = 0;
  // the dots read the part's own (moved) tools first, not a later part's
  const rootAt = (p: DrawnPart, i: number) => noteRootFor(p.cells, i - p.from) ?? noteRootFor(flat, i);
  const blockAt = pickAt(block.choice, picks, "block");
  const item = (p: DrawnPart, s: PlainCell, i: number) => {
    switch (s.type) {
      case "text":
        // a line break in the text is a new line: what to do, the next thing to try, what to notice
        return <p key={i} className={`${measure} whitespace-pre-line text-slate-300 ${textSize}`}><NoteText pieces={pieces[n++]} root={rootAt(p, i)} /></p>;
      case "list":
        return (
          <ol key={i} className={`${measure} list-decimal space-y-1.5 pl-5 text-slate-300 marker:font-semibold marker:text-sky-400 ${textSize}`}>
            {s.items.map((_, j) => <li key={j} className="pl-1"><NoteText pieces={pieces[n++]} root={rootAt(p, i)} /></li>)}
          </ol>
        );
      case "notice":
        return <div key={i} className={measure}><HeadphonesNotice /></div>;
      case "tool":
        // a new option remounts the tool, so what it was playing stops
        return <ToolFigure key={`${i}-${blockAt}-${p.chips ? pickAt(p.chips, picks, p.id) : ""}`} type={s.tool.type} look={look} measure={measure}><ExerciseTool tool={s.tool} /></ToolFigure>;
    }
  };
  const chipRow = (id: string, c: Choice | null | undefined) => {
    if (!c || "open" in c) return null;
    const row = <ChoiceChips options={c.options} label={c.label} value={pickAt(c, picks, id)} onChange={(index) => setPicks((k) => ({ ...k, [id]: index }))} />;
    return aside ? <ToolFigure type="choice" look="framed" measure={measure}>{row}</ToolFigure> : <div className={`-mb-1 pt-1 ${measure}`}>{row}</div>;
  };
  const firstBlockTool = flat.findIndex((c) => c.type === "tool");
  // the part's items: the chips, then "Start exercise" (shown only when there is more than one thing to start), before its first tool
  const items = (p: DrawnPart) => {
    const firstTool = p.cells.findIndex((c) => c.type === "tool");
    return p.cells.map((c, j) => {
      const i = p.from + j;
      const node = withAside(item(p, c, i), i);
      if (j !== firstTool) return node;
      return (
        <Fragment key={i}>
          {i === firstBlockTool && chipRow("block", block.choice)}
          {chipRow(p.id, p.chips)}
          <StartExercise />
          {node}
        </Fragment>
      );
    });
  };
  // like an article: each part after the first starts under a thin rule across the width, its heading plain text above
  // its cells, the minutes quiet beside it
  return (
    <div className="flex flex-col">
      {bar && <div className="mb-5"><KeyBar value={bar} measure={measure} /></div>}
      {parts.map((p, k) => {
        const rule = k > 0 ? "mt-8 border-t border-slate-700/70 pt-7" : "";
        if (!p.section) return <div key={p.id} className={rule}><ExerciseStep><div className="flex flex-col gap-3">{items(p)}</div></ExerciseStep></div>;
        return (
          <div key={p.id} data-plan-section className={`scroll-mt-4 ${rule}`}>
            <ExerciseStep>
              <div className="flex flex-col gap-3">
                <h4 className={`flex flex-wrap items-baseline gap-x-3 gap-y-0.5 font-semibold tracking-tight text-slate-50 ${aside ? "text-xl" : heading}`}>
                  {p.section.heading}
                  {p.section.minutes && <span className="text-xs font-medium tabular-nums tracking-normal text-slate-400">{p.section.minutes} min</span>}
                </h4>
                {items(p)}
                <ToSectionTop />
              </div>
            </ExerciseStep>
          </div>
        );
      })}
    </div>
  );
}

/**
 * A block read as an article on its own page (a note): its title, then its body at the page's size. `keyBar` draws an open
 * block choice as the key bar; leave it off for a block that has exercise metadata.
 */
export default function BlockArticle({ block, keyBar = false, address }: { block: Block; keyBar?: boolean; address?: string }) {
  return (
    <article aria-label={block.title} className="flex w-full flex-col gap-6">
      <BlockTitle title={block.title} size="page" />
      <BlockBody block={block} size="page" keyBar={keyBar} address={address} />
    </article>
  );
}

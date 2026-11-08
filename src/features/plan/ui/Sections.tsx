"use client";

import { Fragment, useContext, useState, type ReactNode } from "react";
import { SectionAsideContext } from "./SectionAside";
import Explained from "@/components/course/Explained";
import { explain, type Piece } from "@/features/course/glossary";
import { inlineNote, noteRootFor, splitNotes, type NoteRoot } from "../model/noteText";
import InlineNote from "./InlineNote";
import type { Section } from "../model/tools";
import { blocksOf } from "../model/blocks";
import ExerciseTool from "./ExerciseTool";
import ToolTour from "@/features/guide/ToolTour";
import KeyChoice from "./KeyChoice";
import { transposeStep } from "../model/transpose";
import { ExerciseStep, StartExercise } from "@/components/practice/exerciseStep";

/** Explained text with its `{{3}}` / `{{c-sharp}}` notes drawn as dots; a note that can't be read stays as text. */
function NoteText({ pieces, root }: { pieces: Piece[]; root: NoteRoot | null }) {
  return pieces.map((p, i) =>
    typeof p !== "string" ? <Explained key={i} pieces={[p]} /> : splitNotes(p).map((part, j) => {
      if (typeof part === "string") return <span key={`${i}-${j}`}>{part}</span>;
      const info = inlineNote(part.note, root);
      return info ? <InlineNote key={`${i}-${j}`} info={info} /> : <span key={`${i}-${j}`}>{`{{${part.note}}}`}</span>;
    }),
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

/**
 * An exercise's sections in the order the AI wrote them: headings, paragraphs, numbered steps and tools, top to bottom.
 * Each step (a heading and what follows it, or the intro) is an `ExerciseStep`: when its tools have more than one kind of
 * thing to start (the mic and a drone, the mic and chords), a "Start exercise" button sits above its first tool.
 * A heading with `keys` gets key chips: the picked key moves the step's tools (and so the dots in its text), remounting them.
 */
export default function Sections({ sections: written, address = "ex" }: { sections: Section[]; /** which exercise, for a `SectionAside` */ address?: string }) {
  const aside = useContext(SectionAsideContext);
  // the review view (a host gives asides): frames its tools and rules its steps; the plan page keeps the plain layout
  const framed = !!aside;
  // the key picked per step (by its heading's index); a step not picked yet is in its first key, as written
  const [picked, setPicked] = useState<Record<number, number>>({});
  const keyOf = (head: number) => {
    const h = written[head];
    return h.type === "heading" && h.keys ? (picked[head] ?? h.keys[0]) : null;
  };
  const sections = written.flatMap((s, i) => (s.type === "heading" && s.keys ? [i] : [])).reduce((all, head) => {
    const next = written.findIndex((s, i) => i > head && s.type === "heading");
    const end = next < 0 ? all.length : next;
    const keys = (written[head] as { keys: number[] }).keys;
    return [...all.slice(0, head + 1), ...transposeStep(all.slice(head + 1, end), keys, keyOf(head)!), ...all.slice(end)];
  }, written);
  // with an aside (a host's comments), each section carries it; text-like sections shrink to their text so the aside sits at its end
  const withAside = (node: ReactNode, i: number) =>
    aside ? <div key={i} className={`group/sec relative ${sections[i].type === "tool" ? "" : "w-fit max-w-full pr-8"}`}>{node}{aside({ address, index: i, section: sections[i] })}</div> : node;
  // a timed heading shows its block's minutes (fitted on paste to add up to the exercise's)
  const blockMinutes = new Map(blocksOf(sections).map((b) => [sections.findIndex((s, i) => i >= b.from && s.type === "heading" && !!s.minutes), b.minutes]));
  // Glossary terms, each marked at its first use in the exercise: texts in order, a list's items one after another.
  const texts = sections.flatMap((s) => (s.type === "text" ? [s.text] : s.type === "list" ? s.items : []));
  const pieces = explain(texts);
  let n = 0;
  // in a step with keys, the dots read the step's own (moved) tools first, not a later step's
  const rootAt = (i: number) => {
    const head = sections.findLastIndex((h, j) => j < i && h.type === "heading");
    if (head < 0 || keyOf(head) === null) return noteRootFor(sections, i);
    const next = sections.findIndex((h, j) => j > head && h.type === "heading");
    return noteRootFor(sections.slice(head + 1, next < 0 ? undefined : next), i - head - 1) ?? noteRootFor(sections, i);
  };
  const item = (s: Section, i: number) => {
    switch (s.type) {
      case "heading":
        return null;
      case "text":
        return <p key={i} className="max-w-3xl text-[15px] leading-relaxed text-slate-300"><NoteText pieces={pieces[n++]} root={rootAt(i)} /></p>;
      case "list":
        return (
          <ol key={i} className="max-w-3xl list-decimal space-y-1.5 pl-5 text-[15px] leading-relaxed text-slate-300 marker:font-semibold marker:text-sky-400">
            {s.items.map((_, j) => <li key={j} className="pl-1"><NoteText pieces={pieces[n++]} root={rootAt(i)} /></li>)}
          </ol>
        );
      case "tool": {
        // a new key remounts the tool, so what it was playing stops
        const head = sections.findLastIndex((h, j) => j < i && h.type === "heading");
        const key = `${i}-${head < 0 ? "" : keyOf(head) ?? ""}`;
        return framed
          ? <ToolFrame key={key} type={s.tool.type}><ExerciseTool tool={s.tool} /></ToolFrame>
          : <ToolBox key={key} type={s.tool.type}><ExerciseTool tool={s.tool} /></ToolBox>;
      }
    }
  };
  // a part per heading: the heading, then everything up to the next one on a rail beside it; what comes before the first heading is the intro
  const parts: { head: number | null; items: number[] }[] = [];
  // the step's items, "Start exercise" (shown only when there is more than one thing to start) before its first tool
  const stepItems = (items: number[]) => {
    const firstTool = items.find((i) => sections[i].type === "tool");
    return items.map((i) => (i === firstTool ? <Fragment key={i}><StartExercise />{withAside(item(sections[i], i), i)}</Fragment> : withAside(item(sections[i], i), i)));
  };
  sections.forEach((s, i) => {
    if (s.type === "heading") parts.push({ head: i, items: [] });
    else if (parts.length) parts[parts.length - 1].items.push(i);
    else parts.push({ head: null, items: [i] });
  });
  // framed (the review view): each step after the first starts under a rule, so the parts of a singing exercise read apart
  return (
    <div className={framed ? "flex flex-col" : "flex flex-col gap-7"}>
      {parts.map((p, k) => {
        const h = p.head === null ? null : sections[p.head];
        const rule = framed && k > 0 ? "mt-7 border-t-2 border-slate-700 pt-6" : "";
        if (!h || h.type !== "heading") return <div key={`intro-${p.items[0]}`} className={rule}><ExerciseStep><div className="flex flex-col gap-3">{stepItems(p.items)}</div></ExerciseStep></div>;
        return (
          <div key={p.head} className={rule}>
            <ExerciseStep>
              <div className="flex flex-col gap-3">
                {withAside(
                  <h4 key={p.head} className={`flex items-center gap-2.5 font-semibold text-slate-50 ${framed ? "text-lg" : "text-base"}`}>
                    <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-sky-400 ring-4 ring-sky-400/15" />
                    {h.text}
                    {blockMinutes.has(p.head!) && <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-medium tabular-nums text-slate-300">{blockMinutes.get(p.head!)} min</span>}
                  </h4>,
                  p.head!,
                )}
                {h.keys && <KeyChoice keys={h.keys} value={keyOf(p.head!)!} onChange={(pc) => setPicked((k) => ({ ...k, [p.head!]: pc }))} />}
                {p.items.length > 0 && <div className="ml-[4px] flex flex-col gap-3 border-l border-slate-700/70 pl-5">{stepItems(p.items)}</div>}
              </div>
            </ExerciseStep>
          </div>
        );
      })}
    </div>
  );
}

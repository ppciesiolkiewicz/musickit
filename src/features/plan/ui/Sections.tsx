"use client";

import Link from "next/link";
import Icon from "@/components/Icon";
import Explained from "@/components/course/Explained";
import { explain, type Piece } from "@/features/course/glossary";
import { inlineNote, noteRootFor, splitNotes, type NoteRoot } from "../model/noteText";
import InlineNote from "./InlineNote";
import type { Section } from "../model/tools";
import { blocksOf } from "../model/blocks";
import ExerciseTool from "./ExerciseTool";

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

/** An exercise's sections in the order the AI wrote them: headings, paragraphs, numbered steps, tools and links, top to bottom. */
export default function Sections({ sections }: { sections: Section[] }) {
  // a timed heading shows its block's minutes (fitted on paste to add up to the exercise's)
  const blockMinutes = new Map(blocksOf(sections).map((b) => [sections.findIndex((s, i) => i >= b.from && s.type === "heading" && !!s.minutes), b.minutes]));
  // Glossary terms, each marked at its first use in the exercise: texts in order, a list's items one after another.
  const texts = sections.flatMap((s) => (s.type === "text" ? [s.text] : s.type === "list" ? s.items : []));
  const pieces = explain(texts);
  let n = 0;
  const item = (s: Section, i: number) => {
    switch (s.type) {
      case "heading":
        return null;
      case "text":
        return <p key={i} className="max-w-3xl text-[15px] leading-relaxed text-slate-300"><NoteText pieces={pieces[n++]} root={noteRootFor(sections, i)} /></p>;
      case "list":
        return (
          <ol key={i} className="max-w-3xl list-decimal space-y-1.5 pl-5 text-[15px] leading-relaxed text-slate-300 marker:font-semibold marker:text-sky-400">
            {s.items.map((_, j) => <li key={j} className="pl-1"><NoteText pieces={pieces[n++]} root={noteRootFor(sections, i)} /></li>)}
          </ol>
        );
      case "tool":
        return <div key={i} className="py-1"><ExerciseTool tool={s.tool} /></div>;
      case "link":
        return (
          <Link key={i} href={s.href} className="inline-flex w-fit items-center gap-1 rounded-lg border border-sky-500/40 bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-100 hover:border-sky-400 hover:bg-sky-500/20">
            Open page <Icon name="chevron-right" size={12} />
          </Link>
        );
    }
  };
  // a part per heading: the heading, then everything up to the next one on a rail beside it; what comes before the first heading is the intro
  const parts: { head: number | null; items: number[] }[] = [];
  sections.forEach((s, i) => {
    if (s.type === "heading") parts.push({ head: i, items: [] });
    else if (parts.length) parts[parts.length - 1].items.push(i);
    else parts.push({ head: null, items: [i] });
  });
  return (
    <div className="flex flex-col gap-7">
      {parts.map((p) => {
        const h = p.head === null ? null : sections[p.head];
        if (!h || h.type !== "heading") return <div key={`intro-${p.items[0]}`} className="flex flex-col gap-3">{p.items.map((i) => item(sections[i], i))}</div>;
        return (
          <div key={p.head} className="flex flex-col gap-3">
            <h4 className="flex items-center gap-2.5 text-base font-semibold text-slate-50">
              <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-sky-400 ring-4 ring-sky-400/15" />
              {h.text}
              {blockMinutes.has(p.head!) && <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-medium tabular-nums text-slate-300">{blockMinutes.get(p.head!)} min</span>}
            </h4>
            {p.items.length > 0 && <div className="ml-[4px] flex flex-col gap-3 border-l border-slate-700/70 pl-5">{p.items.map((i) => item(sections[i], i))}</div>}
          </div>
        );
      })}
    </div>
  );
}

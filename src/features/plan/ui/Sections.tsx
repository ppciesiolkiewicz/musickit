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
  return (
    <div className="flex flex-col gap-3">
      {sections.map((s, i) => {
        switch (s.type) {
          case "heading":
            return (
              <h4 key={i} className="mt-2 flex items-center gap-2 border-b border-slate-800 pb-1 text-[15px] font-semibold text-slate-50">
                {s.text}
                {blockMinutes.has(i) && <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-medium tabular-nums text-slate-300">{blockMinutes.get(i)} min</span>}
              </h4>
            );
          case "text":
            return <p key={i} className="text-[15px] leading-relaxed text-slate-300"><NoteText pieces={pieces[n++]} root={noteRootFor(sections, i)} /></p>;
          case "list":
            return (
              <ol key={i} className="list-decimal space-y-1 pl-5 text-[15px] leading-relaxed text-slate-300 marker:font-semibold marker:text-sky-400">
                {s.items.map((_, j) => <li key={j}><NoteText pieces={pieces[n++]} root={noteRootFor(sections, i)} /></li>)}
              </ol>
            );
          case "tool":
            return <ExerciseTool key={i} tool={s.tool} />;
          case "link":
            return (
              <Link key={i} href={s.href} className="inline-flex w-fit items-center gap-1 rounded-lg border border-sky-500/40 bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-100 hover:border-sky-400 hover:bg-sky-500/20">
                Open page <Icon name="chevron-right" size={12} />
              </Link>
            );
        }
      })}
    </div>
  );
}

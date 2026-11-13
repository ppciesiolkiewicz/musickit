"use client";

import { Fragment, type ReactNode } from "react";
import Explained from "@/components/course/Explained";
import { keepTogether, type Piece } from "@/features/course/glossary";
import { inlineNote, markRuns, splitNotes, type NoteRoot } from "../../model/noteText";
import InlineNote from "../InlineNote";

/**
 * Explained text with its `{{3}}` / `{{c-sharp}}` notes drawn as dots; a note that can't be read stays as text. A line
 * written `_like this_` is a care line (don't reach for high notes): it sits on a low, half-transparent band of amber.
 */
export function NoteText({ pieces, root }: { pieces: Piece[]; root: NoteRoot | null }) {
  const parts = pieces.flatMap((p): (string | Exclude<Piece, string> | { note: string })[] => (typeof p === "string" ? splitNotes(p) : [p]));
  const draw = (part: (typeof parts)[number], key: string) => {
    if (typeof part === "string") return <span key={key}>{keepTogether(part)}</span>;
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
export function CareLine({ children }: { children: ReactNode }) {
  return (
    <mark
      className="rounded-[2px] bg-transparent px-0.5 font-medium text-slate-50 [box-decoration-break:clone] [&_.cursor-help]:decoration-slate-200"
      style={{ backgroundImage: "linear-gradient(transparent 62%, color-mix(in oklab, var(--color-amber-400) 40%, transparent) 62%)" }}
    >
      {children}
    </mark>
  );
}

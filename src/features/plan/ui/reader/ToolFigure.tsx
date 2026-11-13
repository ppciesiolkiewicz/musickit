"use client";

import { useState, type ReactNode } from "react";
import ToolTour from "@/features/guide/ToolTour";

/**
 * How a tool sits in the article: `plain` on a plan card (the tools carry their own frames), `framed` in the review view
 * (its type named in the caption, so the boundary between tool and text reads), `page` in a note (the note's figure frame).
 */
export type FigureLook = "plain" | "framed" | "page";

/** A tool as a figure of the article, with its own tour button walking only this tool. `measure` is the text column's width class. */
export default function ToolFigure({ type, look, measure, children }: { type: string; look: FigureLook; measure: string; children: ReactNode }) {
  const [root, setRoot] = useState<HTMLElement | null>(null);
  if (look === "framed")
    return (
      <figure ref={setRoot} className={`my-1 overflow-hidden rounded-xl border border-slate-600/80 bg-slate-950/60 ${measure}`}>
        <figcaption className="flex items-center gap-2 border-b border-slate-700/70 bg-slate-800/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-300">
          <span aria-hidden className="size-1.5 rounded-full bg-amber-400" />
          {type.replace(/-/g, " ")}
          <span className="ml-auto normal-case tracking-normal"><ToolTour type={type} root={root} /></span>
        </figcaption>
        <div className="p-2">{children}</div>
      </figure>
    );
  return (
    <figure ref={setRoot} className={`flex flex-col gap-1 py-1 ${measure} ${look === "page" ? "rounded-xl bg-slate-950 p-3 ring-1 ring-slate-800" : ""}`}>
      <div className="flex justify-end"><ToolTour type={type} root={root} /></div>
      {children}
    </figure>
  );
}

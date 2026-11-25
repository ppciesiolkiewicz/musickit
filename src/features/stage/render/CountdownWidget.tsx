"use client";

import { useContext } from "react";
import { TimelineContext } from "./TimelineContext";

/** The count-in: the caption as a heading on one line over a big number; nothing outside a timeline or when none is running. */
export default function CountdownWidget() {
  const c = useContext(TimelineContext)?.countdown;
  if (!c) return null;
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl bg-slate-950/80 px-8 py-5 text-center">
      <span className="whitespace-nowrap text-4xl font-semibold text-slate-50">{c.caption}</span>
      <span className="font-mono text-8xl font-bold leading-none text-sky-300">{c.left}</span>
    </div>
  );
}

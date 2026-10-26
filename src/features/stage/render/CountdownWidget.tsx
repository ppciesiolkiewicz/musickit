"use client";

import { useContext } from "react";
import { TimelineContext } from "./TimelineContext";

/** The count-in: a caption over a big number, on a dark pill; nothing outside a timeline or when none is running. */
export default function CountdownWidget() {
  const c = useContext(TimelineContext)?.countdown;
  if (!c) return null;
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl bg-slate-950/80 px-8 py-6 text-center">
      <span className="text-3xl font-medium text-slate-300">{c.caption}</span>
      <span className="font-mono text-9xl font-bold leading-none text-slate-50">{c.left}</span>
    </div>
  );
}

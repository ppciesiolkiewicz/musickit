"use client";

import { useContext } from "react";
import { TimelineContext } from "./TimelineContext";

/** The video's title and a line under it, on a dark pill; nothing outside a timeline or once the first countdown starts. */
export default function IntroWidget() {
  const intro = useContext(TimelineContext)?.intro;
  if (!intro) return null;
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl bg-slate-950/80 px-10 py-8 text-center">
      <span className="text-6xl font-bold leading-tight text-slate-50">{intro.title}</span>
      {intro.text && <span className="text-3xl text-slate-300">{intro.text}</span>}
    </div>
  );
}

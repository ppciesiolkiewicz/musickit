"use client";

import { useContext } from "react";
import { TimelineContext } from "./TimelineContext";

/** The tune after this one in solfège, bar by bar (in the intro the first tune), or "Last tune"; nothing outside a timeline. */
export default function NextWidget() {
  const tl = useContext(TimelineContext);
  if (!tl || (!tl.next && !tl.progress)) return null;
  const next = tl.next;
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-slate-950/80 px-8 py-5">
      <span className="text-2xl font-medium uppercase tracking-wide text-slate-400">{!next ? "Last tune" : tl.intro ? "First up" : `Next · tune ${next.tune}`}</span>
      {next && (
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-4xl font-semibold text-slate-100">
          {next.bars.map((bar, i) => (
            <span key={i} className="flex items-center gap-4">
              {i > 0 && <span className="text-slate-600">|</span>}
              {bar.join(" ")}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}

"use client";

import { useContext } from "react";
import { TimelineContext } from "./TimelineContext";

/** the solfège line's size by its length, so a 4-bar tune stays on one line and the label over it never changes size */
const lineSize = (chars: number) => (chars <= 30 ? "text-4xl" : chars <= 40 ? "text-3xl" : "text-2xl");

/**
 * The tune after this one in solfège, bar by bar on one line (a long tune in smaller letters, never wrapped), in the intro
 * the first tune, or "Last tune" in the same place; nothing outside a timeline.
 */
export default function NextWidget() {
  const tl = useContext(TimelineContext);
  if (!tl || (!tl.next && !tl.progress)) return null;
  const next = tl.next;
  const chars = next ? next.bars.map((b) => b.join(" ")).join(" | ").length : 0;
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-slate-950/80 px-8 py-5">
      <span className="text-2xl font-medium uppercase tracking-wide text-slate-400">{!next ? "Last tune" : tl.intro ? "First up" : `Next · tune ${next.tune}`}</span>
      {/* the line is always there (empty under "Last tune"), so the label keeps its place */}
      <span className={`flex h-10 items-center gap-4 whitespace-nowrap font-semibold text-slate-100 ${lineSize(chars)}`}>
        {next?.bars.map((bar, i) => (
          <span key={i} className="flex items-center gap-4">
            {i > 0 && <span className="text-slate-600">|</span>}
            {bar.join(" ")}
          </span>
        ))}
      </span>
    </div>
  );
}

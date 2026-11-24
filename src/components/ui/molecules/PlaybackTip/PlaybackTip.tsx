import type { ReactNode } from "react";

/**
 * The line under a tool that says what to do right now, in step with what is playing: "Tip" and the text while
 * `live`, else `idle` (what to do before it starts, or after). The text changes with the music, so screen readers
 * hear it (`aria-live`). Keeps its height, so the tool doesn't jump as the text changes.
 */
export function PlaybackTip({ live, children, idle, label = "Tip", className = "" }: { live: boolean; children: ReactNode; idle?: ReactNode; label?: string; className?: string }) {
  if (!live && !idle) return null;
  return (
    <p aria-live="polite" className={`min-h-10 text-sm leading-snug text-slate-300 ${className}`}>
      {live ? <><span className="mr-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</span>{children}</> : idle}
    </p>
  );
}

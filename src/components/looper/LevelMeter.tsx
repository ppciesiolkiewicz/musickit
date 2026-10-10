"use client";

import { useEffect, useRef } from "react";

/** Live input level bar. Reads the level every animation frame without re-rendering React. */
export default function LevelMeter({ getLevel, vertical = false, small = false }: { getLevel: () => number; vertical?: boolean; small?: boolean }) {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    let shown = 0;
    const tick = () => {
      const v = getLevel();
      shown = Math.max(v, shown * 0.92); // fast attack, slow release
      if (bar.current) {
        const pct = `${Math.min(100, shown * 100)}%`;
        if (vertical) bar.current.style.height = pct;
        else bar.current.style.width = pct;
        bar.current.style.background = shown > 0.95 ? "#f43f5e" : shown > 0.7 ? "#fbbf24" : "#34d399";
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getLevel, vertical]);
  if (vertical) {
    return (
      <div className={`flex ${small ? "h-4 w-1" : "h-8 w-1.5"} shrink-0 flex-col self-center justify-end overflow-hidden rounded-full bg-slate-800`} role="meter" aria-label="Level" aria-valuemin={0} aria-valuemax={1}>
        <div ref={bar} className="h-0 w-full rounded-full" />
      </div>
    );
  }
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800" role="meter" aria-label="Input level" aria-valuemin={0} aria-valuemax={1}>
      <div ref={bar} className="h-full w-0 rounded-full" />
    </div>
  );
}

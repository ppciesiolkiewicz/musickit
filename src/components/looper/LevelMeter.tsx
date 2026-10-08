"use client";

import { useEffect, useRef } from "react";

/** Live input level bar. Reads the level every animation frame without re-rendering React. */
export default function LevelMeter({ getLevel }: { getLevel: () => number }) {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    let shown = 0;
    const tick = () => {
      const v = getLevel();
      shown = Math.max(v, shown * 0.92); // fast attack, slow release
      if (bar.current) {
        bar.current.style.width = `${Math.min(100, shown * 100)}%`;
        bar.current.style.background = shown > 0.95 ? "#f43f5e" : shown > 0.7 ? "#fbbf24" : "#34d399";
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getLevel]);
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800" role="meter" aria-label="Input level" aria-valuemin={0} aria-valuemax={1}>
      <div ref={bar} className="h-full w-0 rounded-full" />
    </div>
  );
}

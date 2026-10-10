"use client";

import { useEffect, useRef, useState } from "react";
import type { LooperEngine } from "@/lib/looper/engine";

/**
 * The Looping header's timeline: one segment per bar of the cycle (the longest loop, or one bar), beat ticks inside,
 * the current bar lit and a playhead. A take that grows the loop adds segments live, filled red; a count-in shows hollow.
 */
export default function Timeline({ engine, beatsPerBar }: { engine: LooperEngine; beatsPerBar: number }) {
  const [shape, setShape] = useState({ cycle: 1, take: 0, countIn: false });
  const head = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const segs = useRef<(HTMLDivElement | null)[]>([]) as { current: (HTMLDivElement | null)[] };

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const t = engine.getTimeline();
      const cycle = t?.cycle ?? 1;
      const take = t?.take?.totalBars ?? 0;
      const countIn = t?.countIn ?? false;
      setShape((s) => (s.cycle === cycle && s.take === take && s.countIn === countIn ? s : { cycle, take, countIn }));
      const live = t !== null && (t.state === "running" || t.state === "stopping");
      if (head.current) {
        head.current.style.left = `${(live ? t.fraction : 0) * 100}%`;
        head.current.style.opacity = live ? "1" : "0";
      }
      segs.current.forEach((el, i) => {
        if (el) el.style.opacity = live && i === t.bar ? "1" : t?.take && i < t.take.bar ? "0.85" : "0.35";
      });
      if (label.current) label.current.textContent = t?.take ? `bar ${t.take.bar} / ${t.take.totalBars}` : live ? `bar ${t.bar + 1} / ${cycle}` : t?.countIn ? `count-in ${t.beat + 1}` : "";
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [engine]);

  const recording = shape.take > 0;
  return (
    <div className="flex min-w-[8rem] flex-1 items-center gap-2">
      <div className="relative flex h-3 flex-1 gap-0.5" role="img" aria-label="Position in the loop, by bars">
        {Array.from({ length: shape.cycle }, (_, i) => (
          <div key={i} ref={(el) => { segs.current[i] = el; }} className={`relative flex-1 overflow-hidden rounded-sm ${shape.countIn ? "border border-sky-400/60 bg-transparent" : recording ? "bg-rose-500" : "bg-sky-400"}`} style={{ opacity: 0.35 }}>
            {Array.from({ length: beatsPerBar - 1 }, (_, b) => (
              <span key={b} className="absolute top-0 h-full w-px bg-slate-950/50" style={{ left: `${((b + 1) / beatsPerBar) * 100}%` }} />
            ))}
          </div>
        ))}
        <div ref={head} className="pointer-events-none absolute -top-0.5 h-4 w-0.5 rounded bg-white" style={{ left: 0, opacity: 0 }} />
      </div>
      <span ref={label} className="w-20 shrink-0 text-right text-[11px] tabular-nums text-slate-400" aria-live="off" />
    </div>
  );
}

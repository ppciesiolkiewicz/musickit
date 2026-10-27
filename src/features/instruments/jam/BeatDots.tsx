"use client";

import { useEffect, useRef } from "react";
import { BEATS_PER_BAR, type JamRig } from "./rig";

/**
 * One dot per beat of the shared grid, the current one lit and beat 1 amber; read every frame, so React does not re-render.
 * Small and hidden on a phone for the pocket tools; `big` for the jam's metronome card, shown everywhere.
 */
export default function BeatDots({ rig, playing, big = false }: { rig: JamRig; playing: boolean; big?: boolean }) {
  const refs = useRef<(HTMLSpanElement | null)[]>([]);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const b = playing ? rig.beatNow() : null;
      refs.current.forEach((el, i) => {
        if (!el) return;
        el.style.opacity = b === i ? "1" : "0.3";
        el.style.transform = b === i ? "scale(1.3)" : "scale(1)";
      });
      if (playing) raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [rig, playing]);
  return (
    <span className={big ? "flex shrink-0 items-center gap-2.5 px-1" : "hidden w-14 items-center justify-center gap-1 sm:flex"} aria-hidden>
      {Array.from({ length: BEATS_PER_BAR }, (_, i) => (
        <span key={i} ref={(el) => { refs.current[i] = el; }} className={`${big ? "h-3.5 w-3.5" : "h-2 w-2"} rounded-full opacity-30 transition-transform duration-75 ${i === 0 ? "bg-amber-400" : "bg-sky-400"}`} />
      ))}
    </span>
  );
}

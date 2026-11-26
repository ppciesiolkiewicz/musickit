"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cueAt, type Cue } from "../model/standIn";

export const NOT_FILMED = "Not filmed yet: the words of the video, in time.";
export const PLAY = "Play";
export const PAUSE = "Pause";

const clockText = (s: number): string => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/**
 * A stand-in video: black, with what is said as captions and what is on screen above them, at reading pace (`scriptCues`).
 * Play, Pause and a time bar, like a video's own controls. No file, no sound. Replaced by the recorded video once there is one.
 */
export default function ScriptVideo({ title, seconds, cues, autoPlay = false, className = "", style }: {
  title: string; seconds: number; cues: Cue[]; autoPlay?: boolean; className?: string; style?: CSSProperties;
}) {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(autoPlay);
  const at = useRef(0); // the time now, for the clock to start from
  const from = useRef<{ wall: number; at: number } | null>(null); // where the running clock started

  useEffect(() => {
    if (!playing) { from.current = null; return; }
    let frame = 0;
    const tick = (now: number) => {
      if (!from.current) from.current = { wall: now, at: at.current };
      const next = Math.min(seconds, from.current.at + (now - from.current.wall) / 1000);
      at.current = next;
      setT(next);
      if (next >= seconds) { setPlaying(false); return; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, seconds]);

  const seek = (to: number) => {
    at.current = to;
    from.current = null; // a running clock starts again from here on its next frame
    setT(to);
  };
  const toggle = () => {
    if (!playing && at.current >= seconds) seek(0);
    setPlaying((p) => !p);
  };
  const cue = cueAt(cues, t);

  return (
    <div role="group" aria-label={title} style={style} className={`relative flex flex-col overflow-hidden bg-black text-white ${className}`}>
      <p className="px-4 pt-3 text-xs italic text-slate-400 sm:text-sm">{cue?.show}</p>
      <div className="flex flex-1 items-center justify-center px-6">
        <p aria-live="polite" className="max-w-2xl text-center text-base leading-snug sm:text-xl">{cue?.say}</p>
      </div>
      <p className="px-4 text-[11px] text-slate-500">{NOT_FILMED}</p>
      <div className="flex items-center gap-2 px-3 pb-2 pt-1 text-xs text-slate-300">
        <button type="button" onClick={toggle} className="rounded border border-slate-600 px-2 py-0.5 hover:border-slate-300">{playing ? PAUSE : PLAY}</button>
        <input type="range" min={0} max={seconds} step={0.1} value={t} aria-label="Time in the video"
          onChange={(e) => seek(Number(e.target.value))} className="flex-1 accent-violet-400" />
        <span className="tabular-nums">{clockText(t)} / {clockText(seconds)}</span>
      </div>
    </div>
  );
}

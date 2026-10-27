"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import Icon from "@/components/Icon";
import { getAudioContext } from "@/features/sound";
import { clockTime, waveformBars } from "./recorder";

const BARS = 44;

/** The one take playing: starting another pauses it. */
let playing: HTMLAudioElement | null = null;

/**
 * One take's player, all our own, on one row as tall as the browser's: play, the take's waveform as the seek bar (click or drag
 * anywhere on it; arrows step 5 s) with the played part lit, and the time; the length is in the take's header. `seconds` is the recorded length, since a recorded WebM often reports no duration.
 */
export default function TakePlayer({ url, seconds, label }: { url: string; seconds: number; label: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [on, setOn] = useState(false);
  const [time, setTime] = useState(0);
  const [bars, setBars] = useState<number[] | null>(null);
  const duration = seconds || 1;

  // the waveform, decoded once from the take itself
  useEffect(() => {
    let live = true;
    void fetch(url)
      .then((r) => r.arrayBuffer())
      .then((buf) => getAudioContext().decodeAudioData(buf))
      .then((b) => live && setBars(waveformBars(b.getChannelData(0), BARS)))
      .catch(() => live && setBars(Array(BARS).fill(0.3)));
    return () => {
      live = false;
    };
  }, [url]);

  // the clock follows every frame while it plays
  useEffect(() => {
    if (!on) return;
    let raf = 0;
    const tick = () => {
      if (audio.current) setTime(audio.current.currentTime);
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [on]);

  useEffect(() => () => {
    if (playing === audio.current) playing = null;
  }, []);

  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (!a.paused) return a.pause();
    if (playing && playing !== a) playing.pause();
    playing = a;
    if (a.currentTime >= duration - 0.05) a.currentTime = 0;
    void a.play();
  };
  const seek = (t: number) => {
    const a = audio.current;
    const to = Math.max(0, Math.min(duration, t));
    if (a) a.currentTime = to;
    setTime(to);
  };
  const seekAt = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    seek(((e.clientX - r.left) / r.width) * duration);
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === "ArrowRight" || e.key === "ArrowUp" ? 5 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -5 : 0;
    if (e.key === "Home") seek(0);
    else if (e.key === "End") seek(duration);
    else if (step) seek(time + step);
    else return;
    e.preventDefault();
  };

  const played = Math.min(1, time / duration);
  return (
    <div className="flex h-9 items-center gap-2">
      <audio ref={audio} src={url} preload="auto" onPlay={() => setOn(true)} onPause={() => setOn(false)}
        onEnded={() => { setOn(false); setTime(duration); }} />
      <button type="button" onClick={toggle} aria-label={on ? `Pause ${label}` : `Play ${label}`}
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border transition focus-visible:outline-2 focus-visible:outline-sky-400 ${on ? "border-emerald-400/70 bg-emerald-500/20 text-emerald-100" : "border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-400"}`}>
        <Icon name={on ? "square" : "play"} size={on ? 12 : 15} fill className={on ? "" : "translate-x-px"} />
      </button>
      <div role="slider" tabIndex={0} aria-label={`Position in ${label}`} aria-valuemin={0} aria-valuemax={Math.round(duration)} aria-valuenow={Math.round(time)} aria-valuetext={`${clockTime(time)} of ${clockTime(duration)}`}
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); seekAt(e); }}
          onPointerMove={(e) => e.currentTarget.hasPointerCapture(e.pointerId) && seekAt(e)}
          onKeyDown={onKey}
        className="relative flex h-full min-w-0 flex-1 cursor-pointer touch-none items-center gap-px rounded-md focus-visible:outline-2 focus-visible:outline-sky-400">
        {(bars ?? Array(BARS).fill(0.08)).map((h, i) => (
          <span key={i} aria-hidden className={`flex-1 rounded-full transition-colors ${(i + 0.5) / BARS <= played ? "bg-rose-400" : "bg-slate-600"}`}
            style={{ height: `${Math.max(10, h * 100)}%` }} />
        ))}
        {/* the playhead */}
        <span aria-hidden className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 rounded-full bg-slate-100 shadow" style={{ left: `${played * 100}%` }} />
      </div>
      <span className="shrink-0 text-[11px] tabular-nums text-slate-400">{clockTime(time)}</span>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "../Icon";
import type { LooperEngine, LooperSnapshot } from "@/lib/looper/engine";

const field = "h-8 rounded-md border border-slate-700 bg-slate-900 px-2 text-xs text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";

/**
 * The metronome, floating at the top of the page under the main nav: start/stop, tempo and beat dots in one group,
 * with every other option (beats per bar, count-in, quantise, click) in a popover.
 */
export default function MetronomeBar({ engine, snap, ready }: { engine: LooperEngine; snap: LooperSnapshot; ready: boolean }) {
  const m = snap.metronome;
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => wrap.current && !wrap.current.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", down);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("keydown", key);
    };
  }, [open]);

  const set = (p: Partial<typeof m>) => engine.do({ type: "metronome.set", patch: p });
  const running = m.running;
  return (
    <div ref={wrap} className="relative">
      <div className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/95 p-1.5 shadow-lg backdrop-blur" role="group" aria-label="Metronome">
        <button type="button" className={`grid h-9 w-9 place-items-center rounded-lg border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 disabled:opacity-40 ${m.manual ? "border-sky-400 bg-sky-500/20 text-sky-100" : "border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500"}`} aria-pressed={m.manual} onClick={() => engine.do({ type: "metronome.toggle" })} disabled={!ready} title={m.manual ? "Stop the metronome" : "Start the metronome"} aria-label={m.manual ? "Stop the metronome" : "Start the metronome"}>
          <Icon name={m.manual ? "square" : "play"} fill />
        </button>
        <span className="flex items-center gap-0.5 rounded-lg border border-slate-700 bg-slate-900 px-1" title={m.locked ? "Tempo is locked while there is a loop. Clear every loop to change it." : "Tempo"}>
          <button type="button" className="px-1 text-slate-300 disabled:opacity-40" disabled={m.locked} onClick={() => set({ bpm: m.bpm - 1 })} aria-label="Slower">−</button>
          <input type="number" min={40} max={240} value={m.bpm} disabled={m.locked} onChange={(e) => set({ bpm: Number(e.target.value) })} aria-label="Beats per minute" className="h-8 w-11 bg-transparent text-center text-sm tabular-nums text-slate-100 focus:outline-none disabled:opacity-60" />
          <button type="button" className="px-1 text-slate-300 disabled:opacity-40" disabled={m.locked} onClick={() => set({ bpm: m.bpm + 1 })} aria-label="Faster">+</button>
        </span>
        <input type="range" min={40} max={240} step={1} value={m.bpm} disabled={m.locked} onChange={(e) => set({ bpm: Number(e.target.value) })} className="w-24 accent-sky-400 disabled:opacity-40 sm:w-32" aria-label="Tempo slider" title={m.locked ? "Tempo is locked while there is a loop" : `${m.bpm} bpm`} />
        {m.showBeat && <BeatDots engine={engine} count={m.beatsPerBar} />}
        {running && m.audible === false && (
          <button type="button" className="grid h-9 w-9 place-items-center rounded-lg border border-amber-400/60 bg-slate-900 text-amber-200 hover:border-amber-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400" onClick={() => set({ audible: true })} title="The click is silent: tap to hear it" aria-label="Unmute the click"><Icon name="bell-off" /></button>
        )}
        <button type="button" className={`grid h-9 w-9 place-items-center rounded-lg border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${open ? "border-sky-400 text-sky-200" : "border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500"}`} aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((v) => !v)} title="Metronome options" aria-label="Metronome options">
          <Icon name="metronome" />
        </button>
      </div>

      {open && (
        <div role="dialog" aria-label="Metronome options" className="absolute left-0 top-full mt-1.5 flex w-72 max-w-[calc(100vw-1rem)] flex-col gap-2 rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-slate-300 shadow-2xl">
          <label className="flex items-center justify-between gap-2">
            Beats per bar
            <select className={field} value={m.beatsPerBar} disabled={m.locked} onChange={(e) => set({ beatsPerBar: Number(e.target.value) })}>
              {[2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label className="flex items-center justify-between gap-2">
            Count-in
            <select className={field} value={m.countInBars} onChange={(e) => set({ countInBars: Number(e.target.value) })}>
              {[0, 1, 2].map((n) => <option key={n} value={n}>{n === 0 ? "none" : `${n} bar${n === 1 ? "" : "s"}`}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <Icon name="volume-2" />
            <input type="range" min={0} max={1} step={0.01} value={m.volume} onChange={(e) => set({ volume: Number(e.target.value) })} className="flex-1 accent-sky-400" aria-label="Click volume" />
          </label>
          <label className="flex items-center gap-2"><input type="checkbox" className="accent-sky-400" checked={m.audible} onChange={(e) => set({ audible: e.target.checked })} /> Hear the click</label>
          <label className="flex items-center gap-2"><input type="checkbox" className="accent-sky-400" checked={m.showBeat} onChange={(e) => set({ showBeat: e.target.checked })} /> Show beat dots</label>
          <p className="text-[11px] text-slate-500">The click runs whenever you record or play and is never recorded. {m.locked ? "Tempo and beats per bar are locked while there is a loop." : "The count-in plays before the first take and before the metronome starts on its own."}</p>
        </div>
      )}
    </div>
  );
}

/** One dot per beat of the bar, the current one lit, the downbeat in amber. Hollow dots during the count-in. */
function BeatDots({ engine, count }: { engine: LooperEngine; count: number }) {
  const refs = useRef<(HTMLSpanElement | null)[]>([]) as { current: (HTMLSpanElement | null)[] };
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const p = engine.getBeat();
      refs.current.forEach((el, i) => {
        if (!el) return;
        const on = p !== null && p.beat === i;
        el.style.opacity = on ? "1" : "0.35";
        el.style.transform = on ? "scale(1.25)" : "scale(1)";
        el.style.background = p?.countIn ? "transparent" : i === 0 ? "#fbbf24" : "#38bdf8";
        el.style.borderColor = i === 0 ? "#fbbf24" : "#38bdf8";
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [engine, count]);
  return (
    <span className="flex items-center gap-1.5 px-1" role="img" aria-label="Beat indicator">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} ref={(el) => { refs.current[i] = el; }} className="h-2.5 w-2.5 rounded-full border opacity-35 transition-transform duration-75" />
      ))}
    </span>
  );
}

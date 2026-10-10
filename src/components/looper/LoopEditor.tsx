"use client";

import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import Icon from "../Icon";
import { Modal } from "../Modal";
import type { ChannelInfo, LooperEngine } from "@/lib/looper/engine";
import { DEFAULT_EDIT, isDefaultEdit, minMax, normaliseGain, seamFrames, shiftRange, type LoopEdit } from "@/lib/looper/loopEdit";

const btn = "grid h-7 min-w-7 place-items-center rounded-md border border-slate-700 bg-slate-900 px-1.5 text-[11px] text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40";
const H = 150;
const toDb = (g: number) => (g <= 0 ? -60 : 20 * Math.log10(g));
const fromDb = (db: number) => (db <= -60 ? 0 : Math.pow(10, db / 20));

/** The waveform of a loop with the sound kept around it, and its basic edits: slide, gain, reverse, fades and a smooth seam. */
export default function LoopEditor({ engine, ch, colour, onClose }: { engine: LooperEngine; ch: ChannelInfo; colour: string; onClose: () => void }) {
  // the take grows once the margin after it has been recorded, which also changes the snapshot
  const take = engine.getTake(ch.id);
  const edit = ch.edit;
  const set = (e: Partial<LoopEdit>) => engine.do({ type: "loop.edit", id: ch.id, edit: e });
  // the dialog is drawn into the page one render late, so the box is measured when it appears (a callback ref), not on mount
  const [box, setBox] = useState<HTMLDivElement | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const head = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);

  useLayoutEffect(() => {
    const el = box;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(Math.max(200, el.clientWidth)));
    ro.observe(el);
    setWidth(Math.max(200, el.clientWidth));
    return () => ro.disconnect();
  }, [box]);

  const total = take?.l.length ?? 1;
  const from = take ? take.start + edit.shift : 0;
  const x = (frame: number) => (frame / total) * width;

  // the whole take, dimmed outside the loop window
  useEffect(() => {
    const c = canvas.current;
    if (!c || !take) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.round(width * dpr);
    c.height = Math.round(H * dpr);
    const g = c.getContext("2d");
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, width, H);
    const cols = Math.max(1, Math.floor(width));
    const L = minMax(take.l, 0, take.l.length, cols);
    const R = minMax(take.r, 0, take.r.length, cols);
    const mid = H / 2;
    const a = x(from);
    const b = x(from + take.length);
    g.fillStyle = `${colour}1f`;
    g.fillRect(a, 0, b - a, H);
    for (let i = 0; i < cols; i++) {
      const inside = i >= a && i < b;
      g.fillStyle = inside ? colour : "#475569";
      const hi = Math.max(L.max[i], R.max[i]);
      const lo = Math.min(L.min[i], R.min[i]);
      g.fillRect(i, mid - hi * mid, 1, Math.max(1, (hi - lo) * mid));
    }
    const seam = seamFrames(take, edit, take.sampleRate);
    if (seam > 0) {
      g.fillStyle = "#fbbf2433";
      g.fillRect(x(from - seam), 0, x(seam), H);
      g.fillRect(b - x(seam), 0, x(seam), H);
    }
    g.fillStyle = colour;
    g.fillRect(a - 1, 0, 2, H);
    g.fillRect(b - 1, 0, 2, H);
    g.fillStyle = "#1e293b";
    g.fillRect(0, mid, width, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [take?.l, take?.length, take?.start, width, from, colour, edit.seam, box]);

  // the play head, where the loop is now
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const p = engine.getChannelPosition(ch.id);
      if (head.current && take) {
        head.current.style.display = p === null ? "none" : "block";
        if (p !== null) head.current.style.left = `${x(from + (edit.reverse ? 1 - p : p) * take.length)}px`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, ch.id, take?.length, from, edit.reverse, width, total]);

  if (!take) {
    return (
      <Modal title={ch.name} onClose={onClose}>
        <p className="text-sm text-slate-400">Nothing recorded on this loop yet.</p>
      </Modal>
    );
  }

  const sr = take.sampleRate;
  const range = shiftRange(take);
  const ms = (f: number) => Math.round((f / sr) * 1000);
  const nudge = (msDelta: number) => set({ shift: Math.min(range.max, Math.max(range.min, edit.shift + Math.round((msDelta / 1000) * sr))) });

  // drag the waveform to slide the loop window over the take
  const onDrag = (e: RPointerEvent) => {
    if (e.button !== 0) return;
    const sx = e.clientX;
    const base = edit.shift;
    let last = base;
    const move = (ev: PointerEvent) => {
      // the window follows the pointer over the still waveform
      const next = Math.min(range.max, Math.max(range.min, Math.round(base + ((ev.clientX - sx) / width) * total)));
      if (next !== last) set({ shift: (last = next) });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", () => window.removeEventListener("pointermove", move), { once: true });
  };

  const db = toDb(edit.gain);
  return (
    <Modal title={<span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: colour }} />{ch.name}</span>} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div ref={setBox} className="relative cursor-ew-resize overflow-hidden rounded-lg border border-slate-800 bg-slate-950" style={{ height: H, touchAction: "none" }} onPointerDown={onDrag} title="Drag to slide the loop over the take">
          <canvas ref={canvas} style={{ width, height: H }} className="block" aria-label={`Waveform of ${ch.name}`} />
          <div ref={head} className="pointer-events-none absolute top-0 h-full w-px bg-white/80" style={{ display: "none" }} />
          <span className="pointer-events-none absolute left-1 top-1 text-[10px] text-slate-500">{(take.start / sr).toFixed(2)} s before</span>
          <span className="pointer-events-none absolute right-1 top-1 text-[10px] text-slate-500">{((take.l.length - take.start - take.length) / sr).toFixed(2)} s after</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" className={`${btn} ${ch.active ? "!border-emerald-500/70 !text-emerald-200" : ""}`} onClick={() => engine.do({ type: "loop.active", id: ch.id, on: !ch.active })} aria-pressed={ch.active} title={ch.active ? "Stop on the next beat" : "Start on the next beat"} aria-label={ch.active ? `Stop ${ch.name}` : `Start ${ch.name}`}><Icon name={ch.active ? "square" : "play"} size={11} fill /></button>
          <button type="button" className={`${btn} ${ch.solo ? "!border-sky-400 !text-sky-200" : ""}`} onClick={() => engine.do({ type: "loop.solo", id: ch.id, solo: !ch.solo })} aria-pressed={ch.solo} title="Solo" aria-label={`Solo ${ch.name}`}>S</button>
          <span className="mx-1 h-5 w-px bg-slate-800" />
          <span className="text-[11px] text-slate-400">Slide</span>
          <button type="button" className={btn} onClick={() => nudge(-10)} disabled={edit.shift <= range.min} title="10 ms earlier" aria-label="Slide 10 ms earlier"><Icon name="chevron-left" size={12} />10</button>
          <button type="button" className={btn} onClick={() => nudge(-1)} disabled={edit.shift <= range.min} title="1 ms earlier" aria-label="Slide 1 ms earlier"><Icon name="chevron-left" size={12} />1</button>
          <span className="w-16 text-center text-[11px] tabular-nums text-slate-200" title="Slide from the take as recorded">{ms(edit.shift) > 0 ? "+" : ""}{ms(edit.shift)} ms</span>
          <button type="button" className={btn} onClick={() => nudge(1)} disabled={edit.shift >= range.max} title="1 ms later" aria-label="Slide 1 ms later">1<Icon name="chevron-right" size={12} /></button>
          <button type="button" className={btn} onClick={() => nudge(10)} disabled={edit.shift >= range.max} title="10 ms later" aria-label="Slide 10 ms later">10<Icon name="chevron-right" size={12} /></button>
          <span className="mx-1 h-5 w-px bg-slate-800" />
          <button type="button" className={`${btn} ${edit.reverse ? "!border-sky-400 !text-sky-200" : ""}`} onClick={() => set({ reverse: !edit.reverse })} aria-pressed={edit.reverse} title="Play backwards">Reverse</button>
          <button type="button" className={btn} onClick={() => set({ gain: normaliseGain(take, edit, sr) })} title="Bring the loudest peak just under full scale">Normalise</button>
          <button type="button" className={`${btn} ml-auto`} disabled={isDefaultEdit(edit)} onClick={() => set({ ...DEFAULT_EDIT })} title="Back to the take as recorded" aria-label="Reset edits"><Icon name="rotate-ccw" size={12} /></button>
        </div>

        <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
          <Slider label="Gain" value={Math.max(-24, db)} min={-24} max={18} step={0.5} text={`${db <= -60 ? "-∞" : db.toFixed(1)} dB`} onChange={(v) => set({ gain: fromDb(v) })} />
          <Slider label="Smooth seam" value={edit.seam} min={0} max={250} step={1} text={`${Math.round(edit.seam)} ms`} disabled={take.start + edit.shift <= 0} title="Crossfade the loop end into the sound that came before its start" onChange={(v) => set({ seam: v })} />
          <Slider label="Fade in" value={edit.fadeIn} min={0} max={1000} step={5} text={`${Math.round(edit.fadeIn)} ms`} onChange={(v) => set({ fadeIn: v })} />
          <Slider label="Fade out" value={edit.fadeOut} min={0} max={1000} step={5} text={`${Math.round(edit.fadeOut)} ms`} onChange={(v) => set({ fadeOut: v })} />
        </div>
      </div>
    </Modal>
  );
}

function Slider({ label, value, min, max, step, text, onChange, disabled, title }: { label: string; value: number; min: number; max: number; step: number; text: string; onChange: (v: number) => void; disabled?: boolean; title?: string }) {
  return (
    <label className={`flex items-center gap-2 text-[11px] text-slate-400 ${disabled ? "opacity-40" : ""}`} title={title}>
      <span className="w-20 shrink-0">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} className="h-3 min-w-0 flex-1 accent-sky-400" aria-label={label} />
      <span className="w-14 shrink-0 text-right tabular-nums text-slate-200">{text}</span>
    </label>
  );
}

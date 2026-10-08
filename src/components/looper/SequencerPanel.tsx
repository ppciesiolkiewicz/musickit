"use client";

import { useEffect, useRef } from "react";
import Icon from "../Icon";
import { INSTRUMENTS, type LooperEngine, type LooperSnapshot } from "@/lib/looper/engine";

const ibtn = "grid h-8 min-w-8 place-items-center rounded-lg border border-slate-700 bg-slate-900 px-1.5 text-xs text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";
const field = "h-8 rounded-md border border-slate-700 bg-slate-900 px-2 text-xs text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";

/** The step grid for the sequencer input: pick the instrument and a pattern, click steps (click again for an accent, again to clear). */
export default function SequencerPanel({ engine, snap, id }: { engine: LooperEngine; snap: LooperSnapshot; id: string }) {
  const sq = snap.sequencers.find((x) => x.id === id);
  const seq = engine.getSequencer(id);
  if (!sq || !seq) return null;
  return <Grid engine={engine} snap={snap} id={id} sq={sq} seq={seq} />;
}

function Grid({ engine, snap, id, sq, seq }: { engine: LooperEngine; snap: LooperSnapshot; id: string; sq: LooperSnapshot["sequencers"][number]; seq: NonNullable<ReturnType<LooperEngine["getSequencer"]>> }) {  const inst = INSTRUMENTS.find((i) => i.id === sq.instrumentId) ?? INSTRUMENTS[0];
  const steps = sq.steps;
  const bpb = snap.metronome.beatsPerBar;
  const heads = useRef<(HTMLSpanElement | null)[]>([]) as { current: (HTMLSpanElement | null)[] };

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const p = seq.position();
      heads.current.forEach((el, i) => {
        if (!el) return;
        el.style.background = p === i ? "#fbbf24" : "";
        el.style.color = p === i ? "#0f172a" : "";
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seq, steps]);

  return (
    <div className="flex min-w-0 flex-col gap-2 p-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" className={`${ibtn} ${sq.playing ? "!border-emerald-500/70 !bg-emerald-500/15 !text-emerald-200" : ""}`} aria-pressed={sq.playing} onClick={() => engine.setSequencerPlaying(id, !sq.playing)} title={sq.playing ? "Stop on the next beat" : "Start on the next beat"} aria-label={sq.playing ? "Stop the sequencer" : "Start the sequencer"}><Icon name={sq.playing ? "square" : "play"} fill /></button>
        <select className={field} value={inst.id} onChange={(e) => seq.setInstrument(e.target.value)} aria-label="Instrument">
          {INSTRUMENTS.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
        <select className={field} value="" onChange={(e) => e.target.value && seq.loadPreset(e.target.value)} aria-label="Load a pattern">
          <option value="">Pattern…</option>
          {inst.presets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className={field} value={sq.bars} onChange={(e) => seq.setBars(Number(e.target.value))} aria-label="Bars in the pattern">
          <option value={1}>1 bar</option>
          <option value={2}>2 bars</option>
        </select>
        <select className={field} value={sq.dest} onChange={(e) => engine.setSequencerDest(id, e.target.value as "auto" | "record")} aria-label="Where the sound goes" title="Where the sound goes">
          <option value="auto">{sq.groupId ? `To ${snap.groups.find((g) => g.id === sq.groupId)?.name ?? "its group"}` : "To master"} (by position)</option>
          <option value="record">To the recorder (and master)</option>
        </select>
        <button type="button" className={ibtn} onClick={() => seq.clearPattern()} title="Clear the pattern" aria-label="Clear the pattern"><Icon name="trash" /></button>
      </div>

      <div className="overflow-x-auto">
        <div className="grid min-w-max gap-y-1" style={{ gridTemplateColumns: `4.5rem repeat(${steps}, minmax(1.5rem, 1fr))` }} role="grid" aria-label={`${inst.name} pattern, ${steps} steps`}>
          <span />
          {Array.from({ length: steps }, (_, s) => (
            <span key={s} ref={(el) => { heads.current[s] = el; }} className={`mb-0.5 grid h-4 place-items-center rounded text-[9px] tabular-nums text-slate-500 ${s % (bpb * 4) === 0 && s > 0 ? "ml-1.5" : s % 4 === 0 && s > 0 ? "ml-0.5" : ""}`}>
              {s % 4 === 0 ? (s / 4) % bpb + 1 : "·"}
            </span>
          ))}
          {inst.lanes.map((lane, l) => (
            <div key={lane.id} className="contents" role="row">
              <span className="truncate pr-1 text-xs text-slate-300" title={lane.label}>{lane.label}</span>
              {Array.from({ length: steps }, (_, s) => {
                const v = sq.cells[l]?.[s] ?? 0;
                return (
                  <button
                    key={s}
                    type="button"
                    role="gridcell"
                    aria-label={`${lane.label}, step ${s + 1}: ${v === 0 ? "off" : v === 1 ? "on" : "accent"}`}
                    onClick={() => seq.cycle(l, s)}
                    className={`mx-px h-7 rounded transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${s % (bpb * 4) === 0 && s > 0 ? "ml-1.5" : s % 4 === 0 && s > 0 ? "ml-0.5" : ""} ${v === 2 ? "bg-amber-400" : v === 1 ? "bg-sky-500" : s % 8 < 4 ? "bg-slate-800 hover:bg-slate-700" : "bg-slate-800/60 hover:bg-slate-700"}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <p className="text-[11px] text-slate-500">Sounds are made in the browser, nothing is downloaded. It plays in time with the click while you record or play. It plays on the bus of the group its circle sits in, or master outside every group. Start and stop happen on the next beat.</p>
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import Icon from "@/components/Icon";
import { sbtn } from "@/components/controls";
import { LOOP_CHANNELS, type InputDevice, type LoopChannel, type LoopView } from "./loops";
import { LOOP_BARS, MAX_LOOPS } from "./take";
import type { JamRig } from "./rig";

const STATUS: Record<LoopView["state"], string> = { empty: "Empty", countIn: "Count-in", recording: "Recording", playing: "Playing", stopped: "Stopped" };
const CHANNEL_LABEL: Record<LoopChannel, string> = { "1": "1", "2": "2", mix: "1+2" };
const select = "h-7 min-w-0 rounded-md border border-slate-700/80 bg-slate-900 px-1.5 text-xs text-slate-200 hover:border-slate-600 disabled:opacity-40";

/** A bar filled to what `read` says (0 to 1), redrawn every frame without React. */
function LiveBar({ read, className }: { read: () => number | null; className: string }) {
  const fill = useRef<HTMLDivElement>(null);
  const readRef = useRef(read);
  useEffect(() => {
    readRef.current = read;
  });
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const v = readRef.current();
      if (fill.current) fill.current.style.transform = `scaleX(${v ?? 0})`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800" aria-hidden>
      <div ref={fill} className={`h-full origin-left ${className}`} style={{ transform: "scaleX(0)" }} />
    </div>
  );
}

function LoopRow({ rig, loop, n, devices, removable, ready }: { rig: JamRig; loop: LoopView; n: number; devices: InputDevice[]; removable: boolean; ready: () => Promise<void> }) {
  const name = `loop ${n}`;
  const taking = loop.state === "countIn" || loop.state === "recording";
  const hasSound = loop.state === "playing" || loop.state === "stopped";
  const set = (patch: Parameters<JamRig["setLoop"]>[1]) => rig.setLoop(loop.id, patch);
  // a saved device that is not listed now still shows, so the choice is not lost
  const options = loop.deviceId && !devices.some((d) => d.id === loop.deviceId) ? [...devices, { id: loop.deviceId, label: "Saved input (not found)" }] : devices;
  return (
    <li className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,19rem)]">
      <div className="flex min-w-0 flex-col gap-2.5">
        <div className="flex items-center gap-2.5">
          <button type="button" onClick={async () => { await ready(); void rig.record(loop.id); }} aria-pressed={taking} aria-label={taking ? `Cancel recording ${name}` : `Record ${name}`} title={taking ? "Call off the take" : hasSound ? "Record again from the next bar" : "Record from the next bar"}
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${taking ? "border-rose-400 bg-rose-500/25 text-rose-100" : "border-slate-600 bg-slate-800 text-rose-400 hover:border-rose-400/70"} ${loop.state === "countIn" ? "animate-pulse" : ""}`}>
            <Icon name={taking ? "square" : "circle"} size={16} fill />
          </button>
          <button type="button" disabled={!hasSound} onClick={() => rig.toggleLoop(loop.id)} aria-pressed={loop.on} aria-label={loop.on ? `Stop ${name}` : `Play ${name}`} title={loop.on ? "Stop on the next beat" : "Play on the next beat"}
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 disabled:opacity-40 ${loop.on ? "border-emerald-400/70 bg-emerald-500/20 text-emerald-100" : "border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-400"}`}>
            <Icon name={loop.on ? "square" : "play"} size={16} fill />
          </button>
          <div className="mr-auto min-w-0">
            <p className="text-base font-light text-slate-50">Loop {n}</p>
            <p className={`text-xs ${taking ? "text-rose-300" : "text-slate-400"}`}>{STATUS[loop.state]}</p>
          </div>
          <button type="button" className={sbtn} disabled={!hasSound} onClick={() => rig.clearLoop(loop.id)} title="Clear the recording" aria-label={`Clear ${name}`}><Icon name="trash" size={14} /></button>
          {removable && <button type="button" className={sbtn} onClick={() => rig.removeLoop(loop.id)} title="Remove this loop" aria-label={`Remove ${name}`}><Icon name="x" size={14} /></button>}
        </div>
        <LiveBar read={() => rig.loopPosition(loop.id)} className={taking ? "bg-rose-400" : "bg-emerald-400"} />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-300">
          <label className="flex items-center gap-2">
            <span>Length</span>
            <select className={select} value={loop.bars} disabled={taking || hasSound} onChange={(e) => set({ bars: Number(e.target.value) })} title={hasSound ? "Clear the loop to change its length" : undefined}>
              {LOOP_BARS.map((b) => <option key={b} value={b}>{b} bar{b === 1 ? "" : "s"}</option>)}
            </select>
          </label>
          <label className="flex min-w-[10rem] flex-1 items-center gap-2">
            <span>Volume</span>
            <input type="range" className="min-w-0 flex-1 accent-sky-400" min={0} max={1} step={0.01} value={loop.volume} onChange={(e) => set({ volume: Number(e.target.value) })} />
            <span className="w-9 text-right tabular-nums text-slate-400">{Math.round(loop.volume * 100)}%</span>
          </label>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-slate-800 bg-slate-900/60 p-2.5 text-xs text-slate-300" aria-label={`Input of ${name}`}>
        <div className="flex items-center gap-1.5 text-slate-400"><Icon name="mic" size={13} /><span className="font-medium uppercase tracking-wide">Input</span></div>
        <select className={`${select} w-full`} value={loop.deviceId} disabled={taking} onChange={(e) => set({ deviceId: e.target.value })} aria-label={`Input device of ${name}`}>
          <option value="">Default microphone</option>
          {options.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <span>Channel</span>
          <div className="flex gap-1" aria-label={`Channel of ${name}`}>
            {LOOP_CHANNELS.map((c) => {
              const mono = loop.connected && loop.deviceChannels < 2 && c !== "1";
              return (
                <button key={c} type="button" aria-pressed={loop.channel === c} disabled={taking || mono} className={sbtn} onClick={() => set({ channel: c })} title={mono ? "This input has one channel" : c === "mix" ? "Both channels mixed" : `Channel ${c}`}>{CHANNEL_LABEL[c]}</button>
              );
            })}
          </div>
        </div>
        {loop.connected ? (
          <LiveBar read={() => rig.loopLevel(loop.id)} className="bg-sky-400" />
        ) : (
          <button type="button" className={`${sbtn} self-start !px-2.5`} onClick={async () => { await ready(); rig.connectLoop(loop.id); }} title="Open the input to see its level">Connect</button>
        )}
        {loop.error && <p className="text-rose-300" role="alert">{loop.error}</p>}
      </div>
    </li>
  );
}

/** The jam's loops: one row each (the loop, and its input to the right), and a button to add another. */
export default function JamLoops({ rig, loops, devices, ready }: { rig: JamRig; loops: LoopView[]; devices: InputDevice[]; ready: () => Promise<void> }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-light text-slate-50">Loops</h2>
        <p className="text-xs text-slate-400">Each records its bars from its own input, from the next bar line.</p>
      </div>
      <ul className="flex flex-col gap-3">
        {loops.map((l, i) => <LoopRow key={l.id} rig={rig} loop={l} n={i + 1} devices={devices} removable={loops.length > 1} ready={ready} />)}
      </ul>
      {loops.length < MAX_LOOPS && (
        <button type="button" onClick={() => rig.addLoop()} aria-label="Add a loop" title="Add a loop"
          className="grid h-11 w-full place-items-center rounded-xl border border-dashed border-slate-700 text-slate-400 transition hover:border-slate-500 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400">
          <Icon name="plus" size={18} />
        </button>
      )}
    </div>
  );
}

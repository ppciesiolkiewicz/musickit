"use client";

import { useEffect, useState, type ReactNode } from "react";
import Modal from "../Modal";
import LevelMeter from "./LevelMeter";
import type { LooperEngine, LooperSnapshot } from "@/lib/looper/engine";
import { getMidiInputs, onMidiDevicesChanged, requestMidiAccess, setMidiInputFilter } from "@/lib/midi";

const field = "rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";
const btn = "rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 transition hover:border-slate-500 disabled:opacity-40";
const MIDI_KEY = "musickit.looper.midi";

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5 rounded-xl border border-slate-800 bg-slate-900/50 p-3">
      <h3 className="text-sm font-medium text-slate-100">{title}</h3>
      {children}
    </section>
  );
}

/** Everything about where sound comes from: audio interface, piano, MIDI keyboard and timing. */
export default function LooperSettings({ engine, snap, getLevel, onClose }: { engine: LooperEngine; snap: LooperSnapshot; getLevel: () => number; onClose: () => void }) {
  const ready = snap.status === "ready";
  return (
    <Modal title="Looper settings" onClose={onClose}>
      <div className="flex flex-col gap-3">
        {!ready && <p className="rounded-lg border border-dashed border-slate-700 p-2.5 text-xs text-slate-400">The audio engine is starting. Settings apply once it is running.</p>}

        <Group title="Inputs">
          <p className="text-xs text-slate-400">Add, remove, mute and solo inputs, and choose the audio interface, in the mixer on the looper page. Each input has its own channel choice, gain and level.</p>
        </Group>

        <MetronomeGroup engine={engine} snap={snap} />

        <Group title="Level">
          <LevelMeter getLevel={getLevel} />
          <p className="text-xs text-slate-500">Shows what is about to be recorded, from every source that is switched on.</p>
        </Group>

        <MidiGroup />

        <Group title="Timing">
          <label className="flex items-center gap-2 text-xs text-slate-400">
            Latency fix
            <input type="range" min={0} max={250} step={1} value={snap.latencyMs} onChange={(e) => engine.setLatencyMs(Number(e.target.value))} className="flex-1 accent-sky-400" aria-label="Latency compensation in milliseconds" />
            <span className="w-14 tabular-nums">{snap.latencyMs} ms</span>
          </label>
          <p className="text-xs text-slate-500">Applies to microphones and audio interfaces, not to the keyboard. If new takes sound late against the loop, raise it until they line up.</p>
        </Group>
      </div>
    </Modal>
  );
}

/** Tempo, bar length, click, count-in and quantising. Tempo and bar length lock while a loop exists. */
function MetronomeGroup({ engine, snap }: { engine: LooperEngine; snap: LooperSnapshot }) {
  const m = snap.metronome;
  const set = (p: Partial<typeof m>) => engine.setMetronome(p);
  return (
    <Group title="Metronome">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-xs text-slate-400">
          Tempo
          <input type="range" min={40} max={240} step={1} value={m.bpm} disabled={m.locked} onChange={(e) => set({ bpm: Number(e.target.value) })} className="flex-1 accent-sky-400" aria-label="Tempo in beats per minute" />
          <span className="w-16 tabular-nums">{m.bpm} bpm</span>
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-400">
          Beats per bar
          <select className={field} value={m.beatsPerBar} disabled={m.locked} onChange={(e) => set({ beatsPerBar: Number(e.target.value) })}>
            {[2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-400">
          Quantise first take
          <select className={field} value={m.quantise} onChange={(e) => set({ quantise: e.target.value as typeof m.quantise })}>
            <option value="bar">to whole bars</option>
            <option value="beat">to whole beats</option>
            <option value="off">off</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-400">
          Count-in
          <select className={field} value={m.countInBars} onChange={(e) => set({ countInBars: Number(e.target.value) })}>
            {[0, 1, 2].map((n) => <option key={n} value={n}>{n === 0 ? "none" : `${n} bar${n === 1 ? "" : "s"}`}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-400">
          Click volume
          <input type="range" min={0} max={1} step={0.01} value={m.volume} onChange={(e) => set({ volume: Number(e.target.value) })} className="flex-1 accent-sky-400" aria-label="Click volume" />
        </label>
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
          <label className="flex items-center gap-1.5"><input type="checkbox" className="accent-sky-400" checked={m.audible} onChange={(e) => set({ audible: e.target.checked })} /> Hear the click</label>
          <label className="flex items-center gap-1.5"><input type="checkbox" className="accent-sky-400" checked={m.showBeat} onChange={(e) => set({ showBeat: e.target.checked })} /> Show beat dots</label>
        </div>
      </div>
      <p className="text-xs text-slate-500">The click runs whenever you record or play, and is never recorded. {m.locked ? "Tempo and bar length are locked while there is a loop: clear everything to change them." : "The first take starts on beat 1 after the count-in and is rounded to the nearest whole bar or beat, so every later layer lines up with the click."}</p>
    </Group>
  );
}

/** Connect a MIDI keyboard and choose which one plays the piano. */
function MidiGroup() {
  const [status, setStatus] = useState<"off" | "connecting" | "on" | "error">("off");
  const [error, setError] = useState<string | null>(null);
  const [inputs, setInputs] = useState<{ id: string; name: string }[]>([]);
  const [selected, setSelected] = useState("");

  const refresh = () => setInputs(getMidiInputs().map((i) => ({ id: i.id, name: i.name ?? "MIDI input" })));

  const connect = async () => {
    setStatus("connecting");
    setError(null);
    const r = await requestMidiAccess();
    if (!r.success) {
      setStatus("error");
      setError(r.error ?? "Could not open MIDI.");
      return;
    }
    setStatus("on");
    refresh();
  };

  useEffect(() => {
    let saved = "";
    try {
      saved = window.localStorage.getItem(MIDI_KEY) ?? "";
    } catch {
      /* ignore */
    }
    setSelected(saved);
    setMidiInputFilter(saved || null);
    const off = onMidiDevicesChanged(refresh);
    if (getMidiInputs().length) {
      setStatus("on");
      refresh();
    }
    return off;
  }, []);

  const choose = (id: string) => {
    setSelected(id);
    setMidiInputFilter(id || null);
    try {
      window.localStorage.setItem(MIDI_KEY, id);
    } catch {
      /* ignore */
    }
  };

  return (
    <Group title="MIDI keyboard">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={btn} onClick={() => void connect()} disabled={status === "connecting"}>
          {status === "connecting" ? "Connecting…" : status === "on" ? "Reconnect" : "Connect MIDI"}
        </button>
        <span className="text-xs text-slate-400">
          {status === "on" ? `${inputs.length} device${inputs.length === 1 ? "" : "s"} found` : status === "error" ? "" : "Not connected"}
        </span>
      </div>
      {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
      {status === "on" && (
        <label className="flex flex-col gap-1 text-xs text-slate-400">
          Play the piano from
          <select className={field} value={selected} onChange={(e) => choose(e.target.value)}>
            <option value="">All MIDI devices</option>
            {inputs.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </label>
      )}
      <p className="text-xs text-slate-500">A MIDI keyboard or the MIDI port of your interface plays the on-screen piano, and the piano can be recorded into the loop. MIDI carries notes, not sound, so the sound you hear and record comes from the piano voice. Works in Chrome and Edge.</p>
    </Group>
  );
}

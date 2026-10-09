"use client";

import { useEffect, useState, type ReactNode } from "react";
import Modal from "../Modal";
import LevelMeter from "./LevelMeter";
import MasterControls from "./MasterOutput";
import type { LooperEngine, LooperSnapshot } from "@/lib/looper/engine";
import { getMidiInputs, onMidiDevicesChanged, requestMidiAccess, setMidiInputFilter } from "@/features/sound/keyboard/midi";

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

        <Group title="Level">
          <LevelMeter getLevel={getLevel} />
          <p className="text-xs text-slate-500">Shows what is about to be recorded, from every source that is switched on.</p>
        </Group>

        <Group title="Output (master bus)">
          <div className="flex flex-wrap items-center gap-2">
            <MasterControls engine={engine} snap={snap} />
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-400">
            Play through
            <select className={`${field} !py-1 !text-xs min-w-0 flex-1`} value={snap.outputId} disabled={!snap.canChooseOutput || !ready} onChange={(e) => void engine.setOutputDevice(e.target.value)} aria-label="Audio output device">
              <option value="">System default</option>
              {snap.outputs.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </label>
          {snap.outputChannels > 2 && (
            <label className="flex items-center gap-2 text-xs text-slate-400">
              Output channels
              <select className={`${field} !py-1 !text-xs`} value={snap.outputPair} onChange={(e) => engine.setOutputPair(Number(e.target.value))} aria-label="Pair of output channels">
                {Array.from({ length: Math.floor(snap.outputChannels / 2) }, (_, i) => (
                  <option key={i} value={i}>{i * 2 + 1} and {i * 2 + 2}{i === 0 ? " (main)" : ""}</option>
                ))}
              </select>
            </label>
          )}
          {ready && !snap.canChooseOutput && <p className="text-xs text-amber-300">This browser cannot choose the output. Use Chrome or Edge, or set the interface as the system output.</p>}
          <p className="text-xs text-slate-500">The global output is the master bus: this is the same volume and effect chain as the Master row in the mixer.</p>
        </Group>

        <MidiGroup />

        <Group title="Timing">
          <label className="flex items-center justify-between gap-2 text-xs text-slate-400">
            Quantise recordings
            <select className={`${field} !py-1 !text-xs`} value={snap.metronome.quantise} onChange={(e) => engine.do({ type: "metronome.set", patch: { quantise: e.target.value as typeof snap.metronome.quantise } })} aria-label="Quantise recordings to the metronome">
              <option value="bar">start and stop on whole bars</option>
              <option value="beat">start and stop on whole beats</option>
              <option value="off">off: start and stop when pressed</option>
            </select>
          </label>
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

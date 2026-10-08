"use client";

import { useEffect, useState, type ReactNode } from "react";
import Modal from "../Modal";
import LevelMeter from "./LevelMeter";
import type { LooperEngine, LooperSnapshot } from "@/lib/looper/engine";
import type { InputMode } from "@/lib/looper/frames";
import { getMidiInputs, onMidiDevicesChanged, requestMidiAccess, setMidiInputFilter } from "@/lib/midi";

const field = "rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";
const btn = "rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 transition hover:border-slate-500 disabled:opacity-40";
const MIDI_KEY = "musickit.looper.midi";

const MODES: { id: InputMode; label: string }[] = [
  { id: "left", label: "Input 1 (left)" },
  { id: "right", label: "Input 2 (right)" },
  { id: "stereo", label: "Stereo" },
  { id: "sum", label: "Mix to mono" },
];

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
        {!ready && <p className="rounded-lg border border-dashed border-slate-700 p-2.5 text-xs text-slate-400">Press &ldquo;Start looper&rdquo; first. Audio settings apply once it is running.</p>}

        <Group title="Audio interface">
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input type="checkbox" className="accent-sky-400" checked={snap.deviceOn} disabled={!ready} onChange={(e) => void engine.setSources({ device: e.target.checked })} />
            Record from the audio interface or microphone
          </label>
          {snap.deviceError && <p role="alert" className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-2 text-xs text-rose-200">{snap.deviceError}</p>}
          {snap.deviceOn && ready && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs text-slate-400">
                  Input device
                  <select className={field} value={snap.deviceId} onChange={(e) => void engine.openInput(e.target.value)}>
                    {snap.devices.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-slate-400">
                  Record from
                  <select className={field} value={snap.inputMode} onChange={(e) => engine.setInputMode(e.target.value as InputMode)}>
                    {MODES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                </label>
              </div>
              <p className="text-xs text-slate-500">
                {snap.inputChannels > 0 ? `This device reports ${snap.inputChannels} input channel${snap.inputChannels === 1 ? "" : "s"}. ` : ""}
                With a Focusrite Scarlett, pick its name above. Input 1 and 2 are the two jacks on the front. Plug a guitar into Input 2 and choose &ldquo;Input 2 (right)&rdquo;.
              </p>
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input type="checkbox" checked={snap.monitor} onChange={(e) => engine.setMonitor(e.target.checked)} className="accent-sky-400" />
                Hear the input through the browser
              </label>
              <p className="text-xs text-slate-500">Monitoring through the browser adds delay and can feed back through speakers. Use headphones, or your interface&rsquo;s own direct monitor.</p>
            </>
          )}
        </Group>

        {snap.externalLabel && (
          <Group title={snap.externalLabel}>
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input type="checkbox" className="accent-sky-400" checked={snap.externalOn} disabled={!ready} onChange={(e) => void engine.setSources({ external: e.target.checked })} />
              Record the {snap.externalLabel.toLowerCase()} (what it plays goes into the loop as audio)
            </label>
            <p className="text-xs text-slate-500">
              The sound is taken digitally from the browser, so it needs no cables and the latency fix does not apply to it. You can record the piano and the audio interface together. They are mixed into the same take. Switch the one you do not want off.
            </p>
          </Group>
        )}

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
          <p className="text-xs text-slate-500">Applies to the audio interface only. If new takes sound late against the loop, raise it until they line up.</p>
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

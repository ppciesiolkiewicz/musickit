"use client";

import { useMemo } from "react";
import LevelMeter from "./LevelMeter";
import { MAX_INPUTS, type InputInfo, type InputMode, type LooperEngine, type LooperSnapshot } from "@/lib/looper/engine";

const btn = "rounded-lg border px-2.5 py-1 text-xs transition disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";
const btnPlain = `${btn} border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500`;
const field = "rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";

const MODES: { id: InputMode; label: string }[] = [
  { id: "left", label: "Input 1 (left)" },
  { id: "right", label: "Input 2 (right)" },
  { id: "stereo", label: "Stereo" },
  { id: "sum", label: "Mix to mono" },
];

const INTERFACE_HINT = /focusrite|scarlett|interface|audient|presonus|behringer|steinberg|motu|universal audio|apollo|rme|usb audio/i;
const BUILTIN_HINT = /built-?in|internal|macbook|laptop|microphone array/i;

/** The inputs that feed the recorder: add and remove them, choose channels, mute and solo, watch each level. */
export default function Mixer({ engine, snap, keyboardOpen, onToggleKeyboard }: { engine: LooperEngine; snap: LooperSnapshot; keyboardOpen: boolean; onToggleKeyboard: () => void }) {
  const { inputs, devices } = snap;
  const full = inputs.length >= MAX_INPUTS;
  const hasExtra = inputs.some((i) => i.kind === "extra");
  const interfaceId = devices.find((d) => INTERFACE_HINT.test(d.label))?.id ?? "";
  const builtinId = devices.find((d) => BUILTIN_HINT.test(d.label))?.id ?? "";
  const deviceName = (id: string) => devices.find((d) => d.id === id)?.label;

  const addInterface = (modes: InputMode[]) =>
    modes.forEach((m, i) => {
      const base = deviceName(interfaceId)?.replace(/\s*\(.*\)\s*$/, "") ?? "Interface";
      void engine.mixer.add({ kind: "device", name: `${base} ${m === "right" ? "input 2" : "input 1"}`, deviceId: interfaceId, mode: m });
      void i;
    });

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4" aria-label="Input mixer">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-medium text-slate-100">Mixer: inputs</h2>
        <span className="text-xs text-slate-500">what gets recorded</span>
        <span className="ml-auto flex flex-wrap gap-1.5">
          <button type="button" className={btnPlain} disabled={full || inputs.length + 2 > MAX_INPUTS} onClick={() => addInterface(["left", "right"])} title="Add input 1 and input 2 of your audio interface, for example the two jacks on a Scarlett">+ Interface 1 &amp; 2</button>
          <button type="button" className={btnPlain} disabled={full} onClick={() => addInterface(["left"])}>+ Interface input</button>
          <button type="button" className={btnPlain} disabled={full} onClick={() => void engine.mixer.add({ kind: "device", name: "Built-in mic", deviceId: builtinId, mode: "sum" })}>+ Built-in mic</button>
          {snap.extraLabel && <button type="button" className={btnPlain} disabled={full || hasExtra} onClick={() => void engine.mixer.add({ kind: "extra", name: snap.extraLabel! })}>+ {snap.extraLabel}</button>}
        </span>
      </div>

      {inputs.length === 0 && <p className="rounded-xl border border-dashed border-slate-700 p-3 text-xs text-slate-400">No inputs. Add one above to have something to record.</p>}

      <ul className="flex flex-col gap-2">
        {inputs.map((inp) => (
          <InputStrip key={inp.id} engine={engine} inp={inp} devices={devices} anyDevice={snap.status === "ready"} keyboardOpen={keyboardOpen} onToggleKeyboard={onToggleKeyboard} />
        ))}
      </ul>
      <p className="text-xs text-slate-500">
        Everything that is not muted is mixed into the next take. Solo one input to record only that. Input level shows even when muted, so you can check a signal before you record it. Plug a guitar into the interface&rsquo;s Input 2 and use &ldquo;Input 2 (right)&rdquo;; the built-in mic is mixed down to mono.
      </p>
    </section>
  );
}

function InputStrip({ engine, inp, devices, anyDevice, keyboardOpen, onToggleKeyboard }: { engine: LooperEngine; inp: InputInfo; devices: { id: string; label: string }[]; anyDevice: boolean; keyboardOpen: boolean; onToggleKeyboard: () => void }) {
  const getLevel = useMemo(() => () => engine.getInputLevel(inp.id), [engine, inp.id]);
  const m = engine.mixer;
  const isDevice = inp.kind === "device";
  return (
    <li className={`flex flex-col gap-2 rounded-xl border bg-slate-950/50 p-3 ${inp.live ? "border-slate-800" : "border-slate-800/60 opacity-80"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span aria-hidden className="text-base">{isDevice ? "🎙️" : "🎹"}</span>
        <input value={inp.name} onChange={(e) => m.rename(inp.id, e.target.value)} aria-label="Input name" className="w-40 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm font-medium text-slate-100 hover:border-slate-700 focus:border-slate-500 focus:outline-none" />
        <span className={`text-[11px] ${inp.live ? "text-emerald-300" : "text-slate-500"}`}>{inp.live ? "recording" : inp.muted ? "muted" : "silenced by solo"}</span>
        <span className="ml-auto flex flex-wrap items-center gap-1.5">
          {!isDevice && <button type="button" className={`${btnPlain} ${keyboardOpen ? "!border-sky-400 !text-sky-200" : ""}`} aria-pressed={keyboardOpen} onClick={onToggleKeyboard}>🎹 {keyboardOpen ? "Close keyboard" : "Open keyboard"}</button>}
          <button type="button" className={`${btnPlain} ${inp.muted ? "!border-amber-400 !text-amber-200" : ""}`} aria-pressed={inp.muted} onClick={() => m.toggleMute(inp.id)}>Mute</button>
          <button type="button" className={`${btnPlain} ${inp.solo ? "!border-sky-400 !text-sky-200" : ""}`} aria-pressed={inp.solo} onClick={() => m.toggleSolo(inp.id)}>Solo</button>
          <button type="button" className={btnPlain} onClick={() => m.remove(inp.id)} aria-label={`Remove ${inp.name}`} title="Remove this input">✕</button>
        </span>
      </div>

      {isDevice && (
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <select className={field} value={inp.deviceId} onChange={(e) => void m.setDevice(inp.id, e.target.value)} aria-label="Audio device">
            <option value="">{anyDevice ? "System default input" : "System default input (start the looper to list devices)"}</option>
            {devices.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
          <select className={field} value={inp.mode} onChange={(e) => m.setMode(inp.id, e.target.value as InputMode)} aria-label="Channels to record">
            {MODES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-slate-300">
            <input type="checkbox" className="accent-sky-400" checked={inp.monitor} onChange={(e) => m.setMonitor(inp.id, e.target.checked)} />
            Hear it
          </label>
        </div>
      )}
      {inp.error && <p role="alert" className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-2 text-xs text-rose-200">{inp.error}</p>}
      {isDevice && inp.channels === 1 && (inp.mode === "right") && <p className="text-xs text-amber-200">This device reports one channel, so &ldquo;Input 2&rdquo; will be silent. Choose Input 1 or Mix to mono.</p>}

      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[8rem] flex-1"><LevelMeter getLevel={getLevel} /></div>
        <label className="flex items-center gap-2 text-xs text-slate-400">
          Gain
          <input type="range" min={0} max={1.5} step={0.01} value={inp.volume} onChange={(e) => m.setVolume(inp.id, Number(e.target.value))} className="w-32 accent-sky-400" aria-label={`Gain of ${inp.name}`} />
          <span className="w-10 tabular-nums">{Math.round(inp.volume * 100)}%</span>
        </label>
      </div>
    </li>
  );
}

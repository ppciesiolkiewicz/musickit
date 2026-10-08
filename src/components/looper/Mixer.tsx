"use client";

import { useMemo, useState } from "react";
import Modal from "@/components/Modal";
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

type Pick = "both" | InputMode;
const PICKS: { id: Pick; label: string; hint: string; needs: number }[] = [
  { id: "both", label: "Input 1 and Input 2", hint: "two separate strips", needs: 2 },
  { id: "left", label: "Input 1", hint: "", needs: 1 },
  { id: "right", label: "Input 2", hint: "e.g. a DI guitar in the second jack", needs: 2 },
  { id: "sum", label: "Mix to mono", hint: "both channels on one strip", needs: 2 },
];

/** Two steps: pick the kind of input (hardware or software keyboard), then for hardware pick a device and its channels. */
function AddInputModal({ engine, snap, hasExtra, onClose }: { engine: LooperEngine; snap: LooperSnapshot; hasExtra: boolean; onClose: () => void }) {
  const [step, setStep] = useState<"type" | "hardware">("type");
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [pick, setPick] = useState<Pick>("left");
  const [busy, setBusy] = useState(false);
  /** channels the chosen device really delivers: undefined while checking, null when it could not be opened */
  const [channels, setChannels] = useState<number | null | undefined>(undefined);
  const { devices } = snap;
  const room = MAX_INPUTS - snap.inputs.length;
  const chosen = devices.find((d) => d.id === deviceId);
  const need = pick === "both" ? 2 : 1;
  const choose = (id: string) => {
    setDeviceId(id);
    setChannels(undefined);
    void engine.probeChannels(id).then((n) => {
      setChannels(n);
      setPick(n === 1 ? "sum" : "both");
    });
  };
  const options = channels === 1 ? [{ id: "sum" as Pick, label: "Mono", hint: "this device has one channel", needs: 1 }] : PICKS;

  const detect = async () => {
    setBusy(true);
    try {
      await engine.requestDeviceAccess();
    } finally {
      setBusy(false);
    }
  };
  const addHardware = () => {
    if (deviceId === null) return;
    const base = (chosen?.label ?? "Audio input").replace(/\s*\(.*\)\s*$/, "");
    const modes: InputMode[] = pick === "both" ? ["left", "right"] : [pick];
    modes.forEach((m) => {
      const suffix = m === "left" ? (pick === "both" ? " input 1" : " input 1") : m === "right" ? " input 2" : "";
      void engine.mixer.add({ kind: "device", name: `${base}${suffix}`, deviceId, mode: m });
    });
    onClose();
  };

  return (
    <Modal title={step === "type" ? "Add an input" : "Add a hardware input"} onClose={onClose}>
      {step === "type" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => setStep("hardware")} className="flex flex-col gap-1 rounded-xl border border-slate-700 bg-slate-900 p-4 text-left hover:border-sky-400">
            <span className="text-2xl" aria-hidden>🎙️</span>
            <span className="text-sm font-medium text-slate-100">Hardware</span>
            <span className="text-xs text-slate-400">An audio interface (Scarlett, DI guitar), a USB mic or the built-in microphone.</span>
          </button>
          <button type="button" disabled={hasExtra || !snap.extraLabel} onClick={() => { void engine.mixer.add({ kind: "extra", name: snap.extraLabel ?? "Keyboard" }); onClose(); }} className="flex flex-col gap-1 rounded-xl border border-slate-700 bg-slate-900 p-4 text-left hover:border-sky-400 disabled:cursor-not-allowed disabled:opacity-50">
            <span className="text-2xl" aria-hidden>🎹</span>
            <span className="text-sm font-medium text-slate-100">Software keyboard</span>
            <span className="text-xs text-slate-400">{hasExtra ? "Already added. Open it from its strip." : "The on-screen piano and your MIDI keyboard. Plays through the app, no audio device needed."}</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-medium text-slate-200">Available audio devices</h3>
            <button type="button" className={`${btnPlain} ml-auto`} onClick={() => void detect()} disabled={busy}>{busy ? "Looking…" : devices.length ? "Refresh list" : "Detect devices"}</button>
          </div>
          {devices.length === 0 && <p className="rounded-xl border border-dashed border-slate-700 p-3 text-xs text-slate-400">No devices listed yet. Browsers only show device names after you allow microphone access: press &ldquo;Detect devices&rdquo;. You can also use the system default input below.</p>}
          <ul className="grid gap-2 sm:grid-cols-2">
            <li>
              <DeviceButton on={deviceId === ""} onClick={() => choose("")} title="System default input" sub="whatever the operating system uses" />
            </li>
            {devices.map((d) => (
              <li key={d.id}><DeviceButton on={deviceId === d.id} onClick={() => choose(d.id)} title={d.label} sub={INTERFACE_HINT.test(d.label) ? "audio interface" : "input device"} /></li>
            ))}
          </ul>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1 text-sm font-medium text-slate-200">Channels{deviceId === null ? "" : channels === undefined ? ": checking the device…" : channels === null ? ": could not read the device, assuming two" : `: this device has ${channels}`}</legend>
            {deviceId === null && <p className="text-xs text-slate-500">Pick a device first. We open it for an instant to see how many channels it really has.</p>}
            {deviceId !== null && channels !== undefined && options.map((p) => (
              <label key={p.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs ${pick === p.id ? "border-sky-400 bg-sky-500/10 text-sky-100" : "border-slate-800 text-slate-300"}`}>
                <input type="radio" name="pick" className="accent-sky-400" checked={pick === p.id} onChange={() => setPick(p.id)} />
                <span className="font-medium">{p.label}</span>
                {p.hint && <span className="text-slate-500">{p.hint}</span>}
              </label>
            ))}
          </fieldset>
          {room < need && <p className="text-xs text-amber-200">Not enough room: the mixer holds {MAX_INPUTS} inputs. Remove one first.</p>}
          <div className="flex gap-2">
            <button type="button" className={btnPlain} onClick={() => setStep("type")}>← Back</button>
            <button type="button" className={`${btn} ml-auto border-emerald-500 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25`} disabled={deviceId === null || channels === undefined || room < need} onClick={addHardware}>Add input</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function DeviceButton({ on, onClick, title, sub }: { on: boolean; onClick: () => void; title: string; sub: string }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={`flex w-full flex-col rounded-lg border px-3 py-2 text-left ${on ? "border-sky-400 bg-sky-500/10" : "border-slate-800 hover:border-slate-600"}`}>
      <span className="text-sm text-slate-100">{title}</span>
      <span className="text-[11px] text-slate-500">{sub}</span>
    </button>
  );
}

/** The inputs that feed the recorder: add and remove them, choose channels, mute and solo, watch each level. */
export default function Mixer({ engine, snap, keyboardOpen, onToggleKeyboard }: { engine: LooperEngine; snap: LooperSnapshot; keyboardOpen: boolean; onToggleKeyboard: () => void }) {
  const { inputs, devices } = snap;
  const full = inputs.length >= MAX_INPUTS;
  const hasExtra = inputs.some((i) => i.kind === "extra");
  const [adding, setAdding] = useState(false);
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4" aria-label="Input mixer">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-medium text-slate-100">Mixer: inputs</h2>
        <span className="text-xs text-slate-500">what gets recorded</span>
        <button type="button" className={`${btnPlain} ml-auto`} disabled={full} onClick={() => setAdding(true)}>+ Add input</button>
      </div>

      {inputs.length === 0 && <p className="rounded-xl border border-dashed border-slate-700 p-3 text-xs text-slate-400">No inputs. Add one above to have something to record.</p>}

      <ul className="flex flex-col gap-2">
        {inputs.map((inp) => (
          <InputStrip key={inp.id} engine={engine} inp={inp} devices={devices} anyDevice={snap.devices.length > 0} keyboardOpen={keyboardOpen} onToggleKeyboard={onToggleKeyboard} />
        ))}
      </ul>
      {adding && <AddInputModal engine={engine} snap={snap} hasExtra={hasExtra} onClose={() => setAdding(false)} />}
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

      {isDevice && !inp.connected && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-slate-700 p-2 text-xs text-slate-400">
          Not connected. The browser will ask for microphone access when you connect it.
          <button type="button" className={`${btnPlain} ml-auto`} onClick={() => void m.connect(inp.id)}>Connect</button>
        </div>
      )}
      {isDevice && inp.connected && (
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

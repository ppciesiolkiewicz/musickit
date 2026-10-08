"use client";

import { useMemo, useState } from "react";
import Modal from "@/components/Modal";
import Icon from "@/components/Icon";
import LevelMeter from "./LevelMeter";
import EffectsModal from "./EffectsModal";
import { GroupEffects } from "./LoopStage";
import SignalFlow from "./SignalFlow";
import { MAX_INPUTS, type InputInfo, type InputMode, type LooperEngine, type LooperSnapshot } from "@/lib/looper/engine";

const btn = "rounded-lg border px-2.5 py-1 text-xs transition disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";
const btnPlain = `${btn} border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500`;
const ibtn = "grid h-8 min-w-8 place-items-center rounded-lg border border-slate-700 bg-slate-900 px-1.5 text-xs text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";
const field = "rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";

const MODES: { id: InputMode; label: string }[] = [
  { id: "left", label: "Input 1 (left)" },
  { id: "right", label: "Input 2 (right)" },
  { id: "stereo", label: "Stereo" },
  { id: "sum", label: "Mix to mono" },
];

const INTERFACE_HINT = /focusrite|scarlett|interface|audient|presonus|behringer|steinberg|motu|universal audio|apollo|rme|usb audio/i;

type Pick = "both" | InputMode;
const PICKS: { id: Pick; label: string; hint: string }[] = [
  { id: "both", label: "Input 1 and Input 2", hint: "two separate strips, e.g. both jacks of a Scarlett" },
  { id: "left", label: "Input 1 only", hint: "left channel, usually the first jack" },
  { id: "right", label: "Input 2 only", hint: "right channel, usually the second jack (a DI guitar)" },
  { id: "sum", label: "Mix to mono", hint: "one strip, good for a built-in mic" },
  { id: "stereo", label: "Stereo", hint: "keep left and right as they are" },
];

/** Two steps: pick the kind of input (hardware or software keyboard), then for hardware pick a device and its channels. */
function AddInputModal({ engine, snap, hasExtra, onClose }: { engine: LooperEngine; snap: LooperSnapshot; hasExtra: boolean; onClose: () => void }) {
  const [step, setStep] = useState<"type" | "hardware">("type");
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [pick, setPick] = useState<Pick>("left");
  const [busy, setBusy] = useState(false);
  const { devices } = snap;
  const room = MAX_INPUTS - snap.inputs.length;
  const chosen = devices.find((d) => d.id === deviceId);
  const need = pick === "both" ? 2 : 1;

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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <button type="button" onClick={() => setStep("hardware")} className="flex flex-col gap-1 rounded-xl border border-slate-700 bg-slate-900 p-4 text-left hover:border-sky-400">
            <Icon name="mic" size={28} className="text-sky-300" />
            <span className="text-sm font-medium text-slate-100">Hardware</span>
            <span className="text-xs text-slate-400">An audio interface (Scarlett, DI guitar), a USB mic or the built-in microphone.</span>
          </button>
          <button type="button" disabled={hasExtra || !snap.extraLabel} onClick={() => { void engine.mixer.add({ kind: "extra", name: snap.extraLabel ?? "Keyboard" }); onClose(); }} className="flex flex-col gap-1 rounded-xl border border-slate-700 bg-slate-900 p-4 text-left hover:border-sky-400 disabled:cursor-not-allowed disabled:opacity-50">
            <Icon name="piano" size={28} className="text-sky-300" />
            <span className="text-sm font-medium text-slate-100">Software keyboard</span>
            <span className="text-xs text-slate-400">{hasExtra ? "Already added. Open it from its strip." : "The on-screen piano and your MIDI keyboard. Plays through the app, no audio device needed."}</span>
          </button>
          <button type="button" onClick={() => { void engine.addScalePiano(); onClose(); }} className="flex flex-col gap-1 rounded-xl border border-slate-700 bg-slate-900 p-4 text-left hover:border-sky-400">
            <Icon name="music" size={28} className="text-sky-300" />
            <span className="text-sm font-medium text-slate-100">Scale Piano</span>
            <span className="text-xs text-slate-400">Pick a key and scale: the computer keys play only notes from it.</span>
          </button>
          <button type="button" onClick={() => { void engine.addSequencer(); onClose(); }} className="flex flex-col gap-1 rounded-xl border border-slate-700 bg-slate-900 p-4 text-left hover:border-sky-400 disabled:cursor-not-allowed disabled:opacity-50">
            <Icon name="drum" size={28} className="text-sky-300" />
            <span className="text-sm font-medium text-slate-100">Sequencer</span>
            <span className="text-xs text-slate-400">A step sequencer in time with the click: a drum machine to start with. It plays to the master bus; add as many as you like.</span>
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
              <DeviceButton on={deviceId === ""} onClick={() => setDeviceId("")} title="System default input" sub="whatever the operating system uses" />
            </li>
            {devices.map((d) => (
              <li key={d.id}><DeviceButton on={deviceId === d.id} onClick={() => setDeviceId(d.id)} title={d.label} sub={INTERFACE_HINT.test(d.label) ? "audio interface" : "input device"} /></li>
            ))}
          </ul>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1 text-sm font-medium text-slate-200">Which channels?</legend>
            {PICKS.map((p) => (
              <label key={p.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs ${pick === p.id ? "border-sky-400 bg-sky-500/10 text-sky-100" : "border-slate-800 text-slate-300"}`}>
                <input type="radio" name="pick" className="accent-sky-400" checked={pick === p.id} onChange={() => setPick(p.id)} />
                <span className="font-medium">{p.label}</span>
                <span className="text-slate-500">{p.hint}</span>
              </label>
            ))}
          </fieldset>
          {room < need && <p className="text-xs text-amber-200">Not enough room: the mixer holds {MAX_INPUTS} inputs. Remove one first.</p>}
          <div className="flex gap-2">
            <button type="button" className={btnPlain} onClick={() => setStep("type")}>← Back</button>
            <button type="button" className={`${btn} ml-auto border-emerald-500 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25`} disabled={deviceId === null || room < need} onClick={addHardware}>Add input</button>
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
export default function Mixer({ engine, snap, keyboardOpen, onToggleKeyboard, openSeqs, onToggleSequencer, openPianos, onTogglePiano }: { engine: LooperEngine; snap: LooperSnapshot; keyboardOpen: boolean; onToggleKeyboard: () => void; openSeqs: string[]; onToggleSequencer: (id: string) => void; openPianos: string[]; onTogglePiano: (id: string) => void }) {
  const { inputs, devices } = snap;
  const full = inputs.length >= MAX_INPUTS;
  const hasExtra = inputs.some((i) => i.kind === "extra");
  const [adding, setAdding] = useState(false);
  return (
    <section className="flex flex-col gap-1.5 rounded-xl border border-slate-800 bg-slate-900/40 p-2" aria-label="Input mixer">
      <div className="flex items-center gap-2">
        <h2 className="flex items-center gap-1.5 px-1 text-sm font-medium text-slate-100"><Icon name="sliders-horizontal" className="text-slate-400" />Mixer</h2>
        <button type="button" className={`${ibtn} ml-auto`} disabled={full} onClick={() => setAdding(true)} title="Add an input" aria-label="Add an input"><Icon name="plus" /></button>
      </div>

      {inputs.length === 0 && <p className="rounded-lg border border-dashed border-slate-700 p-2 text-xs text-slate-400">No inputs. Add one with ＋.</p>}

      <ul className="flex flex-col gap-1">
        {inputs.map((inp) => (
          <InputStrip key={inp.id} engine={engine} inp={inp} devices={devices} anyDevice={snap.devices.length > 0} keyboardOpen={keyboardOpen} onToggleKeyboard={onToggleKeyboard} sequencerOpen={!!inp.sourceId && openSeqs.includes(inp.sourceId)} onToggleSequencer={() => inp.sourceId && onToggleSequencer(inp.sourceId)} pianoOpen={!!inp.sourceId && openPianos.includes(inp.sourceId)} onTogglePiano={() => inp.sourceId && onTogglePiano(inp.sourceId)} seq={snap.sequencers.find((q) => q.id === inp.sourceId)} groups={snap.groups} />
        ))}
      </ul>
      <Buses engine={engine} snap={snap} />
      <details open className="rounded-lg border border-slate-800 bg-slate-950/40 p-1.5">
        <summary className="flex cursor-pointer items-center gap-1.5 px-1 text-xs font-medium text-slate-300"><Icon name="audio-lines" className="text-slate-400" size={16} />How it is connected</summary>
        <div className="pt-2"><SignalFlow snap={snap} /></div>
      </details>
      {adding && <AddInputModal engine={engine} snap={snap} hasExtra={hasExtra} onClose={() => setAdding(false)} />}
    </section>
  );
}

function InputStrip({ engine, inp, devices, anyDevice, keyboardOpen, onToggleKeyboard, sequencerOpen, onToggleSequencer, pianoOpen, onTogglePiano, seq, groups }: { engine: LooperEngine; inp: InputInfo; devices: { id: string; label: string }[]; anyDevice: boolean; keyboardOpen: boolean; onToggleKeyboard: () => void; sequencerOpen: boolean; onToggleSequencer: () => void; pianoOpen: boolean; onTogglePiano: () => void; seq?: LooperSnapshot["sequencers"][number]; groups: { id: string; name: string }[] }) {
  const getLevel = useMemo(() => () => engine.getInputLevel(inp.id), [engine, inp.id]);
  const m = engine.mixer;
  const isDevice = inp.kind === "device";
  const [fxOpen, setFxOpen] = useState(false);
  const state = inp.live ? "recording" : inp.muted ? "muted" : "silenced by solo";
  return (
    <li className={`flex flex-col gap-1 rounded-lg border bg-slate-950/50 px-2 py-1.5 ${inp.live ? "border-slate-800" : "border-slate-800/60 opacity-80"}`}>
      <div className="flex flex-wrap items-center gap-1.5">
        <span title={state} className="text-slate-300"><Icon name={isDevice ? "mic" : inp.kind === "sequencer" ? "drum" : inp.kind === "scalepiano" ? "music" : "piano"} size={18} /></span>
        <input value={inp.name} onChange={(e) => m.rename(inp.id, e.target.value)} aria-label="Input name" className="w-32 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-sm font-medium text-slate-100 hover:border-slate-700 focus:border-slate-500 focus:outline-none" />
        {inp.kind === "sequencer" && seq && <span className="rounded-md border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-400" title="Where this sequencer plays: by the group its circle sits in">→ {seq.dest === "record" ? "recorder" : groups.find((g) => g.id === seq.groupId)?.name ?? "master"}</span>}
        {inp.kind !== "sequencer" && <span className="flex items-center gap-0.5 rounded-md border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-400" title="Goes to the recorder, then into the loops"><Icon name="circle" size={10} className="text-rose-400" />rec</span>}
        <span aria-hidden title={state} className={`h-2 w-2 rounded-full ${inp.live ? "bg-emerald-400" : "bg-slate-600"}`} />
        <div className="min-w-[5rem] flex-1"><LevelMeter getLevel={getLevel} /></div>
        <input type="range" min={0} max={1.5} step={0.01} value={inp.volume} onChange={(e) => m.setVolume(inp.id, Number(e.target.value))} className="w-24 accent-sky-400" aria-label={`Gain of ${inp.name}`} title={`Gain ${Math.round(inp.volume * 100)}%`} />
        {inp.kind === "sequencer" && seq && <button type="button" className={`${ibtn} ${seq.playing ? "!border-emerald-500/70 !bg-emerald-500/15 !text-emerald-200" : ""}`} aria-pressed={seq.playing} onClick={() => engine.setSequencerPlaying(seq.id, !seq.playing)} title={seq.playing ? "Stop on the next beat" : "Start on the next beat"} aria-label={seq.playing ? `Stop ${inp.name}` : `Start ${inp.name}`}><Icon name={seq.playing ? "square" : "play"} fill /></button>}
        {inp.kind === "sequencer" && <button type="button" className={`${ibtn} ${sequencerOpen ? "!border-sky-400 !text-sky-200" : ""}`} aria-pressed={sequencerOpen} onClick={onToggleSequencer} title={sequencerOpen ? "Close the sequencer" : "Open the sequencer"} aria-label={sequencerOpen ? "Close the sequencer" : "Open the sequencer"}><Icon name="sliders-horizontal" /></button>}
        {inp.kind === "scalepiano" && <button type="button" className={`${ibtn} ${pianoOpen ? "!border-sky-400 !text-sky-200" : ""}`} aria-pressed={pianoOpen} onClick={onTogglePiano} title={pianoOpen ? "Close the Scale Piano" : "Open the Scale Piano"} aria-label={pianoOpen ? "Close the Scale Piano" : "Open the Scale Piano"}><Icon name="keyboard" /></button>}
        {inp.kind === "extra" && <button type="button" className={`${ibtn} ${keyboardOpen ? "!border-sky-400 !text-sky-200" : ""}`} aria-pressed={keyboardOpen} onClick={onToggleKeyboard} title={keyboardOpen ? "Close keyboard" : "Open keyboard"} aria-label={keyboardOpen ? "Close keyboard" : "Open keyboard"}><Icon name="keyboard" /></button>}
        {isDevice && inp.connected && <button type="button" className={`${ibtn} ${inp.monitor ? "!border-sky-400 !text-sky-200" : ""}`} aria-pressed={inp.monitor} onClick={() => m.setMonitor(inp.id, !inp.monitor)} title="Hear this input while it is recorded" aria-label={`Hear ${inp.name}`}><Icon name="headphones" /></button>}
        <button type="button" className={`${ibtn} relative ${inp.effects.length ? "!border-violet-400/70 !text-violet-200" : ""}`} onClick={() => setFxOpen(true)} title={inp.effects.length ? `${inp.effects.length} effect${inp.effects.length === 1 ? "" : "s"}` : "Add an effect"} aria-label={`Effects on ${inp.name}`}><Icon name="plus" />{inp.effects.length > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-violet-500 px-1 text-[9px] text-white">{inp.effects.length}</span>}</button>
        <button type="button" className={`${ibtn} ${inp.muted ? "!border-amber-400 !text-amber-200" : ""}`} aria-pressed={inp.muted} onClick={() => m.toggleMute(inp.id)} title="Mute" aria-label={`Mute ${inp.name}`}>M</button>
        <button type="button" className={`${ibtn} ${inp.solo ? "!border-sky-400 !text-sky-200" : ""}`} aria-pressed={inp.solo} onClick={() => m.toggleSolo(inp.id)} title="Solo" aria-label={`Solo ${inp.name}`}>S</button>
        <button type="button" className={ibtn} onClick={() => m.remove(inp.id)} aria-label={`Remove ${inp.name}`} title="Remove this input"><Icon name="x" /></button>
      </div>

      {isDevice && !inp.connected && (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Not connected</span>
          <button type="button" className={`${btnPlain} ml-auto`} onClick={() => void m.connect(inp.id)} title="The browser will ask for microphone access">Connect</button>
        </div>
      )}
      {isDevice && inp.connected && (
        <div className="grid gap-1.5 sm:grid-cols-[1fr_auto]">
          <select className={field} value={inp.deviceId} onChange={(e) => void m.setDevice(inp.id, e.target.value)} aria-label="Audio device">
            <option value="">{anyDevice ? "System default input" : "System default input"}</option>
            {devices.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
          <select className={field} value={inp.mode} onChange={(e) => m.setMode(inp.id, e.target.value as InputMode)} aria-label="Channels to record">
            {MODES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
        </div>
      )}
      {fxOpen && (
        <EffectsModal
          title={<span className="flex items-center gap-2"><Icon name={isDevice ? "mic" : "music"} size={16} />{inp.name}: effects</span>}
          effects={inp.effects}
          volume={{ value: inp.volume, onChange: (v) => m.setVolume(inp.id, v) }}
          onAdd={(k, post) => m.addEffect(inp.id, k, post)}
          onRemove={(fx) => m.removeEffect(inp.id, fx)}
          onParam={(fx, key, v) => m.setEffectParam(inp.id, fx, key, v)}
          onBypass={(fx) => m.toggleEffectBypass(inp.id, fx)}
          onPost={(fx, post) => m.setEffectPost(inp.id, fx, post)}
          onClose={() => setFxOpen(false)}
        />
      )}
      {inp.error && <p role="alert" className="rounded-md border border-rose-500/40 bg-rose-500/10 p-1.5 text-xs text-rose-200">{inp.error}</p>}
      {isDevice && inp.channels === 1 && inp.mode === "right" && <p className="text-xs text-amber-200">This device has one channel, so Input 2 is silent.</p>}
    </li>
  );
}

/** The buses (one per group) and the master: what feeds each, its effects, level, volume and mute. */
function Buses({ engine, snap }: { engine: LooperEngine; snap: LooperSnapshot }) {
  const [fxFor, setFxFor] = useState<string | null>(null);
  const fxGroup = snap.groups.find((g) => g.id === fxFor);
  const getMaster = useMemo(() => () => engine.getMasterLevel(), [engine]);
  return (
    <div className="flex flex-col gap-1 border-t border-slate-800 pt-1.5" aria-label="Buses">
      <h3 className="flex items-center gap-1.5 px-1 text-xs font-medium text-slate-300"><Icon name="plug" size={16} className="text-slate-400" />Buses</h3>
      <ul className="flex flex-col gap-1">
        {snap.groups.map((g) => {
          const loops = snap.channels.filter((c) => c.groupId === g.id).length;
          const seqs = snap.sequencers.filter((q) => q.groupId === g.id).length;
          return <BusRow key={g.id} engine={engine} g={g} loops={loops} seqs={seqs} onFx={() => setFxFor(g.id)} />;
        })}
        <li className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-1.5">
          <span className="h-3 w-3 rounded-sm bg-slate-300" aria-hidden />
          <span className="w-24 truncate px-1.5 text-sm font-medium text-slate-100">Master</span>
          <span className="rounded-md border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-400" title="Everything that is not in a group, and every bus">all buses + loops outside groups</span>
          <div className="min-w-[5rem] flex-1"><LevelMeter getLevel={getMaster} /></div>
          <input type="range" min={0} max={1.5} step={0.01} value={snap.masterVolume} onChange={(e) => engine.setMasterVolume(Number(e.target.value))} className="w-24 accent-sky-400" aria-label="Master volume" title={`Master ${Math.round(snap.masterVolume * 100)}%`} />
        </li>
      </ul>
      {fxGroup && <GroupEffects engine={engine} g={fxGroup} onClose={() => setFxFor(null)} />}
    </div>
  );
}

function BusRow({ engine, g, loops, seqs, onFx }: { engine: LooperEngine; g: LooperSnapshot["groups"][number]; loops: number; seqs: number; onFx: () => void }) {
  const getLevel = useMemo(() => () => engine.getBusLevel(g.id), [engine, g.id]);
  return (
    <li className="flex flex-wrap items-center gap-1.5 rounded-lg border bg-slate-950/50 px-2 py-1.5" style={{ borderColor: `${g.colour}66` }}>
      <span className="h-3 w-3 rounded-full" style={{ background: g.colour }} aria-hidden />
      <input value={g.name} onChange={(e) => engine.updateGroup(g.id, { name: e.target.value })} aria-label="Bus name" className="w-24 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-sm font-medium text-slate-100 hover:border-slate-700 focus:border-slate-500 focus:outline-none" />
      <span className="flex items-center gap-1 rounded-md border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-400" title={`${loops} loop${loops === 1 ? "" : "s"} and ${seqs} sequencer${seqs === 1 ? "" : "s"} play through this bus`}>
        <Icon name="repeat" size={10} />{loops}<Icon name="drum" size={10} />{seqs}
      </span>
      <div className="min-w-[5rem] flex-1"><LevelMeter getLevel={getLevel} /></div>
      <input type="range" min={0} max={1.5} step={0.01} value={g.volume} onChange={(e) => engine.updateGroup(g.id, { volume: Number(e.target.value) })} className="w-24 accent-sky-400" aria-label={`Volume of ${g.name}`} title={`Volume ${Math.round(g.volume * 100)}%`} />
      <button type="button" className={`${ibtn} relative ${g.effects.length ? "!border-violet-400/70 !text-violet-200" : ""}`} onClick={onFx} title={g.effects.length ? `${g.effects.length} effect${g.effects.length === 1 ? "" : "s"}` : "Add an effect"} aria-label={`Effects on ${g.name}`}><Icon name="plus" />{g.effects.length > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-violet-500 px-1 text-[9px] text-white">{g.effects.length}</span>}</button>
      <button type="button" className={`${ibtn} ${g.muted ? "!border-amber-400 !text-amber-200" : ""}`} aria-pressed={g.muted} onClick={() => engine.updateGroup(g.id, { muted: !g.muted })} title="Mute the bus" aria-label={`Mute ${g.name}`}>M</button>
    </li>
  );
}

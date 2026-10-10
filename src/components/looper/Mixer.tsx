"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Modal from "@/components/Modal";
import Icon from "@/components/Icon";
import LevelMeter from "./LevelMeter";
import EffectsModal from "./EffectsModal";
import EffectStack from "./EffectStack";
import { GroupEffects } from "./LoopStage";
import MasterControls from "./MasterOutput";
import SignalFlow from "./SignalFlow";
import { MAX_INPUTS, MAX_INPUT_GAIN, type InputInfo, type InputMode, type LooperEngine, type LooperSnapshot } from "@/lib/looper/engine";
import { chooseDevice } from "@/lib/looper/deviceChoice";
import { stripPatchId } from "@/lib/looper/patchView";
import { INPUT_PRESETS, INPUT_ROLES, presetFor, type InputRole } from "@/lib/looper/inputPresets";

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
export function AddInputModal({ engine, snap, hasExtra, onClose }: { engine: LooperEngine; snap: LooperSnapshot; hasExtra: boolean; onClose: () => void }) {
  const [step, setStep] = useState<"type" | "hardware">("type");
  const [deviceId, setDeviceId] = useState<string | null>(() => chooseDevice(snap.devices, null)?.id ?? null);
  const [role, setRole] = useState<InputRole>("guitar");
  const [presetId, setPresetId] = useState<string>("dry");
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
      const preset = presetFor(role, presetId);
      // the effects go on the first strip; a second channel of the same device gets none, so the sound is not doubled
      const first = m === modes[0];
      engine.do({ type: "input.add", spec: { kind: "device", name: `${base}${suffix}`, deviceId, mode: m, ...(first && preset ? { effects: preset.effects } : {}), ...(INPUT_ROLES.find((x) => x.id === role)?.monitor === false ? { monitor: false } : {}) } });
    });
    onClose();
  };

  return (
    <Modal title={step === "type" ? "Add" : "Add a hardware input"} onClose={onClose}>
      {step === "type" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <button type="button" onClick={() => setStep("hardware")} className="flex flex-col gap-1 rounded-xl border border-slate-700 bg-slate-900 p-4 text-left hover:border-sky-400">
            <Icon name="mic" size={28} className="text-sky-300" />
            <span className="text-sm font-medium text-slate-100">Hardware</span>
            <span className="text-xs text-slate-400">An audio interface (Scarlett, DI guitar), a USB mic or the built-in microphone.</span>
          </button>
          <button type="button" disabled={hasExtra || !snap.extraLabel} onClick={() => { engine.do({ type: "input.add", spec: { kind: "extra", name: snap.extraLabel ?? "Keyboard" } }); onClose(); }} className="flex flex-col gap-1 rounded-xl border border-slate-700 bg-slate-900 p-4 text-left hover:border-sky-400 disabled:cursor-not-allowed disabled:opacity-50">
            <Icon name="piano" size={28} className="text-sky-300" />
            <span className="text-sm font-medium text-slate-100">Software keyboard</span>
            <span className="text-xs text-slate-400">{hasExtra ? "Already added. Open it from its strip." : "The on-screen piano and your MIDI keyboard. Plays through the app, no audio device needed."}</span>
          </button>
          <button type="button" onClick={() => { void engine.addScalePiano(); onClose(); }} className="flex flex-col gap-1 rounded-xl border border-slate-700 bg-slate-900 p-4 text-left hover:border-sky-400">
            <Icon name="music" size={28} className="text-sky-300" />
            <span className="text-sm font-medium text-slate-100">Scale Piano</span>
            <span className="text-xs text-slate-400">Pick a key and scale: the computer keys play only notes from it.</span>
          </button>
          <button type="button" onClick={() => { engine.do({ type: "sequencer.add" }); onClose(); }} className="flex flex-col gap-1 rounded-xl border border-slate-700 bg-slate-900 p-4 text-left hover:border-sky-400 disabled:cursor-not-allowed disabled:opacity-50">
            <Icon name="drum" size={28} className="text-sky-300" />
            <span className="text-sm font-medium text-slate-100">Sequencer</span>
            <span className="text-xs text-slate-400">A step sequencer in time with the click: a drum machine to start with. It plays to the master bus; add as many as you like.</span>
          </button>
          <button type="button" disabled={snap.groups.length >= 8} onClick={() => { engine.do({ type: "group.add" }); onClose(); }} className="flex flex-col gap-1 rounded-xl border border-slate-700 bg-slate-900 p-4 text-left hover:border-sky-400 disabled:cursor-not-allowed disabled:opacity-50">
            <Icon name="plus" size={28} className="text-sky-300" />
            <span className="text-sm font-medium text-slate-100">Group</span>
            <span className="text-xs text-slate-400">A special bus with loops inside: a coloured box on the stage with its own recorder, volume and effects.</span>
          </button>
          <button type="button" onClick={() => { engine.do({ type: "patch.node", node: { id: `fx:${Date.now().toString(36)}`, kind: "fx", x: 20, y: 660, name: `Bus ${snap.patch.nodes.filter((n) => n.kind === "fx").length + 1}` } }); onClose(); }} className="flex flex-col gap-1 rounded-xl border border-slate-700 bg-slate-900 p-4 text-left hover:border-sky-400">
            <Icon name="sliders-horizontal" size={28} className="text-sky-300" />
            <span className="text-sm font-medium text-slate-100">Bus</span>
            <span className="text-xs text-slate-400">Just connects things and holds effects. Shown in Widgets with wires.</span>
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
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1 text-sm font-medium text-slate-200">What is it?</legend>
            <div className="flex flex-wrap gap-1.5">
              {INPUT_ROLES.map((x) => (
                <button key={x.id} type="button" aria-pressed={role === x.id} title={x.about} onClick={() => { setRole(x.id); setPresetId(INPUT_PRESETS[x.id][0].id); }} className={`rounded-lg border px-3 py-1.5 text-xs ${role === x.id ? "border-sky-400 bg-sky-500/10 text-sky-100" : "border-slate-700 text-slate-300 hover:border-slate-500"}`}>{x.name}</button>
              ))}
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {INPUT_PRESETS[role].map((p) => (
                <button key={p.id} type="button" aria-pressed={presetId === p.id} onClick={() => setPresetId(p.id)} className={`flex flex-col rounded-lg border px-3 py-1.5 text-left ${presetId === p.id ? "border-sky-400 bg-sky-500/10" : "border-slate-800 hover:border-slate-600"}`}>
                  <span className="text-xs font-medium text-slate-100">{p.name}</span>
                  <span className="text-[11px] text-slate-500">{p.about}</span>
                </button>
              ))}
            </div>
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
export type MixerAlign = "rows" | "columns";

const SECTIONS_KEY = "musickit.looper.mixerSections";
type SectionId = "inputs" | "buses" | "flow";

/** Which mixer sections are open (all, by default). Remembered; read after mount so the server and the first render agree. */
function useSections(): [Record<SectionId, boolean>, (id: SectionId) => void] {
  const [open, setOpen] = useState<Record<SectionId, boolean>>({ inputs: true, buses: true, flow: true });
  useEffect(() => {
    try {
      const j = JSON.parse(window.localStorage.getItem(SECTIONS_KEY) ?? "null");
      if (j && typeof j === "object") setOpen({ inputs: j.inputs !== false, buses: j.buses !== false, flow: j.flow !== false });
    } catch {
      /* ignore */
    }
  }, []);
  const toggle = (id: SectionId) =>
    setOpen((o) => {
      const n = { ...o, [id]: !o[id] };
      try {
        window.localStorage.setItem(SECTIONS_KEY, JSON.stringify(n));
      } catch {
        /* ignore */
      }
      return n;
    });
  return [open, toggle];
}

/** A section with a header that folds it away. The open section marked `grow` takes the space that is left in a widget. */
function Accordion({ title, icon, open, onToggle, grow = false, children }: { title: string; icon: "plug" | "audio-lines" | "mic"; open: boolean; onToggle: () => void; grow?: boolean; children: ReactNode }) {
  return (
    <section className={`flex flex-col rounded-lg border border-slate-800 bg-slate-950/40 ${open && grow ? "min-h-0 flex-1" : ""}`}>
      <button type="button" className="flex items-center gap-1.5 px-2 py-1.5 text-left text-xs font-medium text-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400" aria-expanded={open} onClick={onToggle}>
        <Icon name="chevron-right" size={14} className={`text-slate-500 transition ${open ? "rotate-90" : ""}`} />
        <Icon name={icon} size={16} className="text-slate-400" />
        {title}
      </button>
      {open && <div className={`flex flex-col gap-1 p-1.5 pt-0 ${grow ? "min-h-0 flex-1" : ""}`}>{children}</div>}
    </section>
  );
}

export default function Mixer({ engine, snap, keyboardOpen, onToggleKeyboard, openSeqs, onToggleSequencer, openPianos, onTogglePiano, align = "rows", onAlign, fill = false }: { align?: MixerAlign; onAlign?: (a: MixerAlign) => void; fill?: boolean; engine: LooperEngine; snap: LooperSnapshot; keyboardOpen: boolean; onToggleKeyboard: () => void; openSeqs: string[]; onToggleSequencer: (id: string) => void; openPianos: string[]; onTogglePiano: (id: string) => void }) {
  const { inputs, devices } = snap;
  const full = inputs.length >= MAX_INPUTS;
  const hasExtra = inputs.some((i) => i.kind === "extra");
  const [adding, setAdding] = useState(false);
  const [sections, toggleSection] = useSections();
  return (
    <section className={`flex flex-col gap-1.5 rounded-xl border border-slate-800 bg-slate-900/40 p-1.5 ${fill ? "h-full overflow-auto" : ""}`} aria-label="Input mixer">
      <div className="flex items-center gap-2">
        <h2 className="flex items-center gap-1.5 px-1 text-sm font-medium text-slate-100"><Icon name="sliders-horizontal" className="text-slate-400" />Mixer</h2>
        {onAlign && (
          <button type="button" className={`${ibtn} ml-auto`} onClick={() => onAlign(align === "rows" ? "columns" : "rows")} title={align === "rows" ? "Strips side by side" : "Strips stacked"} aria-label={align === "rows" ? "Strips side by side" : "Strips stacked"} aria-pressed={align === "columns"}><Icon name={align === "rows" ? "columns-3" : "rows-3"} /></button>
        )}
        <button type="button" className={`${ibtn} ${onAlign ? "" : "ml-auto"}`} disabled={full} onClick={() => setAdding(true)} title="Add an instrument or a bus" aria-label="Add an instrument or bus"><Icon name="plus" size={14} /><span className="ml-1 text-[11px]">instrument or bus</span></button>
      </div>

      {inputs.length === 0 && <p className="rounded-lg border border-dashed border-slate-700 p-2 text-xs text-slate-400">No inputs. Add one with ＋.</p>}

      <Accordion title="Inputs" icon="mic" open={sections.inputs} onToggle={() => toggleSection("inputs")}>
        <ul className={align === "columns" ? "flex flex-row flex-wrap items-start gap-1 [&>li]:w-64 [&>li]:shrink-0" : "flex flex-col gap-1"}>
          {inputs.map((inp) => (
            <InputStrip key={inp.id} engine={engine} inp={inp} devices={devices} anyDevice={snap.devices.length > 0} keyboardOpen={keyboardOpen} onToggleKeyboard={onToggleKeyboard} sequencerOpen={!!inp.sourceId && openSeqs.includes(inp.sourceId)} onToggleSequencer={() => inp.sourceId && onToggleSequencer(inp.sourceId)} pianoOpen={!!inp.sourceId && openPianos.includes(inp.sourceId)} onTogglePiano={() => inp.sourceId && onTogglePiano(inp.sourceId)} seq={snap.sequencers.find((q) => q.id === inp.sourceId)} groups={snap.groups} />
          ))}
        </ul>
      </Accordion>
      <Accordion title="Buses and master" icon="plug" open={sections.buses} onToggle={() => toggleSection("buses")}>
        <Buses engine={engine} snap={snap} />
      </Accordion>
      <Accordion title="How it is connected" icon="audio-lines" open={sections.flow} onToggle={() => toggleSection("flow")} grow={fill}>
        <div className={fill ? "min-h-0 flex-1" : ""}><SignalFlow snap={snap} engine={engine} fill={fill} /></div>
      </Accordion>
      {adding && <AddInputModal engine={engine} snap={snap} hasExtra={hasExtra} onClose={() => setAdding(false)} />}
    </section>
  );
}

export function InputStrip({ engine, inp, devices, anyDevice, keyboardOpen, onToggleKeyboard, sequencerOpen, onToggleSequencer, pianoOpen, onTogglePiano, seq, groups }: { engine: LooperEngine; inp: InputInfo; devices: { id: string; label: string }[]; anyDevice: boolean; keyboardOpen: boolean; onToggleKeyboard: () => void; sequencerOpen: boolean; onToggleSequencer: () => void; pianoOpen: boolean; onTogglePiano: () => void; seq?: LooperSnapshot["sequencers"][number]; groups: { id: string; name: string; colour: string }[] }) {
  const getLevel = useMemo(() => () => engine.getInputLevel(inp.id), [engine, inp.id]);
  const m = engine.mixer;
  const isDevice = inp.kind === "device";
  const [fxOpen, setFxOpen] = useState(false);
  const grp = inp.kind === "sequencer" && seq && seq.dest !== "record" ? groups.find((g) => g.id === seq.groupId) : undefined;
  const state = inp.live ? "recording" : inp.muted ? "muted" : "silenced by solo";
  return (
    <li data-patch-id={stripPatchId(inp)} style={grp ? { borderLeft: `4px solid ${grp.colour}`, background: `${grp.colour}12` } : undefined} className={`flex flex-col gap-1 rounded-lg border bg-slate-950/50 px-2 py-1.5 ${inp.live ? "border-slate-800" : "border-slate-800/60 opacity-80"}`}>
      <div className="flex flex-wrap items-center gap-1.5">
        <span title={state} className="text-slate-300"><Icon name={isDevice ? "mic" : inp.kind === "sequencer" ? "drum" : inp.kind === "scalepiano" ? "music" : "piano"} size={18} /></span>
        <input value={inp.name} onChange={(e) => engine.do({ type: "input.set", id: inp.id, patch: { name: e.target.value } })} aria-label="Input name" className="w-32 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-sm font-medium text-slate-100 hover:border-slate-700 focus:border-slate-500 focus:outline-none" />
        {inp.kind === "sequencer" && seq && <span className="flex h-6 min-w-[6.5rem] items-center justify-center gap-1 rounded-md border px-1.5 text-[10px] leading-none text-slate-300" style={{ borderColor: grp?.colour ?? "#334155" }} title="Where this sequencer plays: by the group its circle sits in">{grp && <span className="h-2 w-2 rounded-full" style={{ background: grp.colour }} />}→ {seq.dest === "record" ? "recorder" : grp?.name ?? "master"}</span>}
        {inp.kind !== "sequencer" && <span className="flex h-6 min-w-[6.5rem] items-center justify-center gap-1 rounded-md border border-slate-700 px-1.5 text-[10px] leading-none text-slate-400" title="Goes to the recorder, then into the loops"><Icon name="circle" size={10} className="text-rose-400" />rec</span>}
        <span aria-hidden title={state} className={`h-2 w-2 rounded-full ${inp.live ? "bg-emerald-400" : "bg-slate-600"}`} />
        <LevelMeter vertical getLevel={getLevel} />
        <input type="range" min={0} max={MAX_INPUT_GAIN} step={0.01} value={inp.volume} onChange={(e) => engine.do({ type: "input.set", id: inp.id, patch: { volume: Number(e.target.value) } })} className="w-24 accent-sky-400" aria-label={`Gain of ${inp.name}`} title={`Gain ${Math.round(inp.volume * 100)}%`} />
        <span className="flex-1" aria-hidden />
        {inp.kind === "sequencer" && seq && <button type="button" className={`${ibtn} ${seq.playing ? "!border-emerald-500/70 !bg-emerald-500/15 !text-emerald-200" : ""}`} aria-pressed={seq.playing} onClick={() => engine.do({ type: "sequencer.playing", id: seq.id, on: !seq.playing })} title={seq.playing ? "Stop on the next beat" : "Start on the next beat"} aria-label={seq.playing ? `Stop ${inp.name}` : `Start ${inp.name}`}><Icon name={seq.playing ? "square" : "play"} fill /></button>}
        {inp.kind === "sequencer" && <button type="button" className={`${ibtn} ${sequencerOpen ? "!border-sky-400 !text-sky-200" : ""}`} aria-pressed={sequencerOpen} onClick={onToggleSequencer} title={sequencerOpen ? "Close the sequencer" : "Open the sequencer"} aria-label={sequencerOpen ? "Close the sequencer" : "Open the sequencer"}><Icon name="sliders-horizontal" /></button>}
        {inp.kind === "scalepiano" && <button type="button" className={`${ibtn} ${pianoOpen ? "!border-sky-400 !text-sky-200" : ""}`} aria-pressed={pianoOpen} onClick={onTogglePiano} title={pianoOpen ? "Close the Scale Piano" : "Open the Scale Piano"} aria-label={pianoOpen ? "Close the Scale Piano" : "Open the Scale Piano"}><Icon name="keyboard" /></button>}
        {inp.kind === "extra" && <button type="button" className={`${ibtn} ${keyboardOpen ? "!border-sky-400 !text-sky-200" : ""}`} aria-pressed={keyboardOpen} onClick={onToggleKeyboard} title={keyboardOpen ? "Close keyboard" : "Open keyboard"} aria-label={keyboardOpen ? "Close keyboard" : "Open keyboard"}><Icon name="keyboard" /></button>}
        {isDevice && inp.connected && <button type="button" className={`${ibtn} ${inp.monitor ? "!border-sky-400 !text-sky-200" : ""}`} aria-pressed={inp.monitor} onClick={() => engine.do({ type: "input.set", id: inp.id, patch: { monitor: !inp.monitor } })} title="Hear this input while it is recorded" aria-label={`Hear ${inp.name}`}><Icon name="headphones" /></button>}
        <button type="button" className={`${ibtn} ${inp.muted ? "!border-amber-400 !text-amber-200" : ""}`} aria-pressed={inp.muted} onClick={() => engine.do({ type: "input.set", id: inp.id, patch: { muted: !inp.muted } })} title="Mute" aria-label={`Mute ${inp.name}`}>M</button>
        <button type="button" className={`${ibtn} ${inp.solo ? "!border-sky-400 !text-sky-200" : ""}`} aria-pressed={inp.solo} onClick={() => engine.do({ type: "input.set", id: inp.id, patch: { solo: !inp.solo } })} title="Solo" aria-label={`Solo ${inp.name}`}>S</button>
        <button type="button" className={ibtn} onClick={() => (inp.kind === "sequencer" && inp.sourceId ? engine.do({ type: "sequencer.remove", id: inp.sourceId }) : inp.kind === "device" || inp.kind === "extra" ? engine.do({ type: "input.remove", id: inp.id }) : m.remove(inp.id))} aria-label={`Remove ${inp.name}`} title="Remove this input"><Icon name="x" /></button>
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
          <select className={field} value={inp.mode} onChange={(e) => engine.do({ type: "input.set", id: inp.id, patch: { mode: e.target.value as InputMode } })} aria-label="Channels to record">
            {MODES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
        </div>
      )}
      <EffectStack effects={inp.effects} onOpen={() => setFxOpen(true)} onBypass={(fx) => engine.do({ type: "fx.bypass", target: { input: inp.id }, id: fx, bypass: !inp.effects.find((e) => e.id === fx)?.bypass })} onMove={(fx, d) => engine.do({ type: "fx.move", target: { input: inp.id }, id: fx, dir: d })} />
      {fxOpen && (
        <EffectsModal
          title={<span className="flex items-center gap-2"><Icon name={isDevice ? "mic" : "music"} size={16} />{inp.name}: effects</span>}
          effects={inp.effects}
          pinScope={`i:${inp.id}`}
          volume={{ value: inp.volume, onChange: (v) => engine.do({ type: "input.set", id: inp.id, patch: { volume: v } }) }}
          onAdd={(k, post) => engine.do({ type: "fx.add", target: { input: inp.id }, fx: { kind: k, post } })}
          onRemove={(fx) => engine.do({ type: "fx.remove", target: { input: inp.id }, id: fx })}
          onParam={(fx, key, v) => engine.do({ type: "fx.param", target: { input: inp.id }, id: fx, key, value: v })}
          onBypass={(fx) => engine.do({ type: "fx.bypass", target: { input: inp.id }, id: fx, bypass: !inp.effects.find((e) => e.id === fx)?.bypass })}
          onPost={(fx, post) => m.setEffectPost(inp.id, fx, post)}
          onClose={() => setFxOpen(false)}
        />
      )}
      {inp.error && <p role="alert" className="rounded-md border border-rose-500/40 bg-rose-500/10 p-1.5 text-xs text-rose-200">{inp.error}</p>}
      {isDevice && inp.channels === 1 && inp.mode === "right" && <p className="text-xs text-amber-200">This device has one channel, so Input 2 is silent.</p>}
    </li>
  );
}

/** The master bus as one strip: everything that is not in a group, and every bus, ends here. */
export function MasterStrip({ engine, snap }: { engine: LooperEngine; snap: LooperSnapshot }) {
  return (
  <li data-patch-id="master" className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-1.5">
    <span className="h-3 w-3 rounded-sm bg-slate-300" aria-hidden />
    <span className="w-32 truncate px-1.5 text-sm font-medium text-slate-100">Master bus</span>
    <span className="flex h-6 min-w-[6.5rem] items-center justify-center rounded-md border border-slate-700 px-1.5 text-[10px] leading-none text-slate-400" title="Everything that is not in a group, and every bus">all buses</span>
    <MasterControls engine={engine} snap={snap} />
  </li>
  );
}

/** The buses, one per group: what feeds each, its effects, level, volume and mute. */
export function BusList({ engine, snap }: { engine: LooperEngine; snap: LooperSnapshot }) {
  const [fxFor, setFxFor] = useState<string | null>(null);
  const fxGroup = snap.groups.find((g) => g.id === fxFor);
  return (
    <div className="flex flex-col gap-1" aria-label="Buses">
      {snap.groups.length === 0 && <p className="rounded-lg border border-dashed border-slate-700 p-2 text-xs text-slate-400">No groups, so no buses.</p>}
      <ul className="flex flex-col gap-1">
        {snap.groups.map((g) => {
          const loops = snap.channels.filter((c) => c.groupId === g.id).length;
          const seqs = snap.sequencers.filter((q) => q.groupId === g.id).length;
          return <BusRow key={g.id} engine={engine} g={g} loops={loops} seqs={seqs} onFx={() => setFxFor(g.id)} />;
        })}
      </ul>
      {fxGroup && <GroupEffects engine={engine} g={fxGroup} onClose={() => setFxFor(null)} />}
    </div>
  );
}

/** The buses and the master together: the fixed layout's section and the Buses widget. */
export function Buses({ engine, snap }: { engine: LooperEngine; snap: LooperSnapshot }) {
  return (
    <div className="flex flex-col gap-1" aria-label="Buses and master">
      <h3 className="flex items-center gap-1.5 px-1 text-xs font-medium text-slate-300"><Icon name="plug" size={16} className="text-slate-400" />Buses</h3>
      <BusList engine={engine} snap={snap} />
      <h3 className="mt-1 flex items-center gap-1.5 border-t border-slate-800 px-1 pt-1.5 text-xs font-medium text-slate-300"><Icon name="audio-lines" size={16} className="text-slate-400" />Master</h3>
      <ul>
        <MasterStrip engine={engine} snap={snap} />
      </ul>
    </div>
  );
}

/** The input strips (everything that is not a sequencer) with a button to add one. Its own widget in the widget views. */
export function InputList({ engine, snap, keyboardOpen, onToggleKeyboard, openPianos, onTogglePiano }: { engine: LooperEngine; snap: LooperSnapshot; keyboardOpen: boolean; onToggleKeyboard: () => void; openPianos: string[]; onTogglePiano: (id: string) => void }) {
  const [adding, setAdding] = useState(false);
  const strips = snap.inputs.filter((i) => i.kind !== "sequencer");
  return (
    <div className="flex flex-col gap-1" aria-label="Inputs">
      <div className="flex items-center">
        <button type="button" className={`${ibtn} ml-auto`} disabled={snap.inputs.length >= MAX_INPUTS} onClick={() => setAdding(true)} title="Add an instrument" aria-label="Add an instrument"><Icon name="plus" size={14} /><Icon name="mic" size={14} className="ml-0.5" /></button>
      </div>
      {strips.length === 0 && <p className="rounded-lg border border-dashed border-slate-700 p-2 text-xs text-slate-400">No inputs. Add one with ＋.</p>}
      <ul className="flex flex-col gap-1">
        {strips.map((inp) => (
          <InputStrip key={inp.id} engine={engine} inp={inp} devices={snap.devices} anyDevice={snap.devices.length > 0} keyboardOpen={keyboardOpen} onToggleKeyboard={onToggleKeyboard} sequencerOpen={false} onToggleSequencer={() => undefined} pianoOpen={!!inp.sourceId && openPianos.includes(inp.sourceId)} onTogglePiano={() => inp.sourceId && onTogglePiano(inp.sourceId)} seq={undefined} groups={snap.groups} />
        ))}
      </ul>
      {adding && <AddInputModal engine={engine} snap={snap} hasExtra={snap.inputs.some((i) => i.kind === "extra")} onClose={() => setAdding(false)} />}
    </div>
  );
}

/** The sequencer strips: level, mute, start and stop, the step grid. Its own widget in the widget views. */
export function SequencerList({ engine, snap, openSeqs, onToggleSequencer }: { engine: LooperEngine; snap: LooperSnapshot; openSeqs: string[]; onToggleSequencer: (id: string) => void }) {
  const strips = snap.inputs.filter((i) => i.kind === "sequencer");
  return (
    <div className="flex flex-col gap-1" aria-label="Sequencers">
      <div className="flex items-center">
        <button type="button" className={`${ibtn} ml-auto`} disabled={snap.inputs.length >= MAX_INPUTS} onClick={() => engine.do({ type: "sequencer.add" })} title="Add a sequencer" aria-label="Add a sequencer"><Icon name="plus" size={14} /><Icon name="drum" size={14} className="ml-0.5" /></button>
      </div>
      {strips.length === 0 && <p className="rounded-lg border border-dashed border-slate-700 p-2 text-xs text-slate-400">No sequencers. Add one with ＋.</p>}
      <ul className="flex flex-col gap-1">
        {strips.map((inp) => (
          <InputStrip key={inp.id} engine={engine} inp={inp} devices={snap.devices} anyDevice={snap.devices.length > 0} keyboardOpen={false} onToggleKeyboard={() => undefined} sequencerOpen={!!inp.sourceId && openSeqs.includes(inp.sourceId)} onToggleSequencer={() => inp.sourceId && onToggleSequencer(inp.sourceId)} pianoOpen={false} onTogglePiano={() => undefined} seq={snap.sequencers.find((q) => q.id === inp.sourceId)} groups={snap.groups} />
        ))}
      </ul>
    </div>
  );
}

function BusRow({ engine, g, loops, seqs, onFx }: { engine: LooperEngine; g: LooperSnapshot["groups"][number]; loops: number; seqs: number; onFx: () => void }) {
  const getLevel = useMemo(() => () => engine.getBusLevel(g.id), [engine, g.id]);
  return (
    <li className="flex flex-wrap items-center gap-1.5 rounded-lg border bg-slate-950/50 px-2 py-1.5" style={{ borderColor: `${g.colour}66` }}>
      <span className="h-3 w-3 rounded-full" style={{ background: g.colour }} aria-hidden />
      <input value={g.name} onChange={(e) => engine.do({ type: "group.set", id: g.id, patch: { name: e.target.value } })} aria-label="Bus name" className="w-32 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-sm font-medium text-slate-100 hover:border-slate-700 focus:border-slate-500 focus:outline-none" />
      <span className="flex h-6 min-w-[6.5rem] items-center justify-center gap-1 rounded-md border border-slate-700 px-1.5 text-[10px] leading-none text-slate-400" title={`${loops} loop${loops === 1 ? "" : "s"} and ${seqs} sequencer${seqs === 1 ? "" : "s"} play through this bus`}>
        <Icon name="repeat" size={10} />{loops}<Icon name="drum" size={10} />{seqs}
      </span>
      <LevelMeter vertical getLevel={getLevel} />
      <input type="range" min={0} max={1.5} step={0.01} value={g.volume} onChange={(e) => engine.do({ type: "group.set", id: g.id, patch: { volume: Number(e.target.value) } })} className="w-24 accent-sky-400" aria-label={`Volume of ${g.name}`} title={`Volume ${Math.round(g.volume * 100)}%`} />
      <span className="flex-1" aria-hidden />
      <button type="button" className={`${ibtn} ${g.muted ? "!border-amber-400 !text-amber-200" : ""}`} aria-pressed={g.muted} onClick={() => engine.do({ type: "group.set", id: g.id, patch: { muted: !g.muted } })} title="Mute the bus" aria-label={`Mute ${g.name}`}>M</button>
      <div className="basis-full"><EffectStack effects={g.effects} onOpen={onFx} onBypass={(fx) => engine.do({ type: "effect.bypass", groupId: g.id, fxId: fx, bypass: !g.effects.find((e) => e.id === fx)?.bypass })} onMove={(fx, d) => engine.do({ type: "fx.move", target: { group: g.id }, id: fx, dir: d })} /></div>
    </li>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import posthog from "posthog-js";
import { LooperEngine, EFFECT_DEFS, EFFECT_KINDS, type LooperSnapshot } from "@/lib/looper/engine";
import { wireNam } from "../namWiring";
import LooperSettings from "./LooperSettings";
import { chooseDevice, deviceKind, deviceName, isComputerMic, type DeviceKind } from "@/lib/looper/deviceChoice";
import AddFab from "./AddFab";
import Mixer, { AddInputModal, type MixerAlign } from "./Mixer";
import HistoryPanel from "./HistoryPanel";
import ConnectionLayer from "./ConnectionLayer";
import ViewMenu, { toView } from "./ViewMenu";
import MacroPanel from "./MacroPanel";
import FloatingWindow from "../FloatingWindow";
import { getAudioContext } from "@/features/sound";
import { makeGeneratorVoice } from "@/features/sampler";
import LoopStage from "./LoopStage";
import FreeBoard from "./FreeBoard";
import { Toasts } from "./toast";
import { inputsWidgetDefault, widgetDefaults } from "./widgets";
import { Modal } from "../Modal";
import MetronomeBar, { TransportButton } from "./MetronomeBar";
import Timeline from "./Timeline";
import InstrumentPanel from "./InstrumentPanel";
import SequencerPanel from "./SequencerPanel";
import Link from "next/link";
import ThemeSwitcher from "../ThemeSwitcher";
import Icon from "../Icon";
import { btn as btnPlain, btnBase as btn, ibtn } from "@/components/controls";

/** a small square icon button */

/** What the Looping header says: what exists when stopped, the take or the count-in while they run. The live bar number is drawn by the Timeline. */
function headerLabel(snap: LooperSnapshot): string {
  if (snap.channels.some((c) => c.state === "recording")) return "● rec";
  if (snap.transport.state === "countIn") return "count-in";
  if (snap.loopSeconds === null) return snap.sequencers.length === 0 ? "Record or start a sequencer" : "1 bar";
  const bars = (snap.loopSeconds * snap.metronome.bpm) / 60 / snap.metronome.beatsPerBar;
  const r = Math.round(bars);
  return `${r >= 1 && Math.abs(bars - r) < 0.02 ? `${r} bar${r === 1 ? "" : "s"} · ` : ""}${snap.loopSeconds.toFixed(2)} s`;
}

/** A small value kept in localStorage (read after mount so the server and first client render agree). */
function useStored<T>(key: string, initial: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(initial);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) setV(JSON.parse(raw) as T);
    } catch {
      /* ignore */
    }
  }, [key]);
  const set = (n: T) => {
    setV(n);
    try {
      window.localStorage.setItem(key, JSON.stringify(n));
    } catch {
      /* ignore */
    }
  };
  return [v, set];
}

/**
 * What a project is made of in storage. Settings (metronome, output, MIDI, keyboard), macros and amp models stay. The flags of the
 * defaults go too, so a new project starts with the default guitar, vocal, keyboard piano, Scale Piano, sequencers and group effect
 * widgets again, and the canvas lays itself out afresh (vertical).
 */
const PROJECT_KEYS = ["inputs", "layout", "sequencers", "scalePianos", "instruments", "patch", "fxWidgets", "groupPinsDone", "inputsWidgetDone2", "widgets", "board2", "rigDone3", "keysRigDone", "pianoRigDone2", "seqRigDone", "soundboardRigDone"];

function newProject() {
  try {
    PROJECT_KEYS.forEach((k) => window.localStorage.removeItem(`musickit.looper.${k}`));
    Object.keys(window.localStorage).filter((k) => /^musickit\.looper\.(scalePianoWindow|sequencerWindow|instrumentWindow)\./.test(k)).forEach((k) => window.localStorage.removeItem(k));
    // the default rigs are made once per project: forget that they were, so the new project gets them again
    Object.keys(window.localStorage).filter((k) => /^musickit\.looper\.(rigDone|keysRigDone|pianoRigDone|seqRigDone|soundboardRigDone)/.test(k)).forEach((k) => window.localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
  window.location.reload();
}

/**
 * Covers the page until the audio runs, so nothing half works: a Start screen before the first click or key press (browsers need
 * one), then a loader while the engine starts and waits for a remembered interface, then the error if it failed.
 */
function StartupLoader({ engine, snap }: { engine: LooperEngine; snap: LooperSnapshot }) {
  const out = chooseDevice(snap.outputs, null);
  const start = () => {
    posthog.capture("looper_started");
    void engine.enable();
  };
  if (snap.status === "idle") {
    return (
      <div className="fixed inset-0 z-[1500] grid place-items-center bg-slate-950 p-4">
        <button type="button" className="flex items-center gap-3 rounded-2xl border border-sky-500 bg-sky-500/10 px-6 py-4 text-base text-sky-100 shadow-2xl hover:bg-sky-500/20" onClick={start}>
          <Icon name="play" fill />
          Start the looper
        </button>
      </div>
    );
  }
  if (snap.status === "starting") {
    return (
      <div className="fixed inset-0 z-[1500] grid place-items-center bg-slate-950 p-4" role="status" aria-live="polite">
        <div className="flex items-center gap-2 text-sm text-slate-200">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-sky-400" aria-hidden />
          <Icon name="volume-2" size={14} className="text-slate-400" />
          <span className="truncate">Starting audio · {out ? out.label : "System output"}</span>
        </div>
      </div>
    );
  }
  if (snap.status === "error") {
    return (
      <div className="fixed inset-0 z-[1500] grid place-items-center bg-slate-950/85 p-4 backdrop-blur-sm" role="alertdialog">
        <div className="flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-slate-700 bg-slate-950 p-4 shadow-2xl">
          <div className="flex items-center gap-3"><Icon name="x" className="text-rose-300" /><h2 className="text-sm font-medium text-slate-100">Could not start</h2></div>
          <p className="text-xs text-rose-200" role="alert">{snap.error}</p>
          <button type="button" className="self-start rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:border-slate-500" onClick={start}>Try again</button>
        </div>
      </div>
    );
  }
  return null;
}

function useEngine() {
  const [engine] = useState(() => {
    if (typeof window !== "undefined") {
      wireNam();
    }
    return new LooperEngine({ getContext: getAudioContext, createVoice: (_ctx, dest, spec) => makeGeneratorVoice(dest, spec) });
  });
  useEffect(() => {
    engine.init();
    // every group's effects are on show in a new project
    widgetDefaults(engine.getSnapshot().groups.flatMap((g) => g.effects.map((e) => `g:${g.id}:${e.id}`)));
    // the Inputs list starts on show (a Canvas widget pinned under the metronome)
    inputsWidgetDefault();
    return () => engine.dispose();
  }, [engine]);
  const snap = useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot);
  return { engine, snap };
}

const KIND_BADGE: Record<DeviceKind, { text: string; cls: string } | null> = {
  interface: { text: "audio interface", cls: "border-sky-400/60 bg-sky-400/10 text-sky-200" },
  builtin: { text: "built in", cls: "border-slate-600 text-slate-400" },
  virtual: { text: "virtual", cls: "border-slate-600 text-slate-400" },
  other: null,
};

/** One column of the devices dialog: a card per device with its cleaned name and what it is. With `onPick` the cards are buttons that choose the device. */
function DeviceColumn({ icon, title, items, empty, note, onPick }: { icon: "mic" | "volume-2"; title: string; items: { id: string; label: string; used?: string; muted?: boolean }[]; empty: string; note?: string; onPick?: (id: string) => void }) {
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400"><Icon name={icon} size={14} />{title}</h3>
      <ul className="flex flex-col gap-1.5">
        {items.map((d) => {
          const badge = KIND_BADGE[deviceKind(d.label)];
          const cls = `flex w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border px-3 py-2 text-left ${d.used ? "border-emerald-400/40 bg-emerald-400/5" : "border-slate-800 bg-slate-900/60"}`;
          const body = (
            <>
              <span className="min-w-0 flex-1 truncate text-sm text-slate-100">{deviceName(d.label)}</span>
              {badge && <span className={`rounded-full border px-2 py-0.5 text-[10px] ${badge.cls}`}>{badge.text}</span>}
              {d.muted && <span className="rounded-full border border-amber-400/50 px-2 py-0.5 text-[10px] text-amber-200" title="The computer's mic hears the speakers, so its input starts muted. Unmute it (M) to use it; headphones help.">starts muted</span>}
              {d.used && <span className="rounded-full border border-emerald-400/50 px-2 py-0.5 text-[10px] text-emerald-200">{d.used}</span>}
            </>
          );
          return (
            <li key={d.id}>
              {onPick ? (
                <button type="button" className={`${cls} hover:border-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400`} aria-pressed={!!d.used} onClick={() => onPick(d.id)} title={`${icon === "mic" ? "Play into" : "Play through"} ${deviceName(d.label)}`}>{body}</button>
              ) : (
                <div className={cls}>{body}</div>
              )}
            </li>
          );
        })}
        {items.length === 0 && <li className="rounded-lg border border-dashed border-slate-700 px-3 py-2 text-xs text-slate-500">{empty}</li>}
      </ul>
      {note && <p className="mt-2 text-xs text-slate-400">{note}</p>}
    </section>
  );
}

export default function LooperApp() {
  const { engine, snap } = useEngine();
  const ready = snap.status === "ready";
  const getLevel = useMemo(() => () => engine.getLevel(), [engine]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [gearDismissed, setGearDismissed] = useState(false);
  const [gearBusy, setGearBusy] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);
  const [macrosOpen, setMacrosOpen] = useState(false);
  const [storedView, setView] = useStored<string>("musickit.looper.view", "canvas");
  // saved views from before Canvas ("widgets", "lines") open as the canvas
  const view = toView(storedView);
  const widgetMode = view === "canvas";
  // an older save only knew "widgets on or off"
  useEffect(() => {
    try {
      if (window.localStorage.getItem("musickit.looper.view") === null && window.localStorage.getItem("musickit.looper.widgetMode") === "false") setView("fixed");
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [align, setAlign] = useStored<MixerAlign>("musickit.looper.mixerAlign", "rows");
  const hist = useSyncExternalStore(engine.history.subscribe, engine.history.getState, engine.history.getState);
  const canUndo = hist.cursor > 0, canRedo = hist.cursor < hist.entries.length;
  const recording = useSyncExternalStore(engine.macroRecorder.subscribe, () => engine.macroRecorder.recording, () => false);
  const [addingInput, setAddingInput] = useState(false);
  const [openSeqs, setOpenSeqs] = useState<string[]>([]);
  const [openPianos, setOpenPianos] = useState<string[]>([]);
  const togglePiano = (id: string) => setOpenPianos((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));
  const toggleSeq = (id: string) => setOpenSeqs((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));

  // List the devices right away (no prompt: names appear only if the browser already allows the microphone).
  useEffect(() => {
    void engine.refreshDevices().catch(() => undefined);
  }, [engine]);

  // Start the audio engine on the first touch of the page (browsers need a gesture). This opens no microphone:
  // a device input asks for permission only when the person adds or connects it.
  // Capture phase: the Canvas board stops pointerdown from bubbling, and its first click must still start the engine.
  useEffect(() => {
    const go = () => void engine.enable();
    window.addEventListener("pointerdown", go, { once: true, capture: true });
    window.addEventListener("keydown", go, { once: true, capture: true });
    return () => {
      window.removeEventListener("pointerdown", go, { capture: true });
      window.removeEventListener("keydown", go, { capture: true });
    };
  }, [engine]);

  // Ctrl/Cmd+Z undoes, Ctrl+Shift+Z or Ctrl+Y redoes. Ignored while typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) engine.history.undo();
      else if ((k === "z" && e.shiftKey) || k === "y") engine.history.redo();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [engine]);

  const mixer = (fill: boolean) => (
    <Mixer engine={engine} snap={snap} openSeqs={openSeqs} onToggleSequencer={toggleSeq} openPianos={openPianos} onTogglePiano={togglePiano} align={align} onAlign={setAlign} fill={fill} />
  );
  const loopControls = (
    <>
        <TransportButton engine={engine} snap={snap} ready={ready} className="!h-8 !w-8" />
        <button type="button" className={ibtn} disabled={!ready || snap.channels.every((c) => c.state === "empty")} onClick={() => engine.do({ type: "loop.clearAll" })} title="Clear every loop" aria-label="Clear every loop"><Icon name="trash" /></button>
        <span className="text-xs tabular-nums text-slate-400">{headerLabel(snap)}</span>
        <Timeline engine={engine} beatsPerBar={snap.metronome.beatsPerBar} />
    </>
  );
  const looping = (fill: boolean) => (
    <section className={`flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/40 p-1.5 ${fill ? "h-full overflow-hidden" : ""}`} aria-label="Looping" data-patch-id="looping">
      <div className="flex flex-wrap items-center gap-2">
        {loopControls}
      </div>
      <LoopStage engine={engine} snap={snap} openSeqs={openSeqs} onToggleSeq={toggleSeq} fill={fill} pins={false} />
    </section>
  );

  return (
    <div ref={pageRef} className="relative flex flex-col">
      {widgetMode && ready && <ConnectionLayer engine={engine} snap={snap} wrapper={pageRef} />}
      {ready && <AddFab engine={engine} snap={snap} wires={widgetMode} names={Object.fromEntries(EFFECT_KINDS.map((k) => [k, EFFECT_DEFS[k].name]))} onInput={() => setAddingInput(true)} />}
      <Toasts />
      {addingInput && <AddInputModal engine={engine} snap={snap} onClose={() => setAddingInput(false)} />}
      <div className="pointer-events-none sticky top-0 z-[1100] flex flex-wrap items-start justify-between gap-2 px-1 py-1">
        <div className="pointer-events-auto"><MetronomeBar engine={engine} snap={snap} ready={ready} /></div>
        <div className="pointer-events-auto flex flex-wrap justify-end gap-1">
          <button type="button" className={ibtn} onClick={() => setNewOpen(true)} title="New project" aria-label="New project"><Icon name="file-plus" /></button>
          <button type="button" className={ibtn} disabled={!canUndo} onClick={() => engine.history.undo()} title="Undo (Ctrl+Z)" aria-label="Undo"><Icon name="undo-2" /></button>
          <button type="button" className={ibtn} disabled={!canRedo} onClick={() => engine.history.redo()} title="Redo (Ctrl+Shift+Z)" aria-label="Redo"><Icon name="redo-2" /></button>
          <button type="button" className={`${ibtn} ${historyOpen ? "border-sky-500" : ""}`} aria-pressed={historyOpen} onClick={() => setHistoryOpen((v) => !v)} title="History" aria-label="History"><Icon name="history" /></button>
          <button type="button" className={`${ibtn} ${macrosOpen || recording ? "border-sky-500" : ""} ${recording ? "text-rose-300" : ""}`} aria-pressed={macrosOpen} onClick={() => setMacrosOpen((v) => !v)} title={recording ? "Macros (recording)" : "Macros"} aria-label="Macros"><Icon name={recording ? "circle-dot" : "zap"} /></button>
          <ViewMenu view={view} onChange={setView} btnClass={ibtn} />
          <button type="button" className={ibtn} onClick={() => setSettingsOpen(true)} title="Settings" aria-label="Settings"><Icon name="settings" /></button>
          <ThemeSwitcher />
          <Link href="/" className={ibtn} title="Back to the home page" aria-label="Back to the home page"><Icon name="x" /></Link>
        </div>
      </div>
      {snap.error && <p role="alert" className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-2 text-xs text-rose-200">{snap.error}</p>}
      {view === "canvas" ? (
        <FreeBoard engine={engine} snap={snap} controls={loopControls} openSeqs={openSeqs} onToggleSeq={toggleSeq} openPianos={openPianos} onTogglePiano={togglePiano} />
      ) : (
        <div className="flex flex-col gap-2 px-1 pb-2">
          {looping(false)}
          {mixer(false)}
        </div>
      )}
      {historyOpen && (
        <FloatingWindow title="History" storageKey="musickit.looper.historyWindow" onClose={() => setHistoryOpen(false)}>
          <HistoryPanel engine={engine} />
        </FloatingWindow>
      )}
      {macrosOpen && (
        <FloatingWindow title="Macros" storageKey="musickit.looper.macrosWindow" onClose={() => setMacrosOpen(false)}>
          <MacroPanel engine={engine} />
        </FloatingWindow>
      )}
      {openSeqs.filter((id) => snap.sequencers.some((q) => q.id === id)).map((id) => (
        <FloatingWindow key={id} title={snap.sequencers.find((q) => q.id === id)?.name ?? "Sequencer"} storageKey={`musickit.looper.sequencerWindow.${id}`} onClose={() => toggleSeq(id)}>
          <SequencerPanel engine={engine} snap={snap} id={id} />
        </FloatingWindow>
      ))}
      {openPianos.filter((id) => snap.instruments.some((q) => q.id === id)).map((id) => (
        <FloatingWindow key={id} title={snap.instruments.find((q) => q.id === id)?.name ?? "Instrument"} storageKey={`musickit.looper.instrumentWindow.${id}`} fit onClose={() => togglePiano(id)}>
          <InstrumentPanel engine={engine} snap={snap} id={id} />
        </FloatingWindow>
      ))}
      <StartupLoader engine={engine} snap={snap} />
      {snap.status === "ready" && !gearDismissed && (
        <Modal title="Your devices" onClose={() => setGearDismissed(true)}>
          <div className="flex flex-col gap-3 text-sm text-slate-200">
            {snap.gear.length > 0 && (
              <ul className="flex flex-col gap-1" role="alert">
                {snap.gear.map((g, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-lg border border-amber-400/50 bg-amber-400/10 px-2 py-1.5 text-amber-100"><Icon name="alert-triangle" size={14} className="shrink-0" />{g.text}</li>
                ))}
              </ul>
            )}
            <div className="grid gap-5 sm:grid-cols-2">
              <DeviceColumn icon="mic" title="Inputs" empty="None listed. Names appear once the browser allows the microphone." note={`Click the one your instrument is plugged into: the main input uses it. More inputs come from the round + button.${snap.devices.some((d) => isComputerMic(d.label)) ? " The computer's mic starts muted so it does not pick up the speakers: press M on its input to use it." : ""}`} onPick={(id) => void engine.chooseInput(id)} items={snap.devices.map((d) => ({ id: d.id, label: d.label, muted: isComputerMic(d.label), used: snap.inputs.some((i) => i.kind === "device" && i.deviceId === d.id) ? "used by an input" : undefined }))} />
              <DeviceColumn icon="volume-2" title="Outputs" empty="The system output." note={snap.canChooseOutput ? "Click one to play through it." : "This browser plays to the system output only."} onPick={snap.canChooseOutput ? (id) => void engine.setOutputDevice(id) : undefined} items={[...(snap.canChooseOutput ? [{ id: "", label: "System default" }] : []), ...snap.outputs].map((o) => ({ id: o.id, label: o.label, used: o.id === snap.outputId ? "in use" : undefined }))} />
            </div>
            <div className="flex gap-2">
              <button type="button" disabled={gearBusy} className="rounded-lg border border-sky-500 bg-sky-500/10 px-3 py-1.5 text-sm text-sky-100 hover:bg-sky-500/20 disabled:opacity-50" onClick={async () => { setGearBusy(true); try { await engine.connectGear(true); } finally { setGearBusy(false); } }}>{gearBusy ? "Looking…" : snap.gear.some((g) => g.kind === "input-idle") ? "Detect devices and connect inputs" : "Detect devices"}</button>
              <button type="button" className="ml-auto rounded-lg bg-sky-500 px-4 py-1.5 text-sm font-medium text-slate-950 hover:bg-sky-400" onClick={() => setGearDismissed(true)}>Continue</button>
            </div>
          </div>
        </Modal>
      )}
      {newOpen && (
        <Modal title="New project" onClose={() => setNewOpen(false)}>
          <p className="text-sm text-slate-300">Start from an empty project: loops, groups, inputs, sequencers, pianos, effects, connections and effect widgets are cleared. Settings, macros and amp models are kept.</p>
          <div className="mt-3 flex gap-2">
            <button type="button" className="rounded-lg border border-rose-500 bg-rose-500/10 px-3 py-1.5 text-sm text-rose-200 hover:bg-rose-500/20" onClick={() => newProject()}>Clear and start</button>
            <button type="button" className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:border-slate-500" onClick={() => setNewOpen(false)}>Cancel</button>
          </div>
        </Modal>
      )}
      {settingsOpen && <LooperSettings engine={engine} snap={snap} getLevel={getLevel} onClose={() => setSettingsOpen(false)} />}


    </div>
  );
}

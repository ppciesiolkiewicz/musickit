"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { LooperEngine, EFFECT_DEFS, EFFECT_KINDS, registerChoice, setNamFactory, type LooperSnapshot } from "@/lib/looper/engine";
import { createCloud, createNamEffect, getModelLibrary, speedNote } from "@/features/nam";
import LooperSettings from "./LooperSettings";
import Mixer, { type MixerAlign } from "./Mixer";
import HistoryPanel from "./HistoryPanel";
import ConnectionLayer from "./ConnectionLayer";
import ViewMenu, { type View } from "./ViewMenu";
import MacroPanel from "./MacroPanel";
import { WidgetBoard, splitLayout } from "@/features/widgets";
import FloatingWindow from "../FloatingWindow";
import Piano from "@/features/sound/keyboard/Piano";
import { createPlayer, getAudioContext, getOutputBus } from "@/features/sound";
import LoopStage from "./LoopStage";
import FreeBoard from "./FreeBoard";
import AddWidgetMenu from "./AddWidgetMenu";
import { chooseDevice } from "@/lib/looper/deviceChoice";
import { Modal } from "../Modal";
import MetronomeBar from "./MetronomeBar";
import ScalePianoPanel from "./ScalePianoPanel";
import SequencerPanel from "./SequencerPanel";
import Link from "next/link";
import Icon from "../Icon";

const btn = "rounded-lg border px-3 py-1.5 text-xs transition disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";
const btnPlain = `${btn} border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500`;
/** a small square icon button */
const ibtn = "grid h-8 min-w-8 place-items-center rounded-lg border border-slate-700 bg-slate-900 px-1.5 text-xs text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";

/** " · 2 bars" when the loop is a whole number of bars at the current tempo */
function loopBars(snap: LooperSnapshot): string {
  if (snap.loopSeconds === null) return "";
  const bars = (snap.loopSeconds * snap.metronome.bpm) / 60 / snap.metronome.beatsPerBar;
  const r = Math.round(bars);
  return r >= 1 && Math.abs(bars - r) < 0.02 ? ` · ${r} bar${r === 1 ? "" : "s"}` : "";
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

/** Connect the NAM amp-model effect (a separate feature) to the looper: the effect factory and the model picker. */
function wireNam() {
  const lib = getModelLibrary();
  setNamFactory((ctx, p) => createNamEffect(ctx, p, lib));
  registerChoice("nam-model", {
    cloud: createCloud(lib),
    accept: ".nam",
    // useSyncExternalStore needs the same array back until something changes (a new array every call loops forever: React error 185)
    options: (() => {
      let last: { id: number; name: string; cloudPath?: string }[] = [];
      return () => {
        const next = lib.list().map((m) => ({ id: m.id, name: m.name, cloudPath: m.cloudPath }));
        if (next.length !== last.length || next.some((o, i) => o.id !== last[i].id || o.name !== last[i].name || o.cloudPath !== last[i].cloudPath)) last = next;
        return last;
      };
    })(),
    subscribe: (fn) => lib.subscribe(fn),
    addFiles: async (files) => {
      const errors: string[] = [];
      for (const f of files) {
        try {
          await lib.addFile(f);
        } catch (e) {
          errors.push(e instanceof Error ? e.message : String(e));
        }
      }
      return errors.length ? errors.join("; ") : null;
    },
    describe: (id) => {
      const m = lib.get(id);
      if (!m) return null;
      const sp = speedNote(m.speed);
      return { text: [m.info.architecture, `${Math.round((m.info.sampleRate ?? 48000) / 1000)} kHz`, sp?.text].filter(Boolean).join(" · "), warn: sp?.warn };
    },
  });
  void lib.init();
}

/** What a project is made of in storage. Settings (metronome, output, MIDI, keyboard), macros and amp models stay. */
const PROJECT_KEYS = ["inputs", "layout", "sequencers", "scalePianos", "patch", "fxWidgets", "widgets"];

function newProject() {
  try {
    PROJECT_KEYS.forEach((k) => window.localStorage.removeItem(`musickit.looper.${k}`));
    Object.keys(window.localStorage).filter((k) => /^musickit\.looper\.(scalePianoWindow|sequencerWindow)\./.test(k)).forEach((k) => window.localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
  window.location.reload();
}

/** Shown while the audio starts (a moment): where the sound will go. It does not block the page; only an error is a dialog. */
function StartupLoader({ engine, snap }: { engine: LooperEngine; snap: LooperSnapshot }) {
  const out = chooseDevice(snap.outputs, null);
  if (snap.status === "error") {
    return (
      <div className="fixed inset-0 z-[1500] grid place-items-center bg-slate-950/85 p-4 backdrop-blur-sm" role="alertdialog">
        <div className="flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-slate-700 bg-slate-950 p-4 shadow-2xl">
          <div className="flex items-center gap-3"><Icon name="x" className="text-rose-300" /><h2 className="text-sm font-medium text-slate-100">Could not start</h2></div>
          <p className="text-xs text-rose-200" role="alert">{snap.error}</p>
          <button type="button" className="self-start rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:border-slate-500" onClick={() => void engine.enable()}>Try again</button>
        </div>
      </div>
    );
  }
  if (snap.status !== "starting") return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-14 z-[1500] flex justify-center px-4" role="status" aria-live="polite">
      <div className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/95 px-3 py-1.5 text-xs text-slate-200 shadow-xl">
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-600 border-t-sky-400" aria-hidden />
        <Icon name="volume-2" size={13} className="text-slate-400" />
        <span className="truncate">{out ? out.label : "System output"}</span>
      </div>
    </div>
  );
}

function useEngine() {
  const [engine] = useState(() => {
    if (typeof window !== "undefined") wireNam();
    return new LooperEngine({ getContext: getAudioContext, getExternalSource: getOutputBus, externalLabel: "Piano", createVoice: (_ctx, dest) => { const p = createPlayer({ instrumentId: "PIANO", destination: () => dest }); void p.preload().catch(() => undefined); return p; } });
  });
  useEffect(() => {
    engine.init();
    return () => engine.dispose();
  }, [engine]);
  const snap = useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot);
  return { engine, snap };
}

export default function LooperApp() {
  const { engine, snap } = useEngine();
  const ready = snap.status === "ready";
  const getPosition = useMemo(() => () => engine.getPosition(), [engine]);
  const getLevel = useMemo(() => () => engine.getLevel(), [engine]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [gearDismissed, setGearDismissed] = useState(false);
  const [gearBusy, setGearBusy] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);
  const [macrosOpen, setMacrosOpen] = useState(false);
  const [layoutReset, setLayoutReset] = useState(0);
  const [view, setView] = useStored<View>("musickit.looper.view", "widgets");
  const widgetMode = view !== "fixed";
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
  const [keyboardOpen, setKeyboardOpen] = useState(false);
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
  useEffect(() => {
    const go = () => void engine.enable();
    window.addEventListener("pointerdown", go, { once: true });
    window.addEventListener("keydown", go, { once: true });
    return () => {
      window.removeEventListener("pointerdown", go);
      window.removeEventListener("keydown", go);
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
    <Mixer engine={engine} snap={snap} keyboardOpen={keyboardOpen} onToggleKeyboard={() => setKeyboardOpen((v) => !v)} openSeqs={openSeqs} onToggleSequencer={toggleSeq} openPianos={openPianos} onTogglePiano={togglePiano} align={align} onAlign={setAlign} fill={fill} />
  );
  const loopControls = (
    <>
        <button type="button" className={ibtn} disabled={!ready || snap.loopSeconds === null} onClick={() => engine.do({ type: "playback.set", on: !snap.playing })} title={snap.playing ? "Stop playback" : "Play from the top"} aria-label={snap.playing ? "Stop playback" : "Play from the top"}>
          <Icon name={snap.playing ? "square" : "play"} fill />
        </button>
        <button type="button" className={ibtn} disabled={!ready || snap.channels.every((c) => c.state === "empty")} onClick={() => engine.do({ type: "loop.clearAll" })} title="Clear every loop" aria-label="Clear every loop"><Icon name="trash" /></button>
        <span className="text-xs text-slate-400">{snap.loopSeconds === null ? "No loop yet" : `${snap.loopSeconds.toFixed(2)} s${loopBars(snap)}`}</span>
        <LoopBar getPosition={getPosition} />
        <AddWidgetMenu engine={engine} snap={snap} canPatch={widgetMode} names={Object.fromEntries(EFFECT_KINDS.map((k) => [k, EFFECT_DEFS[k].name]))} />
    </>
  );
  const looping = (fill: boolean) => (
    <section className={`flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/40 p-1.5 ${fill ? "h-full overflow-hidden" : ""}`} aria-label="Looping">
      <div className="flex flex-wrap items-center gap-2">
        {loopControls}
      </div>
      <LoopStage engine={engine} snap={snap} getPosition={getPosition} openSeqs={openSeqs} onToggleSeq={toggleSeq} fill={fill} />
    </section>
  );

  return (
    <div ref={pageRef} className="relative flex flex-col">
      {widgetMode && ready && <ConnectionLayer engine={engine} snap={snap} mode={view === "lines" ? "lines" : "colors"} cards={view === "lines" ? "none" : "float"} wrapper={pageRef} />}
      <div className="pointer-events-none sticky top-0 z-30 flex items-start justify-between gap-2 px-1 py-1">
        <div className="pointer-events-auto"><MetronomeBar engine={engine} snap={snap} ready={ready} /></div>
        <div className="pointer-events-auto flex gap-1">
          <button type="button" className={ibtn} onClick={() => setNewOpen(true)} title="New project" aria-label="New project"><Icon name="file-plus" /></button>
          <button type="button" className={ibtn} disabled={!canUndo} onClick={() => engine.history.undo()} title="Undo (Ctrl+Z)" aria-label="Undo"><Icon name="undo-2" /></button>
          <button type="button" className={ibtn} disabled={!canRedo} onClick={() => engine.history.redo()} title="Redo (Ctrl+Shift+Z)" aria-label="Redo"><Icon name="redo-2" /></button>
          <button type="button" className={`${ibtn} ${historyOpen ? "border-sky-500" : ""}`} aria-pressed={historyOpen} onClick={() => setHistoryOpen((v) => !v)} title="History" aria-label="History"><Icon name="history" /></button>
          <button type="button" className={`${ibtn} ${macrosOpen || recording ? "border-sky-500" : ""} ${recording ? "text-rose-300" : ""}`} aria-pressed={macrosOpen} onClick={() => setMacrosOpen((v) => !v)} title={recording ? "Macros (recording)" : "Macros"} aria-label="Macros"><Icon name={recording ? "circle-dot" : "zap"} /></button>
          <ViewMenu view={view} onChange={setView} btnClass={ibtn} />
          {widgetMode && <button type="button" className={ibtn} onClick={() => setLayoutReset((n) => n + 1)} title="Reset the widget layout" aria-label="Reset the widget layout"><Icon name="rotate-ccw" /></button>}
          <button type="button" className={ibtn} onClick={() => setSettingsOpen(true)} title="Settings" aria-label="Settings"><Icon name="settings" /></button>
          <Link href="/" className={ibtn} title="Back to the home page" aria-label="Back to the home page"><Icon name="x" /></Link>
        </div>
      </div>
      {snap.error && <p role="alert" className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-2 text-xs text-rose-200">{snap.error}</p>}
      {view === "lines" ? (
        <FreeBoard engine={engine} snap={snap} controls={loopControls} keyboardOpen={keyboardOpen} onToggleKeyboard={() => setKeyboardOpen((v) => !v)} openSeqs={openSeqs} onToggleSeq={toggleSeq} openPianos={openPianos} onTogglePiano={togglePiano} resetSignal={layoutReset} />
      ) : widgetMode ? (
        <WidgetBoard
          storageKey="musickit.looper.widgets"
          flush
          defaults={splitLayout(0.42)}
          resetSignal={layoutReset}
          widgets={[{ id: "mixer", title: "Mixer", node: mixer(true) }, { id: "looping", title: "Looping", node: looping(true) }]}
        />
      ) : mixer(false)}
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
      {keyboardOpen && (
        <FloatingWindow title="Keyboard" storageKey="musickit.looper.keyboardWindow" fit onClose={() => setKeyboardOpen(false)}>
          <Piano />
        </FloatingWindow>
      )}
      {openSeqs.filter((id) => snap.sequencers.some((q) => q.id === id)).map((id) => (
        <FloatingWindow key={id} title={snap.sequencers.find((q) => q.id === id)?.name ?? "Sequencer"} storageKey={`musickit.looper.sequencerWindow.${id}`} onClose={() => toggleSeq(id)}>
          <SequencerPanel engine={engine} snap={snap} id={id} />
        </FloatingWindow>
      ))}
      {openPianos.filter((id) => snap.scalePianos.some((q) => q.id === id)).map((id) => (
        <FloatingWindow key={id} title={snap.scalePianos.find((q) => q.id === id)?.name ?? "Scale Piano"} storageKey={`musickit.looper.scalePianoWindow.${id}`} fit onClose={() => togglePiano(id)}>
          <ScalePianoPanel engine={engine} snap={snap} id={id} />
        </FloatingWindow>
      ))}
      <StartupLoader engine={engine} snap={snap} />
      {snap.status === "ready" && snap.gear.length > 0 && !gearDismissed && (
        <Modal title="Connect your gear" onClose={() => setGearDismissed(true)}>
          <ul className="flex flex-col gap-1 text-sm text-slate-200">
            {snap.gear.map((g, i) => (
              <li key={i} className="flex items-center gap-2"><Icon name={g.kind.startsWith("output") ? "volume-2" : "mic"} size={14} className="text-slate-400" />{g.text}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-400">An audio interface is preferred over the computer's own microphone and speakers. Your last choice is remembered.</p>
          <div className="mt-3 flex gap-2">
            <button type="button" disabled={gearBusy} className="rounded-lg border border-sky-500 bg-sky-500/10 px-3 py-1.5 text-sm text-sky-100 hover:bg-sky-500/20 disabled:opacity-50" onClick={async () => { setGearBusy(true); try { await engine.connectGear(true); } finally { setGearBusy(false); } }}>{gearBusy ? "Connecting…" : "Connect"}</button>
            <button type="button" className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:border-slate-500" onClick={() => setGearDismissed(true)}>Not now</button>
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

      {view === "fixed" && looping(false)}

    </div>
  );
}

function LoopBar({ getPosition }: { getPosition: () => number | null }) {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const p = getPosition();
      if (bar.current) bar.current.style.width = p === null ? "0%" : `${p * 100}%`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getPosition]);
  return (
    <div className="h-2 min-w-[8rem] flex-1 overflow-hidden rounded-full bg-slate-800" aria-label="Position in the loop">
      <div ref={bar} className="h-full w-0 bg-sky-400" />
    </div>
  );
}

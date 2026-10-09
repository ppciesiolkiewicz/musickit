"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { LooperEngine, MAX_CHANNELS, type LooperSnapshot } from "@/lib/looper/engine";
import LooperSettings from "./LooperSettings";
import Mixer, { type MixerAlign } from "./Mixer";
import HistoryPanel from "./HistoryPanel";
import MacroPanel from "./MacroPanel";
import WidgetBoard from "./WidgetBoard";
import FloatingWindow from "../FloatingWindow";
import Piano from "@/features/sound/keyboard/Piano";
import { createPlayer, getAudioContext, getOutputBus } from "@/features/sound";
import LoopStage from "./LoopStage";
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

function useEngine() {
  const [engine] = useState(() => new LooperEngine({ getContext: getAudioContext, getExternalSource: getOutputBus, externalLabel: "Piano", createVoice: (_ctx, dest) => { const p = createPlayer({ instrumentId: "PIANO", destination: () => dest }); void p.preload().catch(() => undefined); return p; } }));
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
  const [historyOpen, setHistoryOpen] = useState(false);
  const [macrosOpen, setMacrosOpen] = useState(false);
  const [widgetMode, setWidgetMode] = useStored("musickit.looper.widgetMode", false);
  const [align, setAlign] = useStored<MixerAlign>("musickit.looper.mixerAlign", "rows");
  const hist = useSyncExternalStore(engine.history.subscribe, engine.history.getState, engine.history.getState);
  const canUndo = hist.cursor > 0, canRedo = hist.cursor < hist.entries.length;
  const recording = useSyncExternalStore(engine.macroRecorder.subscribe, () => engine.macroRecorder.recording, () => false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [openSeqs, setOpenSeqs] = useState<string[]>([]);
  const [openPianos, setOpenPianos] = useState<string[]>([]);
  const togglePiano = (id: string) => setOpenPianos((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));
  const toggleSeq = (id: string) => setOpenSeqs((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));

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
  const looping = (fill: boolean) => (
    <section className={`flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/40 p-1.5 ${fill ? "h-full overflow-auto" : ""}`} aria-label="Looping">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="flex items-center gap-1.5 px-1 text-sm font-medium text-slate-100"><Icon name="repeat" className="text-slate-400" />Looping</h2>
        <button type="button" className={ibtn} disabled={!ready || snap.loopSeconds === null} onClick={() => engine.do({ type: "playback.set", on: !snap.playing })} title={snap.playing ? "Stop playback" : "Play from the top"} aria-label={snap.playing ? "Stop playback" : "Play from the top"}>
          <Icon name={snap.playing ? "square" : "play"} fill />
        </button>
        <button type="button" className={ibtn} disabled={!ready || snap.channels.every((c) => c.state === "empty")} onClick={() => engine.do({ type: "loop.clearAll" })} title="Clear every loop" aria-label="Clear every loop"><Icon name="trash" /></button>
        <span className="text-xs text-slate-400">{snap.loopSeconds === null ? "No loop yet" : `${snap.loopSeconds.toFixed(2)} s${loopBars(snap)}`}</span>
        <LoopBar getPosition={getPosition} />
        <button type="button" className={ibtn} disabled={snap.channels.length >= MAX_CHANNELS} onClick={() => engine.do({ type: "loop.add" })} title="Add a loop" aria-label="Add a loop"><Icon name="plus" /></button>
        <button type="button" className={ibtn} disabled={snap.channels.length <= 1 || snap.channels[snap.channels.length - 1].state !== "empty"} onClick={() => engine.do({ type: "loop.removeLast" })} title="Remove the last loop" aria-label="Remove the last loop"><Icon name="minus" /></button>
        <button type="button" className={`${ibtn} gap-1`} disabled={snap.groups.length >= 8} onClick={() => engine.do({ type: "group.add" })} title="Add a group (a bus with effects)" aria-label="Add a group"><Icon name="plus" size={14} /><span className="text-[11px]">Group</span></button>
      </div>
      <LoopStage engine={engine} snap={snap} getPosition={getPosition} openSeqs={openSeqs} onToggleSeq={toggleSeq} />
    </section>
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="pointer-events-none sticky top-2 z-30 flex items-start justify-between gap-2">
        <div className="pointer-events-auto"><MetronomeBar engine={engine} snap={snap} ready={ready} /></div>
        <div className="pointer-events-auto flex gap-1">
          <button type="button" className={ibtn} disabled={!canUndo} onClick={() => engine.history.undo()} title="Undo (Ctrl+Z)" aria-label="Undo"><Icon name="undo-2" /></button>
          <button type="button" className={ibtn} disabled={!canRedo} onClick={() => engine.history.redo()} title="Redo (Ctrl+Shift+Z)" aria-label="Redo"><Icon name="redo-2" /></button>
          <button type="button" className={`${ibtn} ${historyOpen ? "border-sky-500" : ""}`} aria-pressed={historyOpen} onClick={() => setHistoryOpen((v) => !v)} title="History" aria-label="History"><Icon name="history" /></button>
          <button type="button" className={`${ibtn} ${macrosOpen || recording ? "border-sky-500" : ""} ${recording ? "text-rose-300" : ""}`} aria-pressed={macrosOpen} onClick={() => setMacrosOpen((v) => !v)} title={recording ? "Macros (recording)" : "Macros"} aria-label="Macros"><Icon name={recording ? "circle-dot" : "zap"} /></button>
          <button type="button" className={`${ibtn} ${widgetMode ? "border-sky-500" : ""}`} aria-pressed={widgetMode} onClick={() => setWidgetMode(!widgetMode)} title="Widget layout: move and resize the sections" aria-label="Widget layout"><Icon name="layout-dashboard" /></button>
          <button type="button" className={ibtn} onClick={() => setSettingsOpen(true)} title="Settings" aria-label="Settings"><Icon name="settings" /></button>
          <Link href="/" className={ibtn} title="Back to the home page" aria-label="Back to the home page"><Icon name="x" /></Link>
        </div>
      </div>
      {snap.error && <p role="alert" className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-2 text-xs text-rose-200">{snap.error}</p>}
      {widgetMode ? <WidgetBoard panels={{ mixer: mixer(true), looping: looping(true) }} /> : mixer(false)}
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
      {settingsOpen && <LooperSettings engine={engine} snap={snap} getLevel={getLevel} onClose={() => setSettingsOpen(false)} />}

      {!widgetMode && looping(false)}

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

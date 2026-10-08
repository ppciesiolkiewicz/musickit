"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { LooperEngine, MAX_CHANNELS, type LooperSnapshot } from "@/lib/looper/engine";
import LooperSettings from "./LooperSettings";
import Mixer from "./Mixer";
import FloatingWindow from "../FloatingWindow";
import Piano from "../Piano";
import { getAudioContext, getOutputBus } from "@/lib/audio";
import LoopStage from "./LoopStage";
import MetronomeBar from "./MetronomeBar";
import ScalePianoPanel from "./ScalePianoPanel";
import SequencerPanel from "./SequencerPanel";
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

function useEngine() {
  const [engine] = useState(() => new LooperEngine({ getContext: getAudioContext, getExternalSource: getOutputBus, externalLabel: "Piano" }));
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

  return (
    <div className="flex flex-col gap-2.5">
      <div className="pointer-events-none sticky top-2 z-30 flex items-start justify-between gap-2">
        <div className="pointer-events-auto"><MetronomeBar engine={engine} snap={snap} ready={ready} /></div>
        <button type="button" className={`${ibtn} pointer-events-auto`} onClick={() => setSettingsOpen(true)} title="Settings" aria-label="Settings"><Icon name="settings" /></button>
      </div>
      {snap.error && <p role="alert" className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-2 text-xs text-rose-200">{snap.error}</p>}
      <Mixer engine={engine} snap={snap} keyboardOpen={keyboardOpen} onToggleKeyboard={() => setKeyboardOpen((v) => !v)} openSeqs={openSeqs} onToggleSequencer={toggleSeq} openPianos={openPianos} onTogglePiano={togglePiano} />
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

      <section className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/40 p-2" aria-label="Looping">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="flex items-center gap-1.5 px-1 text-sm font-medium text-slate-100"><Icon name="repeat" className="text-slate-400" />Looping</h2>
          <button type="button" className={ibtn} disabled={!ready || snap.loopSeconds === null} onClick={() => engine.setPlaying(!snap.playing)} title={snap.playing ? "Stop playback" : "Play from the top"} aria-label={snap.playing ? "Stop playback" : "Play from the top"}>
            <Icon name={snap.playing ? "square" : "play"} fill />
          </button>
          <button type="button" className={ibtn} disabled={!ready || snap.channels.every((c) => c.state === "empty")} onClick={() => engine.clearAll()} title="Clear every loop" aria-label="Clear every loop"><Icon name="trash" /></button>
          <span className="text-xs text-slate-400">{snap.loopSeconds === null ? "No loop yet" : `${snap.loopSeconds.toFixed(2)} s${loopBars(snap)}`}</span>
          <LoopBar getPosition={getPosition} />
          <button type="button" className={ibtn} disabled={snap.channels.length >= MAX_CHANNELS} onClick={() => engine.addChannel()} title="Add a loop" aria-label="Add a loop"><Icon name="plus" /></button>
          <button type="button" className={ibtn} disabled={snap.channels.length <= 1 || snap.channels[snap.channels.length - 1].state !== "empty"} onClick={() => engine.removeLastChannel()} title="Remove the last loop" aria-label="Remove the last loop"><Icon name="minus" /></button>
          <button type="button" className={`${ibtn} gap-1`} disabled={snap.groups.length >= 8} onClick={() => engine.addGroup()} title="Add a group (a bus with effects)" aria-label="Add a group"><Icon name="plus" size={14} /><span className="text-[11px]">Group</span></button>
        </div>
        <LoopStage engine={engine} snap={snap} getPosition={getPosition} openSeqs={openSeqs} onToggleSeq={toggleSeq} />
      </section>

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

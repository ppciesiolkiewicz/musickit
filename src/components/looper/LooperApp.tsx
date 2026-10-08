"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { LooperEngine, MAX_CHANNELS, type LooperSnapshot } from "@/lib/looper/engine";
import LevelMeter from "./LevelMeter";
import LooperSettings from "./LooperSettings";
import Mixer from "./Mixer";
import FloatingWindow from "../FloatingWindow";
import Piano from "../Piano";
import { getAudioContext, getOutputBus } from "@/lib/audio";
import LoopStage from "./LoopStage";
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
  const [sequencerOpen, setSequencerOpen] = useState(false);

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
      <InputBar engine={engine} snap={snap} ready={ready} getLevel={getLevel} onSettings={() => setSettingsOpen(true)} />
      <Mixer engine={engine} snap={snap} keyboardOpen={keyboardOpen} onToggleKeyboard={() => setKeyboardOpen((v) => !v)} sequencerOpen={sequencerOpen} onToggleSequencer={() => setSequencerOpen((v) => !v)} />
      {keyboardOpen && (
        <FloatingWindow title="Keyboard" storageKey="musickit.looper.keyboardWindow" fit onClose={() => setKeyboardOpen(false)}>
          <Piano />
        </FloatingWindow>
      )}
      {sequencerOpen && (
        <FloatingWindow title="Sequencer" storageKey="musickit.looper.sequencerWindow" onClose={() => setSequencerOpen(false)}>
          <SequencerPanel engine={engine} snap={snap} />
        </FloatingWindow>
      )}
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
        <LoopStage engine={engine} snap={snap} getPosition={getPosition} />
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

function InputBar({ engine, snap, ready, getLevel, onSettings }: { engine: LooperEngine; snap: LooperSnapshot; ready: boolean; getLevel: () => number; onSettings: () => void }) {
  const m = snap.metronome;
  const nextQuant = { off: "beat", beat: "bar", bar: "off" } as const;
  return (
    <section className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/40 p-2" aria-label="Looper header">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="px-1 text-sm font-medium text-slate-100">Looper</span>
        <span className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-1" title={m.locked ? "Tempo is locked while there is a loop. Clear everything to change it." : "Tempo"}>
          <button type="button" className={`grid h-8 w-7 place-items-center rounded-md ${m.manual ? "text-sky-300" : "text-slate-400 hover:text-slate-200"}`} aria-pressed={m.manual} onClick={() => engine.toggleMetronome()} disabled={!ready} title={m.manual ? "Stop the metronome" : "Start the metronome on its own"} aria-label="Start or stop the metronome"><Icon name="metronome" /></button>
          <button type="button" className="px-1 text-slate-300 disabled:opacity-40" disabled={m.locked} onClick={() => engine.setMetronome({ bpm: m.bpm - 1 })} aria-label="Slower">−</button>
          <input type="number" min={40} max={240} value={m.bpm} disabled={m.locked} onChange={(e) => engine.setMetronome({ bpm: Number(e.target.value) })} aria-label="Beats per minute" className="h-8 w-12 bg-transparent text-center text-sm tabular-nums text-slate-100 focus:outline-none disabled:opacity-60" />
          <button type="button" className="px-1 text-slate-300 disabled:opacity-40" disabled={m.locked} onClick={() => engine.setMetronome({ bpm: m.bpm + 1 })} aria-label="Faster">+</button>
          <span className="pl-1 text-xs text-slate-500">{m.beatsPerBar}/4</span>
        </span>
        <button type="button" className={ibtn} onClick={() => engine.setMetronome({ audible: !m.audible })} aria-pressed={m.audible} title={m.audible ? "Click is on (tap to silence)" : "Click is silent (tap to hear it)"} aria-label="Metronome click"><Icon name={m.audible ? "bell" : "bell-off"} /></button>
        <button type="button" className={ibtn} onClick={() => engine.setMetronome({ quantise: nextQuant[m.quantise] })} title={`Quantise the first take to: ${m.quantise}. Tap to change.`} aria-label={`Quantise: ${m.quantise}`}>
          <span className="text-[11px]">⌗ {m.quantise}</span>
        </button>
        {m.showBeat && <BeatDots engine={engine} count={m.beatsPerBar} />}
        <div className="ml-auto flex min-w-[6rem] flex-1 items-center gap-2 sm:max-w-[16rem]" title="Level of what is being recorded">
          <Icon name="activity" className="text-slate-500" />
          <div className="flex-1"><LevelMeter getLevel={getLevel} /></div>
        </div>
        <button type="button" className={ibtn} onClick={onSettings} title="Settings" aria-label="Settings"><Icon name="settings" /></button>
      </div>
      {snap.error && <p role="alert" className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-2 text-xs text-rose-200">{snap.error}</p>}
    </section>
  );
}

/** One dot per beat of the bar, the current one lit, the downbeat in amber. Hollow dots during the count-in. */
function BeatDots({ engine, count }: { engine: LooperEngine; count: number }) {
  const refs = useRef<(HTMLSpanElement | null)[]>([]) as { current: (HTMLSpanElement | null)[] };
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const p = engine.getBeat();
      refs.current.forEach((el, i) => {
        if (!el) return;
        const on = p !== null && p.beat === i;
        el.style.opacity = on ? "1" : "0.35";
        el.style.transform = on ? "scale(1.25)" : "scale(1)";
        el.style.background = p?.countIn ? "transparent" : i === 0 ? "#fbbf24" : "#38bdf8";
        el.style.borderColor = i === 0 ? "#fbbf24" : "#38bdf8";
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [engine, count]);
  return (
    <span className="flex items-center gap-1.5 px-1" role="img" aria-label="Beat indicator">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} ref={(el) => { refs.current[i] = el; }} className="h-2.5 w-2.5 rounded-full border opacity-35 transition-transform duration-75" />
      ))}
    </span>
  );
}

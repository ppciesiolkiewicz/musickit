"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Icon from "@/components/Icon";
import Slider from "@/components/Slider";
import { getAudioContext, getOutputBus } from "@/features/sound";
import { CLICK_MAX_BEATS, CLICK_MAX_BPM, CLICK_MIN_BPM, ClickTrack, DEFAULT_CLICK, clampClick, tapTempo, type ClickParams } from "../click/click";
import { DEFAULT_DRONE, DRONE_MAX_OCTAVE, DRONE_MIN_OCTAVE, DroneVoice, clampDrone, droneName, type DroneParams } from "../drone/drone";
import DroneControls from "../drone/DroneControls";

const STORAGE_KEY = "musickit.pocket";
const ibtn = "grid h-7 min-w-7 shrink-0 place-items-center rounded-md border border-slate-700 bg-slate-900 px-1 text-xs text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";
const field = "h-8 rounded-md border border-slate-700 bg-slate-900 px-2 text-xs text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";

/** The one AudioContext, woken up (a click is a user gesture, so resume is allowed). */
async function audio() {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") await ctx.resume();
  return ctx;
}

/** A gear button with a panel under it; closes on a click outside or Escape. */
function Popover({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => wrap.current && !wrap.current.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", down);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("keydown", key);
    };
  }, [open]);
  return (
    <div ref={wrap} className="relative shrink-0">
      <button type="button" className={`${ibtn} ${open ? "!border-sky-400 !text-sky-200" : ""}`} aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((v) => !v)} title={label} aria-label={label}>
        <Icon name="sliders-horizontal" size={14} />
      </button>
      {open && (
        <div role="dialog" aria-label={label} className={`absolute right-0 top-full z-30 mt-1.5 max-h-[70vh] overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-slate-300 shadow-2xl ${wide ? "w-xl" : "w-64"} max-w-[calc(100vw-1.5rem)]`}>
          {children}
        </div>
      )}
    </div>
  );
}

function PlayButton({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" className={`${ibtn} ${on ? "!border-sky-400 !bg-sky-500/20 !text-sky-100" : ""}`} aria-pressed={on} onClick={onClick} title={on ? `Stop the ${label}` : `Play the ${label}`} aria-label={on ? `Stop the ${label}` : `Play the ${label}`}>
      <Icon name={on ? "square" : "play"} fill size={12} />
    </button>
  );
}

/** One tool on one line: a small label, then its controls. */
function Tool({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex min-w-0 items-center gap-1">
      <span className="w-20 shrink-0 text-[11px] uppercase tracking-wider text-slate-500">{label}</span>
      {children}
    </div>
  );
}

/** One dot per beat, the current one lit and the downbeat amber; read from the click on every frame, so React does not re-render. */
function BeatDots({ track, count, playing }: { track: React.RefObject<ClickTrack | null>; count: number; playing: boolean }) {
  const refs = useRef<(HTMLSpanElement | null)[]>([]);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const b = playing ? track.current?.beat() : null;
      refs.current.forEach((el, i) => {
        if (!el) return;
        const lit = b != null && b.beat === i;
        el.style.opacity = lit ? "1" : "0.3";
        el.style.transform = lit ? "scale(1.3)" : "scale(1)";
      });
      if (playing) raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [track, count, playing]);
  return (
    <span className="flex w-18 shrink-0 items-center justify-center gap-1" aria-hidden>
      {Array.from({ length: Math.min(count, 8) }, (_, i) => (
        <span key={i} ref={(el) => { refs.current[i] = el; }} className={`h-2 w-2 rounded-full opacity-30 transition-transform duration-75 ${i === 0 ? "bg-amber-400" : "bg-sky-400"}`} />
      ))}
    </span>
  );
}

/**
 * A small metronome and drone for a page's settings bar: each on one line with play, the few controls you reach for (tempo; the
 * drone's octave and volume) and a panel behind the sliders button for the rest (the drone's panel is the full `DroneControls`).
 * The drone's note follows `keyPc`. It owns its audio, plays straight to the speakers and stops when the page goes. Saved in
 * localStorage `musickit.pocket` (settings only; nothing plays on load).
 */
export default function PocketTools({ keyPc, className = "" }: { keyPc: number; className?: string }) {
  const [click, setClick] = useState<ClickParams>(DEFAULT_CLICK);
  const [drone, setDrone] = useState<DroneParams>({ ...DEFAULT_DRONE, root: keyPc });
  const [clicking, setClicking] = useState(false);
  const [droning, setDroning] = useState(false);
  const [taps, setTaps] = useState<number[]>([]);
  const track = useRef<ClickTrack | null>(null);
  const voice = useRef<DroneVoice | null>(null);
  const [restored, setRestored] = useState(false);
  const [key, setKey] = useState(keyPc);

  // the drone moves to the page's key whenever it changes
  if (key !== keyPc) {
    setKey(keyPc);
    setDrone((d) => ({ ...d, root: keyPc }));
  }

  // read the save after mount, so the server render and the first client render match; saving starts once it is back
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        setClick(clampClick(s.click));
        setDrone((d) => clampDrone({ ...s.drone, root: d.root }));
      }
    } catch {
      /* ignore a corrupt save */
    }
    setRestored(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!restored) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ click, drone }));
    } catch {
      /* private mode */
    }
  }, [click, drone, restored]);

  useEffect(() => track.current?.set(click), [click]);
  useEffect(() => voice.current?.update(drone), [drone]);

  useEffect(() => () => {
    track.current?.dispose();
    voice.current?.stop();
    const v = voice.current;
    // let the fade finish before freeing it
    setTimeout(() => v?.dispose(), 1500);
  }, []);

  const toggleClick = async () => {
    if (clicking) {
      track.current?.stop();
      setClicking(false);
      return;
    }
    const ctx = await audio();
    track.current ??= new ClickTrack(ctx, getOutputBus());
    track.current.start(click);
    setClicking(true);
  };

  const toggleDrone = async () => {
    if (droning) {
      voice.current?.stop();
      setDroning(false);
      return;
    }
    const ctx = await audio();
    voice.current ??= new DroneVoice(ctx, getOutputBus());
    voice.current.start(drone);
    setDroning(true);
  };

  const setC = (p: Partial<ClickParams>) => setClick((c) => clampClick({ ...c, ...p }));
  // Reset in the drone panel goes back to the key's note, not the drone's default E
  const setD = (p: Partial<DroneParams>) => setDrone((d) => clampDrone({ ...d, ...p, root: p === DEFAULT_DRONE ? keyPc : (p.root ?? d.root) }));

  const tap = () => {
    const now = performance.now() / 1000;
    const next = [...taps.filter((t) => now - t < 3), now];
    setTaps(next);
    const bpm = tapTempo(next);
    if (bpm) setC({ bpm });
  };

  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 ${className}`}>
      <Tool label="Metronome">
        <PlayButton on={clicking} label="metronome" onClick={toggleClick} />
        <button type="button" className={ibtn} disabled={click.bpm <= CLICK_MIN_BPM} onClick={() => setC({ bpm: click.bpm - 1 })} aria-label="Slower">−</button>
        <span className="w-12 text-center text-xs tabular-nums text-slate-100" aria-live="polite">{click.bpm}<span className="text-[10px] text-slate-500"> bpm</span></span>
        <button type="button" className={ibtn} disabled={click.bpm >= CLICK_MAX_BPM} onClick={() => setC({ bpm: click.bpm + 1 })} aria-label="Faster">+</button>
        <BeatDots track={track} count={click.beatsPerBar} playing={clicking} />
        <Popover label="Metronome settings">
          <div className="flex flex-col gap-2.5">
            <label className="flex items-center gap-2">
              <span className="w-16 shrink-0">Tempo</span>
              <Slider min={CLICK_MIN_BPM} max={CLICK_MAX_BPM} step={1} value={click.bpm} onChange={(bpm) => setC({ bpm })} className="flex-1" aria-label="Tempo" />
              <span className="w-8 text-right tabular-nums text-slate-400">{click.bpm}</span>
            </label>
            <label className="flex items-center justify-between gap-2">
              Beats per bar
              <select className={field} value={click.beatsPerBar} onChange={(e) => setC({ beatsPerBar: Number(e.target.value) })}>
                {Array.from({ length: CLICK_MAX_BEATS }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2">
              <span className="w-16 shrink-0">Volume</span>
              <Slider min={0} max={1} step={0.01} value={click.volume} onChange={(volume) => setC({ volume })} className="flex-1" aria-label="Click volume" />
            </label>
            <button type="button" className={`${ibtn} h-9 w-full text-sm`} onClick={tap} title="Tap a few times in time to set the tempo">Tap tempo</button>
          </div>
        </Popover>
      </Tool>

      <Tool label="Drone">
        <PlayButton on={droning} label="drone" onClick={toggleDrone} />
        <button type="button" className={ibtn} disabled={drone.octave <= DRONE_MIN_OCTAVE} onClick={() => setD({ octave: drone.octave - 1 })} aria-label="Octave down">−</button>
        <span className="w-12 text-center text-xs tabular-nums text-slate-100" aria-live="polite" title="The drone plays the key's note (another note in the sound panel)">{droneName(drone)}</span>
        <button type="button" className={ibtn} disabled={drone.octave >= DRONE_MAX_OCTAVE} onClick={() => setD({ octave: drone.octave + 1 })} aria-label="Octave up">+</button>
        <Slider min={0} max={1} step={0.01} value={drone.level} onChange={(level) => setD({ level })} size="sm" className="w-18 shrink-0 px-1" aria-label="Drone volume" title="Drone volume" />
        <Popover label="Drone sound" wide>
          <DroneControls value={drone} onChange={(p) => setD(p)} playing={droning} header={<p className="text-[11px] text-slate-500">The note moves to the page&apos;s key whenever the key changes.</p>} />
        </Popover>
      </Tool>
    </div>
  );
}

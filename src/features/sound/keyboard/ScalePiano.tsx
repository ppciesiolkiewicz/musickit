"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { createPlayer } from "../engine/player";
import { useInstrumentOptions } from "../engine/useInstrumentOptions";
import { MAX_OCTAVE, MIN_OCTAVE, NOTE_NAMES, SCALES, buildKeyMap, clampState, scalePitchClasses, type KeyNote, type ScalePianoState } from "./scaleKeys";

const ibtn = "grid h-8 min-w-8 place-items-center rounded-lg border border-slate-700 bg-slate-900 px-1.5 text-xs text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";
const field = "h-8 rounded-md border border-slate-700 bg-slate-900 px-2 text-xs text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";

/** indent of each keyboard row, in key widths, like a real keyboard */
const STAGGER = [0, 0.5, 0.75, 1.25];
const BLACK = new Set([1, 3, 6, 8, 10]);

const typing = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA" || el.isContentEditable);
};

/** What the keys play. A sample player fits; so does anything else with these three calls (the looper passes its routed voice). */
export interface ScaleVoice {
  noteOn(midi: number, velocity?: number): void;
  noteOff(midi: number): void;
  allOff(): void;
}

/** The keyboard's settings and its sound (an instrument id of the sound engine, the sampled piano when left out). */
export type ScalePianoSettings = ScalePianoState & { instrument?: string };

export interface ScalePianoProps {
  state: ScalePianoSettings;
  /** every change, the sound included: the owner stores it and, when it passed a voice, switches that voice's instrument */
  onChange: (patch: Partial<ScalePianoSettings>) => void;
  /** the sound; without one the keyboard plays its own sample player to the app's output, in `state.instrument` */
  voice?: ScaleVoice;
}

/**
 * The Scale Piano: pick a key and scale, then play it from the computer keyboard (or click the keys).
 * The picture shows which key plays which note. It listens to the keyboard only while mounted and never while typing in a field.
 */
export default function ScalePiano({ state: raw, onChange, voice }: ScalePianoProps) {
  // keyed on the values, so a new object with the same settings does not rebuild the keys (and cut held notes)
  const state = useMemo(() => clampState({ root: raw.root, scale: raw.scale, octave: raw.octave }), [raw.root, raw.scale, raw.octave]);
  const keys = useMemo(() => buildKeyMap(state), [state]);
  const byCode = useMemo(() => new Map(keys.map((k) => [k.code, k])), [keys]);
  const inScale = useMemo(() => scalePitchClasses(state), [state]);
  const [down, setDown] = useState<ReadonlySet<number>>(new Set());
  const held = useRef(new Map<string, number>());

  const instrumentOptions = useInstrumentOptions();
  const instrument = raw.instrument ?? "PIANO";
  // its own sample player, used (and its samples loaded) only when no voice is given
  const [own] = useState(() => createPlayer({ instrumentId: "PIANO" }));
  useEffect(() => {
    if (voice) return;
    own.setInstrument(instrument);
    void own.preload().catch(() => undefined);
  }, [voice, own, instrument]);
  const piano: ScaleVoice = voice ?? own;

  const press = useCallback((tag: string, k: KeyNote) => {
    if (held.current.has(tag)) return;
    held.current.set(tag, k.midi);
    piano.noteOn(k.midi);
    setDown(new Set(held.current.values()));
  }, [piano]);
  const release = useCallback((tag: string) => {
    const m = held.current.get(tag);
    if (m === undefined) return;
    held.current.delete(tag);
    piano.noteOff(m);
    setDown(new Set(held.current.values()));
  }, [piano]);
  const releaseAll = useCallback(() => {
    held.current.clear();
    piano.allOff();
    setDown(new Set());
  }, [piano]);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return;
      const k = byCode.get(e.code);
      if (!k) return;
      e.preventDefault();
      press(e.code, k);
    };
    const onUp = (e: KeyboardEvent) => release(e.code);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", releaseAll);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", releaseAll);
      releaseAll();
    };
  }, [byCode, press, release, releaseAll]);

  const rows = [3, 2, 1, 0]; // number row on top, like the keyboard
  const lowest = 12 * (state.octave + 1);
  return (
    <div className="flex w-[34rem] max-w-full flex-col gap-2 p-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <select className={field} value={state.root} onChange={(e) => onChange({ root: Number(e.target.value) })} aria-label="Key">
          {NOTE_NAMES.map((n, i) => <option key={n} value={i}>{n}</option>)}
        </select>
        <select className={field} value={state.scale} onChange={(e) => onChange({ scale: e.target.value })} aria-label="Scale">
          {SCALES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className={field} value={instrument} onChange={(e) => { onChange({ instrument: e.target.value }); e.target.blur(); }} aria-label="Sound" title="Sound">
          {!instrumentOptions.some((o) => o.value === instrument) && <option value={instrument}>{instrument}</option>}
          {instrumentOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div className="ml-auto flex items-center gap-1" role="group" aria-label="Octave">
          <button type="button" className={ibtn} disabled={state.octave <= MIN_OCTAVE} onClick={() => onChange({ octave: state.octave - 1 })} title="Octave down" aria-label="Octave down"><Icon name="chevron-left" /></button>
          <span className="w-8 text-center text-xs tabular-nums text-slate-300" title="Octave of the bottom row">C{state.octave}</span>
          <button type="button" className={ibtn} disabled={state.octave >= MAX_OCTAVE} onClick={() => onChange({ octave: state.octave + 1 })} title="Octave up" aria-label="Octave up"><Icon name="chevron-right" /></button>
        </div>
      </div>

      <div className="flex flex-col gap-1" role="group" aria-label="Computer keyboard layout">
        {rows.map((r) => (
          <div key={r} className="flex gap-1" style={{ paddingLeft: `${STAGGER[r] * 2.75}rem` }}>
            {keys.filter((k) => k.row === r).map((k) => {
              const on = down.has(k.midi);
              return (
                <button
                  key={k.code}
                  type="button"
                  tabIndex={-1}
                  onPointerDown={(e) => { e.preventDefault(); press(`p${k.code}`, k); }}
                  onPointerUp={() => release(`p${k.code}`)}
                  onPointerLeave={() => release(`p${k.code}`)}
                  onPointerCancel={() => release(`p${k.code}`)}
                  aria-label={`${k.label} plays ${k.name}`}
                  className={`flex h-11 w-[2.65rem] shrink-0 select-none flex-col items-center justify-center rounded-md border leading-none transition-colors ${on ? "border-amber-300 bg-amber-400 text-slate-900" : k.isRoot ? "border-sky-400/70 bg-sky-500/20 text-sky-100" : "border-slate-700 bg-slate-900 text-slate-200"}`}
                >
                  <span className={`text-[9px] ${on ? "text-slate-700" : "text-slate-500"}`}>{k.label}</span>
                  <span className="text-xs font-medium">{k.name}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <MiniPiano lowest={lowest} inScale={inScale} root={state.root} down={down} />
    </div>
  );
}

/** Three octaves of piano with the notes of the scale marked: the root in blue, the other scale notes in grey, the notes being played in amber. */
function MiniPiano({ lowest, inScale, root, down }: { lowest: number; inScale: Set<number>; root: number; down: ReadonlySet<number> }) {
  const span = 36;
  const whites: number[] = [];
  for (let i = 0; i < span; i++) if (!BLACK.has(i % 12)) whites.push(i);
  const w = 100 / whites.length;
  const fill = (semi: number, black: boolean) => {
    const pc = semi % 12;
    if (down.has(lowest + semi)) return "#fbbf24";
    if (pc === root) return "#38bdf8";
    if (inScale.has(pc)) return black ? "#64748b" : "#cbd5e1";
    return black ? "#0f172a" : "#1e293b";
  };
  return (
    <svg viewBox="0 0 100 18" className="w-full" role="img" aria-label="Notes of the scale on a piano" preserveAspectRatio="none" height={56}>
      {whites.map((s, i) => <rect key={s} x={i * w + 0.1} y={0} width={w - 0.2} height={18} rx={0.8} fill={fill(s, false)} stroke="#334155" strokeWidth={0.15} />)}
      {Array.from({ length: span }, (_, s) => s).filter((s) => BLACK.has(s % 12)).map((s) => {
        const left = whites.indexOf(s - 1);
        return <rect key={s} x={(left + 1) * w - w * 0.3} y={0} width={w * 0.6} height={11} rx={0.6} fill={fill(s, true)} stroke="#020617" strokeWidth={0.15} />;
      })}
    </svg>
  );
}

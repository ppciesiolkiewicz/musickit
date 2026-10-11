"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getAudioContext, strum } from "@/features/sound";
import { btnSm } from "@/components/controls";
import { detectPitch, hzToNote, nearestString, type NoteReading } from "./pitch";
import { A4_PRESETS, INSTRUMENTS, instrumentById, type InstrumentId, type TunerString } from "@/features/theory";
import InstrumentIcon from "./InstrumentIcon";

interface Reading { hz: number; note: NoteReading }
interface Choice { instrument: InstrumentId; tuning: string; a4: number }

const FRAME = 4096;
const STORE = "musickit.tuner";
const DEFAULT: Choice = { instrument: "guitar", tuning: "standard", a4: 440 };
const field = "h-8 rounded-md border border-slate-700 bg-slate-900 px-2 text-xs text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";

const clampA4 = (n: number) => Math.max(400, Math.min(480, Math.round(n * 10) / 10));

/** A valid choice from loose input (query string or storage), or null. */
function sanitise(raw: Partial<Record<keyof Choice, unknown>> | null): Choice | null {
  const inst = instrumentById(typeof raw?.instrument === "string" ? raw.instrument : null);
  if (!inst) return null;
  const tuning = inst.tunings.find((t) => t.id === raw?.tuning)?.id ?? inst.tunings[0]?.id ?? "";
  const a4 = Number(raw?.a4);
  return { instrument: inst.id, tuning, a4: Number.isFinite(a4) && a4 > 0 ? clampA4(a4) : 440 };
}

/** A tuner for many instruments. Pick an instrument (and its tuning) or Chromatic; the microphone opens only after Start. */
export default function Tuner() {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState<Reading | null>(null);
  const [choice, setChoice] = useState<Choice>(DEFAULT);
  const loaded = useRef(false);
  const stop = useRef<(() => void) | null>(null);

  const instrument = instrumentById(choice.instrument)!;
  const tuning = instrument.tunings.find((t) => t.id === choice.tuning) ?? instrument.tunings[0];
  const strings: TunerString[] = tuning?.strings ?? [];
  // the detection loop reads these without restarting
  const minHzRef = useRef(instrument.minHz);
  const a4Ref = useRef(choice.a4);
  useEffect(() => {
    minHzRef.current = instrument.minHz;
    a4Ref.current = choice.a4;
  }, [instrument.minHz, choice.a4]);

  useEffect(() => {
    let start: Choice | null = null;
    try {
      const q = new URLSearchParams(window.location.search);
      start = q.has("instrument") ? sanitise({ instrument: q.get("instrument"), tuning: q.get("tuning"), a4: q.get("a4") ?? undefined }) : null;
      start ??= sanitise(JSON.parse(window.localStorage.getItem(STORE) ?? "null"));
    } catch { /* storage blocked */ }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring the saved choice after hydration
    if (start) setChoice(start);
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    try { window.localStorage.setItem(STORE, JSON.stringify(choice)); } catch { /* storage blocked */ }
  }, [choice]);

  const pickInstrument = (id: InstrumentId) => setChoice((c) => ({ ...c, instrument: id, tuning: instrumentById(id)!.tunings[0]?.id ?? "" }));

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const ctx = getAudioContext();
      await ctx.resume();
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = FRAME;
      src.connect(an);
      const buf = new Float32Array(FRAME);
      const recent: number[] = [];
      let raf = 0, quiet = 0, alive = true;
      const tick = () => {
        if (!alive) return;
        an.getFloatTimeDomainData(buf);
        const p = detectPitch(buf, ctx.sampleRate, { minHz: minHzRef.current });
        if (p && p.clarity > 0.85) {
          quiet = 0;
          recent.push(p.freq);
          if (recent.length > 5) recent.shift();
          const hz = [...recent].sort((x, y) => x - y)[Math.floor(recent.length / 2)];
          setReading({ hz, note: hzToNote(hz, a4Ref.current) });
        } else if (++quiet > 30) {
          recent.length = 0;
          setReading(null);
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      stop.current = () => {
        alive = false;
        cancelAnimationFrame(raf);
        src.disconnect();
        stream.getTracks().forEach((t) => t.stop());
        setReading(null);
        setRunning(false);
        stop.current = null;
      };
      setRunning(true);
    } catch {
      setError("The microphone could not be opened. Allow microphone access for this site and try again.");
    }
  }, []);

  useEffect(() => () => stop.current?.(), []);

  // Chromatic: cents to the nearest note. Instrument: cents to the nearest open string of the tuning.
  const target = reading && strings.length ? nearestString(reading.hz, choice.a4, strings) : null;
  const targetString = target ? strings[target.index] : null;
  const cents = target?.cents ?? reading?.note.cents ?? 0;
  const inTune = reading !== null && Math.abs(cents) < 5;
  const colour = reading === null ? "var(--color-slate-600)" : inTune ? "var(--color-emerald-400)" : Math.abs(cents) < 20 ? "var(--color-amber-400)" : "var(--color-rose-400)";
  const needle = Math.max(-50, Math.min(50, cents));
  const bigName = targetString ? targetString.name : reading?.note.name;
  const bigOctave = targetString ? targetString.octave : reading?.note.octave;
  const hint = !reading ? (running ? "Play a note" : "") : targetString && Math.abs(cents) >= 5 ? (cents > 0 ? "Tune down" : "Tune up") : inTune ? "In tune" : "";

  return (
    <div className="flex flex-col gap-3">
      <div role="radiogroup" aria-label="Instrument" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {INSTRUMENTS.map((inst) => {
          const on = inst.id === choice.instrument;
          return (
            <button key={inst.id} type="button" role="radio" aria-checked={on} onClick={() => pickInstrument(inst.id)}
              className={`flex min-w-16 shrink-0 flex-col items-center gap-1 rounded-xl border px-2 py-2 text-[11px] transition focus-visible:outline-2 focus-visible:outline-sky-400 ${on ? "border-sky-500/60 bg-sky-500/15 text-sky-100" : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-600 hover:text-slate-200"}`}>
              <InstrumentIcon id={inst.id} size={28} />
              {inst.name}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
        {instrument.tunings.length > 1 && (
          <label className="flex items-center gap-1.5">
            Tuning
            <select className={field} value={tuning.id} onChange={(e) => setChoice((c) => ({ ...c, tuning: e.target.value }))}>
              {instrument.tunings.map((t) => (
                <option key={t.id} value={t.id}>{t.name} · {t.strings.map((x) => x.name).join(" ")}</option>
              ))}
            </select>
          </label>
        )}
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Reference pitch">
          A4 =
          {A4_PRESETS.map((p) => (
            <button key={p.hz} type="button" aria-pressed={choice.a4 === p.hz} title={p.note} onClick={() => setChoice((c) => ({ ...c, a4: p.hz }))} className={btnSm}>{p.label}</button>
          ))}
          <input type="number" min={400} max={480} step={0.1} value={choice.a4} aria-label="A4 frequency in hertz"
            onChange={(e) => { const n = Number(e.target.value); if (n > 0) setChoice((c) => ({ ...c, a4: clampA4(n) })); }}
            className={`${field} w-20`} />
          Hz
        </div>
      </div>
      {tuning?.note && <p className="-mt-1 text-xs text-slate-500">{tuning.note}</p>}

      <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="flex items-baseline gap-2" aria-live="polite">
          <span className="text-7xl font-light tabular-nums" style={{ color: colour }}>{bigName ?? "–"}</span>
          <span className="w-10 text-xl text-slate-400">{bigOctave ?? ""}</span>
        </div>
        <svg viewBox="-110 -6 220 46" className="w-full max-w-md" role="img" aria-label={reading ? `${Math.round(cents)} cents ${cents > 0 ? "sharp" : "flat"}` : "No note detected"}>
          {Array.from({ length: 11 }, (_, i) => {
            const c = (i - 5) * 10;
            return <line key={c} x1={c * 2} x2={c * 2} y1={c === 0 ? 0 : 6} y2={c === 0 ? 26 : 20} stroke={c === 0 ? "var(--color-emerald-400)" : "var(--color-slate-600)"} strokeWidth={c === 0 ? 2 : 1} />;
          })}
          <text x={-100} y={36} fontSize={9} fill="var(--color-slate-500)" textAnchor="middle">flat</text>
          <text x={100} y={36} fontSize={9} fill="var(--color-slate-500)" textAnchor="middle">sharp</text>
          {reading && <polygon points={`${needle * 2 - 5},-4 ${needle * 2 + 5},-4 ${needle * 2},8`} fill={colour} />}
        </svg>
        <p className="h-5 text-sm tabular-nums text-slate-400">
          {reading
            ? `${reading.hz.toFixed(1)} Hz${targetString ? ` · hearing ${reading.note.name}${reading.note.octave}` : ""} · ${cents > 0 ? "+" : ""}${Math.round(cents)} cents${hint ? ` · ${hint}` : ""}`
            : hint}
        </p>
        <button type="button" onClick={running ? () => stop.current?.() : start} className={`rounded-full border px-5 py-2 text-sm ${running ? "border-rose-500 bg-rose-500/15 text-rose-100" : "border-emerald-500 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25"}`}>
          {running ? "■ Stop" : "● Start tuner"}
        </button>
        {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
      </div>

      {strings.length > 0 && (
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${strings.length}, minmax(0, 1fr))` }}>
          {strings.map((s, i) => {
            const near = target?.index === i;
            const c = near ? target!.cents : 0;
            return (
              <button key={i} type="button" onClick={() => strum([s.midi], { gapMs: 0, holdMs: 1500 })} title={`Hear the open ${s.name}${s.octave} string`}
                className={`flex flex-col items-center gap-0.5 rounded-xl border p-2 transition ${near ? (Math.abs(c) < 5 ? "border-emerald-400 bg-emerald-500/15" : "border-sky-400 bg-sky-500/10") : "border-slate-800 bg-slate-900/40 hover:border-slate-600"}`}>
                <span className="text-lg text-slate-100">{s.name}<span className="text-xs text-slate-500">{s.octave}</span></span>
                <span className="h-4 text-xs tabular-nums text-slate-400">{near ? `${c > 0 ? "+" : ""}${Math.round(c)}` : "▶"}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

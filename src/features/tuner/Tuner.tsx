"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getAudioContext, strum } from "@/features/sound";
import { GUITAR_STRINGS, detectPitch, hzToNote, nearestString, type NoteReading } from "./pitch";

interface Reading { hz: number; note: NoteReading; string: { index: number; cents: number } }

const FRAME = 4096;

/** A chromatic guitar tuner. The microphone opens only after the Start button is pressed. */
export default function Tuner() {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState<Reading | null>(null);
  const [a4, setA4] = useState(440);
  const a4Ref = useRef<number>(a4);
  a4Ref.current = a4;
  const stop = useRef<(() => void) | null>(null);

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
        const p = detectPitch(buf, ctx.sampleRate);
        if (p && p.clarity > 0.85) {
          quiet = 0;
          recent.push(p.freq);
          if (recent.length > 5) recent.shift();
          const hz = [...recent].sort((x, y) => x - y)[Math.floor(recent.length / 2)];
          setReading({ hz, note: hzToNote(hz, a4Ref.current), string: nearestString(hz, a4Ref.current) });
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

  const cents = reading?.note.cents ?? 0;
  const inTune = reading !== null && Math.abs(cents) < 5;
  const colour = reading === null ? "#475569" : inTune ? "#34d399" : Math.abs(cents) < 20 ? "#fbbf24" : "#fb7185";
  const needle = Math.max(-50, Math.min(50, cents));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="flex items-baseline gap-2" aria-live="polite">
          <span className="text-7xl font-light tabular-nums" style={{ color: colour }}>{reading ? reading.note.name : "–"}</span>
          <span className="w-10 text-xl text-slate-400">{reading ? reading.note.octave : ""}</span>
        </div>
        <svg viewBox="-110 -6 220 46" className="w-full max-w-md" role="img" aria-label={reading ? `${Math.round(cents)} cents ${cents > 0 ? "sharp" : "flat"}` : "No note detected"}>
          {Array.from({ length: 11 }, (_, i) => {
            const c = (i - 5) * 10;
            return <line key={c} x1={c * 2} x2={c * 2} y1={c === 0 ? 0 : 6} y2={c === 0 ? 26 : 20} stroke={c === 0 ? "#34d399" : "#475569"} strokeWidth={c === 0 ? 2 : 1} />;
          })}
          <text x={-100} y={36} fontSize={9} fill="#64748b" textAnchor="middle">flat</text>
          <text x={100} y={36} fontSize={9} fill="#64748b" textAnchor="middle">sharp</text>
          {reading && <polygon points={`${needle * 2 - 5},-4 ${needle * 2 + 5},-4 ${needle * 2},8`} fill={colour} />}
        </svg>
        <p className="h-5 text-sm tabular-nums text-slate-400">
          {reading ? `${reading.hz.toFixed(1)} Hz · ${cents > 0 ? "+" : ""}${Math.round(cents)} cents` : running ? "Play a note" : ""}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={running ? () => stop.current?.() : start} className={`rounded-full border px-5 py-2 text-sm ${running ? "border-rose-500 bg-rose-500/15 text-rose-100" : "border-emerald-500 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25"}`}>
            {running ? "■ Stop" : "● Start tuner"}
          </button>
          <label className="flex items-center gap-1.5 text-xs text-slate-400">
            A4 =
            <input type="number" min={415} max={466} value={a4} onChange={(e) => setA4(Math.max(415, Math.min(466, Number(e.target.value) || 440)))} className="w-16 rounded-md border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-slate-200" />
            Hz
          </label>
        </div>
        {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
      </div>

      <div className="grid grid-cols-6 gap-2">
        {GUITAR_STRINGS.map((s, i) => {
          const near = reading?.string.index === i;
          const c = near ? reading!.string.cents : 0;
          return (
            <button key={s.midi} type="button" onClick={() => strum([s.midi], { gapMs: 0, holdMs: 1500 })} title={`Hear the open ${s.name} string`}
              className={`flex flex-col items-center gap-0.5 rounded-xl border p-2 transition ${near ? (Math.abs(c) < 5 ? "border-emerald-400 bg-emerald-500/15" : "border-sky-400 bg-sky-500/10") : "border-slate-800 bg-slate-900/40 hover:border-slate-600"}`}>
              <span className="text-lg text-slate-100">{s.name.toUpperCase()}<span className="text-xs text-slate-500">{s.octave}</span></span>
              <span className="h-4 text-xs tabular-nums text-slate-400">{near ? `${c > 0 ? "+" : ""}${Math.round(c)}` : "▶"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

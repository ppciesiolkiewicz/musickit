"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import type { PatchNode } from "@/lib/looper/patch";
import type { LooperEngine, LooperSnapshot } from "@/lib/looper/engine";

type Detector = (buf: Float32Array, sampleRate: number) => { freq: number; clarity: number } | null;
let detect: Detector = () => null;

/** The app injects the pitch detector (it lives in the tuner feature; the looper imports no other feature). */
export function setPitchDetector(f: Detector): void {
  detect = f;
}

const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
/** The nearest note to a frequency, and the cents sharp (+) or flat (−). */
const noteOf = (hz: number) => {
  const exact = 69 + 12 * Math.log2(hz / 440);
  const midi = Math.round(exact);
  return { name: NAMES[((midi % 12) + 12) % 12], octave: Math.floor(midi / 12) - 1, cents: (exact - midi) * 100 };
};

/** How often the note is measured: often enough to follow a string, rare enough to cost little. */
const EVERY_MS = 80;

/**
 * A tuner element of the patch: the note it hears, how many cents off, and a needle. Muted, it still listens but lets nothing through,
 * so you can tune in silence. Reads the engine's analyser for this element; opens no device.
 */
export default function TunerWidget({ engine, snap, node: n }: { engine: LooperEngine; snap: LooperSnapshot; node: PatchNode }) {
  const [reading, setReading] = useState<{ hz: number; note: ReturnType<typeof noteOf> } | null>(null);
  const fed = snap.patch.links.some((l) => l.to === n.id);

  useEffect(() => {
    const recent: number[] = [];
    let quiet = 0;
    let buf: Float32Array<ArrayBuffer> | null = null;
    const id = window.setInterval(() => {
      const an = engine.tunerAnalyser(n.id);
      if (!an) return;
      if (!buf || buf.length !== an.fftSize) buf = new Float32Array(an.fftSize);
      an.getFloatTimeDomainData(buf);
      const p = detect(buf, an.context.sampleRate);
      if (p && p.clarity > 0.85) {
        quiet = 0;
        recent.push(p.freq);
        if (recent.length > 5) recent.shift();
        // the median of the last few readings, so one bad frame does not throw the needle
        const hz = [...recent].sort((x, y) => x - y)[Math.floor(recent.length / 2)];
        setReading({ hz, note: noteOf(hz) });
      } else if (++quiet > 8) {
        recent.length = 0;
        setReading(null);
      }
    }, EVERY_MS);
    return () => window.clearInterval(id);
  }, [engine, n.id]);

  const cents = reading?.note.cents ?? 0;
  const inTune = reading !== null && Math.abs(cents) < 5;
  const colour = reading === null ? "#475569" : inTune ? "#34d399" : Math.abs(cents) < 20 ? "#fbbf24" : "#fb7185";
  const needle = Math.max(-50, Math.min(50, cents));

  return (
    <div className="flex flex-col items-center gap-1 px-2 py-1.5" data-patch-id={n.id}>
      <div className="flex items-baseline gap-1" aria-live="polite">
        <span className="text-4xl font-light tabular-nums" style={{ color: colour }}>{reading ? reading.note.name : "–"}</span>
        <span className="w-5 text-sm text-slate-400">{reading ? reading.note.octave : ""}</span>
      </div>
      <svg viewBox="-110 -6 220 34" className="w-full max-w-[16rem]" role="img" aria-label={reading ? `${Math.round(cents)} cents ${cents > 0 ? "sharp" : "flat"}` : "No note"}>
        {Array.from({ length: 11 }, (_, i) => {
          const c = (i - 5) * 10;
          return <line key={c} x1={c * 2} x2={c * 2} y1={c === 0 ? 0 : 6} y2={c === 0 ? 26 : 20} stroke={c === 0 ? "#34d399" : "#475569"} strokeWidth={c === 0 ? 2 : 1} />;
        })}
        {reading && <polygon points={`${needle * 2 - 5},-4 ${needle * 2 + 5},-4 ${needle * 2},8`} fill={colour} />}
      </svg>
      <p className="h-4 text-[11px] tabular-nums text-slate-400">{reading ? `${reading.hz.toFixed(1)} Hz · ${cents > 0 ? "+" : ""}${Math.round(cents)} cents` : fed ? "Play a note" : "Wire something in"}</p>
      <button type="button" className={`flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] ${n.muted ? "border-amber-400/70 text-amber-200" : "border-slate-700 text-slate-300 hover:border-slate-500"}`} aria-pressed={n.muted} onClick={() => engine.do({ type: "patch.mute", what: "node", id: n.id, muted: !n.muted })} title={n.muted ? "Silent while you tune: click to let the sound through" : "Silence the output while you tune"}>
        <Icon name={n.muted ? "volume-x" : "volume-2"} size={12} />{n.muted ? "Muted: tuning" : "Mute to tune"}
      </button>
    </div>
  );
}

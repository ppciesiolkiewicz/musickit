"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { PatchNode } from "@/lib/looper/patch";
import type { LooperEngine, LooperSnapshot } from "@/lib/looper/engine";
import { createSmoother, detectPitch, readHz, resolveChoice, TunerSettings, useThrottled, useTunerChoice } from "@/features/tuner";

/** How often the note is measured: often enough to follow a string, rare enough to cost little. */
const EVERY_MS = 80;

/**
 * A tuner element of the patch: the note it hears, how many cents off, and a needle. Muted, it still listens but lets nothing through,
 * so you can tune in silence (its M button). Instrument, tuning and A4 are the tuner page's, kept per element. Reads the engine's
 * analyser for this element; opens no device: what it hears is the input wired into it.
 */
export default function TunerWidget({ engine, snap, node: n, mute }: { engine: LooperEngine; snap: LooperSnapshot; node: PatchNode; mute: ReactNode }) {
  const [hz, setHz] = useState<number | null>(null);
  const [choice, setChoice] = useTunerChoice(`musickit.looper.tuner.${n.id}`);
  // the detection loop reads this without restarting
  const lowest = resolveChoice(choice).instrument.minHz;
  const minHz = useRef(lowest);
  useEffect(() => { minHz.current = lowest; }, [lowest]);
  const fed = snap.patch.links.some((l) => l.to === n.id);

  useEffect(() => {
    const smooth = createSmoother();
    let quiet = 0;
    let buf: Float32Array<ArrayBuffer> | null = null;
    const id = window.setInterval(() => {
      const an = engine.tunerAnalyser(n.id);
      if (!an) return;
      if (!buf || buf.length !== an.fftSize) buf = new Float32Array(an.fftSize);
      an.getFloatTimeDomainData(buf);
      const p = detectPitch(buf, an.context.sampleRate, { minHz: minHz.current });
      if (p && p.clarity > 0.85) {
        quiet = 0;
        setHz(smooth.push(p.freq));
      } else if (++quiet > 8) {
        smooth.reset();
        setHz(null);
      }
    }, EVERY_MS);
    return () => window.clearInterval(id);
  }, [engine, n.id]);

  const reading = hz !== null ? readHz(hz, choice) : null;
  const cents = reading?.cents ?? 0;
  const inTune = reading !== null && Math.abs(cents) < 5;
  const colour = reading === null ? "var(--color-slate-600)" : inTune ? "var(--color-emerald-400)" : Math.abs(cents) < 20 ? "var(--color-amber-400)" : "var(--color-rose-400)";
  const needle = Math.max(-50, Math.min(50, cents));
  // the text changes a few times a second, the needle at every reading
  const textHz = useThrottled(hz, 250);
  const text = textHz !== null ? readHz(textHz, choice) : null;
  const tc = text?.cents ?? 0;

  return (
    <div className="flex flex-col items-center gap-2 px-3 py-2" data-patch-id={n.id}>
      <TunerSettings choice={choice} onChange={setChoice} compact trailing={mute}
        aside={n.muted && <span className="ml-auto truncate text-[10px] text-amber-200/80">Muted: tuning in silence</span>} />
      <div className="flex items-baseline gap-1 pt-1" aria-live="polite">
        <span className="text-4xl font-light leading-none tabular-nums" style={{ color: colour }}>{reading ? reading.name : "–"}</span>
        <span className="w-5 text-sm text-slate-400">{reading ? reading.octave : ""}</span>
      </div>
      <svg viewBox="-110 -6 220 34" className="w-full max-w-[16rem]" role="img" aria-label={reading ? `${Math.round(cents)} cents ${cents > 0 ? "sharp" : "flat"}` : "No note"}>
        {Array.from({ length: 11 }, (_, i) => {
          const c = (i - 5) * 10;
          return <line key={c} x1={c * 2} x2={c * 2} y1={c === 0 ? 0 : 6} y2={c === 0 ? 26 : 20} stroke={c === 0 ? "var(--color-emerald-400)" : "var(--color-slate-600)"} strokeWidth={c === 0 ? 2 : 1} />;
        })}
        {/* the needle glides to each reading and fades out while nothing is heard */}
        <polygon points="-5,-4 5,-4 0,8" fill={colour}
            style={{ transform: `translateX(${needle * 2}px)`, opacity: reading ? 1 : 0, transition: "transform 180ms ease-out, opacity 200ms, fill 200ms" }} />
      </svg>
      <p className="h-4 text-[11px] tabular-nums text-slate-400">{text && textHz !== null ? `${textHz.toFixed(1)} Hz${text.string !== null ? ` · ${text.heard.name}${text.heard.octave}` : ""} · ${tc > 0 ? "+" : ""}${Math.round(tc)} cents` : fed ? "Play a note" : "Wire something in"}</p>
    </div>
  );
}

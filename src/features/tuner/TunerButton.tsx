"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getAudioContext, readDeviceChoice } from "@/features/sound";
import { readHz, resolveChoice } from "./choice";
import { usePitch } from "./usePitch";
import TunerMeter from "./TunerMeter";
import TunerSettings from "./TunerSettings";
import { useTunerChoice } from "./useTunerChoice";

const FRAME = 4096;

/** A tuning fork, for the nav button. */
function Fork({ size = 15 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 2v7a3 3 0 0 0 6 0V2" />
      <path d="M12 12v10" />
    </svg>
  );
}

/**
 * The nav's tuner: a button that pops up a small tuner on any page. Instrument, tuning and A4 are the tuner page's own (one saved
 * choice); it listens to the input chosen in the audio devices menu. The microphone opens only on Start and closes with the panel.
 */
export default function TunerButton({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [choice, setChoice] = useTunerChoice("musickit.tuner");
  const box = useRef<HTMLDivElement>(null);
  const stop = useRef<(() => void) | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);

  const hz = usePitch(() => analyser.current, resolveChoice(choice).instrument.minHz, running);
  const read = hz !== null ? readHz(hz, choice) : null;

  const start = useCallback(async () => {
    setError(null);
    try {
      const input = readDeviceChoice().input;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: input ? { ideal: input.id } : undefined, echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      const ctx = getAudioContext();
      await ctx.resume();
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = FRAME;
      src.connect(an);
      analyser.current = an;
      stop.current = () => {
        analyser.current = null;
        src.disconnect();
        stream.getTracks().forEach((t) => t.stop());
        setRunning(false);
        stop.current = null;
      };
      setRunning(true);
    } catch {
      setError("The microphone could not be opened. Allow microphone access for this site and try again.");
    }
  }, []);

  useEffect(() => {
    if (!open) {
      stop.current?.();
      return;
    }
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", away);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);

  useEffect(() => () => stop.current?.(), []);

  return (
    <div ref={box} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Tuner"
        className="flex h-8 items-center gap-1.5 rounded-full border border-sky-500/45 bg-slate-900/70 px-2.5 sm:pr-3 text-slate-100 backdrop-blur transition hover:border-sky-400"
      >
        <span className={running ? "text-emerald-400" : "text-sky-400"}><Fork /></span>
        <span className="hidden text-sm leading-none sm:inline">Tuner</span>
      </button>
      {open && (
        // the app's own panel, like the audio devices menu, so it follows the style
        <div role="dialog" aria-label="Tuner" className="fixed inset-x-3 top-16 z-3000 flex max-h-[calc(100dvh-5rem)] flex-col items-center gap-2 overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-3 text-slate-200 shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80">
          <TunerSettings choice={choice} onChange={setChoice} compact />
          <TunerMeter size="compact" hz={hz} read={read} idle={running ? "Play a string" : "Press Start and play"} />
          <button type="button" onClick={running ? () => stop.current?.() : () => void start()}
            className={`inline-flex min-w-36 items-center justify-center gap-2 rounded-full border px-5 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${running ? "border-rose-500/70 bg-rose-500/15 text-rose-100 hover:bg-rose-500/25" : "border-emerald-500/70 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25"}`}>
            <span aria-hidden className={`h-2 w-2 ${running ? "rounded-sm bg-rose-300" : "rounded-full bg-emerald-300"}`} />
            {running ? "Stop" : "Start"}
          </button>
          {error && <p role="alert" className="text-center text-xs text-rose-300">{error}</p>}
        </div>
      )}
    </div>
  );
}

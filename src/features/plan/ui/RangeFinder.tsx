"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { getAudioContext } from "@/features/sound";
import { usePitch } from "@/features/tuner/usePitch";
import { VOICES, hzToMidi, type Voice } from "@/features/theory/singing";
import { nearestVoice, noteName, normaliseRange, steadyNote } from "@/features/theory/voiceRange";

type Step = "idle" | "low" | "high" | "done";

const FRAME = 4096;
/** Readings come about 30 a second: a second of the same note. */
const STEADY_FRAMES = 30;
const GIVE_UP_MS = 10_000;
const MIN_HZ = 60;

/**
 * Finds a singing range with the microphone: sing the lowest comfortable note, then the highest, each held for about a second.
 * Reports the range and its nearest voice type. Releases the microphone when done or unmounted.
 */
export default function RangeFinder({ onRange }: { onRange: (r: { low: number; high: number }, voice: Voice) => void }) {
  const [step, setStep] = useState<Step>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<{ low: number; high: number; voice: Voice } | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const release = useRef<(() => void) | null>(null);
  const low = useRef<number | null>(null);
  const history = useRef<(number | null)[]>([]);
  const listening = step === "low" || step === "high";
  const hz = usePitch(() => analyser.current, MIN_HZ, listening);

  const stop = () => { release.current?.(); release.current = null; analyser.current = null; };
  useEffect(() => stop, []);

  const giveUp = () => { stop(); setStep("idle"); setMessage("Couldn't hear you; pick a type above."); };

  const start = async () => {
    setMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const ctx = getAudioContext();
      await ctx.resume();
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = FRAME;
      src.connect(an);
      analyser.current = an;
      release.current = () => { src.disconnect(); stream.getTracks().forEach((t) => t.stop()); };
      low.current = null;
      history.current = [];
      setStep("low");
    } catch { giveUp(); }
  };

  // each reading joins the history; a held note ends the step
  useEffect(() => {
    if (!listening) return;
    history.current = [...history.current, hz === null ? null : hzToMidi(hz)].slice(-STEADY_FRAMES * 2);
    const note = steadyNote(history.current, STEADY_FRAMES);
    if (note === null) return;
    history.current = [];
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the step follows the mic reading
    if (step === "low") { low.current = note; setStep("high"); return; }
    stop();
    const range = normaliseRange(low.current ?? note, note);
    const voice = nearestVoice(range);
    setResult({ ...range, voice });
    setStep("done");
    onRange(range, voice);
  }, [hz]); // eslint-disable-line react-hooks/exhaustive-deps -- one reading at a time

  // nothing heard for a while in a step
  useEffect(() => {
    if (!listening) return;
    const id = window.setTimeout(giveUp, GIVE_UP_MS);
    return () => window.clearTimeout(id);
  }, [listening, step, hz]); // eslint-disable-line react-hooks/exhaustive-deps -- any pitch heard restarts the wait

  return (
    <div className="flex flex-col items-start gap-2" aria-live="polite">
      {step === "idle" && <Button onClick={start}>Find my range</Button>}
      {step === "low" && <p className="text-sm text-slate-200">Sing your lowest comfortable note</p>}
      {step === "high" && <p className="text-sm text-slate-200">Now your highest</p>}
      {step === "done" && result && (
        <div className="flex items-center gap-3">
          <p className="text-sm text-slate-200">{noteName(result.low)} – {noteName(result.high)} → {VOICES[result.voice].label}</p>
          <Button onClick={() => { setResult(null); setStep("idle"); }}>Retry</Button>
        </div>
      )}
      {message && <p role="alert" className="text-xs text-rose-300">{message}</p>}
    </div>
  );
}

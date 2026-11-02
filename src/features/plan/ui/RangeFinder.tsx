"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import InputChip, { micStatusMessage } from "@/components/InputChip";
import type { MicStatus } from "@/components/practice/useMicPitch";
import { getAudioContext, openLiveInput, readDeviceChoice } from "@/features/sound";
import { rms } from "@/lib/practice/mic";
import { usePitch } from "@/features/tuner/usePitch";
import { VOICES, hzToMidi, type Voice } from "@/features/theory/singing";
import { isHighEnough, nearestVoice, noteName, normaliseRange, steadyNote } from "@/features/theory/voiceRange";

type Step = "idle" | "low" | "high" | "done";

const FRAME = 4096;
/** Readings come about 30 a second: a second of the same note. */
const STEADY_FRAMES = 30;
const GIVE_UP_MS = 10_000;
const MIN_HZ = 60;
/** how often the input's level is published for the chip */
const LEVEL_MS = 66;

/**
 * Finds a singing range with the microphone: sing the lowest comfortable note, then the highest, each held for about a second.
 * Reports the range and its nearest voice type. Releases the microphone when done or unmounted. It sits in a modal where the
 * nav's devices menu can't be reached, so the input chip beside its button shows and changes the input and the level it hears.
 */
export default function RangeFinder({ onRange }: { onRange: (r: { low: number; high: number }, voice: Voice) => void }) {
  const [step, setStep] = useState<Step>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<MicStatus>("off");
  const [result, setResult] = useState<{ low: number; high: number; voice: Voice } | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const release = useRef<(() => void) | null>(null);
  const low = useRef<number | null>(null);
  const alive = useRef(true);
  const starting = useRef(false);
  const [busy, setBusy] = useState(false);
  const history = useRef<(number | null)[]>([]);
  const listening = step === "low" || step === "high";
  const hz = usePitch(() => analyser.current, MIN_HZ, listening);

  const stop = () => {
    release.current?.();
    release.current = null;
    analyser.current = null;
    if (alive.current) setStatus((st) => (st === "on" || st === "asking" ? "off" : st));
  };
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; stop(); };
  }, []);

  const giveUp = () => { stop(); setStep("idle"); setMessage("Couldn't hear you; pick a type above."); };

  const start = async () => {
    if (starting.current || release.current) return;
    starting.current = true;
    setBusy(true);
    setMessage(null);
    let stream: MediaStream | null = null;
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("insecure");
      setMessage(micStatusMessage("insecure"));
      starting.current = false;
      setBusy(false);
      return;
    }
    setStatus("asking");
    try {
      const input = readDeviceChoice().input;
      stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: input ? { ideal: input.id } : undefined, echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const got = stream;
      const free = () => got.getTracks().forEach((t) => t.stop());
      if (!alive.current) { free(); return; }
      release.current = free;
      const ctx = getAudioContext();
      await ctx.resume();
      if (!alive.current) { stop(); return; }
      const src = ctx.createMediaStreamSource(got);
      const an = ctx.createAnalyser();
      an.fftSize = FRAME;
      src.connect(an);
      analyser.current = an;
      // the level, for the input chip
      const live = openLiveInput();
      const buf = new Float32Array(an.fftSize);
      const meter = window.setInterval(() => {
        an.getFloatTimeDomainData(buf);
        live.levels([rms(buf)]);
      }, LEVEL_MS);
      release.current = () => { window.clearInterval(meter); live.close(); src.disconnect(); free(); };
      setStatus("on");
      low.current = null;
      history.current = [];
      setStep("low");
    } catch (e) {
      stream?.getTracks().forEach((t) => t.stop());
      stop();
      if (!alive.current) return;
      // no stream: the mic was blocked or isn't there, so say that rather than "couldn't hear you"
      if (!stream) {
        const st: MicStatus = e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "SecurityError") ? "denied" : "error";
        setStatus(st);
        setStep("idle");
        setMessage(`${micStatusMessage(st)} Or pick a type above.`);
      } else giveUp();
    } finally { starting.current = false; if (alive.current) setBusy(false); }
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
    if (low.current !== null && !isHighEnough(low.current, note)) return; // still holding the low note
    stop();
    const range = normaliseRange(low.current ?? note, note);
    const voice = nearestVoice(range);
    setResult({ ...range, voice });
    setStep("done");
    onRange(range, voice);
  }, [hz]); // eslint-disable-line react-hooks/exhaustive-deps -- one reading at a time

  // no steady note within a while of a step starting
  useEffect(() => {
    if (!listening) return;
    const id = window.setTimeout(giveUp, GIVE_UP_MS);
    return () => window.clearTimeout(id);
  }, [listening, step]); // eslint-disable-line react-hooks/exhaustive-deps -- the wait is per step

  return (
    <div className="flex flex-col items-start gap-2" aria-live="polite">
      <div className="flex flex-wrap items-center gap-2">
        {step === "idle" && <Button onClick={start} disabled={busy}>Find my range</Button>}
        <InputChip status={status} />
      </div>
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

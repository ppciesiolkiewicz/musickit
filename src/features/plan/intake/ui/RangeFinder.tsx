"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import InputChip, { micStatusMessage } from "@/components/InputChip";
import type { MicStatus } from "@/components/practice/useMicPitch";
import { getAudioContext, openInputStream, openLiveInput, tapChannels } from "@/features/sound";
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
  /** the low note once found, for the chart */
  const [lowNote, setLowNote] = useState<number | null>(null);
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
      stream = await openInputStream({ channelCount: { ideal: 2 }, echoCancellation: false, noiseSuppression: false, autoGainControl: false });
      const got = stream;
      const free = () => got.getTracks().forEach((t) => t.stop());
      if (!alive.current) { free(); return; }
      release.current = free;
      const ctx = getAudioContext();
      await ctx.resume();
      if (!alive.current) { stop(); return; }
      const src = ctx.createMediaStreamSource(got);
      // the app's chosen channel of the input (both inputs of an interface mixed, or one)
      const tap = tapChannels(ctx, src, got.getAudioTracks()[0]?.getSettings().channelCount ?? 1);
      const an = ctx.createAnalyser();
      an.fftSize = FRAME;
      tap.output.connect(an);
      analyser.current = an;
      // each input's level, for the input chip
      const live = openLiveInput();
      const meter = window.setInterval(() => live.levels(tap.levels()), LEVEL_MS);
      release.current = () => { window.clearInterval(meter); live.close(); tap.close(); src.disconnect(); free(); };
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
    if (step === "low") { low.current = note; setLowNote(note); setStep("high"); return; }
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

  const liveMidi = listening && hz !== null ? hzToMidi(hz) : null;
  return (
    <div className="flex w-full flex-col items-start gap-2" aria-live="polite">
      <div className="flex flex-wrap items-center gap-2">
        {step === "idle" && <Button onClick={start} disabled={busy}>Find my range</Button>}
        <InputChip status={status} />
      </div>
      {listening && (
        <div className="flex items-center gap-2 text-sm">
          <StepDot n={1} on={step === "low"} done={step === "high"} label="Lowest" />
          <span aria-hidden className="h-px w-4 bg-slate-700" />
          <StepDot n={2} on={step === "high"} done={false} label="Highest" />
          <span className="ml-2 text-slate-200">{step === "low" ? "Sing your lowest comfortable note and hold it" : "Now your highest, and hold it"}</span>
        </div>
      )}
      {step === "done" && result && (
        <div className="flex items-center gap-3">
          <p className="text-sm text-slate-200">{noteName(result.low)} – {noteName(result.high)} → <b className={`font-semibold ${VOICE_STYLE[result.voice].text}`}>{VOICES[result.voice].label}</b></p>
          <Button onClick={() => { setResult(null); setStep("idle"); }}>Retry</Button>
        </div>
      )}
      {(listening || result) && <RangeChart live={liveMidi} low={step === "high" ? lowNote : result?.low ?? null} high={result?.high ?? null} voice={result?.voice ?? null} />}
      {message && <p role="alert" className="text-xs text-rose-300">{message}</p>}
    </div>
  );
}

const VOICE_STYLE: Record<Voice, { bar: string; text: string }> = {
  soprano: { bar: "bg-rose-400", text: "text-rose-300" },
  mezzo: { bar: "bg-pink-400", text: "text-pink-300" },
  alto: { bar: "bg-violet-400", text: "text-violet-300" },
  tenor: { bar: "bg-sky-400", text: "text-sky-300" },
  baritone: { bar: "bg-emerald-400", text: "text-emerald-300" },
  bass: { bar: "bg-amber-400", text: "text-amber-300" },
};
const CHART_LOW = 38, CHART_HIGH = 86;
const pct = (m: number) => `${(Math.min(Math.max(m, CHART_LOW), CHART_HIGH) - CHART_LOW) / (CHART_HIGH - CHART_LOW) * 100}%`;

function StepDot({ n, on, done, label }: { n: number; on: boolean; done: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${on ? "text-sky-200" : done ? "text-emerald-300" : "text-slate-500"}`}>
      <span className={`grid size-5 place-items-center rounded-full border text-[11px] ${on ? "animate-pulse border-sky-400 bg-sky-500/20" : done ? "border-emerald-400 bg-emerald-500/20" : "border-slate-700"}`}>{done ? "✓" : n}</span>
      {label}
    </span>
  );
}

/** Each voice type's range as a coloured bar on one note axis, with the range found so far and the note heard now drawn over them. */
function RangeChart({ live, low, high, voice }: { live: number | null; low: number | null; high: number | null; voice: Voice | null }) {
  const voices = Object.keys(VOICES) as Voice[];
  return (
    <div className="w-full rounded-xl border border-slate-800 bg-slate-950/50 p-3">
      <div className="relative flex flex-col gap-1.5">
        {low !== null && high !== null && (
          <div aria-hidden className="absolute inset-y-[-4px] rounded-md border border-slate-200/70 bg-slate-100/10" style={{ left: pct(low), width: `calc(${pct(high)} - ${pct(low)})` }} />
        )}
        {low !== null && high === null && <div aria-hidden className="absolute inset-y-[-4px] w-0.5 rounded bg-emerald-300" style={{ left: pct(low) }} />}
        {live !== null && <div aria-hidden className="absolute inset-y-[-6px] w-0.5 rounded bg-white shadow-[0_0_8px_white] transition-[left] duration-100" style={{ left: pct(live) }} />}
        {voices.map((v) => (
          <div key={v} className="relative h-3">
            <div className={`absolute inset-y-0 rounded-full ${VOICE_STYLE[v].bar} ${voice && voice !== v ? "opacity-25" : "opacity-80"}`} style={{ left: pct(VOICES[v].low), width: `calc(${pct(VOICES[v].high)} - ${pct(VOICES[v].low)})` }} />
            <span className={`absolute top-1/2 -translate-y-1/2 pl-1 text-[10px] leading-none ${voice === v ? "font-semibold text-slate-950" : "text-slate-950/80"}`} style={{ left: pct(VOICES[v].low) }}>{VOICES[v].label}</span>
          </div>
        ))}
      </div>
      <div className="relative mt-2 h-3 text-[10px] text-slate-500">
        {[40, 48, 60, 72, 84].map((m) => <span key={m} className="absolute -translate-x-1/2" style={{ left: pct(m) }}>{noteName(m)}</span>)}
      </div>
      {live !== null && <p className="mt-1 text-xs text-slate-300">Hearing <b className="text-slate-100">{noteName(Math.round(live))}</b></p>}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import InputChip, { micStatusMessage } from "@/components/InputChip";
import type { MicStatus } from "@/components/practice/useMicPitch";
import { getAudioContext, openInputStream, openLiveInput, tapChannels } from "@/features/sound";
import { usePitch } from "@/features/tuner/usePitch";
import { VOICES, hzToMidi, type Range, type Voice } from "@/features/theory/singing";
import { MIN_SPAN, furthest, isHighEnough, nearestVoice, noteName, rangeOf, rangeWords, steadyNote } from "@/features/theory/voiceRange";

type Step = "idle" | "low" | "high" | "done";

const FRAME = 4096;
/** Readings come about 30 a second: half a second of the same note counts as held. */
const HELD_FRAMES = 15;
/** with no note held this long into a step, the finder says so (it keeps listening) */
const QUIET_MS = 10_000;
const MIN_HZ = 60;
/** how often the input's level is published for the chip */
const LEVEL_MS = 66;

/**
 * Finds a singing range with the microphone, in two steps: the player slides down to their lowest easy note, then up to
 * their highest. Every note held for half a second counts, and the step keeps the lowest (then the highest) of them, so
 * the player can take their time and go further; they end each step themself. `current` is the range they already have.
 * Reports the range when both ends are in. Releases the microphone when done or unmounted. It sits in a modal where the
 * nav's devices menu can't be reached, so the input chip beside its button shows and changes the input and the level it hears.
 */
export default function RangeFinder({ current = null, onRange }: { current?: Range | null; onRange: (r: Range) => void }) {
  const [step, setStep] = useState<Step>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<MicStatus>("off");
  const analyser = useRef<AnalyserNode | null>(null);
  const release = useRef<(() => void) | null>(null);
  /** the lowest note held in the first step, and the highest held in the second (at least a minor 3rd above it) */
  const [low, setLow] = useState<number | null>(null);
  const [high, setHigh] = useState<number | null>(null);
  /** no note held yet, a while into the step */
  const [quiet, setQuiet] = useState(false);
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
      setLow(null);
      setHigh(null);
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
        setMessage(`${micStatusMessage(st)} Or pick a voice type below.`);
      } else {
        setStep("idle");
        setMessage("The microphone didn't start. Press Find my range to try again, or pick a voice type below.");
      }
    } finally { starting.current = false; if (alive.current) setBusy(false); }
  };

  // each reading joins the history; a held note moves the step's end when it is further out
  useEffect(() => {
    if (!listening) return;
    history.current = [...history.current, hz === null ? null : hzToMidi(hz)].slice(-HELD_FRAMES * 2);
    const note = steadyNote(history.current, HELD_FRAMES);
    if (note === null) return;
    if (step === "low") setLow((n) => furthest(n, note, "low"));
    else if (low !== null && isHighEnough(low, note)) setHigh((n) => furthest(n, note, "high"));
  }, [hz]); // eslint-disable-line react-hooks/exhaustive-deps -- one reading at a time

  // a while into a step with no note held: say so, and keep listening
  const held = step === "low" ? low : high;
  useEffect(() => {
    if (!listening || held !== null) return;
    const id = window.setTimeout(() => setQuiet(true), QUIET_MS);
    return () => { window.clearTimeout(id); setQuiet(false); };
  }, [listening, step, held]);

  const next = () => { history.current = []; setStep("high"); };
  const finish = () => {
    if (low === null || high === null) return;
    stop();
    setStep("done");
    onRange({ low, high });
  };

  const found = step === "done" && low !== null && high !== null ? { low, high } : null;
  const shown = found ?? (step === "idle" ? current : null);
  const used = shown ? rangeOf({ range: shown }) : null;
  const nearest = shown ? nearestVoice(shown) : null;
  const liveMidi = listening && hz !== null ? hzToMidi(hz) : null;
  return (
    <div className="flex w-full flex-col items-start gap-2" aria-live="polite">
      {!listening && !shown && <p className="text-sm text-slate-300">Sing your lowest and your highest easy note, and the singing exercises fit your own voice. It takes under a minute.</p>}
      {!listening && shown && used && nearest && (
        <div className="text-sm text-slate-200">
          <p>Your range is <b className="font-semibold text-slate-50">{rangeWords(shown)}</b>. {shown.high - shown.low >= MIN_SPAN ? "The singing exercises stay inside it." : `That is less than an octave, so the singing exercises use ${rangeWords(used)}.`}</p>
          <p className="mt-1 text-xs text-slate-400">
            {shown.high - shown.low >= MIN_SPAN ? <>Closest voice type: <span className={VOICE_STYLE[nearest].text}>{VOICES[nearest].label}</span>.</> : "Press Find it again below once your voice is warm: most voices reach further then."}
          </p>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {!listening && <Button onClick={start} disabled={busy}>{shown ? "Find it again" : "Find my range"}</Button>}
        {step === "low" && <Button onClick={next} disabled={low === null}>That&apos;s my lowest</Button>}
        {step === "high" && <Button onClick={finish} disabled={high === null}>That&apos;s my highest</Button>}
        <InputChip status={status} />
      </div>
      {listening && (
        <div className="flex flex-col gap-1.5 text-sm">
          <div className="flex items-center gap-2">
            <StepDot n={1} on={step === "low"} done={step === "high"} label="Lowest" />
            <span aria-hidden className="h-px w-4 bg-slate-700" />
            <StepDot n={2} on={step === "high"} done={false} label="Highest" />
          </div>
          <p className="text-slate-200">
            {step === "low"
              ? "Slide down on \"ah\" to the lowest note that still feels easy, and hold it. Then press That's my lowest above."
              : "Now slide up on \"oo\" to the highest note that still feels easy, and hold it. Then press That's my highest above."}
          </p>
          <p className="text-xs">
            {/* a care line, drawn as the plan's are (`CareLine` in plan/ui/reader/NoteText.tsx) */}
            <mark className="rounded-[2px] bg-transparent px-0.5 font-medium text-slate-50" style={{ backgroundImage: "linear-gradient(transparent 62%, color-mix(in oklab, var(--color-amber-400) 40%, transparent) 62%)" }}>
              Sing only notes that feel easy. Don&apos;t push for a lower or a higher one.
            </mark>
          </p>
          <p className="text-xs text-slate-300">
            {held !== null
              ? <>{step === "low" ? "Lowest" : "Highest"} so far: <b className="text-slate-100">{noteName(held)}</b>. Go further if it still feels easy.</>
              : quiet
                ? "The microphone hears no held note yet. Check the input above, then sing a little louder and hold the note."
                : step === "high" && low !== null ? `Your lowest is ${noteName(low)}. The microphone is listening for a higher note.` : "The microphone is listening."}
          </p>
        </div>
      )}
      {(listening || found) && <RangeChart live={liveMidi} low={low} high={high} voice={found ? nearest : null} />}
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

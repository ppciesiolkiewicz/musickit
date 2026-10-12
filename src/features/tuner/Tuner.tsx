"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getAudioContext } from "@/features/sound";
import { midiToHz } from "@/features/theory/tunings";
import { detectPitch } from "./pitch";
import { readHz, resolveChoice, sanitiseChoice } from "./choice";
import { useTunerChoice } from "./useTunerChoice";
import { playReference } from "./reference";
import { createSmoother } from "./smooth";
import { FRAME_MS, useThrottled } from "./useThrottled";
import TunerSettings from "./TunerSettings";

/** Which microphone or interface, and which of its inputs: "mix" for all of them, or one channel (0 = Input 1). */
interface InputChoice { deviceId: string; channel: "mix" | number }

const FRAME = 4096;
const STORE = "musickit.tuner";
const INPUT_STORE = "musickit.tuner.input";
const DEFAULT_INPUT: InputChoice = { deviceId: "", channel: "mix" };
const ALIAS = new Set(["default", "communications"]);
const field = "h-8 rounded-md border border-slate-700 bg-slate-900 px-2 text-xs text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";

const fromQuery = () => {
  const q = new URLSearchParams(window.location.search);
  return q.has("instrument") ? sanitiseChoice({ instrument: q.get("instrument"), tuning: q.get("tuning"), a4: q.get("a4") ?? undefined }) : null;
};

function loadInput(): InputChoice {
  try {
    const raw = JSON.parse(window.localStorage.getItem(INPUT_STORE) ?? "null") as Partial<InputChoice> | null;
    return { deviceId: typeof raw?.deviceId === "string" ? raw.deviceId : "", channel: typeof raw?.channel === "number" && raw.channel >= 0 ? raw.channel : "mix" };
  } catch { return DEFAULT_INPUT; }
}

/** A tuner. Pick an instrument (and its tuning) or Chromatic, and the input to listen to; the microphone opens only after Start. */
export default function Tuner() {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hz, setHz] = useState<number | null>(null);
  const [choice, setChoice] = useTunerChoice(STORE, fromQuery);
  const [input, setInput] = useState<InputChoice>(DEFAULT_INPUT);
  const [devices, setDevices] = useState<{ id: string; label: string }[]>([]);
  const [channels, setChannels] = useState(0);
  const stop = useRef<(() => void) | null>(null);

  const { instrument, tuning } = resolveChoice(choice);
  const strings = tuning?.strings ?? [];
  // the detection loop reads this without restarting
  const minHzRef = useRef(instrument.minHz);
  useEffect(() => { minHzRef.current = instrument.minHz; }, [instrument.minHz]);

  const listDevices = useCallback(async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      setDevices(all.filter((d) => d.kind === "audioinput" && !ALIAS.has(d.deviceId)).map((d, i) => ({ id: d.deviceId, label: d.label || `Input ${i + 1}` })));
    } catch { /* no media devices */ }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring the saved input after hydration
    setInput(loadInput());
    void listDevices();
    navigator.mediaDevices?.addEventListener?.("devicechange", listDevices);
    return () => navigator.mediaDevices?.removeEventListener?.("devicechange", listDevices);
  }, [listDevices]);

  const pickInput = (next: InputChoice) => {
    setInput(next);
    try { window.localStorage.setItem(INPUT_STORE, JSON.stringify(next)); } catch { /* storage blocked */ }
  };

  const start = useCallback(async (inp: InputChoice) => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: inp.deviceId ? { exact: inp.deviceId } : undefined, channelCount: { ideal: 2 }, echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      const ctx = getAudioContext();
      await ctx.resume();
      const n = stream.getAudioTracks()[0]?.getSettings().channelCount ?? 1;
      setChannels(n);
      void listDevices(); // names appear once the microphone is allowed
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = FRAME;
      // one input of an interface (Focusrite Input 1) is one channel of its stream; the analyser mixes the rest down to mono
      let split: ChannelSplitterNode | null = null;
      if (inp.channel !== "mix" && n > 1) {
        split = ctx.createChannelSplitter(n);
        src.connect(split);
        split.connect(an, Math.min(inp.channel, n - 1));
      } else src.connect(an);
      const buf = new Float32Array(FRAME);
      const smooth = createSmoother();
      let raf = 0, quiet = 0, alive = true;
      const tick = () => {
        if (!alive) return;
        an.getFloatTimeDomainData(buf);
        const p = detectPitch(buf, ctx.sampleRate, { minHz: minHzRef.current });
        if (p && p.clarity > 0.85) {
          quiet = 0;
          setHz(smooth.push(p.freq));
        } else if (++quiet > 30) {
          smooth.reset();
          setHz(null);
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      stop.current = () => {
        alive = false;
        cancelAnimationFrame(raf);
        src.disconnect();
        split?.disconnect();
        stream.getTracks().forEach((t) => t.stop());
        setHz(null);
        setRunning(false);
        stop.current = null;
      };
      setRunning(true);
    } catch (e) {
      setError((e as Error)?.name === "OverconstrainedError" || (e as Error)?.name === "NotFoundError"
        ? "That input is not connected. Pick another one and try again."
        : "The microphone could not be opened. Allow microphone access for this site and try again.");
    }
  }, [listDevices]);

  useEffect(() => () => stop.current?.(), []);

  // a new input while listening: reopen on it
  const switchInput = (next: InputChoice) => {
    pickInput(next);
    if (stop.current) { stop.current(); void start(next); }
  };

  const read = hz !== null ? readHz(hz, choice) : null;
  const cents = read?.cents ?? 0;
  const inTune = read !== null && Math.abs(cents) < 5;
  const colour = read === null ? "var(--color-slate-600)" : inTune ? "var(--color-emerald-400)" : Math.abs(cents) < 20 ? "var(--color-amber-400)" : "var(--color-rose-400)";
  const needle = Math.max(-50, Math.min(50, cents));
  // the text changes at most 30 times a second, the needle every frame
  const textHz = useThrottled(hz, FRAME_MS);
  const text = textHz !== null ? readHz(textHz, choice) : null;
  const tc = text?.cents ?? 0;
  const hint = !text ? (running ? "Play a note" : "") : text.string !== null && Math.abs(tc) >= 5 ? (tc > 0 ? "Tune down" : "Tune up") : Math.abs(tc) < 5 ? "In tune" : "";
  const knownDevice = !input.deviceId || devices.some((d) => d.id === input.deviceId);

  return (
    <div className="flex flex-col gap-3">
      <TunerSettings choice={choice} onChange={setChoice} />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
        <label className="flex min-w-0 items-center gap-1.5">
          Input
          <select className={`${field} min-w-0 max-w-64`} value={knownDevice ? input.deviceId : ""} onChange={(e) => switchInput({ deviceId: e.target.value, channel: "mix" })}>
            <option value="">System default</option>
            {devices.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
        </label>
        {/* an interface's inputs: pick one (a DI guitar on Input 1) or both; offered before Start, when the channel count is not known yet */}
        {(input.deviceId !== "" || channels > 1 || input.channel !== "mix") && (
          <label className="flex items-center gap-1.5">
            Channel
            <select className={field} value={String(input.channel)} onChange={(e) => switchInput({ ...input, channel: e.target.value === "mix" ? "mix" : Number(e.target.value) })}>
              <option value="mix">{channels > 2 ? "All inputs" : "Input 1 + 2"}</option>
              {Array.from({ length: Math.max(2, channels) }, (_, i) => <option key={i} value={i}>Input {i + 1}</option>)}
            </select>
          </label>
        )}
      </div>

      <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="flex items-baseline gap-2" aria-live="polite">
          <span className="text-7xl font-light tabular-nums" style={{ color: colour }}>{read?.name ?? "–"}</span>
          <span className="w-10 text-xl text-slate-400">{read?.octave ?? ""}</span>
        </div>
        <svg viewBox="-110 -6 220 46" className="w-full max-w-md" role="img" aria-label={read ? `${Math.round(cents)} cents ${cents > 0 ? "sharp" : "flat"}` : "No note detected"}>
          {Array.from({ length: 11 }, (_, i) => {
            const c = (i - 5) * 10;
            return <line key={c} x1={c * 2} x2={c * 2} y1={c === 0 ? 0 : 6} y2={c === 0 ? 26 : 20} stroke={c === 0 ? "var(--color-emerald-400)" : "var(--color-slate-600)"} strokeWidth={c === 0 ? 2 : 1} />;
          })}
          <text x={-100} y={36} fontSize={9} fill="var(--color-slate-500)" textAnchor="middle">flat</text>
          <text x={100} y={36} fontSize={9} fill="var(--color-slate-500)" textAnchor="middle">sharp</text>
          {/* the needle glides to each reading and fades out while nothing is heard */}
          <polygon points="-5,-4 5,-4 0,8" fill={colour}
            style={{ transform: `translateX(${needle * 2}px)`, opacity: read ? 1 : 0, transition: "transform 60ms linear, opacity 200ms, fill 200ms" }} />
        </svg>
        <p className="h-5 text-sm tabular-nums text-slate-400">
          {text && textHz !== null
            ? `${textHz.toFixed(1)} Hz${text.string !== null ? ` · hearing ${text.heard.name}${text.heard.octave}` : ""} · ${tc > 0 ? "+" : ""}${Math.round(tc)} cents${hint ? ` · ${hint}` : ""}`
            : hint}
        </p>
        <button type="button" onClick={running ? () => stop.current?.() : () => start(input)} className={`rounded-full border px-5 py-2 text-sm ${running ? "border-rose-500 bg-rose-500/15 text-rose-100" : "border-emerald-500 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25"}`}>
          {running ? "■ Stop" : "● Start tuner"}
        </button>
        {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
      </div>

      {strings.length > 0 && (
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${strings.length}, minmax(0, 1fr))` }}>
          {strings.map((s, i) => {
            const near = read?.string === i;
            return (
              <button key={i} type="button" onClick={() => playReference(midiToHz(s.midi, choice.a4))} title={`Hear ${s.name}${s.octave} at A4 = ${choice.a4} Hz`}
                className={`flex flex-col items-center gap-0.5 rounded-xl border p-2 transition ${near ? (inTune ? "border-emerald-400 bg-emerald-500/15" : "border-sky-400 bg-sky-500/10") : "border-slate-800 bg-slate-900/40 hover:border-slate-600"}`}>
                <span className="text-lg text-slate-100">{s.name}<span className="text-xs text-slate-500">{s.octave}</span></span>
                <span className="h-4 text-xs tabular-nums text-slate-400">{near && text?.string === i ? `${tc > 0 ? "+" : ""}${Math.round(tc)}` : "▶"}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

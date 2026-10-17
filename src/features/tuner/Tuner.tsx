"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getAudioContext } from "@/features/sound";
import { midiToHz } from "@/features/theory/tunings";
import { readHz, resolveChoice, sanitiseChoice } from "./choice";
import { usePitch } from "./usePitch";
import TunerMeter from "./TunerMeter";
import { useTunerChoice } from "./useTunerChoice";
import { playReference } from "./reference";
import TunerSettings, { label } from "./TunerSettings";
import { Select } from "@/components/ui";

/** Which microphone or interface, and which of its inputs: "mix" for all of them, or one channel (0 = Input 1). */
interface InputChoice { deviceId: string; channel: "mix" | number }

const FRAME = 4096;
const STORE = "musickit.tuner";
const INPUT_STORE = "musickit.tuner.input";
const DEFAULT_INPUT: InputChoice = { deviceId: "", channel: "mix" };
const ALIAS = new Set(["default", "communications"]);

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
  const [choice, setChoice] = useTunerChoice(STORE, fromQuery);
  const [input, setInput] = useState<InputChoice>(DEFAULT_INPUT);
  const [devices, setDevices] = useState<{ id: string; label: string }[]>([]);
  const [channels, setChannels] = useState(0);
  const stop = useRef<(() => void) | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);

  const { instrument, tuning } = resolveChoice(choice);
  const strings = tuning?.strings ?? [];
  const hz = usePitch(() => analyser.current, instrument.minHz, running);

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
      analyser.current = an;
      stop.current = () => {
        analyser.current = null;
        src.disconnect();
        split?.disconnect();
        stream.getTracks().forEach((t) => t.stop());
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
  const knownDevice = !input.deviceId || devices.some((d) => d.id === input.deviceId);

  const signed = (c: number) => `${Math.round(c) > 0 ? "+" : ""}${Math.round(c) || 0}`;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(18rem,22rem)_1fr]">
      {/* the meter first on a phone, beside the setup on a wide screen */}
      <section aria-label="Meter" className="flex flex-col items-center gap-5 rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-6 sm:px-8 sm:py-8 lg:order-2">
        <TunerMeter hz={hz} read={read} idle={(
          <>
            <span className="text-2xl font-light text-slate-300">{running ? "Play a string" : "Ready to tune"}</span>
            <span className="mt-1 text-sm text-slate-500">{running ? "Let it ring" : `${instrument.name}${tuning ? ` · ${tuning.name}` : ""} · A4 ${choice.a4} Hz`}</span>
          </>
        )} />

        {strings.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2" role="group" aria-label="Strings: tap one to hear it">
            {strings.map((s, i) => {
              const near = read?.string === i;
              return (
                <button key={i} type="button" onClick={() => playReference(midiToHz(s.midi, choice.a4))} title={`Hear ${s.name}${s.octave} at A4 = ${choice.a4} Hz`} aria-label={`Hear ${s.name}${s.octave}`}
                  className={`flex h-11 w-11 flex-col items-center justify-center rounded-full sm:h-14 sm:w-14 border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${near ? (inTune ? "border-emerald-400 bg-emerald-500/15" : "border-sky-400 bg-sky-500/10") : "border-slate-700 bg-slate-900/60 hover:border-slate-500"}`}>
                  <span className="text-lg leading-none text-slate-100">{s.name}<span className="text-[10px] text-slate-500">{s.octave}</span></span>
                  {near && <span className="mt-0.5 text-[10px] leading-none tabular-nums text-slate-400">{signed(cents)}</span>}
                </button>
              );
            })}
          </div>
        )}

        <button type="button" onClick={running ? () => stop.current?.() : () => start(input)}
          className={`inline-flex min-w-48 items-center justify-center gap-2 rounded-full border px-6 py-2.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${running ? "border-rose-500/70 bg-rose-500/15 text-rose-100 hover:bg-rose-500/25" : "border-emerald-500/70 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25"}`}>
          <span aria-hidden className={`h-2 w-2 ${running ? "rounded-sm bg-rose-300" : "rounded-full bg-emerald-300"}`} />
          {running ? "Stop" : "Start tuner"}
        </button>
        {error && <p role="alert" className="text-center text-xs text-rose-300">{error}</p>}
      </section>

      <aside aria-label="Setup" className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 lg:order-1">
        <TunerSettings choice={choice} onChange={setChoice} />
        <div className="flex flex-col gap-1.5">
          <span className={label}>Input</span>
          <div className="flex flex-wrap gap-2">
            <Select
              size="lg"
              className="flex-1"
              aria-label="Input device"
              value={knownDevice ? input.deviceId : ""}
              onChange={(deviceId) => switchInput({ deviceId, channel: "mix" })}
              options={[{ value: "", label: "System default" }, ...devices.map((d) => ({ value: d.id, label: d.label }))]}
            />
            {/* an interface's inputs: pick one (a DI guitar on Input 1) or both; offered before Start, when the channel count is not known yet */}
            {(input.deviceId !== "" || channels > 1 || input.channel !== "mix") && (
              <Select<number | "mix">
                size="lg"
                aria-label="Channel"
                value={input.channel}
                onChange={(channel) => switchInput({ ...input, channel })}
                options={[{ value: "mix", label: channels > 2 ? "All inputs" : "Input 1 + 2" }, ...Array.from({ length: Math.max(2, channels) }, (_, i) => ({ value: i, label: `Input ${i + 1}` }))]}
              />
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

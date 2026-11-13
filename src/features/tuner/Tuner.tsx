"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { readDeviceChoice, serverDeviceChoice, subscribeDeviceChoice } from "@/features/sound";
import { midiToHz } from "@/features/theory/tunings";
import InputChip from "@/components/InputChip";
import type { MicStatus } from "@/components/practice/useMicPitch";
import { useLevelAtLeast } from "@/features/guide/Tier";
import { DEFAULT_CHOICE, readHz, resolveChoice, sanitiseChoice } from "./choice";
import { usePitch } from "./usePitch";
import TunerMeter from "./TunerMeter";
import { useTunerChoice } from "./useTunerChoice";
import { playReference } from "./reference";
import TunerSettings, { label } from "./TunerSettings";
import { SettingsPanel, SettingsSection } from "@/components/ui";
import { migrateOldInput, openTunerInput, type TunerInput } from "./listen";

const STORE = "musickit.tuner";

const fromQuery = () => {
  const q = new URLSearchParams(window.location.search);
  return q.has("instrument") ? sanitiseChoice({ instrument: q.get("instrument"), tuning: q.get("tuning"), a4: q.get("a4") ?? undefined }) : null;
};

/** An input the host already listens to (the teacher studio's one audio input): its pitch, and Start / Stop for it. */
export interface ExternalInput {
  hz: number | null;
  listening: boolean;
  onToggle: () => void;
}

/**
 * A tuner. Pick an instrument (and its tuning) or Chromatic; it listens to the app's one input (shown and changed with the input
 * chip), on the app's chosen channel (both inputs of a two-input device by default). The microphone opens only after Start, and again on a new input while it runs.
 * Given an `external` input, it opens no microphone and has no input chip: it reads that input, and Start / Stop is the host's.
 */
export default function Tuner({ external, guide = false }: {
  external?: ExternalInput;
  /** on the tuner page: the setup is the page's settings panel; the reference pitch is a Standard control, and while it is hidden the tuner reads at A4 = 440 Hz */
  guide?: boolean;
} = {}) {
  const [status, setStatus] = useState<MicStatus>("off");
  const [error, setError] = useState<string | null>(null);
  const [saved, setChoice] = useTunerChoice(STORE, fromQuery);
  const showA4 = useLevelAtLeast("standard", !guide);
  const choice = showA4 ? saved : { ...saved, a4: DEFAULT_CHOICE.a4 };
  const inputId = useSyncExternalStore(subscribeDeviceChoice, readDeviceChoice, serverDeviceChoice).input?.id ?? "";
  const mic = useRef<TunerInput | null>(null);
  // a press while the permission prompt is open: the newest wins
  const attempt = useRef(0);

  const { instrument, tuning } = resolveChoice(choice);
  const strings = tuning?.strings ?? [];
  const ownHz = usePitch(() => mic.current?.analyser() ?? null, instrument.minHz, status === "on" && !external);
  const running = external ? external.listening : status === "on" || status === "asking";
  const hz = external ? external.hz : ownHz;

  // the old picker's device becomes the app's input, once
  useEffect(() => {
    if (!external) void migrateOldInput();
  }, [external]);

  const stop = useCallback(() => {
    attempt.current++;
    mic.current?.close();
    mic.current = null;
    setStatus("off");
  }, []);

  const start = useCallback(async () => {
    mic.current?.close();
    mic.current = null;
    const n = ++attempt.current;
    setError(null);
    setStatus("asking");
    try {
      const opened = await openTunerInput();
      if (n !== attempt.current) return opened.close();
      mic.current = opened;
      setStatus("on");
    } catch (e) {
      if (n !== attempt.current) return;
      const name = (e as Error)?.name;
      const denied = name === "NotAllowedError" || name === "SecurityError";
      setStatus(!navigator.mediaDevices ? "insecure" : denied ? "denied" : "error");
      setError(denied ? "The microphone could not be opened. Allow microphone access for this site and try again." : "That input could not be opened. Pick another one and try again.");
    }
  }, []);

  useEffect(() => () => mic.current?.close(), []);

  // listen as soon as the page opens
  useEffect(() => {
    if (!external) void start();
  }, [external, start]);

  // a new input chosen while listening: reopen on it
  const heardOn = useRef(inputId);
  useEffect(() => {
    if (heardOn.current === inputId) return;
    heardOn.current = inputId;
    if (mic.current) void start();
  }, [inputId, start]);

  const read = hz !== null ? readHz(hz, choice) : null;
  const cents = read?.cents ?? 0;
  const inTune = read !== null && Math.abs(cents) < 5;

  const signed = (c: number) => `${Math.round(c) > 0 ? "+" : ""}${Math.round(c) || 0}`;

  const meter = (
      <section aria-label="Meter" data-tour="tuner-meter" className="flex flex-col items-center gap-5 rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-6 sm:px-8 sm:py-8 lg:order-2">
        <TunerMeter hz={hz} read={read} idle={(
          <>
            <span className="text-2xl font-light text-slate-300">{running ? "Play a string" : "Ready to tune"}</span>
            <span className="mt-1 text-sm text-slate-500">{running ? "Let it ring" : `${instrument.name}${tuning ? ` · ${tuning.name}` : ""} · A4 ${choice.a4} Hz`}</span>
          </>
        )} />

        {strings.length > 0 && (
          <div data-tour="tuner-strings" className="flex flex-wrap justify-center gap-1.5 sm:gap-2" role="group" aria-label="Strings: tap one to hear it">
            {strings.map((s, i) => {
              const near = read?.string === i;
              return (
                <button key={i} type="button" onClick={() => playReference(midiToHz(s.midi, choice.a4))} title={`Hear ${s.name}${s.octave} at A4 = ${choice.a4} Hz`} aria-label={`Hear ${s.name}${s.octave}`}
                  className={`cursor-pointer flex h-11 w-11 flex-col items-center justify-center rounded-full sm:h-14 sm:w-14 border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${near ? (inTune ? "border-emerald-400 bg-emerald-500/15" : "border-sky-400 bg-sky-500/10") : "border-slate-700 bg-slate-900/60 hover:border-slate-500"}`}>
                  <span className="text-lg leading-none text-slate-100">{s.name}<span className="text-[10px] text-slate-500">{s.octave}</span></span>
                  {near && <span className="mt-0.5 text-[10px] leading-none tabular-nums text-slate-400">{signed(cents)}</span>}
                </button>
              );
            })}
          </div>
        )}

        <button type="button" onClick={external ? external.onToggle : running ? stop : () => void start()}
          className={`inline-flex min-w-48 items-center justify-center gap-2 rounded-full border px-6 py-2.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${running ? "border-rose-500/70 bg-rose-500/15 text-rose-100 hover:bg-rose-500/25" : "border-emerald-500/70 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25"}`}>
          <span aria-hidden className={`h-2 w-2 ${running ? "rounded-sm bg-rose-300" : "rounded-full bg-emerald-300"}`} />
          {running ? "Stop" : "Start tuner"}
        </button>
        {error && <p role="alert" className="text-center text-xs text-rose-300">{error}</p>}
      </section>
  );
  const setup = <>
    {/* hidden, a change keeps the saved A4 for when it shows again */}
    <TunerSettings choice={choice} onChange={(c) => setChoice(showA4 ? c : { ...c, a4: saved.a4 })} noA4={!showA4} />
    {!external && <div data-tour="tuner-input" className="flex flex-col items-start gap-1.5">
      <span className={label}>Input</span>
      <InputChip quiet status={status} mic={{ on: running, onToggle: running ? stop : () => void start() }} />
    </div>}
  </>;

  // on the tuner page the setup is the page's settings panel, folded on a phone so the meter comes first
  if (guide) return <SettingsPanel foldOnPhone settings={<SettingsSection first><div className="flex flex-col gap-4">{setup}</div></SettingsSection>}>{meter}</SettingsPanel>;
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(18rem,22rem)_1fr]">
      {/* the meter first on a phone, beside the setup on a wide screen */}
      {meter}
      <aside aria-label="Setup" className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 lg:order-1">{setup}</aside>
    </div>
  );
}

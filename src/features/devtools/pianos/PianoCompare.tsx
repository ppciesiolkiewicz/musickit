"use client";

import { useCallback, useRef, useState } from "react";
import { Button, Select } from "@/components/ui";
import { useMicPitch } from "@/components/practice/useMicPitch";
import { getAudioContext, getOutputBus, midiToName, wakeAudio } from "@/features/sound";
import { createSmoother, hzToNote, type Pitch } from "@/features/tuner";
import { backendsFor, type PianoBackend, type Tuning } from "./backends";
import { INSTRUMENTS_TO_COMPARE, centsFrom } from "./instruments";
import measured from "./tuning.generated.json";

type Entry = { raw: Tuning; corrected: Tuning; measuredAt: string } | { error: string; measuredAt: string };
const TABLE = measured as { low: number; high: number; backends: Record<string, Entry> };
const NOTES = Array.from({ length: TABLE.high - TABLE.low + 1 }, (_, i) => TABLE.low + i);
const SECONDS = 2.2;

const fmt = (c: number | null | undefined) => (c == null ? "–" : `${c >= 0 ? "+" : "−"}${Math.abs(c).toFixed(1)}¢`);
const tint = (c: number | null | undefined) => (c == null ? "text-slate-500" : Math.abs(c) <= 5 ? "text-emerald-300" : Math.abs(c) <= 10 ? "text-amber-300" : "text-rose-300");
const worst = (t: Tuning) => Math.max(0, ...Object.values(t).map(Math.abs));

/**
 * TEMPORARY (delete with /dev/pianos). Pick an instrument and a way to play it, tap a note to hear it, and sing it with the mic on.
 * Each key shows what `npm run pianos:measure` read for it, as recorded or with the tuning; "Correct pitch" plays with the tuning.
 */
export default function PianoCompare() {
  const [instId, setInstId] = useState(INSTRUMENTS_TO_COMPARE[0].id);
  const inst = INSTRUMENTS_TO_COMPARE.find((i) => i.id === instId)!;
  const backends = backendsFor(inst);
  const [backendId, setBackendId] = useState("piano/own:tji-piano");
  const [correct, setCorrect] = useState(true);
  // another instrument starts on its first way to play
  const spec = backends.find((b) => b.id === backendId) ?? backends[0];
  const pickInstrument = (id: string) => {
    setInstId(id);
    setBackendId(backendsFor(INSTRUMENTS_TO_COMPARE.find((i) => i.id === id)!)[0].id);
  };
  const entry = TABLE.backends[spec.id];
  const table = entry && "raw" in entry ? entry : null;

  // one backend at a time, made on the first note after the backend or the correction changes, and loaded then
  const made = useRef<{ key: string; b: PianoBackend; loading: Promise<void> } | null>(null);
  const tuning = correct && table ? table.raw : undefined;
  const [target, setTarget] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const sound = async (midi: number) => {
    try {
      await wakeAudio();
      const key = `${spec.id}:${tuning ? "tuned" : "raw"}`;
      if (made.current?.key !== key) {
        setStatus("Loading samples…");
        const b = spec.create(getAudioContext(), getOutputBus(), { tuning });
        made.current = { key, b, loading: b.load() };
      }
      const { b, loading } = made.current;
      await loading;
      setStatus(null);
      b.play(midi, getAudioContext().currentTime + 0.03, SECONDS);
    } catch (e) {
      made.current = null;
      setStatus(e instanceof Error ? e.message : String(e));
    }
  };

  const tap = (midi: number) => {
    setTarget(midi);
    void sound(midi);
  };

  const [mic, setMic] = useState(false);
  const [hz, setHz] = useState<number | null>(null);
  const smoother = useRef(createSmoother());
  const quiet = useRef(0);
  const onPitch = useCallback((p: Pitch | null) => {
    if (p) {
      quiet.current = 0;
      setHz(smoother.current.push(p));
    } else if (++quiet.current > 20) {
      smoother.current.reset();
      setHz(null);
    }
  }, []);
  const { status: micStatus } = useMicPitch(mic, undefined, onPitch);
  const heard = hz === null ? null : hzToNote(hz);
  const vsTarget = hz === null || target === null ? null : centsFrom(hz, target);
  const shown = table ? (correct ? table.corrected : table.raw) : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Select size="sm" value={instId} onChange={pickInstrument} aria-label="Instrument" options={INSTRUMENTS_TO_COMPARE.map((i) => ({ value: i.id, label: i.label }))} />
        <Select size="sm" value={spec.id} onChange={setBackendId} aria-label="Backend" options={backends.map((b) => ({ value: b.id, label: b.label }))} />
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={correct} onChange={(e) => setCorrect(e.target.checked)} /> Correct pitch
        </label>
        <Button size="sm" pressed={mic} onClick={() => setMic((v) => !v)}>{mic ? "Mic on" : "Mic off"}</Button>
      </div>
      <div className="space-y-1 text-sm text-slate-400">
        <p>{spec.about}</p>
        {table ? (
          <p>
            Worst note: <span className={tint(worst(table.raw))}>±{worst(table.raw).toFixed(1)}¢ as recorded</span>, <span className={tint(worst(table.corrected))}>±{worst(table.corrected).toFixed(1)}¢ corrected</span>. Measured {table.measuredAt.slice(0, 16).replace("T", " ")}.
          </p>
        ) : (
          <p className="text-amber-300">{entry && "error" in entry ? `The last measuring failed: ${entry.error}` : "Not measured yet: run npm run pianos:measure."}</p>
        )}
      </div>

      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-12">
        {NOTES.map((m) => {
          const black = [1, 3, 6, 8, 10].includes(m % 12);
          return (
            <button key={m} type="button" onClick={() => tap(m)}
              className={`rounded-md border px-1 py-2 text-xs ${target === m ? "border-sky-400 bg-sky-500/20" : black ? "border-slate-700 bg-slate-900" : "border-slate-600 bg-slate-800"}`}>
              <span className="block text-slate-100">{midiToName(m)}</span>
              {shown && <span className={`block tabular-nums ${tint(shown[m])}`}>{fmt(shown[m])}</span>}
              {table && correct && <span className="block tabular-nums text-[10px] text-slate-500">was {fmt(table.raw[m])}</span>}
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-700 p-4">
        <div className="text-xs uppercase tracking-wide text-slate-500">Your voice</div>
        <div className="mt-1 text-sm text-slate-300">
          {micStatus !== "on" ? `Mic: ${micStatus}` : heard ? `${heard.name}${heard.octave} ${fmt(heard.cents)} from the nearest note` : "Sing…"}
        </div>
        <div className={`text-3xl tabular-nums ${tint(vsTarget)}`}>{target === null || !heard ? "" : `${fmt(vsTarget)} from ${midiToName(target)}`}</div>
      </div>
      {status && <p className="text-sm text-slate-400">{status}</p>}
      <p className="text-xs text-slate-500">
        Cents from equal temperament at A4 = 440, read 0.3 s into each note by <code>npm run pianos:measure</code>, without and with the tuning. Green within 5¢, amber within 10¢.
      </p>
    </div>
  );
}


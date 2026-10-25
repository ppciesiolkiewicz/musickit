"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BarRow, ScaleSettingsBar, WithSettings } from "@/components/chordKit/ScaleSettings";
import { useMicPitch } from "@/components/practice/useMicPitch";
import { Button, Chip, Select } from "@/components/ui";
import { createSmoother, type Pitch } from "@/features/tuner/pitch";
import { DEFAULT_KEY_PC } from "@/features/theory/theory";
import { getAudioContext, getSharedPiano, midiToName, onSilence, playSequence, silence, wakeAudio } from "@/features/sound";
import type { PocketStatus } from "@/features/instruments";
import { RANGE_MAX, RANGE_MIN, VOICES, buildLadder, clefFor, hzToMidi, scaleRun, setRangeEnd, voiceOf, type Range, type Voice } from "@/features/theory/singing";
import SingingStaff from "./SingingStaff";
import { panel } from "@/components/practice/shared";

/** null readings in a row before the voice counts as stopped (about 100 ms), so one dropped frame doesn't break the line */
const GAP_FRAMES = 6;
/** the tempo before the pocket tools report theirs */
const FALLBACK_BPM = 90;
/** how long a tapped note sounds */
const TAP_MS = 900;
const RESTS = [0, 1, 2, 3, 4];

const RANGE_NOTES = Array.from({ length: RANGE_MAX - RANGE_MIN + 1 }, (_, i) => ({ value: RANGE_MIN + i, label: midiToName(RANGE_MIN + i) }));

/**
 * Sing the notes of a scale against its staff: pick the key, the scale and the range (a voice type, or any two notes) in
 * the settings bar (with the drone and the metronome from the scales pages). Tap a note to hear it, or play the scale up
 * and down on the metronome's tempo, then switch the mic on and a dot follows your voice over the notes.
 */
export default function SingingApp() {
  const [tonicPc, setTonicPc] = useState(DEFAULT_KEY_PC);
  const [scale, setScale] = useState("major-ionian");
  const [range, setRange] = useState<Range>(VOICES.soprano);
  const [rest, setRest] = useState(2);
  const [mic, setMic] = useState(false);
  const [pocket, setPocket] = useState<PocketStatus | null>(null);
  const voice = voiceOf(range);
  const clef = clefFor(range);
  const ladder = useMemo(() => buildLadder(scale, tonicPc, range) ?? buildLadder("major-ionian", tonicPc, range)!, [scale, tonicPc, range]);

  const pitch = useRef<number | null>(null);
  const smoother = useRef(createSmoother());
  const gaps = useRef(0);
  const onPitch = useCallback((p: Pitch | null) => {
    if (!p) {
      if (++gaps.current >= GAP_FRAMES) {
        pitch.current = null;
        smoother.current.reset();
      }
      return;
    }
    gaps.current = 0;
    pitch.current = hzToMidi(smoother.current.push(p));
  }, []);
  const { status } = useMicPitch(mic, undefined, onPitch);

  // the note sounding now (ladder index), from a run or a tap; a run's highlights are timers, cleared with its sound
  const [played, setPlayed] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clear = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setRunning(false);
    setPlayed(null);
  }, []);
  useEffect(() => onSilence(clear), [clear]);
  // a run belongs to its ladder: a new key, scale or range (or leaving the page) stops it
  useEffect(() => () => silence(), [ladder]);

  const play = async () => {
    if (running) return silence();
    await wakeAudio();
    const ctx = getAudioContext();
    const beat = 60000 / (pocket?.bpm ?? FALLBACK_BPM);
    // on the click's next beat while the metronome (or any pocket tool) plays, else straight away
    const next = pocket?.nextBeat() ?? null;
    const lead = next === null ? 60 : Math.max(0, (next - ctx.currentTime) * 1000);
    const run = scaleRun(ladder.notes.length, rest);
    playSequence(run.flatMap((n, i) => (n === null ? [] : [{ note: ladder.notes[n].midi, at: lead + i * beat, hold: beat * 0.9 }])));
    setRunning(true);
    timers.current = run.map((n, i) => setTimeout(() => setPlayed(n), lead + i * beat));
    timers.current.push(setTimeout(clear, lead + run.length * beat));
  };

  // a tap sounds over a run without stopping it, and lights its note only when nothing runs
  const tap = async (i: number) => {
    await wakeAudio();
    const midi = ladder.notes[i].midi;
    const piano = getSharedPiano();
    piano.noteOn(midi);
    setTimeout(() => piano.noteOff(midi), TAP_MS);
    if (running) return;
    setPlayed(i);
    timers.current.push(setTimeout(() => setPlayed((p) => (p === i ? null : p)), TAP_MS));
  };

  const message =
    status === "asking" ? "Allow the microphone in your browser…"
    : status === "denied" ? "Microphone blocked. Allow it in the browser's site settings and try again."
    : status === "insecure" ? "The browser only allows the microphone on a secure (https) page."
    : status === "error" ? "No microphone found."
    : status === "on" ? "Listening. Sing the scale up from the root: the dot turns green on a note of the scale, red on a note outside it."
    : "Tap a note to hear it, or play the scale up and down on the metronome's tempo. Then switch the mic on and sing.";

  return (
    <WithSettings
      side={false}
      bar={
        <ScaleSettingsBar tonicPc={tonicPc} onTonic={setTonicPc} scale={scale} onScale={setScale} labels={false} onStatus={setPocket}>
          <BarRow label="Voice">
            {(Object.keys(VOICES) as Voice[]).map((v) => (
              <Chip key={v} on={v === voice} onClick={() => setRange(VOICES[v])} title={`${midiToName(VOICES[v].low)} to ${midiToName(VOICES[v].high)}`}>{VOICES[v].label}</Chip>
            ))}
          </BarRow>
          <BarRow label="Range">
            <Select size="sm" highlighted={!voice} value={range.low} onChange={(m) => setRange((r) => setRangeEnd(r, "low", m))} options={RANGE_NOTES} aria-label="Lowest note" />
            <span className="text-xs text-slate-500">to</span>
            <Select size="sm" highlighted={!voice} value={range.high} onChange={(m) => setRange((r) => setRangeEnd(r, "high", m))} options={RANGE_NOTES} aria-label="Highest note" />
            {!voice && <span className="text-xs text-slate-400">Custom</span>}
          </BarRow>
          <BarRow label="Top rest">
            {RESTS.map((n) => (
              <Chip key={n} on={n === rest} onClick={() => setRest(n)}>{n === 0 ? "None" : `${n} beat${n > 1 ? "s" : ""}`}</Chip>
            ))}
          </BarRow>
        </ScaleSettingsBar>
      }
    >
      <section className={`${panel} flex flex-col gap-3`}>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-base font-medium text-slate-100">{ladder.title}</h2>
          <Button size="sm" pressed={running} onClick={() => void play()} className={running ? "!border-sky-400/70 !bg-sky-500/20 !text-sky-100" : ""}>
            {running ? "Stop the scale" : `Play the scale · ${pocket?.bpm ?? FALLBACK_BPM} bpm`}
          </Button>
          <Button size="sm" pressed={mic} onClick={() => { pitch.current = null; setMic((v) => !v); }} className={mic ? "!border-emerald-400/70 !bg-emerald-500/20 !text-emerald-100" : ""}>
            {mic ? "Stop the mic" : "Start the mic"}
          </Button>
          <p className="min-w-0 basis-full text-sm sm:basis-0 sm:flex-1 text-slate-400" aria-live="polite">{message}</p>
        </div>
        <SingingStaff ladder={ladder} clef={clef} pitch={pitch} played={played} onNote={(i) => void tap(i)} />
      </section>
    </WithSettings>
  );
}

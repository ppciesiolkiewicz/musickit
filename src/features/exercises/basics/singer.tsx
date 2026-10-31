"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMicPitch } from "@/components/practice/useMicPitch";
import MelodyStaff from "@/components/theory/singing/MelodyStaff";
import MicButton from "@/components/theory/singing/MicButton";
import { getSharedPiano, playSequence, silence, wakeAudio } from "@/features/sound";
import { VOICES, buildLadder, clefFor, hzToMidi, tuneLadderFor, type Range, type Voice } from "@/features/theory/singing";
import { BOOK, RUNS, placeRun, placeTune } from "@/features/theory/singingMelodies";
import { createSmoother, type Pitch } from "@/features/tuner/pitch";

/** frames without a pitch before the dot goes away */
const GAP_FRAMES = 6;
const BPM = 90;
const TAP_MS = 900;

/**
 * One tune (or run) from the singing page's books on its melody staff, in a key and voice: play it to hear it, tap a
 * note, switch the mic on and sing along the bar. The singing page's staff, mic and placement; nothing writes the address.
 */
export function SingerView({ n, pc, voice = "soprano" }: { n: number; pc: number; voice?: Voice }) {
  const tune = BOOK.find((t) => t.n === n) ?? RUNS.find((t) => t.n === n);
  const range = VOICES[voice] ?? VOICES.soprano;
  const clef = clefFor(range);
  const { ladder, notes } = useMemo(() => {
    const ladderIn = (k: number, r: Range) => tuneLadderFor(buildLadder("major-ionian", k, r)!, k, r);
    const ladder = ladderIn(pc, range);
    if (!tune) return { ladder, notes: [] };
    return { ladder, notes: tune.keys ? placeRun(tune.notes, pc, tune.keys, ladderIn, range) : placeTune(tune.notes, ladder, range) };
  }, [tune, pc, range]);
  const beat = 60000 / BPM;
  const [mic, setMic] = useState(false);
  const [playFrom, setPlayFrom] = useState<number | null>(null);
  const [tapped, setTapped] = useState<number | null>(null);
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
  // leaving, or another tune, stops the sound
  useEffect(() => () => silence(), [notes]);
  const gridBeats = useCallback(() => null, []);
  if (!tune || !notes.length) return null;
  const play = async () => {
    silence();
    await wakeAudio();
    const lead = 60;
    playSequence(notes.map((x) => ({ note: x.midi, at: lead + x.at * beat, hold: x.beats * beat * 0.9 })));
    setPlayFrom(performance.now() + lead);
  };
  const tap = async (i: number) => {
    await wakeAudio();
    const midi = notes[i].midi;
    const piano = getSharedPiano();
    piano.noteOn(midi);
    setTapped(i);
    setTimeout(() => {
      piano.noteOff(midi);
      setTapped((p) => (p === i ? null : p));
    }, TAP_MS);
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
        <button type="button" onClick={() => void play()} className="rounded border border-slate-700 px-2 py-0.5 text-[11px] text-slate-300 hover:border-slate-500">▶ Play · {BPM} bpm</button>
        <MicButton on={mic} onClick={() => { pitch.current = null; setMic((v) => !v); }} offLabel="Sing with the mic" />
        <span>{tune.keys ? "Run" : "Melody"} #{tune.n} · {tune.stage.title} · {ladder.title} · {range.label}{status === "denied" ? " · microphone blocked in the browser" : ""}</span>
      </div>
      <MelodyStaff notes={notes} ladder={ladder} clef={clef} live pitch={pitch} playFrom={playFrom} beatMs={beat} gridBeats={gridBeats} tapped={tapped} onNote={(i) => void tap(i)} />
    </div>
  );
}

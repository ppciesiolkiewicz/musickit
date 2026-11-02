"use client";

import { useMemo, useState } from "react";
import { getSharedPiano, wakeAudio } from "@/features/sound";
import { VOICES, buildLadder, clefFor, tuneLadderFor, type Range, type Voice } from "@/features/theory/singing";
import { BOOK, RUNS, placeRun, placeTune } from "@/features/theory/singingMelodies";
import { harmoniseRun, harmoniseTune, type MelodyChord } from "@/features/theory/melodyChords";
import SingAlong from "./sing-along/SingAlong";

const BPM = 90;
const TAP_MS = 900;

/**
 * One tune (or run) from the singing page's books, in a key and voice, sung along (`SingAlong`): play it on a loop over
 * the whole tune or a part of it, muted or heard, on an endless staff or a piano roll; tap a note to hear it. With `chords` (the default) the piano plays a chord a bar under it, named
 * over the staff, and a run announces each new key in its held-Do bar; with `metronome` the click is heard from the start (it can be
 * switched on and off in the player either way). The singing page's placement; nothing writes the address.
 */
export function SingerView({ n, pc, voice = "soprano", chords = true, metronome = false }: { n: number; pc: number; voice?: Voice; chords?: boolean; metronome?: boolean }) {
  const tune = BOOK.find((t) => t.n === n) ?? RUNS.find((t) => t.n === n);
  const range = VOICES[voice] ?? VOICES.soprano;
  const clef = clefFor(range);
  const { ladder, notes, harmony } = useMemo(() => {
    const ladderIn = (k: number, r: Range) => tuneLadderFor(buildLadder("major-ionian", k, r)!, k, r);
    const ladder = ladderIn(pc, range);
    const none: MelodyChord[] = [];
    if (!tune) return { ladder, notes: [], harmony: none };
    if (chords) {
      const h = tune.keys ? harmoniseRun(tune.notes, pc, tune.keys, ladderIn, range) : harmoniseTune(tune.notes, ladder, range);
      return { ladder, notes: h.notes, harmony: h.chords };
    }
    return { ladder, notes: tune.keys ? placeRun(tune.notes, pc, tune.keys, ladderIn, range) : placeTune(tune.notes, ladder, range), harmony: none };
  }, [tune, pc, range, chords]);
  const beat = 60000 / BPM;
  const [tapped, setTapped] = useState<number | null>(null);
  if (!tune || !notes.length) return null;
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
    <SingAlong key={`${n}-${pc}-${voice}-${chords}-${metronome}`} notes={notes} chords={harmony} ladder={ladder} clef={clef} beatMs={beat} click={metronome} tapped={tapped} onNote={(i) => void tap(i)}
      info={<>{tune.keys ? "Run" : "Melody"} #{tune.n} · {tune.stage.title} · {ladder.title} · {range.label} · {BPM} bpm</>} />
  );
}

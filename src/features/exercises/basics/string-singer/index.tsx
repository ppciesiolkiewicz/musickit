"use client";

import { useMemo, useState } from "react";
import { getSharedPiano, wakeAudio } from "@/features/sound";
import { VOICES, buildLadder, clefFor, spellName, withNotesUnder, type Ladder, type Voice } from "@/features/theory/singing";
import type { PlacedNote } from "@/features/theory/singingMelodies";
import SingAlong from "../sing-along/SingAlong";
import { STRING_NAMES, drillNotes, type StringDrill } from "./strings";

const BPM = 72;
const TAP_MS = 1400;

const WHAT: Record<StringDrill, string> = {
  strings: "Open strings E A D G B E, up and back",
  pairs: "Neighbouring strings: fourths, a major third from G to B",
  "fifth-fret": "5th fret = the next open string (4th fret on G)",
};

/**
 * The guitar's open strings to sing (`SingAlong`), moved into the voice: the strings one by one, neighbouring pairs, or
 * the 5th-fret unisons, so the student carries the pitches to tune by ear. No chords; the metronome heard unless turned
 * off (it keeps the long notes in time, and switches on and off in the player); tap a note to hear it.
 */
export function View({ drill = "strings", voice = "tenor", metronome = true }: { drill?: StringDrill; voice?: Voice; metronome?: boolean }) {
  const range = VOICES[voice] ?? VOICES.tenor;
  const clef = clefFor(range);
  const { notes, ladder } = useMemo(() => {
    const notes: PlacedNote[] = drillNotes(drill, range).map((n) => ({ midi: n.midi, spelled: spellName(STRING_NAMES[n.string], n.midi, n.label), degree: n.string, label: n.label, at: n.at, beats: n.beats }));
    // the staff's rungs: the white keys (C major) through the range, unlabelled
    const white = withNotesUnder(buildLadder("major-ionian", 0, range)!, range);
    const ladder: Ladder = { ...white, title: "the guitar's open strings", notes: white.notes.map((n) => ({ ...n, label: "" })) };
    return { notes, ladder };
  }, [drill, range]);
  const [tapped, setTapped] = useState<number | null>(null);
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
    <SingAlong key={`${drill}-${voice}-${metronome}`} notes={notes} chords={[]} ladder={ladder} clef={clef} beatMs={60000 / BPM} click={metronome} tapped={tapped} onNote={(i) => void tap(i)}
      info={<>{WHAT[drill]} · {range.label} · {BPM} bpm</>} />
  );
}

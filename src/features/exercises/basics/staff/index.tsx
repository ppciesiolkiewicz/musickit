"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useMicPitch } from "@/components/practice/useMicPitch";
import MicButton from "@/components/theory/singing/MicButton";
import SingingStaff from "@/components/theory/singing/SingingStaff";
import { getSharedPiano, wakeAudio } from "@/features/sound";
import { VOICES, buildLadder, clefFor, hzToMidi, spellName } from "@/features/theory/singing";
import { createSmoother, type Pitch } from "@/features/tuner/pitch";

const FLAT = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"];
const SHARP = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
const SEMI_TEXT = ["1", "♭2", "2", "♭3", "3", "4", "♯4", "5", "♭6", "6", "♭7", "7"];

/** frames without a pitch before the dot on the staff goes away */
const GAP_FRAMES = 6;

/** The scale on a staff in the voice's range, with the microphone's pitch drawn on it; tap a note to hear it. */
export function View({ slug, pc, voice, notes, highlight, others = "dimmed", mic: micButton = true }: { slug: string; pc: number; voice: keyof typeof VOICES; notes?: number[]; highlight?: number[]; others?: "dimmed" | "hidden"; mic?: boolean }) {
  const range = VOICES[voice];
  const lit = useMemo(() => (highlight?.length ? new Set(highlight.map((semi) => (pc + semi) % 12)) : undefined), [highlight, pc]);
  const picked = useMemo(() => {
    const full = buildLadder(slug, pc, range);
    if (!full || !notes?.length) return full;
    // only the degrees asked for (the chord tones, say), not the whole scale: a tone outside the scale (the ♭7 over a major scale) is added
    const root = full.notes[0];
    const below = full.notes.filter((n) => n.midi - root.midi < 12);
    const flats = full.signature < 0;
    const out: typeof full.notes = [];
    for (let o = 0; o < 4; o++)
      for (const semi of notes) {
        const midi = root.midi + 12 * o + semi;
        if (midi > range.high && out.length >= 2) break;
        const inScale = below.find((n) => n.midi - root.midi === semi);
        const under = below.filter((n) => n.midi - root.midi <= semi).pop() ?? root;
        const name = inScale?.spelled.name ?? (flats ? FLAT : SHARP)[(pc + semi) % 12];
        out.push({ midi, spelled: spellName(name, midi, SEMI_TEXT[semi]), degree: (inScale ?? under).degree, label: SEMI_TEXT[semi] });
      }
    return out.length > 1 ? { ...full, notes: out, pcs: new Set(notes.map((semi) => (pc + semi) % 12)), title: `${full.title.split(" ")[0]}: ${notes.map((v) => SEMI_TEXT[v]).join(" ")}` } : full;
  }, [slug, pc, range, notes]);
  // "hidden": the notes not lit leave the staff
  const ladder = useMemo(() => {
    if (!picked || others !== "hidden" || !lit) return picked;
    const kept = picked.notes.filter((n) => lit.has(n.midi % 12));
    return kept.length > 1 ? { ...picked, notes: kept } : picked;
  }, [picked, others, lit]);
  const [mic, setMic] = useState(false);
  const [played, setPlayed] = useState<number | null>(null);
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
  if (!ladder) return null;
  const tap = async (i: number) => {
    await wakeAudio();
    const midi = ladder.notes[i].midi;
    const piano = getSharedPiano();
    piano.noteOn(midi);
    setPlayed(i);
    setTimeout(() => {
      piano.noteOff(midi);
      setPlayed((p) => (p === i ? null : p));
    }, 700);
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
        {micButton && <MicButton on={mic} onClick={() => { pitch.current = null; setMic((v) => !v); }} offLabel="Sing with the mic" />}
        <span>{ladder.title} · {VOICES[voice].label}{status === "denied" ? " · microphone blocked in the browser" : ""}</span>
      </div>
      <SingingStaff ladder={ladder} clef={clefFor(range)} pitch={pitch} played={played} onNote={(i) => void tap(i)} highlight={lit} />
    </div>
  );
}

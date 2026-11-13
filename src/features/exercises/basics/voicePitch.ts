"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { useMicPitch, type MicStatus } from "@/components/practice/useMicPitch";
import { midiToName } from "@/features/sound";
import { hzToMidi } from "@/features/theory/singing";
import { createSmoother, type Pitch } from "@/features/tuner/pitch";

/** frames without a pitch before the voice counts as gone (a breath, a pause) */
const GAP_FRAMES = 6;

/**
 * The voice from the mic while `on`, as a ref to read each frame: its pitch in fractional MIDI, smoothed, or null when
 * nothing pitched has been heard for a few frames. For the warm-ups that follow the voice continuously (the hill, the lip roll).
 */
export function useVoicePitch(on: boolean): { pitch: { readonly current: number | null }; status: MicStatus } {
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
  useEffect(() => {
    pitch.current = null;
    smoother.current.reset();
  }, [on]);
  const { status } = useMicPitch(on, undefined, onPitch);
  return { pitch, status };
}

/**
 * True on a touch screen. A phone plays every sound much quieter while a page has the mic open, so a warm-up opens the
 * mic there only while the student sings.
 */
export const useTouch = () => useSyncExternalStore(
  (fn) => {
    const mq = window.matchMedia("(pointer: coarse)");
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  },
  () => window.matchMedia("(pointer: coarse)").matches,
  () => false,
);

const FLATS: Record<string, string> = { "C#": "D♭", "D#": "E♭", "F#": "G♭", "G#": "A♭", "A#": "B♭" };
/** A note's name, a black key as a flat but F♯: "E♭3", "F♯4", "B♭3". Out of a key, these are the spellings singers meet most. */
export const noteLabel = (midi: number) => {
  const n = midiToName(Math.round(midi));
  const name = n.replace(/-?\d+$/, "");
  return name === "F#" ? n.replace("#", "♯") : n.replace(name, FLATS[name] ?? name);
};

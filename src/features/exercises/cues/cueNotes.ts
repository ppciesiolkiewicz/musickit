import { OPEN_MIDI } from "@/lib/chordKit/shapeTools";
import type { Cue } from "./cues";

/** A note of a tool in its own beats: when it starts, how long it lasts, its pitch and, when known, where it is played. */
export interface KitNote { beat: number; beats: number; midi: number; string?: number; fret?: number; finger?: number }

/** The notes a student plays in `cues`: one per fret of each cue that is not backing and is enabled. */
export function cueNotes(cues: Cue[]): KitNote[] {
  return cues
    .filter((c) => c.kind !== "backing" && c.enabled)
    .flatMap((c) => c.frets.map((f) => ({
      beat: c.at, beats: c.beats, midi: OPEN_MIDI[f.string] + f.fret, string: f.string, fret: f.fret, finger: f.finger,
    })));
}

/** The finger for `fret` with the hand at `pos` (one finger a fret, 1 index ... 4 pinky); an open string has none. */
export function fingerFor(fret: number, pos: number): number | undefined {
  if (fret <= 0) return undefined;
  return Math.min(4, Math.max(1, fret - pos + 1));
}

import { Note } from "@tonaljs/tonal";
import { silence, strum as soundStrum } from "@/features/sound";
import { shapeMidi } from "./shapeTools";
import type { Shape } from "./shapes";

/** MIDI numbers -> note names with sharps, using tonal. */
export const midiToNames = (midi: number[]): string[] => midi.map((m) => Note.fromMidiSharps(m));

/** Strum a list of MIDI notes, low string first, on the shared piano (the sound module). */
export function strum(midi: number[], opts: { gapMs?: number; holdMs?: number } = {}): void {
  soundStrum(midi, opts);
}

export { silence };

/** Strum a shape placed with its root at `rootFret`. */
export const strumShape = (sh: Shape, rootFret: number, opts?: { gapMs?: number; holdMs?: number }) => strum(shapeMidi(sh, rootFret), opts);

/** Play the notes together, like a block chord (for comparing voicings quickly). */
export const blockShape = (sh: Shape, rootFret: number) => strum(shapeMidi(sh, rootFret), { gapMs: 0, holdMs: 1200 });

import { Note } from "@tonaljs/tonal";
import { playNote, stopNote } from "@/lib/audio";
import { shapeMidi } from "./shapeTools";
import type { Shape } from "./shapes";

const timers: ReturnType<typeof setTimeout>[] = [];
let sounding: string[] = [];

/** Silence anything still ringing and cancel pending strum notes. */
export function silence(): void {
  timers.splice(0).forEach(clearTimeout);
  sounding.forEach(stopNote);
  sounding = [];
}

/** MIDI numbers -> note names with sharps, using tonal. */
export const midiToNames = (midi: number[]): string[] => midi.map((m) => Note.fromMidiSharps(m));

/** Strum a list of MIDI notes, low string first. */
export function strum(midi: number[], opts: { gapMs?: number; holdMs?: number } = {}): void {
  const { gapMs = 45, holdMs = 1400 } = opts;
  silence();
  const names = midiToNames(midi);
  names.forEach((name, i) => {
    timers.push(
      setTimeout(() => {
        playNote(name);
        sounding.push(name);
      }, i * gapMs),
    );
  });
  timers.push(setTimeout(silence, (names.length - 1) * gapMs + holdMs));
}

/** Strum a shape placed with its root at `rootFret`. */
export const strumShape = (sh: Shape, rootFret: number, opts?: { gapMs?: number; holdMs?: number }) => strum(shapeMidi(sh, rootFret), opts);

/** Play the notes together, like a block chord (for comparing voicings quickly). */
export const blockShape = (sh: Shape, rootFret: number) => strum(shapeMidi(sh, rootFret), { gapMs: 0, holdMs: 1200 });

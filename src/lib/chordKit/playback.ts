import { Note } from "@tonaljs/tonal";
import { onSilence, playSequence, silence, strum as soundStrum } from "@/features/sound";
import { shapeMidi } from "./shapeTools";
import type { Shape } from "./shapes";

/** MIDI numbers -> note names with sharps, using tonal. */
export const midiToNames = (midi: number[]): string[] => midi.map((m) => Note.fromMidiSharps(m));

/** Strum a list of MIDI notes, low string first, on the shared piano (the sound module). */
export function strum(midi: number[], opts: { gapMs?: number; holdMs?: number } = {}): void {
  soundStrum(midi, opts);
}

export { silence };

/** The tune now playing (the id of the button that started it), so that button can turn into Stop. */
let tune: string | null = null;
let tuneEnd: ReturnType<typeof setTimeout> | undefined;
const tuneListeners = new Set<() => void>();
const setTune = (id: string | null) => {
  clearTimeout(tuneEnd);
  if (tune === id) return;
  tune = id;
  tuneListeners.forEach((fn) => fn());
};
// any stop or new sound ends the tune
if (typeof window !== "undefined") onSilence(() => setTune(null));

export const currentTune = () => tune;
export function subscribeTune(fn: () => void): () => void {
  tuneListeners.add(fn);
  return () => tuneListeners.delete(fn);
}

/** Notes of their own lengths one after another (a tune), each held for most of its length. With `tuneId` it counts as that tune until it ends or is stopped. */
export function playTimed(notes: { midi: number; ms: number; velocity?: number }[], tuneId?: string): void {
  let at = 0;
  playSequence(notes.map((n) => ({ note: n.midi, at: (at += n.ms) - n.ms, hold: n.ms * 0.92, velocity: n.velocity })));
  if (!tuneId) return;
  setTune(tuneId);
  tuneEnd = setTimeout(() => setTune(null), at);
}

/** Strum a shape placed with its root at `rootFret`. */
export const strumShape = (sh: Shape, rootFret: number, opts?: { gapMs?: number; holdMs?: number }) => strum(shapeMidi(sh, rootFret), opts);

/** Play the notes together, like a block chord (for comparing voicings quickly). */
export const blockShape = (sh: Shape, rootFret: number) => strum(shapeMidi(sh, rootFret), { gapMs: 0, holdMs: 1200 });

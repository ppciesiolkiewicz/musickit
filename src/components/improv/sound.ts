import { Note } from "@tonaljs/tonal";
import { getAudioContext } from "@/lib/audio";
import { playNote, stopNote } from "@/lib/audio";

export interface Hit {
  /** place in the cycle, 0 up to 1 */
  at: number;
  freq: number;
  gain: number;
}

function click(ctx: AudioContext, t: number, freq: number, gain: number) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "triangle";
  o.frequency.value = freq;
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0008, t + 0.14);
  o.connect(g);
  g.connect(ctx.destination);
  o.start(t);
  o.stop(t + 0.16);
}

export interface Loop {
  stop: () => void;
  /** how far through the cycle we are now, 0 to 1 (null before the first hit) */
  position: () => number;
}

/** Play a rhythm cycle on the audio clock: forever, or `cycles` times. */
export function startLoop(cycleSeconds: number, hits: Hit[], cycles = Infinity, onDone?: () => void): Loop {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  const t0 = ctx.currentTime + 0.1;
  let k = 0;
  let done = false;
  const tick = () => {
    while (k < cycles && t0 + k * cycleSeconds < ctx.currentTime + 0.4) {
      hits.forEach((h) => click(ctx, t0 + k * cycleSeconds + h.at * cycleSeconds, h.freq, h.gain));
      k++;
    }
    if (k >= cycles && !done && ctx.currentTime > t0 + cycles * cycleSeconds) {
      done = true;
      stop();
      onDone?.();
    }
  };
  const timer = setInterval(tick, 25);
  tick();
  const stop = () => clearInterval(timer);
  return { stop, position: () => (((ctx.currentTime - t0) / cycleSeconds) % 1 + 1) % 1 };
}

let timers: ReturnType<typeof setTimeout>[] = [];
let sounding: string[] = [];

export function silence() {
  timers.forEach(clearTimeout);
  timers = [];
  sounding.forEach(stopNote);
  sounding = [];
}

/** Play MIDI notes one after another with the app's piano. */
export function playMelody(midi: number[], stepMs = 300) {
  silence();
  midi.forEach((m, i) => {
    const name = Note.fromMidiSharps(m);
    timers.push(setTimeout(() => { playNote(name); sounding.push(name); }, i * stepMs));
    timers.push(setTimeout(() => { stopNote(name); sounding = sounding.filter((n) => n !== name); }, i * stepMs + stepMs * 0.9));
  });
}

/** A held root note to improvise over. Returns a function that stops it. */
export function startDrone(midi: number): () => void {
  const name = Note.fromMidiSharps(midi);
  playNote(name);
  return () => stopNote(name);
}

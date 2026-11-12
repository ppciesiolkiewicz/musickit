import { audioStartTime, getAudioContext, getOutputBus, wakeAudio } from "./context";
import type { SampleBackend, SoundingNote } from "./backend";
import { bufferBackendFor } from "./backends/buffer";
import { getInstrumentConfig, OSCILLATOR_ID } from "./instruments";
import { midiToHz, noteToMidi, pickSample, type NoteLike } from "./notes";
import { instrumentSamples, preloadInstrument } from "./samples";

/** Something that can sound notes. The looper's instruments, the keyboards and the chord pages all use this one shape. */
export interface Voice {
  noteOn(note: NoteLike, velocity?: number): void;
  noteOff(note: NoteLike): void;
  allOff(): void;
}

export interface Player extends Voice {
  readonly instrumentId: string;
  setInstrument(id: string): void;
  preload(): Promise<void>;
}

/** A tap let go before its note started (the output was still settling) is heard for this long, not lost. */
const SHORTEST_NOTE = 0.12;
/** a note pressed again while still sounding fades this fast */
const QUICK = 0.03;

export interface PlayerOptions {
  instrumentId?: string;
  /** where the sound goes; the app's main output by default */
  destination?: () => AudioNode;
  /** what plays the samples; the buffer player on the app's context by default */
  backend?: (instrumentId: string) => SampleBackend;
}

/** The oscillator: a triangle at the note, for the "Oscillator" instrument and an id with no config. */
function oscillator(midi: number, velocity: number, at: number, dest: AudioNode): SoundingNote {
  const ctx = getAudioContext();
  const peak = 0.75 * 0.8 * Math.max(0.05, Math.min(1, velocity / 0.8));
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(peak, at + 0.01);
  gain.connect(dest);
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.value = midiToHz(midi);
  osc.connect(gain);
  osc.start(at);
  const ended: (() => void)[] = [];
  osc.onended = () => {
    gain.disconnect();
    ended.forEach((fn) => fn());
  };
  return {
    at,
    release(t, seconds = 0.15) {
      const from = Math.max(t, at + (t < at ? SHORTEST_NOTE : 0));
      gain.gain.cancelScheduledValues(from);
      gain.gain.setValueAtTime(t < at ? peak : gain.gain.value, from);
      gain.gain.linearRampToValueAtTime(0.001, from + seconds);
      osc.stop(from + seconds + 0.05);
    },
    stop: (t) => osc.stop(t),
    onEnded: (fn) => ended.push(fn),
  };
}

/** A player with its own instrument and its own set of sounding notes, sharing the app's samples and AudioContext. */
export function createPlayer(options: PlayerOptions = {}): Player {
  let instrumentId = options.instrumentId ?? "PIANO";
  const dest = options.destination ?? getOutputBus;
  const backendOf = options.backend ?? (() => bufferBackendFor(getAudioContext()));
  const sounding = new Map<number, SoundingNote>();
  /** notes pressed whose sample is still loading */
  const waiting = new Set<number>();

  const keep = (midi: number, note: SoundingNote) => {
    sounding.set(midi, note);
    note.onEnded(() => {
      if (sounding.get(midi) === note) sounding.delete(midi);
    });
  };

  const release = (midi: number, quick = false) => {
    const s = sounding.get(midi);
    if (!s) return;
    sounding.delete(midi);
    const now = getAudioContext().currentTime;
    // replaced or silenced before it sounded: never heard
    if (quick && now < s.at) return s.stop(now);
    s.release(now, quick ? QUICK : undefined);
  };

  const player: Player = {
    get instrumentId() {
      return instrumentId;
    },
    setInstrument(id) {
      player.allOff();
      instrumentId = id;
    },
    preload: () => (instrumentId === OSCILLATOR_ID ? Promise.resolve() : preloadInstrument(instrumentId)),
    noteOn(note, velocity = 0.8) {
      const midi = noteToMidi(note);
      if (midi === null) return;
      void wakeAudio();
      release(midi, true);
      const config = getInstrumentConfig(instrumentId);
      if (!config) return keep(midi, oscillator(midi, velocity, audioStartTime(), dest()));
      // a pad without a sample, or a sampler with none, stays silent
      if (!pickSample(midi, instrumentSamples(instrumentId), config.strict)) return;
      const id = instrumentId;
      const backend = backendOf(id);
      const started = backend.start(id, { midi, at: audioStartTime(), velocity }, dest());
      if (started) return keep(midi, started);
      waiting.add(midi);
      void backend.load(id, midi).then(() => {
        if (!waiting.delete(midi)) return; // released before it loaded
        const late = backend.start(id, { midi, at: audioStartTime(), velocity }, dest());
        if (late) keep(midi, late);
      });
    },
    noteOff(note) {
      const midi = noteToMidi(note);
      if (midi === null) return;
      waiting.delete(midi);
      release(midi);
    },
    allOff() {
      waiting.clear();
      const now = getAudioContext().currentTime;
      [...sounding.keys()].forEach((m) => release(m, now < sounding.get(m)!.at));
    },
  };
  return player;
}

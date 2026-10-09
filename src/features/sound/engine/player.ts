import { getAudioContext, getOutputBus } from "./context";
import { getInstrumentConfig, OSCILLATOR_ID } from "./instruments";
import { closestSample, midiToHz, noteToMidi, type NoteLike } from "./notes";
import { cachedSample, instrumentSamples, loadSample, preloadInstrument } from "./samples";

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

interface Sounding {
  gain: GainNode;
  stop: (at: number) => void;
  release: number;
}

export interface PlayerOptions {
  instrumentId?: string;
  /** where the sound goes; the app's main output by default */
  destination?: () => AudioNode;
}

/** A player with its own instrument and its own set of sounding notes, sharing the app's samples and AudioContext. */
export function createPlayer(options: PlayerOptions = {}): Player {
  let instrumentId = options.instrumentId ?? "PIANO";
  const dest = options.destination ?? getOutputBus;
  const sounding = new Map<number, Sounding>();
  /** notes pressed whose sample is still loading */
  const waiting = new Set<number>();

  const start = (midi: number, velocity: number, buffer: AudioBuffer | null, rate: number, attack: number, release: number) => {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    const gain = ctx.createGain();
    const peak = 0.8 * Math.max(0.05, Math.min(1, velocity / 0.8));
    gain.gain.setValueAtTime(0, t);
    gain.connect(dest());
    if (buffer) {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.playbackRate.value = rate;
      src.connect(gain);
      gain.gain.linearRampToValueAtTime(peak, t + (attack || 0.01));
      src.start(t);
      src.onended = () => {
        gain.disconnect();
        if (sounding.get(midi)?.gain === gain) sounding.delete(midi);
      };
      sounding.set(midi, { gain, release, stop: (at) => src.stop(at) });
    } else {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = midiToHz(midi);
      osc.connect(gain);
      gain.gain.linearRampToValueAtTime(peak * 0.75, t + 0.01);
      osc.start(t);
      osc.onended = () => {
        gain.disconnect();
        if (sounding.get(midi)?.gain === gain) sounding.delete(midi);
      };
      sounding.set(midi, { gain, release: 0.15, stop: (at) => osc.stop(at) });
    }
  };

  const release = (midi: number, quick = false) => {
    const s = sounding.get(midi);
    if (!s) return;
    sounding.delete(midi);
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const r = quick ? 0.03 : s.release;
    s.gain.gain.cancelScheduledValues(now);
    s.gain.gain.setValueAtTime(s.gain.gain.value, now);
    s.gain.gain.linearRampToValueAtTime(0.001, now + r);
    s.stop(now + r + 0.05);
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
      const ctx = getAudioContext();
      if (ctx.state === "suspended") void ctx.resume();
      release(midi, true);
      const config = getInstrumentConfig(instrumentId);
      const match = config ? closestSample(midi, instrumentSamples(instrumentId)) : null;
      if (!config || !match) return start(midi, velocity, null, 1, 0, 0.15);
      const buffer = cachedSample(match.sample.url);
      if (buffer) return start(midi, velocity, buffer, match.rate, config.attack, config.release);
      waiting.add(midi);
      void loadSample(match.sample.url).then((buf) => {
        if (!waiting.delete(midi)) return; // released before it loaded
        start(midi, velocity, buf, match.rate, config.attack, config.release);
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
      [...sounding.keys()].forEach((m) => release(m));
    },
  };
  return player;
}

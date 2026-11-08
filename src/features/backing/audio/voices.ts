import { DRUMS } from "@/features/instruments/model";
import { midiToHz, preloadInstrument, scheduleNote } from "@/features/sound";
import type { NoteEvent, Part } from "../model/arrange";

/**
 * The band's instruments. Each part is a `PartVoice`: told one note and when, it makes the sound. The band never knows how
 * (synth or sample); a new sound is a new voice here, nothing else changes.
 */
export interface PartVoice {
  /** play `ev` at AudioContext time `when`, held `seconds` */
  play(ev: NoteEvent, when: number, seconds: number): void;
  /** load whatever it needs before the first note (samples) */
  prepare?(): Promise<void>;
}

/** The synthesised drum machine the jam and the looper use (nothing to download). */
export function drumVoice(ctx: AudioContext, out: AudioNode): PartVoice {
  const len = Math.floor(ctx.sampleRate * 0.6);
  const noise = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return {
    play(ev, when) {
      const lane = DRUMS.lanes.findIndex((l) => l.id === ev.lane);
      if (lane >= 0) DRUMS.trigger(ctx, out, lane, when, ev.vel, noise, 0);
    },
  };
}

/** A round synth bass: a saw and a sine an octave apart through a closing low-pass, held for the note's length. */
export function bassVoice(ctx: AudioContext, out: AudioNode): PartVoice {
  return {
    play(ev, when, seconds) {
      if (ev.midi === undefined) return;
      const f = midiToHz(ev.midi);
      const hold = Math.max(0.06, seconds * 0.92);
      const amp = ctx.createGain();
      amp.gain.setValueAtTime(0, when);
      amp.gain.linearRampToValueAtTime(0.55 * ev.vel, when + 0.006);
      amp.gain.setTargetAtTime(0.38 * ev.vel, when + 0.02, 0.15);
      amp.gain.setValueAtTime(0.38 * ev.vel, when + hold);
      amp.gain.linearRampToValueAtTime(0.0001, when + hold + 0.05);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.Q.value = 2;
      lp.frequency.setValueAtTime(f * 10, when);
      lp.frequency.exponentialRampToValueAtTime(Math.max(120, f * 3), when + 0.18);
      lp.connect(amp);
      amp.connect(out);
      const saw = ctx.createOscillator();
      saw.type = "sawtooth";
      saw.frequency.value = f;
      const sub = ctx.createOscillator();
      sub.type = "sine";
      sub.frequency.value = f;
      const subGain = ctx.createGain();
      subGain.gain.value = 0.9;
      saw.connect(lp);
      sub.connect(subGain);
      subGain.connect(amp);
      for (const o of [saw, sub]) {
        o.start(when);
        o.stop(when + hold + 0.08);
      }
      saw.onended = () => amp.disconnect();
    },
  };
}

/** Chords on a sampled instrument of the sound engine; `instrument()` is read on every note, so a new style switches it. */
export function keysVoice(out: AudioNode, instrument: () => string): PartVoice {
  return {
    play(ev, when, seconds) {
      if (ev.midi !== undefined) scheduleNote({ instrumentId: instrument(), midi: ev.midi, when, duration: seconds, velocity: ev.vel, destination: out });
    },
    prepare: () => preloadInstrument(instrument()),
  };
}

export type Voices = Record<Part, PartVoice>;

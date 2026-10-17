/**
 * A drone: one held note built from a few detuned oscillators, with a filter, a slow modulator (an LFO on the filter, the pitch or the
 * volume) and a slow fade in and out.
 * The same voice is the Drone instrument of the looper (it sits on the stage and plays through its group) and the drone of the theory
 * pages (it plays straight to the speakers). It is pure Web Audio and imports nothing.
 */

export const NOTE_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"] as const;
export const WAVES = ["sine", "triangle", "sawtooth", "square"] as const;
export type DroneWave = (typeof WAVES)[number];
export const FILTERS = ["lowpass", "bandpass", "highpass"] as const;
export type DroneFilter = (typeof FILTERS)[number];
/** what the modulator moves */
export const MOD_TARGETS = ["off", "filter", "pitch", "volume"] as const;
export type DroneModTarget = (typeof MOD_TARGETS)[number];

export interface DroneParams {
  /** pitch class, 0 = C */
  root: number;
  /** octave of the note (2 = C2) */
  octave: number;
  wave: DroneWave;
  /** level of the fifth above, 0 to 1 */
  fifth: number;
  /** level of the octave above, 0 to 1 */
  upper: number;
  /** level of the octave below, 0 to 1 */
  sub: number;
  /** detune of the doubled voice, in cents (a slow beating, 0 = single voice) */
  detune: number;
  /** filter cut-off, 0 (dark) to 1 (open) */
  tone: number;
  filter: DroneFilter;
  /** filter resonance, 0 (flat) to 1 (a ringing peak at the cut-off) */
  resonance: number;
  /** loudness, 0 to 1 */
  level: number;
  /** what the modulator moves, or off */
  mod: DroneModTarget;
  /** shape of the modulator */
  modWave: DroneWave;
  /** speed of the modulator in Hz */
  modRate: number;
  /** how far the modulator moves its target, 0 to 1 */
  modDepth: number;
}

export const DEFAULT_DRONE: DroneParams = {
  root: 4 /* E, the app-wide default key */, octave: 2, wave: "sawtooth", fifth: 0.5, upper: 0.25, sub: 0.5, detune: 8, tone: 0.45, filter: "lowpass", resonance: 0.2, level: 0.5,
  mod: "filter", modWave: "sine", modRate: 0.15, modDepth: 0.35,
};
export const DRONE_MIN_OCTAVE = 1;
export const DRONE_MAX_OCTAVE = 5;
export const DRONE_FADE = 1.2;
export const DRONE_MIN_RATE = 0.05;
export const DRONE_MAX_RATE = 8;

const clamp = (v: unknown, lo: number, hi: number, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback);

const pick = <T extends string>(list: readonly T[], v: unknown, fallback: T): T => (list.includes(v as T) ? (v as T) : fallback);

/** Check every field of a (possibly saved) value; anything wrong falls back to the default (or to `base`). */
export function clampDrone(p: Partial<DroneParams> | null | undefined, base: DroneParams = DEFAULT_DRONE): DroneParams {
  const root = typeof p?.root === "number" && Number.isFinite(p.root) ? ((Math.round(p.root) % 12) + 12) % 12 : base.root;
  return {
    root,
    octave: Math.round(clamp(p?.octave, DRONE_MIN_OCTAVE, DRONE_MAX_OCTAVE, base.octave)),
    wave: pick(WAVES, p?.wave, base.wave),
    fifth: clamp(p?.fifth, 0, 1, base.fifth),
    upper: clamp(p?.upper, 0, 1, base.upper),
    sub: clamp(p?.sub, 0, 1, base.sub),
    detune: clamp(p?.detune, 0, 30, base.detune),
    tone: clamp(p?.tone, 0, 1, base.tone),
    filter: pick(FILTERS, p?.filter, base.filter),
    resonance: clamp(p?.resonance, 0, 1, base.resonance),
    level: clamp(p?.level, 0, 1, base.level),
    mod: pick(MOD_TARGETS, p?.mod, base.mod),
    modWave: pick(WAVES, p?.modWave, base.modWave),
    modRate: clamp(p?.modRate, DRONE_MIN_RATE, DRONE_MAX_RATE, base.modRate),
    modDepth: clamp(p?.modDepth, 0, 1, base.modDepth),
  };
}

/** Frequency of a note: pitch class and octave (C4 is middle C, A4 = 440 Hz). */
export const droneFrequency = (root: number, octave: number): number => 440 * 2 ** ((12 * (octave + 1) + root - 69) / 12);

/** The name of the note, like "A2". */
export const droneName = (p: Pick<DroneParams, "root" | "octave">): string => `${NOTE_NAMES[((p.root % 12) + 12) % 12]}${p.octave}`;

/** Filter cut-off in Hz for the 0 to 1 tone control: 200 Hz to 6.4 kHz, spaced like pitch. */
export const droneCutoff = (tone: number): number => 200 * 2 ** (5 * Math.min(1, Math.max(0, tone)));

/** Filter Q for the 0 to 1 resonance control: 0.7 (no peak) to about 16 (ringing), spaced evenly to the ear. */
export const droneQ = (resonance: number): number => 0.7 * 2 ** (4.5 * Math.min(1, Math.max(0, resonance)));

/** Widest swings of the modulator at full depth: two octaves of filter each way, half a semitone of pitch, the whole volume. */
export const MOD_FILTER_CENTS = 2400;
export const MOD_PITCH_CENTS = 50;

/** One modulator sample, -1 to 1, at `phase` cycles (the same shapes Web Audio's oscillators make: all start at 0 and rise, but the square). */
export function modShape(wave: DroneWave, phase: number): number {
  const f = phase - Math.floor(phase);
  if (wave === "sine") return Math.sin(2 * Math.PI * f);
  if (wave === "square") return f < 0.5 ? 1 : -1;
  if (wave === "sawtooth") return f < 0.5 ? 2 * f : 2 * f - 2;
  return f < 0.25 ? 4 * f : f < 0.75 ? 2 - 4 * f : 4 * f - 4;
}

const hz = (f: number) => (f >= 1000 ? `${(f / 1000).toFixed(f >= 10000 ? 0 : 1)} kHz` : `${Math.round(f)} Hz`);

/** What the modulator does in words, from its low point to its high point, like "Cut-off 330 Hz – 2.1 kHz". */
export function modRange(p: DroneParams): { label: string; low: string; high: string } {
  if (p.mod === "filter") {
    const f = droneCutoff(p.tone);
    const k = 2 ** ((p.modDepth * MOD_FILTER_CENTS) / 1200);
    return { label: "Cut-off", low: hz(f / k), high: hz(f * k) };
  }
  if (p.mod === "pitch") {
    const c = Math.round(p.modDepth * MOD_PITCH_CENTS);
    return { label: "Pitch", low: `−${c} ¢`, high: `+${c} ¢` };
  }
  if (p.mod === "volume") return { label: "Volume", low: `${Math.round((1 - p.modDepth) * 100)}%`, high: "100%" };
  return { label: "Off", low: "", high: "" };
}

export interface DroneLayer {
  /** frequency in Hz */
  freq: number;
  /** relative level of this oscillator */
  gain: number;
  /** detune in cents */
  cents: number;
}

/**
 * The oscillators of a drone: the root twice (one detuned a little each way, so it breathes), then the fifth, the octave above
 * and the octave below, each only when its level is above zero.
 */
export function droneLayers(p: DroneParams): DroneLayer[] {
  const f = droneFrequency(p.root, p.octave);
  const out: DroneLayer[] = [{ freq: f, gain: 1, cents: p.detune > 0 ? -p.detune : 0 }];
  if (p.detune > 0) out.push({ freq: f, gain: 1, cents: p.detune });
  if (p.fifth > 0) out.push({ freq: f * 1.5, gain: p.fifth, cents: 0 });
  if (p.upper > 0) out.push({ freq: f * 2, gain: p.upper, cents: 0 });
  if (p.sub > 0) out.push({ freq: f / 2, gain: p.sub, cents: 0 });
  return out;
}

const MAX_LAYERS = 5;

/** The sounding drone. Create it with the context and the node it plays into, then `start`, `update` and `stop`. */
export class DroneVoice {
  private amp: GainNode;
  /** the volume modulator works here, so it never fights the fade on `amp` */
  private trem: GainNode;
  private filter: BiquadFilterNode;
  private oscs: { osc: OscillatorNode; gain: GainNode }[] = [];
  private lfo: OscillatorNode | null = null;
  private lfoAmount: GainNode | null = null;
  private tap: AnalyserNode | null = null;
  private params: DroneParams = DEFAULT_DRONE;
  private live = false;
  private endTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private ctx: AudioContext, out: AudioNode) {
    this.amp = ctx.createGain();
    this.amp.gain.value = 0;
    this.filter = ctx.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.Q.value = 0.7;
    this.trem = ctx.createGain();
    this.filter.connect(this.trem).connect(this.amp);
    this.amp.connect(out);
  }

  /** An analyser on the drone's output, for drawing the wave it makes. */
  analyser(): AnalyserNode {
    if (!this.tap) {
      this.tap = this.ctx.createAnalyser();
      this.tap.fftSize = 2048;
      this.amp.connect(this.tap);
    }
    return this.tap;
  }

  get playing() {
    return this.live;
  }

  /** Loudness for a level: each layer is quiet on its own so the sum stays well below clipping. */
  private static peak(p: DroneParams) {
    return 0.7 * p.level;
  }

  private build(p: DroneParams) {
    const layers = droneLayers(p).slice(0, MAX_LAYERS);
    const total = layers.reduce((a, l) => a + l.gain, 0) || 1;
    this.oscs = layers.map((l) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = p.wave;
      osc.frequency.value = l.freq;
      osc.detune.value = l.cents;
      gain.gain.value = l.gain / total;
      osc.connect(gain).connect(this.filter);
      osc.start();
      return { osc, gain };
    });
    this.lfo = this.ctx.createOscillator();
    this.lfoAmount = this.ctx.createGain();
    this.lfo.connect(this.lfoAmount);
    this.lfo.start();
    this.route(p);
  }

  /** Point the modulator at its target, with its shape, speed and depth. */
  private route(p: DroneParams, t = this.ctx.currentTime) {
    const lfo = this.lfo;
    const amount = this.lfoAmount;
    if (!lfo || !amount) return;
    lfo.type = p.modWave;
    lfo.frequency.setTargetAtTime(p.modRate, t, 0.05);
    amount.disconnect();
    const d = p.mod === "off" ? 0 : p.modDepth;
    this.trem.gain.setTargetAtTime(p.mod === "volume" ? 1 - d / 2 : 1, t, 0.05);
    if (p.mod === "filter") {
      amount.gain.value = d * MOD_FILTER_CENTS;
      amount.connect(this.filter.detune);
    } else if (p.mod === "pitch") {
      amount.gain.value = d * MOD_PITCH_CENTS;
      this.oscs.forEach(({ osc }) => amount.connect(osc.detune));
    } else if (p.mod === "volume") {
      amount.gain.value = d / 2;
      amount.connect(this.trem.gain);
    }
  }

  private teardown() {
    this.oscs.forEach(({ osc, gain }) => {
      try {
        osc.stop();
        osc.disconnect();
        gain.disconnect();
      } catch {
        /* already stopped */
      }
    });
    this.oscs = [];
    try {
      this.lfo?.stop();
      this.lfo?.disconnect();
      this.lfoAmount?.disconnect();
    } catch {
      /* already stopped */
    }
    this.lfo = null;
    this.lfoAmount = null;
  }

  /** Start sounding at AudioContext time `at` (now when omitted) with a slow fade in. */
  start(p: DroneParams, at = 0) {
    if (this.endTimer) clearTimeout(this.endTimer);
    this.endTimer = null;
    const t = Math.max(at, this.ctx.currentTime);
    if (!this.live) {
      this.params = p;
      this.teardown();
      this.build(p);
    } else this.update(p);
    this.filter.type = p.filter;
    this.filter.frequency.setValueAtTime(droneCutoff(p.tone), this.ctx.currentTime);
    this.filter.Q.setValueAtTime(droneQ(p.resonance), this.ctx.currentTime);
    this.amp.gain.cancelScheduledValues(t);
    this.amp.gain.setValueAtTime(this.amp.gain.value, t);
    this.amp.gain.linearRampToValueAtTime(DroneVoice.peak(p), t + DRONE_FADE);
    this.live = true;
  }

  /** Change the sound while it plays. A new note glides; a new wave or a layer going on or off rebuilds the oscillators. */
  update(p: DroneParams) {
    const old = this.params;
    this.params = p;
    if (!this.live) return;
    const t = this.ctx.currentTime;
    const sameShape = old.wave === p.wave && droneLayers(old).length === droneLayers(p).length;
    if (sameShape) {
      const layers = droneLayers(p);
      const total = layers.reduce((a, l) => a + l.gain, 0) || 1;
      this.oscs.forEach(({ osc, gain }, i) => {
        const l = layers[i];
        if (!l) return;
        osc.frequency.setTargetAtTime(l.freq, t, 0.15);
        osc.detune.setTargetAtTime(l.cents, t, 0.1);
        gain.gain.setTargetAtTime(l.gain / total, t, 0.1);
      });
      this.route(p, t);
    } else {
      this.teardown();
      this.build(p);
    }
    this.filter.type = p.filter;
    this.filter.frequency.setTargetAtTime(droneCutoff(p.tone), t, 0.1);
    this.filter.Q.setTargetAtTime(droneQ(p.resonance), t, 0.1);
    this.amp.gain.setTargetAtTime(DroneVoice.peak(p), t, 0.1);
  }

  /** Fade out from time `at` (now when omitted), then free the oscillators. */
  stop(at = 0) {
    if (!this.live) return;
    this.live = false;
    const t = Math.max(at, this.ctx.currentTime);
    this.amp.gain.cancelScheduledValues(t);
    this.amp.gain.setValueAtTime(this.amp.gain.value, t);
    this.amp.gain.linearRampToValueAtTime(0, t + DRONE_FADE);
    if (this.endTimer) clearTimeout(this.endTimer);
    this.endTimer = setTimeout(() => {
      if (!this.live) this.teardown();
    }, (t - this.ctx.currentTime + DRONE_FADE + 0.1) * 1000);
  }

  dispose() {
    if (this.endTimer) clearTimeout(this.endTimer);
    this.live = false;
    this.teardown();
    try {
      this.filter.disconnect();
      this.trem.disconnect();
      this.amp.disconnect();
      this.tap?.disconnect();
    } catch {
      /* already disconnected */
    }
  }
}

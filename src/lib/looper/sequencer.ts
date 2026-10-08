import { BASS_PRESETS, DRUM_PRESETS, MAX_BARS, fromRows, emptyCells, stepAt, stepSeconds, stepsInPattern, type Cells, type Preset } from "./sequencerPattern";

/**
 * A step sequencer that plays a synthesised instrument in time with the metronome grid. Nothing is downloaded:
 * every sound is built from oscillators and noise. The instrument is swappable; the default is a drum machine.
 * Like the rest of the looper this file imports nothing outside src/lib/looper.
 */

export interface Lane {
  id: string;
  label: string;
}

export interface Instrument {
  id: string;
  name: string;
  lanes: Lane[];
  presets: Preset[];
  /** Play one hit on `lane` at AudioContext time `t`. velocity is 0.6 for a normal step and 1 for an accent. */
  trigger(ctx: AudioContext, out: AudioNode, lane: number, t: number, velocity: number, noise: AudioBuffer): void;
}

const env = (ctx: AudioContext, out: AudioNode, t: number, peak: number, decay: number) => {
  const g = ctx.createGain();
  g.gain.setValueAtTime(peak, t);
  g.gain.exponentialRampToValueAtTime(0.0005, t + decay);
  g.connect(out);
  return g;
};
const noiseSrc = (ctx: AudioContext, buf: AudioBuffer, t: number, dur: number) => {
  const s = ctx.createBufferSource();
  s.buffer = buf;
  s.start(t, Math.random() * 0.2, dur);
  return s;
};
const filt = (ctx: AudioContext, type: BiquadFilterType, f: number, q = 0.7) => {
  const b = ctx.createBiquadFilter();
  b.type = type;
  b.frequency.value = f;
  b.Q.value = q;
  return b;
};
const tone = (ctx: AudioContext, type: OscillatorType, f0: number, f1: number, t: number, dur: number, to: AudioNode) => {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.5);
  o.connect(to);
  o.start(t);
  o.stop(t + dur + 0.02);
};

export const DRUMS: Instrument = {
  id: "drums",
  name: "Drum machine",
  lanes: [
    { id: "kick", label: "Kick" },
    { id: "snare", label: "Snare" },
    { id: "clap", label: "Clap" },
    { id: "hat", label: "Hat" },
    { id: "open", label: "Open hat" },
    { id: "tom", label: "Tom" },
  ],
  presets: DRUM_PRESETS,
  trigger(ctx, out, lane, t, v, noise) {
    switch (lane) {
      case 0: {
        tone(ctx, "sine", 160, 42, t, 0.38, env(ctx, out, t, 1.0 * v, 0.4));
        break;
      }
      case 1: {
        const g = env(ctx, out, t, 0.7 * v, 0.2);
        const hp = filt(ctx, "highpass", 1200);
        noiseSrc(ctx, noise, t, 0.25).connect(hp);
        hp.connect(g);
        tone(ctx, "triangle", 220, 160, t, 0.12, env(ctx, out, t, 0.5 * v, 0.12));
        break;
      }
      case 2: {
        for (const d of [0, 0.011, 0.024]) {
          const g = env(ctx, out, t + d, 0.5 * v, d === 0.024 ? 0.16 : 0.02);
          const bp = filt(ctx, "bandpass", 1500, 1.2);
          noiseSrc(ctx, noise, t + d, 0.2).connect(bp);
          bp.connect(g);
        }
        break;
      }
      case 3:
      case 4: {
        const g = env(ctx, out, t, 0.35 * v, lane === 3 ? 0.05 : 0.28);
        const hp = filt(ctx, "highpass", 7000);
        noiseSrc(ctx, noise, t, 0.35).connect(hp);
        hp.connect(g);
        break;
      }
      default:
        tone(ctx, "sine", 210, 95, t, 0.3, env(ctx, out, t, 0.8 * v, 0.3));
    }
  },
};

/** A simple saw bass over an A minor pentatonic ladder, lowest note first. */
const BASS_SEMIS = [0, 3, 5, 7, 10, 12, 15, 17];
const NOTE_NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
const BASS_ROOT_MIDI = 33; // A1
export const BASS: Instrument = {
  id: "bass",
  name: "Bass synth",
  lanes: BASS_SEMIS.map((s, i) => ({ id: `n${i}`, label: NOTE_NAMES[(BASS_ROOT_MIDI + s) % 12] + Math.floor((BASS_ROOT_MIDI + s) / 12 - 1) })).reverse(),
  presets: BASS_PRESETS.map((p) => ({ ...p, rows: [...p.rows].reverse() })),
  trigger(ctx, out, lane, t, v) {
    const semis = BASS_SEMIS[BASS_SEMIS.length - 1 - lane];
    const f = 440 * 2 ** ((BASS_ROOT_MIDI + semis - 69) / 12);
    const lp = filt(ctx, "lowpass", 700, 4);
    lp.frequency.setValueAtTime(1400, t);
    lp.frequency.exponentialRampToValueAtTime(260, t + 0.2);
    lp.connect(env(ctx, out, t, 0.5 * v, 0.24));
    tone(ctx, "sawtooth", f, f, t, 0.22, lp);
  },
};

export const INSTRUMENTS: Instrument[] = [DRUMS, BASS];

export interface SequencerState {
  /** "auto": the bus of the group it sits in, or master when it sits outside every group. "record": heard on master and fed to the recorder. */
  dest: "auto" | "record";
  /** place of its circle on the looping stage */
  x: number;
  y: number;
  instrumentId: string;
  bars: number;
  /** started by the person: it sounds in time with the metronome, joining and leaving on a beat */
  playing: boolean;
  cells: Cells;
}

const LOOKAHEAD = 0.12;
const TICK_MS = 25;

const findInstrument = (id: string) => INSTRUMENTS.find((i) => i.id === id) ?? DRUMS;

export class Sequencer {
  state: SequencerState = { dest: "auto", x: 100, y: 100, instrumentId: DRUMS.id, bars: 1, playing: false, cells: fromRows(DRUM_PRESETS[0].rows) };
  /** every voice goes into `out`; `toSpeakers` carries it to the master or a group bus, `toRecord` is what the mixer taps */
  out: GainNode | null = null;
  toSpeakers: GainNode | null = null;
  toRecord: GainNode | null = null;
  private ctx: AudioContext | null = null;
  private noise: AudioBuffer | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private anchor = 0;
  private next = 0;

  /** getTiming gives the metronome's beat length and bar length at any moment, so the grid and the tempo are shared */
  constructor(readonly id: string, private getTiming: () => { beatSeconds: number; beatsPerBar: number }, private onChange: () => void) {}

  get instrument() {
    return findInstrument(this.state.instrumentId);
  }

  get running() {
    return this.timer !== null;
  }

  get steps() {
    return stepsInPattern(this.state.bars, this.getTiming().beatsPerBar);
  }

  attach(ctx: AudioContext) {
    this.ctx = ctx;
    this.out = ctx.createGain();
    this.out.gain.value = 0.5;
    this.toSpeakers = ctx.createGain();
    this.toRecord = ctx.createGain();
    this.toRecord.gain.value = 0;
    this.out.connect(this.toSpeakers);
    this.out.connect(this.toRecord);
    const len = Math.floor(ctx.sampleRate * 0.6);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
  }

  /** The part worth saving. */
  serialize(): Omit<SequencerState, "playing"> {
    const { playing: _p, ...rest } = this.state;
    void _p;
    return rest;
  }

  /** Load a saved state, checking every field. */
  load(j: Partial<SequencerState> | null | undefined) {
    if (!j) return;
    const inst = findInstrument(String(j.instrumentId));
    const lanes = inst.lanes.length;
    const cells = Array.isArray(j.cells) && j.cells.length === lanes ? j.cells.map((row) => Array.from({ length: 96 }, (_, i) => (Number(row?.[i]) === 2 ? 2 : Number(row?.[i]) === 1 ? 1 : 0))) : fromRows(inst.presets[0].rows);
    this.state = { dest: j.dest === "record" ? "record" : "auto", x: Number.isFinite(j.x) ? Number(j.x) : this.state.x, y: Number.isFinite(j.y) ? Number(j.y) : this.state.y, instrumentId: inst.id, bars: j.bars === 2 ? 2 : 1, playing: false, cells };
  }

  private update(patch: Partial<SequencerState>) {
    this.state = { ...this.state, ...patch };
    this.onChange();
  }

  /** Cycle a step: off, normal, accent, off. */
  cycle(lane: number, step: number) {
    const cells = this.state.cells.map((r) => r.slice());
    cells[lane][step] = (cells[lane][step] + 1) % 3;
    this.update({ cells });
  }

  setInstrument(id: string) {
    const inst = findInstrument(id);
    if (inst.id === this.state.instrumentId) return;
    this.update({ instrumentId: inst.id, cells: fromRows(inst.presets[0].rows) });
  }

  loadPreset(id: string) {
    const p = this.instrument.presets.find((x) => x.id === id);
    if (p) this.update({ cells: fromRows(p.rows) });
  }

  clearPattern() {
    this.update({ cells: emptyCells(this.instrument.lanes.length) });
  }

  setBars(bars: number) {
    this.update({ bars: Math.min(MAX_BARS, Math.max(1, Math.round(bars))) });
  }

  setDest(dest: "auto" | "record") {
    this.update({ dest });
  }

  setPos(x: number, y: number) {
    this.update({ x, y });
  }

  /** Mark it started or stopped (the engine does the timing). */
  setPlaying(on: boolean) {
    this.state = { ...this.state, playing: on };
    this.onChange();
  }

  private startAt = 0;
  private stopAtTime: number | null = null;

  /** Run with step 0 at `anchor` (the metronome's beat 1). Steps before `startAt` stay silent, so it can join on a beat. Call again to move the grid. */
  start(anchor: number, startAt = 0) {
    if (!this.ctx) return;
    this.anchor = anchor;
    this.startAt = startAt;
    this.stopAtTime = null;
    this.next = Math.ceil((this.ctx.currentTime - anchor) / stepSeconds(this.getTiming().beatSeconds) - 1e-9);
    if (!this.timer) this.timer = setInterval(() => this.schedule(), TICK_MS);
    this.schedule();
    this.onChange();
  }

  get stopping() {
    return this.stopAtTime !== null;
  }

  cancelStop() {
    this.stopAtTime = null;
  }

  /** Let it play until time `t` (a beat line), then stop. */
  stopAt(t: number) {
    this.stopAtTime = t;
  }

  stop() {
    this.stopAtTime = null;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.onChange();
  }

  /** Current step for the display, or null when stopped. */
  position(): number | null {
    if (!this.ctx || !this.running) return null;
    return stepAt(this.ctx.currentTime, this.anchor, this.getTiming().beatSeconds, this.steps);
  }

  private schedule() {
    const ctx = this.ctx;
    if (!ctx || !this.out || !this.noise) return;
    const { beatSeconds } = this.getTiming();
    const dt = stepSeconds(beatSeconds);
    const steps = this.steps;
    while (this.anchor + this.next * dt < ctx.currentTime + LOOKAHEAD) {
      const t = this.anchor + this.next * dt;
      if (this.stopAtTime !== null && t >= this.stopAtTime - 1e-6) {
        this.stop();
        return;
      }
      if (t >= ctx.currentTime - 0.005 && t >= this.startAt - 1e-6) {
        const step = ((this.next % steps) + steps) % steps;
        this.state.cells.forEach((row, lane) => {
          const v = row[step];
          if (v) this.instrument.trigger(ctx, this.out!, lane, t, v === 2 ? 1 : 0.6, this.noise!);
        });
      }
      this.next++;
    }
  }

  dispose() {
    this.stop();
    try {
      [this.out, this.toSpeakers, this.toRecord].forEach((n) => n?.disconnect());
    } catch {
      /* already disconnected */
    }
    this.out = null;
    this.toSpeakers = null;
    this.toRecord = null;
    this.ctx = null;
  }
}

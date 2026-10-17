import { clampDrone, type DroneParams } from "../drone/drone";
import { BASS, DRONE_ID, DRUMS, Sequencer, type SequencerState } from "../sequencer/sequencer";
import { clampTempo, nextBeat } from "./clock";

export const JAM_PARTS = ["drone", "drums", "bass"] as const;
export type JamPart = (typeof JAM_PARTS)[number];
export const BEATS_PER_BAR = 4;

export interface JamPartView {
  state: SequencerState;
  /** sounding now (it may be on its way out: `stopping`) */
  running: boolean;
  stopping: boolean;
  steps: number;
}
export interface JamSnapshot {
  bpm: number;
  parts: Record<JamPart, JamPartView>;
}
export interface JamSaved { bpm: number; parts: Partial<Record<JamPart, Partial<SequencerState>>> }

/**
 * Drone, drums and bass on one clock, for a page: what the `Jam` component shows. No React. The first part to start sets the grid;
 * the others join on its next beat, and stop on the next beat too. The bass plays in the drone's key. Audio is made only after
 * `attach` (call it from a person's click).
 */
export class JamRig {
  private seqs!: Record<JamPart, Sequencer>;
  private bpm = clampTempo(NaN);
  private anchor: number | null = null;
  private ctx: AudioContext | null = null;
  private listeners = new Set<() => void>();
  private snap: JamSnapshot;

  constructor() {
    const timing = () => ({ beatSeconds: this.beat, beatsPerBar: BEATS_PER_BAR });
    const make = (id: JamPart, instrument: string) => {
      const q = new Sequencer(id, timing, () => this.changed());
      q.setInstrument(instrument);
      return q;
    };
    this.seqs = { drone: make("drone", DRONE_ID), drums: make("drums", DRUMS.id), bass: make("bass", BASS.id) };
    this.snap = this.build();
  }

  private get beat() {
    return 60 / this.bpm;
  }

  private build(): JamSnapshot {
    const view = (q: Sequencer): JamPartView => ({ state: q.state, running: q.running, stopping: q.stopping, steps: q.steps });
    return { bpm: this.bpm, parts: { drone: view(this.seqs.drone), drums: view(this.seqs.drums), bass: view(this.seqs.bass) } };
  }

  private changed() {
    if (!this.seqs) return; // while the constructor makes them
    this.seqs.bass.key = this.seqs.drone.state.drone.root;
    this.snap = this.build();
    this.listeners.forEach((f) => f());
  }

  subscribe = (f: () => void) => {
    this.listeners.add(f);
    return () => this.listeners.delete(f);
  };
  snapshot = () => this.snap;

  /** Load what `save` gave, checking every field. */
  load(saved: Partial<JamSaved> | null | undefined) {
    if (!saved) return;
    this.bpm = clampTempo(Number(saved.bpm));
    for (const p of JAM_PARTS) {
      const s = saved.parts?.[p];
      if (s && s.instrumentId === this.seqs[p].state.instrumentId) this.seqs[p].load(s);
    }
    this.changed();
  }

  /** An older save of the drone alone. */
  loadDrone(p: Partial<DroneParams>) {
    this.seqs.drone.setDrone(clampDrone(p));
  }

  save(): JamSaved {
    return { bpm: this.bpm, parts: { drone: this.seqs.drone.serialize(), drums: this.seqs.drums.serialize(), bass: this.seqs.bass.serialize() } };
  }

  /** Make the sound: every part into `out`. Call from a person's click, once the context is running. */
  attach(ctx: AudioContext, out: AudioNode) {
    if (this.ctx) return;
    this.ctx = ctx;
    for (const p of JAM_PARTS) {
      this.seqs[p].attach(ctx);
      this.seqs[p].toSpeakers!.connect(out);
    }
  }

  get attached() {
    return this.ctx !== null;
  }

  private sounding = (p: JamPart) => this.seqs[p].running && !this.seqs[p].stopping;

  start(parts: readonly JamPart[]) {
    const ctx = this.ctx;
    if (!ctx) return;
    if (this.anchor === null || !JAM_PARTS.some(this.sounding)) this.anchor = ctx.currentTime + 0.06;
    const at = nextBeat(ctx.currentTime + 0.02, this.anchor, this.beat);
    for (const p of parts) {
      const q = this.seqs[p];
      q.setPlaying(true);
      if (q.stopping) q.cancelStop();
      else if (!q.running) q.start(this.anchor, at);
    }
  }

  stop(parts: readonly JamPart[]) {
    const ctx = this.ctx;
    for (const p of parts) {
      const q = this.seqs[p];
      q.setPlaying(false);
      if (ctx && q.running && this.anchor !== null) q.stopAt(nextBeat(ctx.currentTime + 0.02, this.anchor, this.beat));
    }
  }

  /** A new tempo moves the grid: the parts that play start again together on it. */
  setTempo(bpm: number) {
    this.bpm = clampTempo(bpm);
    const going = JAM_PARTS.filter(this.sounding);
    if (this.ctx && going.length) {
      const a = this.ctx.currentTime + 0.05;
      this.anchor = a;
      going.forEach((p) => this.seqs[p].start(a, a));
    }
    this.changed();
  }

  setDrone(patch: Partial<DroneParams>) {
    this.seqs.drone.setDrone(patch);
  }
  loadPreset(p: JamPart, id: string) {
    this.seqs[p].loadPreset(id);
  }
  setBars(p: JamPart, bars: number) {
    this.seqs[p].setBars(bars);
  }
  clear(p: JamPart) {
    this.seqs[p].clearPattern();
  }
  setStep(p: JamPart, lane: number, step: number, value: number) {
    this.seqs[p].setStep(lane, step, value);
  }

  position(p: JamPart) {
    return this.seqs[p].position();
  }
  instrument(p: JamPart) {
    return this.seqs[p].instrument;
  }
  key() {
    return this.seqs.bass.key;
  }
  droneAnalyser() {
    return this.ctx ? this.seqs.drone.droneAnalyser() : null;
  }

  /** Silence and let go of the audio; `attach` can make it again. */
  dispose() {
    JAM_PARTS.forEach((p) => {
      this.seqs[p].setPlaying(false);
      this.seqs[p].dispose();
    });
    this.anchor = null;
    this.ctx = null;
  }
}

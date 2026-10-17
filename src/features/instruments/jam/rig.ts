import { ClickTrack, DEFAULT_CLICK, beatIndexAt, beatOf, clampClick, type ClickParams } from "../click/click";
import { clampDrone, type DroneParams } from "../drone/drone";
import { BASS, DRONE_ID, DRUMS, Sequencer, type SequencerState } from "../sequencer/sequencer";
import { clampTempo, nextBeat } from "./clock";
import { InputPool, JamLoop, type InputDevice, type LoopConfig, type LoopView } from "./loops";
import { MAX_LOOPS } from "./take";

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
  loops: LoopView[];
  /** the input devices the browser lists (names only once the microphone is allowed) */
  devices: InputDevice[];
  /** a loop holds sound or records: the tempo stays as it is */
  tempoLocked: boolean;
  /** the metronome click on the same grid (`setClick`) */
  click: { on: boolean; volume: number };
}
export interface JamSaved { bpm: number; parts: Partial<Record<JamPart, Partial<SequencerState>>>; loops?: Partial<LoopConfig>[]; click?: { volume?: number } }

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
  private loops: JamLoop[] = [];
  private pool: InputPool | null = null;
  private out: AudioNode | null = null;
  private devices: InputDevice[] = [];
  private onDeviceChange = () => void this.refreshDevices();
  private clickTrack: ClickTrack | null = null;
  private clickOn = false;
  private clickVolume = DEFAULT_CLICK.volume;

  constructor() {
    const timing = () => ({ beatSeconds: this.beat, beatsPerBar: BEATS_PER_BAR });
    const make = (id: JamPart, instrument: string) => {
      const q = new Sequencer(id, timing, () => this.changed());
      q.setInstrument(instrument);
      return q;
    };
    this.seqs = { drone: make("drone", DRONE_ID), drums: make("drums", DRUMS.id), bass: make("bass", BASS.id) };
    this.loops = [this.makeLoop(null)];
    this.snap = this.build();
  }

  private get beat() {
    return 60 / this.bpm;
  }

  private build(): JamSnapshot {
    const view = (q: Sequencer): JamPartView => ({ state: q.state, running: q.running, stopping: q.stopping, steps: q.steps });
    const now = this.ctx?.currentTime ?? 0;
    return {
      bpm: this.bpm,
      parts: { drone: view(this.seqs.drone), drums: view(this.seqs.drums), bass: view(this.seqs.bass) },
      loops: this.loops.map((l) => l.view(now)),
      devices: this.devices,
      tempoLocked: this.tempoLocked,
      click: { on: this.clickOn, volume: this.clickVolume },
    };
  }

  private makeLoop(config: Partial<LoopConfig> | null) {
    const l = new JamLoop(config, () => this.changed());
    if (this.ctx && this.pool && this.out) l.attach(this.ctx, this.pool, this.out);
    return l;
  }

  private get tempoLocked() {
    return this.loops.some((l) => l.buffer || l.take);
  }

  private get bar() {
    return this.beat * BEATS_PER_BAR;
  }

  private changed() {
    if (!this.seqs || !this.loops) return; // while the constructor makes them
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
    if (saved.click) this.clickVolume = clampClick({ volume: saved.click.volume }).volume;
    if (Array.isArray(saved.loops) && saved.loops.length && !this.loops.some((l) => l.buffer || l.take)) {
      this.loops.forEach((l) => l.dispose());
      this.loops = saved.loops.slice(0, MAX_LOOPS).map((c) => this.makeLoop(c));
    }
    this.changed();
  }

  /** An older save of the drone alone. */
  loadDrone(p: Partial<DroneParams>) {
    this.seqs.drone.setDrone(clampDrone(p));
  }

  save(): JamSaved {
    return { bpm: this.bpm, parts: { drone: this.seqs.drone.serialize(), drums: this.seqs.drums.serialize(), bass: this.seqs.bass.serialize() }, loops: this.loops.map((l) => l.config), click: { volume: this.clickVolume } };
  }

  /** Make the sound: every part into `out`. Call from a person's click, once the context is running. */
  attach(ctx: AudioContext, out: AudioNode) {
    if (this.ctx) return;
    this.ctx = ctx;
    this.out = out;
    this.pool = new InputPool(ctx);
    for (const p of JAM_PARTS) {
      this.seqs[p].attach(ctx);
      this.seqs[p].toSpeakers!.connect(out);
    }
    this.loops.forEach((l) => l.attach(ctx, this.pool!, out));
    this.clickTrack = new ClickTrack(ctx, out);
    navigator.mediaDevices?.addEventListener?.("devicechange", this.onDeviceChange);
  }

  get attached() {
    return this.ctx !== null;
  }

  private sounding = (p: JamPart) => this.seqs[p].running && !this.seqs[p].stopping;
  /** something keeps the grid: a part or a loop sounds, or a take is on its way */
  private busy = () => this.clickOn || JAM_PARTS.some(this.sounding) || this.loops.some((l) => l.take || (l.running && !l.stopping));

  /** The grid to start on: the running one, or a new one from now on (every loop's bar 1 moves to it). */
  private grid(lead = 0.06): number {
    const ctx = this.ctx!;
    if (this.anchor === null || !this.busy()) {
      this.anchor = ctx.currentTime + lead;
      this.loops.forEach((l) => (l.origin = this.anchor!));
    }
    return this.anchor;
  }

  /** Start parts, and with `withLoops` every loop that holds sound. */
  start(parts: readonly JamPart[], withLoops = false) {
    const ctx = this.ctx;
    if (!ctx) return;
    const anchor = this.grid();
    const at = nextBeat(ctx.currentTime + 0.02, anchor, this.beat);
    for (const p of parts) {
      const q = this.seqs[p];
      q.setPlaying(true);
      if (q.stopping) q.cancelStop();
      else if (!q.running) q.start(anchor, at);
    }
    if (withLoops) this.loops.filter((l) => l.buffer && !l.take).forEach((l) => this.playLoop(l, at));
  }

  stop(parts: readonly JamPart[], withLoops = false) {
    const ctx = this.ctx;
    const at = ctx && this.anchor !== null ? nextBeat(ctx.currentTime + 0.02, this.anchor, this.beat) : 0;
    for (const p of parts) {
      const q = this.seqs[p];
      q.setPlaying(false);
      if (ctx && q.running && this.anchor !== null) q.stopAt(at);
    }
    if (withLoops) this.loops.forEach((l) => this.stopLoop(l, at));
  }

  private playLoop(l: JamLoop, at: number) {
    l.on = true;
    l.play(at);
    this.changed();
  }

  private stopLoop(l: JamLoop, at: number) {
    if (l.take) l.cancelTake();
    l.on = false;
    if (l.running && !l.stopping) l.stopAt(Math.max(at, (this.ctx?.currentTime ?? 0) + 0.01));
    this.changed();
  }

  private loop(id: string) {
    return this.loops.find((l) => l.config.id === id);
  }

  /** Start or stop one loop on the next beat. */
  toggleLoop(id: string) {
    const l = this.loop(id), ctx = this.ctx;
    if (!l || !ctx || !l.buffer) return;
    if (l.on) return this.stopLoop(l, this.anchor === null ? ctx.currentTime : nextBeat(ctx.currentTime + 0.02, this.anchor, this.beat));
    const anchor = this.grid();
    this.playLoop(l, nextBeat(ctx.currentTime + 0.02, anchor, this.beat));
  }

  /**
   * Record a loop: open its input (from the person's click), then take its bars from the next bar line. With nothing playing the
   * grid starts with a one-bar count-in of clicks. Pressed again before the take is in, it is called off.
   */
  async record(id: string) {
    const l = this.loop(id), ctx = this.ctx;
    if (!l || !ctx) return;
    if (l.take) return l.cancelTake();
    if (!(await l.connect())) return;
    void this.refreshDevices();
    const now = ctx.currentTime;
    let start: number;
    if (this.anchor !== null && this.busy()) start = nextBeat(now + 0.05, this.anchor, this.bar);
    else {
      start = this.grid(0.1 + this.bar);
      this.countIn(start);
    }
    l.arm(start, start + l.config.bars * this.bar);
  }

  /** A bar of clicks before `start`, the first one higher. */
  private countIn(start: number) {
    const ctx = this.ctx!, out = this.out!;
    for (let i = 0; i < BEATS_PER_BAR; i++) {
      const t = start - this.bar + i * this.beat;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = i === 0 ? 1500 : 1000;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.3, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + 0.08);
    }
  }

  /** Open a loop's input without recording, so its meter shows the signal. */
  connectLoop(id: string) {
    const l = this.loop(id);
    if (l) void l.connect().then((ok) => { if (ok) void this.refreshDevices(); });
  }

  setLoop(id: string, patch: Partial<Omit<LoopConfig, "id">>) {
    const l = this.loop(id);
    // during a take only the effects and the monitor change (they are heard, and taken, at once)
    if (!l || (l.take && Object.keys(patch).some((k) => k !== "effects" && k !== "monitor"))) return;
    // the length is the recording's once there is one
    if (l.buffer && patch.bars !== undefined) patch = { ...patch, bars: l.config.bars };
    l.setConfig(patch);
  }

  clearLoop(id: string) {
    this.loop(id)?.clear();
  }

  /** A new empty loop on the same input as the last one. */
  addLoop() {
    if (this.loops.length >= MAX_LOOPS) return;
    const last = this.loops[this.loops.length - 1]?.config;
    this.loops = [...this.loops, this.makeLoop(last ? { deviceId: last.deviceId, channel: last.channel, bars: last.bars, effects: last.effects } : null)];
    this.changed();
  }

  removeLoop(id: string) {
    const l = this.loop(id);
    if (!l || this.loops.length <= 1) return;
    l.dispose();
    this.loops = this.loops.filter((x) => x !== l);
    this.changed();
  }

  loopPosition(id: string) {
    return this.loop(id)?.position() ?? null;
  }
  loopLevel(id: string) {
    return this.loop(id)?.level() ?? 0;
  }

  /** List the input devices (no prompt: names show once the microphone is allowed). */
  async refreshDevices() {
    try {
      const list = (await navigator.mediaDevices?.enumerateDevices?.()) ?? [];
      const next = list.filter((d) => d.kind === "audioinput" && d.deviceId && d.deviceId !== "default").map((d, i) => ({ id: d.deviceId, label: d.label || `Input ${i + 1}` }));
      if (next.length === this.devices.length && next.every((d, i) => d.id === this.devices[i].id && d.label === this.devices[i].label)) return;
      this.devices = next;
      this.changed();
    } catch {
      /* no device listing here */
    }
  }

  /** A new tempo moves the grid: the parts that play (and the click) start again together on it. */
  setTempo(bpm: number) {
    // recorded loops are so many bars of the tempo they were taken at
    if (this.tempoLocked) return;
    this.bpm = clampTempo(bpm);
    const going = JAM_PARTS.filter(this.sounding);
    if (this.ctx && (going.length || this.clickOn)) {
      const a = this.ctx.currentTime + 0.05;
      this.anchor = a;
      going.forEach((p) => this.seqs[p].start(a, a));
      if (this.clickOn) this.clickTrack?.start(this.clickParams, a, a);
    }
    this.changed();
  }

  private get clickParams(): ClickParams {
    return { bpm: this.bpm, beatsPerBar: BEATS_PER_BAR, volume: this.clickVolume };
  }

  /** Start the metronome click on the grid (on its next beat when something plays), or stop it at once. */
  setClick(on: boolean) {
    const ctx = this.ctx;
    if (on && ctx && this.clickTrack) {
      const anchor = this.grid();
      this.clickTrack.start(this.clickParams, anchor, nextBeat(ctx.currentTime + 0.02, anchor, this.beat));
      this.clickOn = true;
    } else {
      this.clickTrack?.stop();
      this.clickOn = false;
    }
    this.changed();
  }

  setClickVolume(volume: number) {
    this.clickVolume = clampClick({ volume }).volume;
    this.clickTrack?.set(this.clickParams);
    this.changed();
  }

  /** The beat of the bar sounding now (0 = beat 1) while anything keeps the grid, else null. */
  beatNow(): number | null {
    if (!this.ctx || this.anchor === null || !this.busy()) return null;
    const i = beatIndexAt(this.ctx.currentTime, this.anchor, this.bpm);
    return i < 0 ? null : beatOf(i, BEATS_PER_BAR);
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
    this.loops.forEach((l) => l.dispose());
    this.pool?.dispose();
    this.clickTrack?.dispose();
    this.clickTrack = null;
    this.clickOn = false;
    navigator.mediaDevices?.removeEventListener?.("devicechange", this.onDeviceChange);
    this.anchor = null;
    this.ctx = null;
    this.out = null;
    this.pool = null;
    // the settings stay; the recorded sound goes with the audio
    this.loops = this.loops.map((l) => this.makeLoop(l.config));
  }
}

import { nextBeat } from "../jam/clock";
import { BEATS_PER_BAR, type GridFollower, type GridHost } from "../jam/rig";
import { InputPool, JamLoop, type AppInput, type InputDevice, type LoopConfig, type LoopView } from "./loops";
import { MAX_LOOPS } from "./take";

export interface LoopDeckSnapshot {
  loops: LoopView[];
  /** the input devices the browser lists (names only once the microphone is allowed) */
  devices: InputDevice[];
}

/**
 * The looper on its own: up to `MAX_LOOPS` loops, each recording its bars from its input and playing them round on a rig's clock. No
 * React. It follows a `JamRig` (`rig.follow(deck)`): the rig tells it where the grid's beat 1 is and the tempo, starts and stops it
 * with its parts (Play all), and asks it whether it keeps the grid or locks the tempo. Audio is made only after `attach` (from a
 * person's click); without a rig it keeps its settings and records nothing.
 */
export class LoopDeck implements GridFollower {
  /** set by the rig this deck follows: called whenever the loops change */
  changed?: () => void;
  /** set by the rig this deck follows: its grid, to join or to start */
  host?: GridHost | null;
  private loops: JamLoop[] = [];
  private ctx: AudioContext | null = null;
  private out: AudioNode | null = null;
  private pool: InputPool | null = null;
  private unfollowApp: (() => void) | null = null;
  private devices: InputDevice[] = [];
  private onDeviceChange = () => void this.refreshDevices();
  private listeners = new Set<() => void>();
  private snap: LoopDeckSnapshot;
  /** the rig's grid: its beat 1 (AudioContext time), or null before one, and the beat's length */
  private anchor: number | null = null;
  private beat = 0.5;

  constructor() {
    this.loops = [this.makeLoop(null)];
    this.snap = this.build();
  }

  private get bar() {
    return this.beat * BEATS_PER_BAR;
  }

  private build(): LoopDeckSnapshot {
    const now = this.ctx?.currentTime ?? 0;
    return { loops: this.loops.map((l) => l.view(now)), devices: this.devices };
  }

  private notify() {
    if (!this.loops) return; // while the constructor makes them
    this.snap = this.build();
    this.listeners.forEach((f) => f());
    this.changed?.();
  }

  subscribe = (f: () => void) => {
    this.listeners.add(f);
    return () => this.listeners.delete(f);
  };
  snapshot = () => this.snap;

  private makeLoop(config: Partial<LoopConfig> | null) {
    const l = new JamLoop(config, () => this.notify());
    if (this.ctx && this.pool && this.out) l.attach(this.ctx, this.pool, this.out);
    return l;
  }

  /** Load saved loop settings (never the sound), unless a loop holds sound or records. */
  load(loops?: Partial<LoopConfig>[] | null) {
    if (!Array.isArray(loops) || !loops.length || this.locksTempo()) return;
    this.loops.forEach((l) => l.dispose());
    this.loops = loops.slice(0, MAX_LOOPS).map((c) => this.makeLoop(c));
    this.notify();
  }

  save(): Partial<LoopConfig>[] {
    return this.loops.map((l) => l.config);
  }

  /**
   * Make the sound into `out`. Call from a person's click, once the context is running. `app` is the app's one input, which a loop
   * without its own device records (and follows when it changes).
   */
  attach(ctx: AudioContext, out: AudioNode, app: AppInput | null = null) {
    if (this.ctx) return;
    this.ctx = ctx;
    this.out = out;
    this.pool = new InputPool(ctx, app);
    this.unfollowApp = app?.subscribe(() => this.loops.forEach((l) => l.followAppInput())) ?? null;
    this.loops.forEach((l) => l.attach(ctx, this.pool!, out));
    navigator.mediaDevices?.addEventListener?.("devicechange", this.onDeviceChange);
  }

  // ---- GridFollower: what the rig asks ----

  /** a loop sounds, or a take is on its way */
  busy() {
    return this.loops.some((l) => l.take || (l.running && !l.stopping));
  }

  /** a loop plays or is set to, or a take is on its way */
  on() {
    return this.loops.some((l) => l.on || !!l.take);
  }

  /** a loop holds sound or records: recorded loops are so many bars of the tempo they were taken at */
  locksTempo() {
    return this.loops.some((l) => l.buffer || l.take);
  }

  /** A new grid: every loop's bar 1 moves to it. */
  onGrid(anchor: number, beatSeconds: number) {
    this.anchor = anchor;
    this.beat = beatSeconds;
    this.loops.forEach((l) => (l.origin = anchor));
  }

  onTempo(bpm: number) {
    this.beat = 60 / bpm;
  }

  /** Play all: every loop that holds sound. */
  startAt(at: number) {
    this.loops.filter((l) => l.buffer && !l.take).forEach((l) => this.playLoop(l, at));
  }

  stopAt(at: number) {
    this.loops.forEach((l) => this.stopLoop(l, at));
  }

  // ---- the loops ----

  private playLoop(l: JamLoop, at: number) {
    l.on = true;
    l.play(at);
    this.notify();
  }

  private stopLoop(l: JamLoop, at: number) {
    if (l.take) l.cancelTake();
    l.on = false;
    if (l.running && !l.stopping) l.stopAt(Math.max(at, (this.ctx?.currentTime ?? 0) + 0.01));
    this.notify();
  }

  private loop(id: string) {
    return this.loops.find((l) => l.config.id === id);
  }

  /** Start or stop one loop on the next beat. */
  toggleLoop(id: string) {
    const l = this.loop(id), ctx = this.ctx, host = this.host;
    if (!l || !ctx || !host || !l.buffer) return;
    if (l.on) this.stopLoop(l, this.anchor === null ? ctx.currentTime : nextBeat(ctx.currentTime + 0.02, this.anchor, this.beat));
    else {
      const anchor = host.grid();
      this.playLoop(l, nextBeat(ctx.currentTime + 0.02, anchor, this.beat));
    }
  }

  /**
   * Record a loop: open its input (from the person's click), then take its bars from the next bar line. With nothing playing the
   * grid starts with a one-bar count-in of clicks. Pressed again before the take is in, it is called off.
   */
  async record(id: string) {
    const l = this.loop(id), ctx = this.ctx, host = this.host;
    if (!l || !ctx || !host) return;
    if (l.take) return l.cancelTake();
    if (!(await l.connect())) return;
    void this.refreshDevices();
    const now = ctx.currentTime;
    let start: number;
    if (this.anchor !== null && host.busy()) start = nextBeat(now + 0.05, this.anchor, this.bar);
    else {
      start = host.grid(0.1 + this.bar);
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
    this.notify();
  }

  removeLoop(id: string) {
    const l = this.loop(id);
    if (!l || this.loops.length <= 1) return;
    l.dispose();
    this.loops = this.loops.filter((x) => x !== l);
    this.notify();
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
      this.notify();
    } catch {
      /* no device listing here */
    }
  }

  /** Silence and let go of the audio; `attach` can make it again. The settings stay; the recorded sound goes with the audio. */
  dispose() {
    this.loops.forEach((l) => l.dispose());
    this.pool?.dispose();
    this.unfollowApp?.();
    this.unfollowApp = null;
    navigator.mediaDevices?.removeEventListener?.("devicechange", this.onDeviceChange);
    this.anchor = null;
    this.ctx = null;
    this.out = null;
    this.pool = null;
    this.loops = this.loops.map((l) => this.makeLoop(l.config));
    this.notify();
  }
}

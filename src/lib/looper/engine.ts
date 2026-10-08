import { assemble, effectiveGain, loopOffset, msToFrames, nextBoundary, peaks, quantUnitFrames, quantiseLength, type Chunk } from "./frames";
import { Metronome, type MetronomeSettings } from "./metronome";
import { Sequencer, type SequencerState } from "./sequencer";
import { ScalePiano, clampState as clampScalePiano, type ScalePianoState } from "./scalePiano";
import { LoopBus, peakOf } from "./buses";
import { EFFECT_DEFS, defaultParams, clampParams, sanitiseEffects, type EffectKind, type EffectSpec } from "./effects";
import { GROUP_COLOURS, clampPoint, clampRect, containingGroup, defaultGroups, defaultSpot, type GroupLayout } from "./layout";
import { InputMixer, describeError, type InputInfo } from "./mixer";
import { RECORDER_PROCESSOR_NAME, recorderWorkletUrl } from "./recorderWorklet";

export type { InputInfo } from "./mixer";
export type { InputMode, Quantise } from "./frames";
export { BPM_RANGE, type MetronomeSettings } from "./metronome";
export { INSTRUMENTS, type Instrument, type SequencerState } from "./sequencer";
export { SCALES, NOTE_NAMES, KEY_ROWS, MIN_OCTAVE, MAX_OCTAVE, buildKeyMap, scalePitchClasses, noteName, type ScalePianoState, type KeyNote } from "./scalePiano";
export { EFFECT_DEFS, EFFECT_KINDS, type EffectKind, type EffectSpec, type ParamDef } from "./effects";
export { STAGE_W, STAGE_H, LOOP_R, GROUP_COLOURS } from "./layout";

/** A coloured group of loops. Loops whose circle centre is inside the rectangle play through the group's bus and its effects. */
export interface GroupInfo extends GroupLayout {
  name: string;
  colour: string;
  volume: number;
  muted: boolean;
  effects: EffectSpec[];
}

/**
 * A small multi-channel looper built on the Web Audio API.
 *
 * - The first recording (on any channel) is free length and defines the loop length.
 * - Every later recording is armed, starts on the next loop boundary and lasts exactly one loop.
 * - All channels play in sync from one shared loop clock.
 * - What gets recorded comes from the input mixer (mixer.ts): any number of inputs with mute and solo.
 *
 * This file is independent of the rest of Music Kit: it imports nothing outside src/lib/looper.
 * Anything app-specific (for example the piano) is handed in through `LooperOptions`.
 */

export interface LooperOptions {
  /** Use this AudioContext instead of creating one. Needed when an extra source lives in another part of the app. */
  getContext?: () => AudioContext;
  /** An extra audio source (a node in the same context), such as the piano's output. */
  getExternalSource?: () => AudioNode;
  /** Name shown for that source, e.g. "Piano". */
  externalLabel?: string;
}

export type ChannelState = "empty" | "armed" | "recording" | "playing";

export interface ChannelInfo {
  id: number;
  name: string;
  state: ChannelState;
  volume: number;
  muted: boolean;
  solo: boolean;
  peaks: Float32Array | null;
  /** place of the circle on the looping stage */
  x: number;
  y: number;
  /** the group whose rectangle holds the circle, or null for the main bus */
  groupId: string | null;
  /** false when the person has stopped this loop (it restarts on a beat); a recorded loop is active by default */
  active: boolean;
}

export interface InputDevice {
  id: string;
  label: string;
}

export interface LooperSnapshot {
  status: "idle" | "starting" | "ready" | "error";
  error: string | null;
  /** audio inputs the browser lists */
  devices: InputDevice[];
  /** the input strips of the mixer */
  inputs: InputInfo[];
  /** name of the extra source the app provided (the piano), or null */
  extraLabel: string | null;
  latencyMs: number;
  /** metronome settings, whether it is clicking now, and whether the tempo is locked by a loop or a take */
  metronome: MetronomeSettings & { running: boolean; locked: boolean; manual: boolean };
  /** every step sequencer: its pattern and destination, whether it is sounding, and how many steps the pattern has */
  /** every scale piano: its key, scale and octave */
  scalePianos: (ScalePianoState & { id: string; name: string })[];
  sequencers: (SequencerState & { id: string; name: string; running: boolean; stopping: boolean; steps: number; groupId: string | null })[];
  playing: boolean;
  loopSeconds: number | null;
  channels: ChannelInfo[];
  groups: GroupInfo[];
  masterVolume: number;
  sampleRate: number;
}

interface ChannelRuntime {
  info: ChannelInfo;
  buffer: AudioBuffer | null;
  gain: GainNode | null;
  source: AudioBufferSourceNode | null;
}

interface Capture {
  channel: number;
  /** first frame to keep (after latency compensation) */
  startFrame: number;
  /** last frame (exclusive) for loop-synced captures, null for the free-length first take */
  endFrame: number | null;
  chunks: Chunk[];
  lastFrame: number;
  /** true once the capture window has begun */
  started: boolean;
  /** frames to round a free-length first take to (a beat or a bar), 0 for none */
  unit: number;
  /** the person has pressed stop and the take is running on to the next beat or bar line */
  stopping: boolean;
}

export const MAX_CHANNELS = 8;
export const MAX_FIRST_TAKE_SECONDS = 120;
export { MAX_INPUTS } from "./mixer";

const LAYOUT_KEY = "musickit.looper.layout";
const groupName = (i: number) => `Group ${String.fromCharCode(65 + (i % 26))}`;
const defaultGroupInfos = (): GroupInfo[] => defaultGroups().map((g, i) => ({ ...g, name: groupName(i), colour: GROUP_COLOURS[i % GROUP_COLOURS.length], volume: 1, muted: false, effects: [] }));

export class LooperEngine {
  private ctx: AudioContext | null = null;
  private ownsContext = true;
  private worklet: AudioWorkletNode | null = null;
  private analyser: AnalyserNode | null = null;
  private master: GainNode | null = null;
  private workletReady = false;
  private levelBuf: Float32Array<ArrayBuffer> | null = null;
  /** the input strips: mixer.add / remove / setMode / toggleMute / toggleSolo ... */
  readonly mixer: InputMixer;

  private groups: GroupInfo[] = defaultGroupInfos();
  private buses = new Map<string, LoopBus>();
  private fxCounter = 0;
  private groupCounter = 5;
  private masterVolume = 1;
  private masterMeter: AnalyserNode | null = null;
  private masterBuf: Float32Array<ArrayBuffer> | null = null;
  private runtimes: ChannelRuntime[] = [];
  private loopLength: number | null = null;
  private loopStart = 0;
  private playing = true;
  private capture: Capture | null = null;
  /** AudioContext time of beat 1 of the metronome grid */
  private gridAnchor = 0;
  /** true when the loop length is a whole number of beats or bars, so loop restarts stay on the grid */
  private loopOnGrid = false;
  readonly metronome: Metronome;
  /** the step sequencers (a drum machine to start with), by id */
  private sequencers = new Map<string, Sequencer>();
  private seqCounter = 0;
  /** the scale pianos (computer keys locked to a key and scale), by id */
  private scalePianos = new Map<string, ScalePiano>();
  private spCounter = 0;
  /** the person started the metronome by hand, with no take or loop running */
  private metroManual = false;

  private listeners = new Set<() => void>();
  private snap: LooperSnapshot;

  constructor(private options: LooperOptions = {}) {
    this.mixer = new InputMixer({
      getExtraSource: options.getExternalSource,
      extraLabel: options.externalLabel,
      getSequencerSource: (id) => this.sequencers.get(id)?.toRecord,
      getScalePianoSource: (id) => this.scalePianos.get(id)?.toRecord,
      onRemoved: (info) => {
        if (info.kind === "scalepiano" && info.sourceId) this.disposeScalePiano(info.sourceId);
        if (info.kind === "sequencer" && info.sourceId) this.disposeSequencer(info.sourceId);
      },
      onChange: () => {
        this.syncSequencer();
        this.emit();
      },
    });
    this.metronome = new Metronome(() => this.emit());
    this.runtimes = [0, 1, 2, 3].map((i) => this.makeChannel(i));
    this.snap = this.buildSnapshot();
  }

  /* ------------------------------------------------------------------ store */

  subscribe = (cb: () => void) => {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  };

  getSnapshot = () => this.snap;

  private meta = { status: "idle" as LooperSnapshot["status"], error: null as string | null, devices: [] as InputDevice[], latencyMs: 0 };

  private buildSnapshot(patch: Partial<typeof this.meta> = {}): LooperSnapshot {
    this.meta = { ...this.meta, ...patch };
    return {
      ...this.meta,
      inputs: this.mixer.list(),
      metronome: { ...this.metronome.settings, running: this.metronome.running, locked: this.loopLength !== null || this.capture !== null, manual: this.metroManual },
      sequencers: this.mixer.list().filter((i) => i.kind === "sequencer" && i.sourceId && this.sequencers.has(i.sourceId)).map((i) => {
        const q = this.sequencers.get(i.sourceId!)!;
        return { ...q.state, id: q.id, name: i.name, running: q.running, stopping: q.stopping, steps: q.steps, groupId: containingGroup(this.groups, q.state.x, q.state.y) };
      }),
      scalePianos: this.mixer.list().filter((i) => i.kind === "scalepiano" && i.sourceId && this.scalePianos.has(i.sourceId)).map((i) => ({ ...this.scalePianos.get(i.sourceId!)!.state, id: i.sourceId!, name: i.name })),
      extraLabel: this.options.getExternalSource ? this.options.externalLabel ?? "Extra source" : null,
      playing: this.playing,
      loopSeconds: this.loopLength,
      channels: this.runtimes.map((r) => ({ ...r.info })),
      masterVolume: this.masterVolume,
      groups: this.groups.map((g) => ({ ...g, effects: g.effects.map((e) => ({ ...e, params: { ...e.params } })) })),
      sampleRate: this.ctx?.sampleRate ?? 0,
    };
  }

  private emit(patch: Partial<typeof this.meta> = {}) {
    this.snap = this.buildSnapshot(patch);
    this.listeners.forEach((l) => l());
  }

  /** Load saved settings. Call once from the browser. */
  init() {
    this.mixer.restore();
    this.metronome.restore();
    this.restoreSequencers();
    this.restoreScalePianos();
    this.restoreLayout();
  }

  /** Change metronome settings. The tempo and bar length stay put while a loop exists or a take is running, so everything stays in time. */
  setMetronome(patch: Partial<MetronomeSettings>) {
    const next = { ...patch };
    if (this.loopLength !== null || this.capture) {
      delete next.bpm;
      delete next.beatsPerBar;
    }
    this.metronome.set(next);
    this.syncSequencer(true);
  }

  /** Beat position for the display, or null when the metronome is not running. */
  getBeat() {
    return this.metronome.position();
  }

  /* ------------------------------------------------------------------ scale pianos */

  private spKey = "musickit.looper.scalePianos";

  private attachScalePiano(p: ScalePiano) {
    if (!this.ctx || !this.master) return;
    p.attach(this.ctx);
    p.toSpeakers?.connect(this.master);
  }

  private makeScalePiano(id: string): ScalePiano {
    const p = new ScalePiano(id, () => {
      this.saveScalePianos();
      this.emit();
    });
    this.scalePianos.set(id, p);
    this.attachScalePiano(p);
    return p;
  }

  private restoreScalePianos() {
    let saved: Record<string, Partial<ScalePianoState>> = {};
    try {
      saved = JSON.parse(window.localStorage.getItem(this.spKey) ?? "{}") ?? {};
    } catch {
      /* ignore a corrupt save */
    }
    for (const id of this.mixer.scalePianoIds()) {
      if (this.scalePianos.has(id)) continue;
      this.makeScalePiano(id).load(saved[id]);
      this.spCounter = Math.max(this.spCounter, Number(id.replace(/\D/g, "")) || 0);
    }
    this.emit();
  }

  private saveScalePianos() {
    try {
      const data: Record<string, ScalePianoState> = {};
      this.scalePianos.forEach((p, id) => (data[id] = p.serialize()));
      window.localStorage.setItem(this.spKey, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }

  /** Add a scale piano and its mixer strip. It is heard on the master bus and recorded through its strip. */
  async addScalePiano(): Promise<string | null> {
    const id = `p${++this.spCounter}`;
    this.makeScalePiano(id);
    const n = this.mixer.scalePianoIds().length;
    const added = await this.mixer.add({ kind: "scalepiano", name: n === 0 ? "Scale Piano" : `Scale Piano ${n + 1}`, sourceId: id });
    if (added === null) {
      this.disposeScalePiano(id);
      return null;
    }
    this.saveScalePianos();
    return id;
  }

  private disposeScalePiano(id: string) {
    this.scalePianos.get(id)?.dispose();
    this.scalePianos.delete(id);
    this.saveScalePianos();
    this.emit();
  }

  getScalePiano(id: string): ScalePiano | undefined {
    return this.scalePianos.get(id);
  }

  setScalePiano(id: string, patch: Partial<ScalePianoState>) {
    this.scalePianos.get(id)?.set(clampScalePiano({ ...this.scalePianos.get(id)!.state, ...patch }));
  }

  /* ------------------------------------------------------------------ sequencers */

  private seqKey = "musickit.looper.sequencers";

  private makeSequencer(id: string): Sequencer {
    const q = new Sequencer(id, () => ({ beatSeconds: this.metronome.period, beatsPerBar: this.metronome.settings.beatsPerBar }), () => {
      this.saveSequencers();
      this.emit();
    });
    const spot = defaultSpot(this.groups, this.runtimes.length + this.sequencers.size);
    q.state = { ...q.state, x: spot.x, y: spot.y };
    this.sequencers.set(id, q);
    if (this.ctx) {
      q.attach(this.ctx);
      this.routeSequencer(q);
    }
    return q;
  }

  private restoreSequencers() {
    let saved: Record<string, Partial<SequencerState>> = {};
    try {
      saved = JSON.parse(window.localStorage.getItem(this.seqKey) ?? "{}") ?? {};
    } catch {
      /* ignore a corrupt save */
    }
    for (const id of this.mixer.sequencerIds()) {
      if (this.sequencers.has(id)) continue;
      this.makeSequencer(id).load(saved[id]);
      this.seqCounter = Math.max(this.seqCounter, Number(id.replace(/\D/g, "")) || 0);
    }
    this.emit();
  }

  private saveSequencers() {
    try {
      const data: Record<string, unknown> = {};
      this.sequencers.forEach((q, id) => (data[id] = q.serialize()));
      window.localStorage.setItem(this.seqKey, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }

  /** Add a sequencer and its mixer strip. Its sound goes to the master bus until you send it elsewhere. */
  async addSequencer(): Promise<string | null> {
    const id = `s${++this.seqCounter}`;
    const q = this.makeSequencer(id);
    const n = this.mixer.sequencerIds().length;
    const added = await this.mixer.add({ kind: "sequencer", name: n === 0 ? "Drums" : `Drums ${n + 1}`, sourceId: id });
    if (added === null) {
      this.disposeSequencer(id);
      return null;
    }
    void q;
    this.saveSequencers();
    return id;
  }

  private disposeSequencer(id: string) {
    this.sequencers.get(id)?.dispose();
    this.sequencers.delete(id);
    this.saveSequencers();
    this.emit();
  }

  /** Where a sequencer's sound goes: the bus of the group it sits in (master when outside every group), or the recorder as well as master. */
  private routeSequencer(q: Sequencer) {
    if (!q.toSpeakers || !q.toRecord || !this.master) return;
    const gid = containingGroup(this.groups, q.state.x, q.state.y);
    try {
      q.toSpeakers.disconnect();
    } catch {
      /* not connected yet */
    }
    q.toSpeakers.connect((q.state.dest === "auto" ? this.busFor(gid)?.input : null) ?? this.master);
    q.toRecord.gain.value = q.state.dest === "record" ? 1 : 0;
  }

  getSequencer(id: string): Sequencer | undefined {
    return this.sequencers.get(id);
  }

  setSequencerDest(id: string, dest: "auto" | "record") {
    const q = this.sequencers.get(id);
    if (!q) return;
    q.setDest(dest);
    this.routeSequencer(q);
  }

  moveSequencer(id: string, x: number, y: number) {
    const q = this.sequencers.get(id);
    if (!q) return;
    const c = clampPoint(x, y);
    q.setPos(c.x, c.y);
    this.routeSequencer(q);
    this.emit();
  }

  /** Start or stop a sequencer. It joins and leaves on the next beat of the metronome, so you can stop one and start another cleanly. */
  setSequencerPlaying(id: string, on: boolean) {
    const q = this.sequencers.get(id);
    if (!q || !this.ctx) return;
    if (on && !this.gridActive()) this.gridAnchor = this.ctx.currentTime + 0.05;
    q.setPlaying(on);
    this.syncMetronome();
    this.syncSequencer();
  }

  /** Make every sequencer follow its play switch: start on the next beat, or stop on the next beat. `restart` re-joins at once after the grid moved. */
  private syncSequencer(restart = false) {
    const when = this.ctx ? this.beatBoundary() : 0;
    this.sequencers.forEach((q) => {
      if (q.state.playing) {
        if (restart || !q.running) q.start(this.gridAnchor, restart ? 0 : when);
        else if (q.stopping) q.cancelStop();
      } else if (q.running && !q.stopping) {
        q.stopAt(when);
      }
    });
  }

  /** The next beat line of the metronome grid. */
  private beatBoundary(): number {
    const ctx = this.ctx;
    if (!ctx) return 0;
    return nextBoundary(ctx.currentTime, this.gridAnchor, this.metronome.period, 0.03);
  }

  /** Start or stop one loop on the next beat. A stopped loop keeps its recording. */
  setLoopActive(id: number, on: boolean) {
    const rt = this.runtimes[id];
    if (!rt || !this.ctx || !rt.buffer) return;
    rt.info.active = on;
    if (on) {
      if (!this.playing) {
        this.setPlaying(true);
        return;
      }
      this.startChannel(rt, null, this.beatBoundary());
    } else if (rt.source) {
      try {
        rt.source.stop(this.beatBoundary());
      } catch {
        /* already stopped */
      }
      rt.source = null;
    }
    this.syncMetronome();
    this.emit();
  }

  /** Start or stop everything in a group, loops and sequencers, on the next beat. */
  setGroupActive(groupId: string, on: boolean) {
    this.runtimes.forEach((r) => {
      if (r.info.groupId === groupId && r.buffer) this.setLoopActive(r.info.id, on);
    });
    this.sequencers.forEach((q, id) => {
      if (containingGroup(this.groups, q.state.x, q.state.y) === groupId) this.setSequencerPlaying(id, on);
    });
  }

  private gridActive() {
    return this.capture !== null || (this.playing && this.loopLength !== null) || this.metroManual || [...this.sequencers.values()].some((q) => q.state.playing);
  }

  /** Start or stop the metronome on its own (and the sequencer with it). It also runs by itself while recording or playing. */
  toggleMetronome() {
    if (!this.ctx) return;
    this.metroManual = !this.metroManual;
    if (this.metroManual && this.loopLength === null && this.capture === null) this.gridAnchor = this.ctx.currentTime + 0.05 + this.metronome.settings.countInBars * this.metronome.settings.beatsPerBar * this.metronome.period;
    this.syncMetronome(true);
    this.emit();
  }

  private syncMetronome(restart = false) {
    const on = this.gridActive();
    if (!on) this.metronome.stop();
    else if (restart || !this.metronome.running) this.metronome.start(this.gridAnchor);
    this.syncSequencer(restart);
  }

  /* ------------------------------------------------------------------ start up */

  /** Ask the browser for microphone access once, so it will name the devices, then list them. Nothing keeps listening. */
  async requestDeviceAccess(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) return;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      s.getTracks().forEach((t) => t.stop());
    } catch {
      /* denied: the list will have generic names */
    }
    await this.refreshDevices().catch(() => undefined);
  }

  /** Start the audio engine and open every audio input that is set up in the mixer. */
  async enable(): Promise<void> {
    if (this.meta.status === "starting") return;
    this.emit({ status: "starting", error: null });
    try {
      this.ensureContext();
      await this.ctx!.resume();
      if (!this.workletReady) {
        await this.ctx!.audioWorklet.addModule(recorderWorkletUrl());
        this.workletReady = true;
      }
      this.createWorklet();
      await this.mixer.open();
      await this.refreshDevices().catch(() => undefined);
      navigator.mediaDevices?.addEventListener?.("devicechange", () => void this.refreshDevices());
      this.emit({ status: "ready" });
    } catch (e) {
      this.emit({ status: "error", error: describeError(e) });
    }
  }

  private ensureContext() {
    if (this.ctx) return;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (this.options.getContext) {
      this.ctx = this.options.getContext();
      this.ownsContext = false;
    } else {
      this.ctx = new Ctor({ latencyHint: "interactive" });
      this.ownsContext = true;
    }
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.masterVolume;
    this.master.connect(ctx.destination);
    this.masterMeter = ctx.createAnalyser();
    this.masterMeter.fftSize = 512;
    this.master.connect(this.masterMeter);
    this.masterBuf = new Float32Array(this.masterMeter.fftSize) as Float32Array<ArrayBuffer>;
    this.groups.forEach((g) => this.makeBus(g));
    this.sequencers.forEach((q) => {
      q.attach(ctx);
      this.routeSequencer(q);
    });
    this.scalePianos.forEach((p) => this.attachScalePiano(p));
    this.mixer.attach(ctx, this.master);
    this.metronome.attach(ctx, ctx.destination);
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.mixer.output!.connect(this.analyser);
    this.levelBuf = new Float32Array(this.analyser.fftSize) as Float32Array<ArrayBuffer>;
    // a rough latency guess for the audio interface; the user can fine-tune it
    const guess = Math.round(((ctx.baseLatency || 0) + ((ctx as unknown as { outputLatency?: number }).outputLatency || 0)) * 1000);
    this.meta.latencyMs = guess;
  }

  private createWorklet() {
    if (this.worklet || !this.ctx || !this.mixer.output) return;
    const ctx = this.ctx;
    this.worklet = new AudioWorkletNode(ctx, RECORDER_PROCESSOR_NAME, { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 2, channelCountMode: "explicit", outputChannelCount: [1] });
    this.worklet.port.onmessage = (ev: MessageEvent<Chunk>) => this.onChunk(ev.data);
    // keep the worklet pulled by the graph without making a sound
    const mute = ctx.createGain();
    mute.gain.value = 0;
    this.mixer.output.connect(this.worklet);
    this.worklet.connect(mute);
    mute.connect(ctx.destination);
  }

  async refreshDevices(): Promise<void> {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const all = await navigator.mediaDevices.enumerateDevices();
    const devices = all.filter((d) => d.kind === "audioinput" && d.deviceId !== "default" && d.deviceId !== "communications").map((d, i) => ({ id: d.deviceId, label: d.label || `Input ${i + 1}` }));
    this.emit({ devices });
  }

  setLatencyMs(ms: number) {
    this.emit({ latencyMs: Math.max(0, Math.min(500, ms)) });
  }

  /** Peak level of everything about to be recorded, 0..1. Cheap enough to call every animation frame. */
  getLevel(): number {
    if (!this.analyser || !this.levelBuf) return 0;
    this.analyser.getFloatTimeDomainData(this.levelBuf);
    let m = 0;
    for (let i = 0; i < this.levelBuf.length; i++) {
      const v = Math.abs(this.levelBuf[i]);
      if (v > m) m = v;
    }
    return m;
  }

  /** Peak level of one input strip. */
  /** Peak level leaving a group's bus. */
  getBusLevel(id: string): number {
    return this.buses.get(id)?.level() ?? 0;
  }

  /** Peak level of everything going to the speakers. */
  getMasterLevel(): number {
    if (!this.masterMeter || !this.masterBuf) return 0;
    return peakOf(this.masterMeter, this.masterBuf);
  }

  setMasterVolume(v: number) {
    this.masterVolume = Math.min(1.5, Math.max(0, v));
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.02);
    this.emit();
  }

  getInputLevel(id: number): number {
    return this.mixer.getLevel(id);
  }

  /** Position inside the loop, 0..1, or null when there is no loop or it is stopped. */
  getPosition(): number | null {
    if (!this.ctx || !this.loopLength || !this.playing) return null;
    return loopOffset(this.ctx.currentTime, this.loopStart, this.loopLength) / this.loopLength;
  }

  /* ------------------------------------------------------------------ channels */

  private makeChannel(id: number): ChannelRuntime {
    const spot = defaultSpot(this.groups, id);
    return {
      info: { id, name: `Loop ${id + 1}`, state: "empty", volume: 0.8, muted: false, solo: false, peaks: null, x: spot.x, y: spot.y, groupId: containingGroup(this.groups, spot.x, spot.y), active: true },
      buffer: null,
      gain: null,
      source: null,
    };
  }

  addChannel() {
    if (this.runtimes.length >= MAX_CHANNELS) return;
    this.runtimes.push(this.makeChannel(this.runtimes.length));
    this.saveLayout();
    this.emit();
  }

  /* ------------------------------------------------------------------ groups, buses and effects */

  private busFor(groupId: string | null): LoopBus | null {
    return groupId ? this.buses.get(groupId) ?? null : null;
  }

  private makeBus(g: GroupInfo) {
    if (!this.ctx || !this.master || this.buses.has(g.id)) return;
    const bus = new LoopBus(this.ctx, this.master);
    bus.setVolume(g.muted ? 0 : g.volume);
    bus.setEffects(g.effects);
    this.buses.set(g.id, bus);
  }

  /** Send a loop's playback to its group's bus (or straight to the speakers when it sits outside every group). */
  private connectChannel(rt: ChannelRuntime) {
    if (!rt.gain || !this.master) return;
    try {
      rt.gain.disconnect();
    } catch {
      /* not connected yet */
    }
    rt.gain.connect(this.busFor(rt.info.groupId)?.input ?? this.master);
  }

  /** Work out which group each loop is in after anything moved. */
  private assignGroups() {
    this.runtimes.forEach((r) => {
      const gid = containingGroup(this.groups, r.info.x, r.info.y);
      if (gid !== r.info.groupId) {
        r.info.groupId = gid;
        this.connectChannel(r);
      }
    });
  }

  private restoreLayout() {
    try {
      const raw = window.localStorage.getItem(LAYOUT_KEY);
      if (!raw) return;
      const j = JSON.parse(raw) as { groups?: Partial<GroupInfo>[]; spots?: Record<string, { x: number; y: number }> };
      if (Array.isArray(j.groups) && j.groups.length <= 8) {
        const groups: GroupInfo[] = j.groups.map((g, i) => {
          const r = clampRect({ x: Number(g.x) || 0, y: Number(g.y) || 0, w: Number(g.w) || 300, h: Number(g.h) || 300 });
          return { id: typeof g.id === "string" ? g.id : `g${i + 1}`, ...r, name: typeof g.name === "string" ? g.name.slice(0, 24) : groupName(i), colour: GROUP_COLOURS.includes(String(g.colour)) ? String(g.colour) : GROUP_COLOURS[i % GROUP_COLOURS.length], volume: Math.min(1.5, Math.max(0, Number(g.volume) || 1)), muted: g.muted === true, effects: sanitiseEffects(g.effects) };
        });
        this.groups = groups;
        this.groupCounter = groups.reduce((m, g) => Math.max(m, Number(g.id.replace(/\D/g, "")) || 0), 0);
        this.fxCounter = groups.reduce((m, g) => g.effects.reduce((n, e) => Math.max(n, Number(e.id.replace(/\D/g, "")) || 0), m), 0);
      }
      this.runtimes.forEach((r) => {
        const sp = j.spots?.[String(r.info.id)];
        if (sp && Number.isFinite(sp.x) && Number.isFinite(sp.y)) {
          const c = clampPoint(sp.x, sp.y);
          r.info.x = c.x;
          r.info.y = c.y;
        }
      });
      this.assignGroups();
      this.emit();
    } catch {
      /* ignore a corrupt save */
    }
  }

  private saveLayout() {
    try {
      const spots: Record<string, { x: number; y: number }> = {};
      this.runtimes.forEach((r) => (spots[r.info.id] = { x: r.info.x, y: r.info.y }));
      window.localStorage.setItem(LAYOUT_KEY, JSON.stringify({ groups: this.groups, spots }));
    } catch {
      /* ignore */
    }
  }

  private layoutChanged() {
    this.assignGroups();
    this.sequencers.forEach((q) => this.routeSequencer(q));
    this.saveLayout();
    this.emit();
  }

  moveChannel(id: number, x: number, y: number) {
    const rt = this.runtimes[id];
    if (!rt) return;
    const c = clampPoint(x, y);
    rt.info.x = c.x;
    rt.info.y = c.y;
    this.layoutChanged();
  }

  addGroup(): string | null {
    if (this.groups.length >= 8) return null;
    const n = ++this.groupCounter;
    const i = this.groups.length;
    const r = clampRect({ x: 30 + i * 24, y: 30 + i * 24, w: 300, h: 260 });
    const g: GroupInfo = { id: `g${n}`, ...r, name: groupName(i), colour: GROUP_COLOURS[i % GROUP_COLOURS.length], volume: 1, muted: false, effects: [] };
    this.groups.push(g);
    this.makeBus(g);
    this.layoutChanged();
    return g.id;
  }

  removeGroup(id: number | string) {
    const g = this.groups.find((x) => x.id === id);
    if (!g) return;
    this.groups = this.groups.filter((x) => x !== g);
    this.buses.get(g.id)?.dispose();
    this.buses.delete(g.id);
    this.runtimes.forEach((r) => {
      if (r.info.groupId === g.id) {
        r.info.groupId = null;
        this.connectChannel(r);
      }
    });
    this.layoutChanged();
  }

  updateGroup(id: string, patch: Partial<Pick<GroupInfo, "name" | "colour" | "volume" | "muted" | "x" | "y" | "w" | "h">>) {
    const g = this.groups.find((x) => x.id === id);
    if (!g) return;
    if (patch.name !== undefined) g.name = patch.name.slice(0, 24);
    if (patch.colour !== undefined && GROUP_COLOURS.includes(patch.colour)) g.colour = patch.colour;
    if (patch.volume !== undefined) g.volume = Math.min(1.5, Math.max(0, patch.volume));
    if (patch.muted !== undefined) g.muted = patch.muted;
    if (patch.volume !== undefined || patch.muted !== undefined) this.buses.get(id)?.setVolume(g.muted ? 0 : g.volume);
    if (patch.x !== undefined || patch.y !== undefined || patch.w !== undefined || patch.h !== undefined) {
      Object.assign(g, clampRect({ x: patch.x ?? g.x, y: patch.y ?? g.y, w: patch.w ?? g.w, h: patch.h ?? g.h }));
    }
    this.layoutChanged();
  }

  /** Draw a group above the others, so it wins where groups overlap. */
  bringGroupToFront(id: string) {
    const i = this.groups.findIndex((x) => x.id === id);
    if (i < 0 || i === this.groups.length - 1) return;
    this.groups.push(...this.groups.splice(i, 1));
    this.layoutChanged();
  }

  private fxChanged(g: GroupInfo) {
    this.buses.get(g.id)?.setEffects(g.effects);
    this.saveLayout();
    this.emit();
  }

  addEffect(groupId: string, kind: EffectKind, post = false) {
    const g = this.groups.find((x) => x.id === groupId);
    if (!g || g.effects.length >= 6 || !EFFECT_DEFS[kind]) return;
    g.effects.push({ id: `fx${++this.fxCounter}`, kind, bypass: false, post, params: defaultParams(kind) });
    this.fxChanged(g);
  }

  removeEffect(groupId: string, fxId: string) {
    const g = this.groups.find((x) => x.id === groupId);
    if (!g) return;
    g.effects = g.effects.filter((e) => e.id !== fxId);
    this.fxChanged(g);
  }

  setEffectParam(groupId: string, fxId: string, key: string, value: number) {
    const g = this.groups.find((x) => x.id === groupId);
    const e = g?.effects.find((x) => x.id === fxId);
    if (!g || !e) return;
    e.params = clampParams(e.kind, { ...e.params, [key]: value });
    this.fxChanged(g);
  }

  /** Put an effect before (false) or after (true) the group's fader. */
  setEffectPost(groupId: string, fxId: string, post: boolean) {
    const g = this.groups.find((x) => x.id === groupId);
    const e = g?.effects.find((x) => x.id === fxId);
    if (!g || !e) return;
    e.post = post;
    this.fxChanged(g);
  }

  toggleEffectBypass(groupId: string, fxId: string) {
    const g = this.groups.find((x) => x.id === groupId);
    const e = g?.effects.find((x) => x.id === fxId);
    if (!g || !e) return;
    e.bypass = !e.bypass;
    this.fxChanged(g);
  }

  removeLastChannel() {
    if (this.runtimes.length <= 1) return;
    const last = this.runtimes[this.runtimes.length - 1];
    if (last.info.state !== "empty" || this.capture?.channel === last.info.id) return;
    this.runtimes.pop();
    this.saveLayout();
    this.emit();
  }

  rename(id: number, name: string) {
    this.runtimes[id].info.name = name;
    this.emit();
  }

  setVolume(id: number, v: number) {
    this.runtimes[id].info.volume = v;
    this.applyGains();
    this.emit();
  }

  toggleMute(id: number) {
    const c = this.runtimes[id].info;
    c.muted = !c.muted;
    this.applyGains();
    this.emit();
  }

  toggleSolo(id: number) {
    const c = this.runtimes[id].info;
    c.solo = !c.solo;
    this.applyGains();
    this.emit();
  }

  private applyGains() {
    const any = this.runtimes.some((r) => r.info.solo);
    this.runtimes.forEach((r) => {
      if (r.gain) r.gain.gain.value = effectiveGain(r.info, any);
    });
  }

  /* ------------------------------------------------------------------ recording */

  /** Record (or re-record) a channel. The first take is free length; later takes are one loop long. */
  record(id: number) {
    if (!this.ctx || this.meta.status !== "ready") return;
    if (this.capture) return; // one take at a time
    const sr = this.ctx.sampleRate;
    // the latency fix is for the audio interface; a digital source such as the piano has none
    const comp = this.mixer.hasLiveDevice() ? msToFrames(this.meta.latencyMs, sr) : 0;
    const rt = this.runtimes[id];

    if (!this.loopLength) {
      // the first take starts on beat 1 of the metronome, after the count-in; its length is rounded to the beat or bar
      const m = this.metronome.settings;
      const anchor = this.ctx.currentTime + 0.1 + m.countInBars * m.beatsPerBar * this.metronome.period;
      const startFrame = Math.round(anchor * sr) + comp;
      const unit = quantUnitFrames(m.quantise, m.bpm, m.beatsPerBar, sr);
      this.capture = { channel: id, startFrame, endFrame: null, chunks: [], lastFrame: startFrame, started: false, unit, stopping: false };
      rt.info.state = "armed";
      this.gridAnchor = anchor;
      this.loopOnGrid = unit > 0;
      this.syncMetronome(true);
      this.emit();
      return;
    }

    const when = nextBoundary(this.ctx.currentTime, this.loopStart, this.loopLength, 0.08);
    const startFrame = Math.round(when * sr) + comp;
    const endFrame = startFrame + Math.round(this.loopLength * sr);
    this.capture = { channel: id, startFrame, endFrame, chunks: [], lastFrame: startFrame, started: false, unit: 0, stopping: false };
    rt.info.state = "armed";
    this.syncMetronome();
    this.emit();
  }

  /** Finish the free-length first take (or cancel an armed/recording loop-synced take). */
  stopRecording() {
    const cap = this.capture;
    if (!cap) return;
    if (cap.stopping) return; // already running on to the next line
    if (cap.endFrame === null && cap.started && cap.lastFrame > cap.startFrame) {
      const target = cap.startFrame + quantiseLength(cap.lastFrame - cap.startFrame, cap.unit);
      if (cap.unit === 0 || target <= cap.lastFrame) {
        this.finish(cap, cap.unit === 0 ? cap.lastFrame : target);
      } else {
        // keep recording up to the beat or bar line, then close the take
        cap.endFrame = target;
        cap.stopping = true;
        this.emit();
      }
    } else {
      this.cancelCapture();
    }
  }

  private cancelCapture() {
    const cap = this.capture;
    if (!cap) return;
    const rt = this.runtimes[cap.channel];
    rt.info.state = rt.buffer ? "playing" : "empty";
    this.capture = null;
    this.syncMetronome();
    this.emit();
  }

  private onChunk(c: Chunk) {
    const cap = this.capture;
    if (!cap || !this.ctx) return;
    const n = c.l.length;
    const end = c.frame + n;
    if (end <= cap.startFrame) return;
    const rt = this.runtimes[cap.channel];
    if (!cap.started) {
      cap.started = true;
      rt.info.state = "recording";
      this.emit();
    }
    cap.chunks.push({ frame: c.frame, l: c.l, r: c.r });
    cap.lastFrame = end;
    const limit = cap.endFrame ?? cap.startFrame + Math.round(MAX_FIRST_TAKE_SECONDS * this.ctx.sampleRate);
    if (end >= limit) this.finish(cap, Math.min(end, limit));
  }

  private finish(cap: Capture, endFrame: number) {
    if (this.capture !== cap || !this.ctx) return;
    this.capture = null;
    const sr = this.ctx.sampleRate;
    const { l, r } = assemble(cap.chunks, cap.startFrame, endFrame);
    const rt = this.runtimes[cap.channel];
    if (l.length < 64) {
      rt.info.state = rt.buffer ? "playing" : "empty";
      this.syncMetronome();
      this.emit();
      return;
    }
    const buf = this.ctx.createBuffer(2, l.length, sr);
    buf.getChannelData(0).set(l);
    buf.getChannelData(1).set(r);
    rt.buffer = buf;
    rt.info.peaks = peaks(l, 600);
    rt.info.state = "playing";
    rt.info.active = true;

    const firstTake = this.loopLength === null;
    if (firstTake) {
      this.loopLength = buf.duration;
      this.playing = true;
      // on the grid: the loop restarts on a multiple of its length after beat 1, so it stays in time with the clicks
      this.loopStart = this.loopOnGrid ? nextBoundary(this.ctx.currentTime, this.gridAnchor, this.loopLength, 0.03) : this.ctx.currentTime + 0.05;
      if (!this.loopOnGrid) this.gridAnchor = this.loopStart;
    }
    if (this.playing) this.startChannel(rt, firstTake ? this.loopStart : null);
    this.syncMetronome(firstTake);
    this.emit();
  }

  /* ------------------------------------------------------------------ playback */

  private startChannel(rt: ChannelRuntime, at: number | null, joinAt?: number) {
    if (!this.ctx || !this.master || !rt.buffer || !this.loopLength) return;
    this.stopSource(rt);
    const gain = rt.gain ?? this.ctx.createGain();
    if (!rt.gain) {
      rt.gain = gain;
      this.connectChannel(rt);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = rt.buffer;
    src.loop = true;
    src.connect(gain);
    const when = at ?? joinAt ?? this.ctx.currentTime + 0.02;
    // join the running loop at the right phase
    const offset = at !== null ? 0 : loopOffset(when, this.loopStart, this.loopLength);
    src.start(when, offset % rt.buffer.duration);
    rt.source = src;
    this.applyGains();
  }

  private stopSource(rt: ChannelRuntime) {
    if (rt.source) {
      try {
        rt.source.stop();
      } catch {
        /* already stopped */
      }
      rt.source.disconnect();
      rt.source = null;
    }
  }

  /** Stop or restart playback of everything. Restarting begins the loop again from the top. */
  setPlaying(on: boolean) {
    if (!this.ctx || !this.loopLength) return;
    this.playing = on;
    if (!on) {
      this.runtimes.forEach((r) => this.stopSource(r));
    } else {
      this.loopStart = this.loopOnGrid ? nextBoundary(this.ctx.currentTime, this.loopStart, this.loopLength, 0.05) : this.ctx.currentTime + 0.05;
      if (!this.loopOnGrid) this.gridAnchor = this.loopStart;
      this.runtimes.forEach((r) => {
        if (r.buffer && r.info.active) this.startChannel(r, this.loopStart);
      });
    }
    this.syncMetronome(on);
    this.emit();
  }

  clear(id: number) {
    if (this.capture?.channel === id) this.cancelCapture();
    const rt = this.runtimes[id];
    this.stopSource(rt);
    rt.buffer = null;
    rt.info.peaks = null;
    rt.info.state = "empty";
    rt.info.active = true;
    if (!this.runtimes.some((r) => r.buffer)) {
      this.loopLength = null;
      this.playing = true;
    }
    this.syncMetronome();
    this.emit();
  }

  clearAll() {
    this.runtimes.forEach((_, i) => this.clear(i));
  }

  dispose() {
    this.capture = null;
    this.runtimes.forEach((r) => this.stopSource(r));
    this.metronome.dispose();
    this.sequencers.forEach((q) => q.dispose());
    this.scalePianos.forEach((p) => p.dispose());
    this.buses.forEach((b) => b.dispose());
    this.buses.clear();
    this.mixer.dispose();
    try {
      this.worklet?.disconnect();
      this.master?.disconnect();
    } catch {
      /* already disconnected */
    }
    if (this.worklet) this.worklet.port.onmessage = null;
    this.worklet = null;
    if (this.ownsContext) {
      void this.ctx?.close();
      this.workletReady = false;
    }
    this.ctx = null;
    this.master = null;
    this.analyser = null;
    this.meta = { ...this.meta, status: "idle" };
    this.listeners.clear();
  }
}

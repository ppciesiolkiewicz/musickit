import { DEFAULT_LOOP_BARS, clampBars, cutTake, fadeEdges, loopOffset, type Chunk } from "./take";
import { EffectChain } from "../effects/chain";
import { openInputStream } from "@/features/sound";
import { sanitiseEffects, type EffectSpec } from "../effects/effects";

/**
 * The jam's loops: each records `bars` bars from its input on the jam's clock (the app's one input, both channels mixed, unless the
 * loop names its own device and channel) and
 * then plays them round. Its effects sit between the input and the recorder (they are in the take, like the looper's input effects), and
 * "hear it" sends the same effected signal to the speakers. No React. A device opens only from a person's click (record, or Connect in its input settings); one stream per
 * device is shared by every loop that uses it and stopped when the last one lets go.
 */

/** Which of the device's channels a loop records: the first, the second, or both mixed to one. */
export type LoopChannel = "1" | "2" | "mix";
export const LOOP_CHANNELS: readonly LoopChannel[] = ["1", "2", "mix"];

export interface LoopConfig {
  id: string;
  /** the loop's own input device, or "" for the app's input (chosen in the devices menu or an input chip; followed when it changes) */
  deviceId: string;
  /** the channel of the loop's own device; the app's input always records both mixed */
  channel: LoopChannel;
  bars: number;
  volume: number;
  /** the input's effects, in signal order (all before the recorder; `post` is not used) */
  effects: EffectSpec[];
  /** hear the input (with its effects) live */
  monitor: boolean;
}

/** At most this many effects on one loop's input. */
export const MAX_LOOP_EFFECTS = 6;

export type LoopState = "empty" | "countIn" | "recording" | "playing" | "stopped";

export interface LoopView extends LoopConfig {
  state: LoopState;
  /** wanted on: it plays (or starts on the next beat) */
  on: boolean;
  /** its input is open, so the meter moves */
  connected: boolean;
  /** channels its device gives (1 or 2), 0 before it is opened */
  deviceChannels: number;
  error: string | null;
}

export interface InputDevice {
  id: string;
  label: string;
}

/** The app's one input, handed in by the page (this file has no React and reads no app state itself). */
export interface AppInput {
  /** the chosen input's device id, "" for the system default */
  id(): string;
  /** called when the chosen input changes */
  subscribe(cb: () => void): () => void;
  /** a stream of the app's input is open: publish its levels for the input chip */
  publish(): { levels(levels: readonly number[], active?: number): void; close(): void };
}

/** Where a loop's input comes from: its own device, or the app's input. */
interface Wanted {
  id: string;
  app: boolean;
}
const keyOf = (w: Wanted) => (w.app ? `app:${w.id}` : w.id);

/** How loud a frame is (root mean square). */
function rms(data: Float32Array): number {
  let sum = 0;
  for (const v of data) sum += v * v;
  return data.length ? Math.sqrt(sum / data.length) : 0;
}

const PROCESSOR = "jam-loop-recorder";
const WORKLET = `
class JamLoopRecorder extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch && ch.length) {
      const data = new Float32Array(ch);
      this.port.postMessage({ frame: currentFrame, data }, [data.buffer]);
    }
    return true;
  }
}
registerProcessor("${PROCESSOR}", JamLoopRecorder);
`;

interface OpenInput {
  stream: MediaStream;
  source: MediaStreamAudioSourceNode;
  channels: number;
  /** seconds the device is late (what the browser reports, else 0) */
  latency: number;
  refs: number;
  /** stops publishing the levels (the app's input only) */
  unmeter?: () => void;
}

const closeInput = (i: OpenInput) => {
  i.unmeter?.();
  i.source.disconnect();
  i.stream.getTracks().forEach((t) => t.stop());
};

/** Device streams shared by the loops, counted, and the recorder worklet loaded once. */
export class InputPool {
  private open = new Map<string, Promise<OpenInput>>();
  private worklet: Promise<void> | null = null;

  constructor(private ctx: AudioContext, private app: AppInput | null = null) {}

  /** What a loop on `deviceId` opens: that device, or the app's input for "". */
  wanted(deviceId: string): Wanted {
    return deviceId ? { id: deviceId, app: false } : { id: this.app?.id() ?? "", app: true };
  }

  loadWorklet(): Promise<void> {
    this.worklet ??= this.ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([WORKLET], { type: "application/javascript" })));
    return this.worklet;
  }

  async get(w: Wanted): Promise<OpenInput> {
    const key = keyOf(w);
    let p = this.open.get(key);
    if (!p) {
      p = this.openDevice(w);
      this.open.set(key, p);
      p.catch(() => this.open.delete(key));
    }
    const input = await p;
    input.refs++;
    return input;
  }

  private async openDevice(w: Wanted): Promise<OpenInput> {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser cannot record (use HTTPS).");
    // the raw signal: no echo cancelling, noise suppression or auto gain, which would mangle an instrument. The loop's own device
    // must be that one; the app's input falls back to another, as everywhere else in the app
    const raw: MediaTrackConstraints = { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: { ideal: 2 } };
    const stream = w.app ? await openInputStream(raw, w.id ? { id: w.id, label: "" } : null) : await navigator.mediaDevices.getUserMedia({ audio: { ...raw, deviceId: { exact: w.id } } });
    const settings = (stream.getAudioTracks()[0]?.getSettings?.() ?? {}) as MediaTrackSettings & { latency?: number };
    const input: OpenInput = { stream, source: this.ctx.createMediaStreamSource(stream), channels: Math.min(2, settings.channelCount ?? 1) || 1, latency: Number.isFinite(settings.latency) ? settings.latency! : 0, refs: 0 };
    if (w.app && this.app) input.unmeter = this.meter(input, this.app);
    return input;
  }

  /** Publish each channel's level of an open app input (the louder one as heard) until the returned stop. */
  private meter(input: OpenInput, app: AppInput): () => void {
    const ctx = this.ctx;
    const split = ctx.createChannelSplitter(2);
    input.source.connect(split);
    const ans = Array.from({ length: input.channels }, (_, i) => {
      const an = ctx.createAnalyser();
      an.fftSize = 1024;
      split.connect(an, i);
      return an;
    });
    const data = ans.map((an) => new Float32Array(an.fftSize));
    const live = app.publish();
    const id = setInterval(() => {
      const levels = ans.map((an, i) => {
        an.getFloatTimeDomainData(data[i]);
        return rms(data[i]);
      });
      live.levels(levels, levels.length > 1 && levels[1] > levels[0] ? 1 : 0);
    }, 66);
    return () => {
      clearInterval(id);
      live.close();
      split.disconnect();
      try {
        input.source.disconnect(split);
      } catch {
        /* already gone */
      }
    };
  }

  release(key: string) {
    const p = this.open.get(key);
    if (!p) return;
    void p.then((input) => {
      if (--input.refs > 0) return;
      this.open.delete(key);
      closeInput(input);
    }).catch(() => undefined);
  }

  dispose() {
    for (const p of this.open.values()) void p.then(closeInput).catch(() => undefined);
    this.open.clear();
  }
}

interface Take {
  /** context time the take starts and ends (on the bar lines) */
  start: number;
  end: number;
  /** first frame kept (latency moved) and how many */
  from: number;
  frames: number;
  chunks: Chunk[];
}

let nextId = 1;
export const newLoopId = () => `loop-${Date.now().toString(36)}-${nextId++}`;

export function cleanConfig(c: Partial<LoopConfig> | null | undefined): LoopConfig {
  return {
    id: typeof c?.id === "string" && c.id ? c.id : newLoopId(),
    deviceId: typeof c?.deviceId === "string" ? c.deviceId : "",
    channel: LOOP_CHANNELS.includes(c?.channel as LoopChannel) ? (c!.channel as LoopChannel) : "mix",
    bars: clampBars(Number(c?.bars ?? DEFAULT_LOOP_BARS)),
    volume: Number.isFinite(c?.volume) ? Math.min(1, Math.max(0, c!.volume!)) : 0.8,
    effects: sanitiseEffects(c?.effects).slice(0, MAX_LOOP_EFFECTS).map((e) => ({ ...e, post: false })),
    monitor: c?.monitor === true,
  };
}

/** One loop: its input chain, the take being recorded, the recorded sound and its playback into `out`. */
export class JamLoop {
  config: LoopConfig;
  on = false;
  error: string | null = null;
  buffer: AudioBuffer | null = null;
  /** when the sound's bar 1 was (the phase it plays in) */
  origin = 0;
  take: Take | null = null;
  private ctx: AudioContext | null = null;
  private pool: InputPool | null = null;
  private input: OpenInput | null = null;
  /** the pool's key of the open input */
  private inputKey: string | null = null;
  private chain: AudioNode[] = [];
  private fx: EffectChain | null = null;
  private monitor: GainNode | null = null;
  private out: AudioNode | null = null;
  private analyser: AnalyserNode | null = null;
  private recorder: AudioWorkletNode | null = null;
  private gain: GainNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private stopAtTime: number | null = null;
  private levelData: Float32Array<ArrayBuffer> | null = null;

  constructor(config: Partial<LoopConfig> | null, private changed: () => void) {
    this.config = cleanConfig(config);
  }

  attach(ctx: AudioContext, pool: InputPool, out: AudioNode) {
    this.ctx = ctx;
    this.pool = pool;
    this.out = out;
    this.gain = ctx.createGain();
    this.gain.gain.value = this.config.volume;
    this.gain.connect(out);
  }

  get connected() {
    return this.input !== null;
  }

  get running() {
    return this.source !== null && (this.stopAtTime === null || (this.ctx?.currentTime ?? 0) < this.stopAtTime);
  }

  get stopping() {
    return this.stopAtTime !== null;
  }

  get length() {
    return this.buffer?.duration ?? 0;
  }

  state(now: number): LoopState {
    if (this.take) return now < this.take.start ? "countIn" : "recording";
    if (!this.buffer) return "empty";
    return this.source && !this.stopping ? "playing" : "stopped";
  }

  view(now: number): LoopView {
    return { ...this.config, state: this.state(now), on: this.on, connected: this.connected, deviceChannels: this.input?.channels ?? 0, error: this.error };
  }

  /** Open the loop's input (its own device and channel, or the app's input). Call from a person's click. */
  async connect(): Promise<boolean> {
    const { ctx, pool } = this;
    if (!ctx || !pool) return false;
    const wanted = pool.wanted(this.config.deviceId);
    const key = keyOf(wanted);
    if (this.input && this.inputKey === key) return true;
    this.disconnect();
    try {
      await pool.loadWorklet();
      const input = await pool.get(wanted);
      if (keyOf(pool.wanted(this.config.deviceId)) !== key) {
        pool.release(key);
        return false;
      }
      this.input = input;
      this.inputKey = key;
      this.error = null;
      this.wire();
      return true;
    } catch (e) {
      this.error = e instanceof Error && e.name === "NotAllowedError" ? "Microphone access was blocked." : e instanceof Error ? e.message : String(e);
      return false;
    } finally {
      this.changed();
    }
  }

  /** Build source → channel pick → effects → (meter, recorder, monitor). */
  private wire() {
    const ctx = this.ctx!, input = this.input!;
    this.unwire();
    const split = ctx.createChannelSplitter(2);
    const mono = ctx.createGain();
    mono.channelCount = 1;
    mono.channelCountMode = "explicit";
    input.source.connect(split);
    // the app's input records both channels mixed (a mic, or both inputs of an interface)
    const ch = this.config.deviceId ? this.config.channel : "mix";
    // a one-channel device has no second channel: it records its only one
    if (ch === "1" || input.channels < 2) split.connect(mono, 0);
    else if (ch === "2") split.connect(mono, 1);
    else {
      split.connect(mono, 0);
      split.connect(mono, 1);
    }
    const fx = new EffectChain(ctx);
    fx.setEffects(this.config.effects);
    mono.connect(fx.input);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    fx.output.connect(analyser);
    const recorder = new AudioWorkletNode(ctx, PROCESSOR, { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1, channelCountMode: "explicit" });
    recorder.port.onmessage = (e: MessageEvent<Chunk>) => this.onChunk(e.data);
    // a silent path to the speakers keeps the worklet running in every browser
    const mute = ctx.createGain();
    mute.gain.value = 0;
    fx.output.connect(recorder);
    recorder.connect(mute).connect(ctx.destination);
    // monitoring: the same signal the recorder takes, to the jam's output (shut unless asked for: a mic by the speakers would howl)
    const monitor = ctx.createGain();
    monitor.gain.value = this.config.monitor ? 1 : 0;
    fx.output.connect(monitor);
    if (this.out) monitor.connect(this.out);
    this.chain = [split, mono, analyser, recorder, mute, monitor];
    this.fx = fx;
    this.monitor = monitor;
    this.analyser = analyser;
    this.recorder = recorder;
  }

  /** Take this loop's nodes off the shared source (which feeds other loops too). */
  private unwire() {
    const split = this.chain[0];
    if (split && this.input) {
      try {
        this.input.source.disconnect(split);
      } catch {
        /* already gone */
      }
    }
    this.chain.forEach((n) => n.disconnect());
    this.fx?.dispose();
    this.recorder?.port.close();
    this.chain = [];
    this.fx = null;
    this.monitor = null;
    this.analyser = null;
    this.recorder = null;
  }

  /** Close the input (the device stays open while other loops use it). */
  disconnect() {
    this.unwire();
    if (this.input && this.inputKey !== null) this.pool?.release(this.inputKey);
    this.input = null;
    this.inputKey = null;
  }

  /** The app's input changed: a loop that follows it and has its input open moves to the new one. */
  followAppInput() {
    if (this.input && !this.config.deviceId && this.pool && keyOf(this.pool.wanted("")) !== this.inputKey) void this.connect();
  }

  setConfig(patch: Partial<Omit<LoopConfig, "id">>) {
    const before = this.config;
    this.config = cleanConfig({ ...before, ...patch, id: before.id });
    if (this.gain && this.ctx) this.gain.gain.setTargetAtTime(this.config.volume, this.ctx.currentTime, 0.02);
    if (this.monitor && this.ctx) this.monitor.gain.setTargetAtTime(this.config.monitor ? 1 : 0, this.ctx.currentTime, 0.02);
    if (this.fx && JSON.stringify(this.config.effects) !== JSON.stringify(before.effects)) this.fx.setEffects(this.config.effects);
    if (this.input && this.config.channel !== before.channel) this.wire();
    if (this.input && this.config.deviceId !== before.deviceId) void this.connect();
    this.changed();
  }

  /** Signal level of the input now (0 to 1), for the meter. */
  level(): number {
    const a = this.analyser;
    if (!a) return 0;
    if (!this.levelData || this.levelData.length !== a.fftSize) this.levelData = new Float32Array(a.fftSize);
    a.getFloatTimeDomainData(this.levelData);
    let peak = 0;
    for (const v of this.levelData) peak = Math.max(peak, Math.abs(v));
    return Math.min(1, peak);
  }

  /** Record from `start` to `end` (bar lines); what played before stops when the take begins. */
  arm(start: number, end: number) {
    const ctx = this.ctx!;
    const sr = ctx.sampleRate;
    // what is heard at time t was played to the speakers late and comes back through the input late as well
    const late = (ctx.baseLatency || 0) + (ctx.outputLatency || 0) + (this.input?.latency ?? 0);
    this.take = { start, end, from: Math.round((start + late) * sr), frames: Math.round((end - start) * sr), chunks: [] };
    if (this.source) this.stopAt(start);
    this.on = false;
    this.changed();
    setTimeout(() => this.changed(), Math.max(0, (start - ctx.currentTime) * 1000) + 10);
  }

  cancelTake() {
    this.take = null;
    this.changed();
  }

  private onChunk(c: Chunk) {
    const t = this.take;
    if (!t) return;
    if (c.frame + c.data.length > t.from) t.chunks.push(c);
    if (c.frame + c.data.length < t.from + t.frames) return;
    // the whole take is in: it becomes the loop and plays on at once, in its phase
    const ctx = this.ctx!;
    const buffer = ctx.createBuffer(1, t.frames, ctx.sampleRate);
    buffer.copyToChannel(fadeEdges(cutTake(t.chunks, t.from, t.frames), Math.round(ctx.sampleRate * 0.004)), 0);
    this.take = null;
    this.buffer = buffer;
    this.origin = t.start;
    this.on = true;
    this.play(ctx.currentTime + 0.01);
    this.changed();
  }

  /** Start the sound at `at`, at the place its phase says. */
  play(at: number) {
    const ctx = this.ctx;
    if (!ctx || !this.buffer || !this.gain) return;
    if (this.source && this.stopping) {
      // a stop is on its way: call it off and keep playing
      this.source.onended = null;
      this.source.stop(Number.MAX_VALUE);
      this.stopAtTime = null;
      this.changed();
      return;
    }
    if (this.source) return;
    const s = ctx.createBufferSource();
    s.buffer = this.buffer;
    s.loop = true;
    s.connect(this.gain);
    s.start(at, loopOffset(at, this.origin, this.buffer.duration));
    this.source = s;
    this.stopAtTime = null;
  }

  stopAt(at: number) {
    const s = this.source;
    if (!s) return;
    this.stopAtTime = at;
    s.stop(at);
    s.onended = () => {
      if (this.source !== s) return;
      s.disconnect();
      this.source = null;
      this.stopAtTime = null;
      this.changed();
    };
  }

  /** Forget the recorded sound. */
  clear() {
    this.take = null;
    this.on = false;
    if (this.source) {
      this.source.onended = null;
      this.source.stop();
      this.source.disconnect();
      this.source = null;
    }
    this.stopAtTime = null;
    this.buffer = null;
    this.changed();
  }

  /** Where the loop is (0 to 1) while it plays or records, else null. */
  position(): number | null {
    const ctx = this.ctx;
    if (!ctx) return null;
    const now = ctx.currentTime;
    if (this.take) return now < this.take.start ? null : Math.min(1, (now - this.take.start) / (this.take.end - this.take.start));
    if (!this.source || !this.buffer) return null;
    return loopOffset(now, this.origin, this.buffer.duration) / this.buffer.duration;
  }

  dispose() {
    this.clear();
    this.disconnect();
    this.gain?.disconnect();
    this.gain = null;
    this.out = null;
    this.ctx = null;
    this.pool = null;
  }
}

import { DEFAULT_LOOP_BARS, clampBars, cutTake, fadeEdges, loopOffset, type Chunk } from "./take";

/**
 * The jam's loops: each records `bars` bars from its own input (a device and one of its channels, or both mixed) on the jam's clock and
 * then plays them round. No React. A device opens only from a person's click (record, or Connect in its input settings); one stream per
 * device is shared by every loop that uses it and stopped when the last one lets go.
 */

/** Which of the device's channels a loop records: the first, the second, or both mixed to one. */
export type LoopChannel = "1" | "2" | "mix";
export const LOOP_CHANNELS: readonly LoopChannel[] = ["1", "2", "mix"];

export interface LoopConfig {
  id: string;
  /** the input device ("" = the browser's default microphone) */
  deviceId: string;
  channel: LoopChannel;
  bars: number;
  volume: number;
}

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
}

/** Device streams shared by the loops, counted, and the recorder worklet loaded once. */
export class InputPool {
  private open = new Map<string, Promise<OpenInput>>();
  private worklet: Promise<void> | null = null;

  constructor(private ctx: AudioContext) {}

  loadWorklet(): Promise<void> {
    this.worklet ??= this.ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([WORKLET], { type: "application/javascript" })));
    return this.worklet;
  }

  async get(deviceId: string): Promise<OpenInput> {
    let p = this.open.get(deviceId);
    if (!p) {
      p = this.openDevice(deviceId);
      this.open.set(deviceId, p);
      p.catch(() => this.open.delete(deviceId));
    }
    const input = await p;
    input.refs++;
    return input;
  }

  private async openDevice(deviceId: string): Promise<OpenInput> {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser cannot record (use HTTPS).");
    // the raw signal: no echo cancelling, noise suppression or auto gain, which would mangle an instrument
    const audio: MediaTrackConstraints = { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: { ideal: 2 }, ...(deviceId ? { deviceId: { exact: deviceId } } : {}) };
    const stream = await navigator.mediaDevices.getUserMedia({ audio });
    const settings = (stream.getAudioTracks()[0]?.getSettings?.() ?? {}) as MediaTrackSettings & { latency?: number };
    return { stream, source: this.ctx.createMediaStreamSource(stream), channels: Math.min(2, settings.channelCount ?? 1) || 1, latency: Number.isFinite(settings.latency) ? settings.latency! : 0, refs: 0 };
  }

  release(deviceId: string) {
    const p = this.open.get(deviceId);
    if (!p) return;
    void p.then((input) => {
      if (--input.refs > 0) return;
      this.open.delete(deviceId);
      input.source.disconnect();
      input.stream.getTracks().forEach((t) => t.stop());
    }).catch(() => undefined);
  }

  dispose() {
    for (const p of this.open.values()) void p.then((i) => { i.source.disconnect(); i.stream.getTracks().forEach((t) => t.stop()); }).catch(() => undefined);
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
  private inputDevice: string | null = null;
  private chain: AudioNode[] = [];
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

  /** Open the loop's input (the device and channel in its config). Call from a person's click. */
  async connect(): Promise<boolean> {
    const { ctx, pool } = this;
    if (!ctx || !pool) return false;
    if (this.input && this.inputDevice === this.config.deviceId) return true;
    this.disconnect();
    const deviceId = this.config.deviceId;
    try {
      await pool.loadWorklet();
      const input = await pool.get(deviceId);
      if (this.config.deviceId !== deviceId) {
        pool.release(deviceId);
        return false;
      }
      this.input = input;
      this.inputDevice = deviceId;
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

  /** Build source → channel pick → (meter, recorder). */
  private wire() {
    const ctx = this.ctx!, input = this.input!;
    this.unwire();
    const split = ctx.createChannelSplitter(2);
    const mono = ctx.createGain();
    mono.channelCount = 1;
    mono.channelCountMode = "explicit";
    input.source.connect(split);
    const ch = this.config.channel;
    // a one-channel device has no second channel: it records its only one
    if (ch === "1" || input.channels < 2) split.connect(mono, 0);
    else if (ch === "2") split.connect(mono, 1);
    else {
      split.connect(mono, 0);
      split.connect(mono, 1);
    }
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    mono.connect(analyser);
    const recorder = new AudioWorkletNode(ctx, PROCESSOR, { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1, channelCountMode: "explicit" });
    recorder.port.onmessage = (e: MessageEvent<Chunk>) => this.onChunk(e.data);
    // a silent path to the speakers keeps the worklet running in every browser
    const mute = ctx.createGain();
    mute.gain.value = 0;
    mono.connect(recorder);
    recorder.connect(mute).connect(ctx.destination);
    this.chain = [split, mono, analyser, recorder, mute];
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
    this.recorder?.port.close();
    this.chain = [];
    this.analyser = null;
    this.recorder = null;
  }

  /** Close the input (the device stays open while other loops use it). */
  disconnect() {
    this.unwire();
    if (this.input && this.inputDevice !== null) this.pool?.release(this.inputDevice);
    this.input = null;
    this.inputDevice = null;
  }

  setConfig(patch: Partial<Omit<LoopConfig, "id">>) {
    const before = this.config;
    this.config = cleanConfig({ ...before, ...patch, id: before.id });
    if (this.gain && this.ctx) this.gain.gain.setTargetAtTime(this.config.volume, this.ctx.currentTime, 0.02);
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
    this.ctx = null;
    this.pool = null;
  }
}

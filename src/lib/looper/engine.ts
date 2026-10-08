import { applyInputMode, assemble, effectiveGain, loopOffset, msToFrames, nextBoundary, peaks, type Chunk, type InputMode } from "./frames";
import { RECORDER_PROCESSOR_NAME, recorderWorkletUrl } from "./recorderWorklet";

/**
 * A small multi-channel looper built on the Web Audio API.
 *
 * - The first recording (on any channel) is free length and defines the loop length.
 * - Every later recording is armed, starts on the next loop boundary and lasts exactly one loop.
 * - All channels play in sync from one shared loop clock.
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
}

export interface InputDevice {
  id: string;
  label: string;
}

export interface LooperSnapshot {
  status: "idle" | "starting" | "ready" | "error";
  error: string | null;
  devices: InputDevice[];
  deviceId: string;
  /** channels the selected input reports, 0 if unknown */
  inputChannels: number;
  inputMode: InputMode;
  monitor: boolean;
  latencyMs: number;
  /** record from the audio interface */
  deviceOn: boolean;
  /** record from the extra source (the piano) */
  externalOn: boolean;
  /** null when the app gave the looper no extra source */
  externalLabel: string | null;
  /** why the audio interface could not be opened, if it could not */
  deviceError: string | null;
  playing: boolean;
  loopSeconds: number | null;
  channels: ChannelInfo[];
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
}

export const MAX_CHANNELS = 8;
export const MAX_FIRST_TAKE_SECONDS = 120;
const STORAGE_KEY = "musickit.looper.input";
const SOURCES_KEY = "musickit.looper.sources";

const defaultChannel = (id: number): ChannelRuntime => ({
  info: { id, name: `Channel ${id + 1}`, state: "empty", volume: 0.8, muted: false, solo: false, peaks: null },
  buffer: null,
  gain: null,
  source: null,
});

export class LooperEngine {
  private ctx: AudioContext | null = null;
  private ownsContext = true;
  private inputBus: GainNode | null = null;
  private deviceGain: GainNode | null = null;
  private externalGain: GainNode | null = null;
  private externalNode: AudioNode | null = null;
  private stream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private worklet: AudioWorkletNode | null = null;
  private analyser: AnalyserNode | null = null;
  private monitorGain: GainNode | null = null;
  private master: GainNode | null = null;
  private workletReady = false;
  private levelBuf: Float32Array<ArrayBuffer> | null = null;

  private runtimes: ChannelRuntime[] = [0, 1, 2, 3].map(defaultChannel);
  private loopLength: number | null = null;
  private loopStart = 0;
  private playing = true;
  private capture: Capture | null = null;

  private listeners = new Set<() => void>();
  private snap: LooperSnapshot;

  constructor(private options: LooperOptions = {}) {
    this.meta.externalLabel = options.getExternalSource ? options.externalLabel ?? "Extra source" : null;
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

  private meta = { status: "idle" as LooperSnapshot["status"], error: null as string | null, devices: [] as InputDevice[], deviceId: "", inputChannels: 0, inputMode: "left" as InputMode, monitor: false, latencyMs: 0, deviceOn: true, externalOn: true, externalLabel: null as string | null, deviceError: null as string | null };

  private buildSnapshot(patch: Partial<typeof this.meta> = {}): LooperSnapshot {
    this.meta = { ...this.meta, ...patch };
    return {
      ...this.meta,
      playing: this.playing,
      loopSeconds: this.loopLength,
      channels: this.runtimes.map((r) => ({ ...r.info })),
      sampleRate: this.ctx?.sampleRate ?? 0,
    };
  }

  private emit(patch: Partial<typeof this.meta> = {}) {
    this.snap = this.buildSnapshot(patch);
    this.listeners.forEach((l) => l());
  }

  /* ------------------------------------------------------------------ audio input */

  /** Start the audio engine, then open the audio interface (if it is switched on). */
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
      let saved = "";
      try {
        saved = window.localStorage.getItem(STORAGE_KEY) ?? "";
        const src = JSON.parse(window.localStorage.getItem(SOURCES_KEY) ?? "null") as { device?: boolean; external?: boolean } | null;
        if (src) this.meta = { ...this.meta, deviceOn: src.device ?? true, externalOn: src.external ?? true };
      } catch {
        /* storage may be unavailable */
      }
      this.applySourceGains();
      if (this.meta.deviceOn) {
        try {
          await this.openInput(saved);
        } catch (e) {
          // the interface is optional when another source is available
          if (!this.meta.externalLabel) throw e;
          this.emit({ deviceOn: false, deviceError: describeError(e) });
        }
      } else {
        await this.refreshDevices().catch(() => undefined);
      }
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
    }
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.connect(ctx.destination);
    this.monitorGain = ctx.createGain();
    this.monitorGain.gain.value = this.meta.monitor ? 1 : 0;
    this.monitorGain.connect(this.master);

    // everything that can be recorded is summed here, as stereo
    this.inputBus = ctx.createGain();
    this.inputBus.channelCount = 2;
    this.inputBus.channelCountMode = "explicit";
    this.inputBus.channelInterpretation = "speakers";
    this.deviceGain = ctx.createGain();
    this.deviceGain.connect(this.inputBus);
    this.externalGain = ctx.createGain();
    this.externalGain.connect(this.inputBus);
    if (this.options.getExternalSource) {
      this.externalNode = this.options.getExternalSource();
      this.externalNode.connect(this.externalGain);
    }

    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.inputBus.connect(this.analyser);
    this.levelBuf = new Float32Array(this.analyser.fftSize) as Float32Array<ArrayBuffer>;
    // a rough latency guess for the audio interface; the user can fine-tune it
    const guess = Math.round(((ctx.baseLatency || 0) + ((ctx as unknown as { outputLatency?: number }).outputLatency || 0)) * 1000);
    this.meta.latencyMs = guess;
  }

  private createWorklet() {
    if (this.worklet || !this.ctx || !this.inputBus) return;
    const ctx = this.ctx;
    this.worklet = new AudioWorkletNode(ctx, RECORDER_PROCESSOR_NAME, { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 2, channelCountMode: "explicit", outputChannelCount: [1] });
    this.worklet.port.onmessage = (ev: MessageEvent<Chunk>) => this.onChunk(ev.data);
    // keep the worklet pulled by the graph without making a sound
    const mute = ctx.createGain();
    mute.gain.value = 0;
    this.inputBus.connect(this.worklet);
    this.worklet.connect(mute);
    mute.connect(ctx.destination);
  }

  private applySourceGains() {
    if (this.deviceGain) this.deviceGain.gain.value = this.meta.deviceOn ? 1 : 0;
    if (this.externalGain) this.externalGain.gain.value = this.meta.externalOn && this.meta.externalLabel ? 1 : 0;
  }

  /** Choose what gets recorded: the audio interface, the extra source (piano), or both mixed. */
  async setSources(next: { device?: boolean; external?: boolean }): Promise<void> {
    const device = next.device ?? this.meta.deviceOn;
    const external = next.external ?? this.meta.externalOn;
    try {
      window.localStorage.setItem(SOURCES_KEY, JSON.stringify({ device, external }));
    } catch {
      /* ignore */
    }
    this.meta = { ...this.meta, externalOn: external };
    this.applySourceGains();
    if (device && !this.meta.deviceOn) {
      this.meta = { ...this.meta, deviceOn: true, deviceError: null };
      try {
        await this.openInput(this.meta.deviceId);
      } catch (e) {
        this.emit({ deviceOn: false, deviceError: describeError(e) });
        return;
      }
    } else if (!device && this.meta.deviceOn) {
      this.stopStream();
      this.emit({ deviceOn: false });
      return;
    }
    this.emit();
  }

  /** Open (or switch to) an input device. An empty id means the system default. */
  async openInput(deviceId: string): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser cannot record audio (getUserMedia is missing). Use HTTPS or localhost.");
    this.ensureContext();
    this.stopStream();
    // Raw signal wanted: no echo cancelling, noise suppression or auto gain, which would mangle an instrument.
    const audio: MediaTrackConstraints = {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      channelCount: { ideal: 2 },
      ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
    };
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio });
    } catch (e) {
      if (deviceId) {
        // the saved device vanished: fall back to the default one
        stream = await navigator.mediaDevices.getUserMedia({ audio: { ...audio, deviceId: undefined } });
        deviceId = "";
      } else throw e;
    }
    this.stream = stream;
    const track = stream.getAudioTracks()[0];
    const settings = track?.getSettings?.() ?? {};
    const actualId = settings.deviceId ?? deviceId;
    const ctx = this.ctx!;
    this.sourceNode = ctx.createMediaStreamSource(stream);
    this.sourceNode.connect(this.deviceGain!);
    this.sourceNode.connect(this.monitorGain!);
    this.meta.deviceOn = true;

    try {
      window.localStorage.setItem(STORAGE_KEY, actualId);
    } catch {
      /* ignore */
    }
    await this.refreshDevices();
    this.emit({ deviceId: actualId, inputChannels: settings.channelCount ?? 0, deviceOn: true, deviceError: null });
  }

  private stopStream() {
    try {
      this.sourceNode?.disconnect();
    } catch {
      /* already disconnected */
    }
    this.sourceNode = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }

  async refreshDevices(): Promise<void> {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const all = await navigator.mediaDevices.enumerateDevices();
    const devices = all.filter((d) => d.kind === "audioinput").map((d, i) => ({ id: d.deviceId, label: d.label || `Input ${i + 1}` }));
    this.emit({ devices });
  }

  setInputMode(mode: InputMode) {
    this.emit({ inputMode: mode });
  }

  setMonitor(on: boolean) {
    if (this.monitorGain) this.monitorGain.gain.value = on ? 1 : 0;
    this.emit({ monitor: on });
  }

  setLatencyMs(ms: number) {
    this.emit({ latencyMs: Math.max(0, Math.min(500, ms)) });
  }

  /** Peak level of the live input, 0..1. Cheap enough to call every animation frame. */
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

  /** Position inside the loop, 0..1, or null when there is no loop or it is stopped. */
  getPosition(): number | null {
    if (!this.ctx || !this.loopLength || !this.playing) return null;
    return loopOffset(this.ctx.currentTime, this.loopStart, this.loopLength) / this.loopLength;
  }

  /* ------------------------------------------------------------------ channels */

  addChannel() {
    if (this.runtimes.length >= MAX_CHANNELS) return;
    this.runtimes.push(defaultChannel(this.runtimes.length));
    this.emit();
  }

  removeLastChannel() {
    if (this.runtimes.length <= 1) return;
    const last = this.runtimes[this.runtimes.length - 1];
    if (last.info.state !== "empty" || this.capture?.channel === last.info.id) return;
    this.runtimes.pop();
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
    const comp = this.meta.deviceOn ? msToFrames(this.meta.latencyMs, sr) : 0;
    const rt = this.runtimes[id];

    if (!this.loopLength) {
      // free-length first take starts right now
      const startFrame = Math.ceil((this.ctx.currentTime + 0.02) * sr) + comp;
      this.capture = { channel: id, startFrame, endFrame: null, chunks: [], lastFrame: startFrame, started: false };
      rt.info.state = "recording";
      this.emit();
      return;
    }

    const when = nextBoundary(this.ctx.currentTime, this.loopStart, this.loopLength, 0.08);
    const startFrame = Math.round(when * sr) + comp;
    const endFrame = startFrame + Math.round(this.loopLength * sr);
    this.capture = { channel: id, startFrame, endFrame, chunks: [], lastFrame: startFrame, started: false };
    rt.info.state = "armed";
    this.emit();
  }

  /** Finish the free-length first take (or cancel an armed/recording loop-synced take). */
  stopRecording() {
    const cap = this.capture;
    if (!cap) return;
    if (cap.endFrame === null && cap.started && cap.lastFrame > cap.startFrame) {
      this.finish(cap, cap.lastFrame);
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
    const picked = applyInputMode(c.l, c.r, this.meta.inputMode);
    cap.chunks.push({ frame: c.frame, l: picked.l, r: picked.r });
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
      this.emit();
      return;
    }
    const buf = this.ctx.createBuffer(2, l.length, sr);
    buf.getChannelData(0).set(l);
    buf.getChannelData(1).set(r);
    rt.buffer = buf;
    rt.info.peaks = peaks(l, 600);
    rt.info.state = "playing";

    const firstTake = this.loopLength === null;
    if (firstTake) {
      this.loopLength = buf.duration;
      this.loopStart = this.ctx.currentTime + 0.05;
      this.playing = true;
    }
    if (this.playing) this.startChannel(rt, firstTake ? this.loopStart : null);
    this.emit();
  }

  /* ------------------------------------------------------------------ playback */

  private startChannel(rt: ChannelRuntime, at: number | null) {
    if (!this.ctx || !this.master || !rt.buffer || !this.loopLength) return;
    this.stopSource(rt);
    const gain = rt.gain ?? this.ctx.createGain();
    if (!rt.gain) {
      gain.connect(this.master);
      rt.gain = gain;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = rt.buffer;
    src.loop = true;
    src.connect(gain);
    const when = at ?? this.ctx.currentTime + 0.02;
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
      this.loopStart = this.ctx.currentTime + 0.05;
      this.runtimes.forEach((r) => {
        if (r.buffer) this.startChannel(r, this.loopStart);
      });
    }
    this.emit();
  }

  clear(id: number) {
    if (this.capture?.channel === id) this.cancelCapture();
    const rt = this.runtimes[id];
    this.stopSource(rt);
    rt.buffer = null;
    rt.info.peaks = null;
    rt.info.state = "empty";
    if (!this.runtimes.some((r) => r.buffer)) {
      this.loopLength = null;
      this.playing = true;
    }
    this.emit();
  }

  clearAll() {
    this.runtimes.forEach((_, i) => this.clear(i));
  }

  dispose() {
    this.capture = null;
    this.runtimes.forEach((r) => this.stopSource(r));
    this.stopStream();
    try {
      this.worklet?.disconnect();
      if (this.externalNode && this.externalGain) this.externalNode.disconnect(this.externalGain);
      this.inputBus?.disconnect();
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
    this.externalNode = null;
    this.listeners.clear();
  }
}

function describeError(e: unknown): string {
  const name = (e as { name?: string })?.name;
  const msg = (e as { message?: string })?.message ?? String(e);
  if (name === "NotAllowedError" || name === "SecurityError") return "Microphone access was blocked. Allow it in the browser's site settings, then try again.";
  if (name === "NotFoundError") return "No audio input was found. Plug in your interface and try again.";
  if (name === "NotReadableError") return "The audio input is busy. Close other apps that are using it and try again.";
  return msg;
}

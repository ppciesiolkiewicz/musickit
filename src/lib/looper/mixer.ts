import { effectiveGain, type InputMode } from "./frames";

/**
 * The input side of the looper: a list of input strips (an audio interface input, the built-in mic, or an extra source such
 * as the piano), each with its own channel choice, volume, mute, solo and level meter, summed into one stereo output.
 * Like the engine, this file imports nothing outside src/lib/looper.
 */

export type InputKind = "device" | "extra";

export interface InputInfo {
  id: number;
  kind: InputKind;
  name: string;
  /** audio device id for "device" strips; "" means the system default */
  deviceId: string;
  mode: InputMode;
  volume: number;
  muted: boolean;
  solo: boolean;
  monitor: boolean;
  /** why this input could not be opened */
  error: string | null;
  /** channels the device reports, 0 if unknown */
  channels: number;
  /** device strips only: false until the person connects it, so the browser never asks for the microphone unprompted */
  connected: boolean;
  /** true when it is actually feeding the recorder (not muted, and not silenced by another strip's solo) */
  live: boolean;
}

export interface MixerOptions {
  /** an extra source node (e.g. the piano's output) that lives in the same AudioContext */
  getExtraSource?: () => AudioNode;
  extraLabel?: string;
  onChange: () => void;
}

export interface SavedInput {
  kind: InputKind;
  name: string;
  deviceId: string;
  mode: InputMode;
  volume: number;
}

interface Shared {
  stream: MediaStream;
  source: MediaStreamAudioSourceNode;
  splitter: ChannelSplitterNode;
  refs: number;
  channels: number;
  actualId: string;
}

interface Runtime {
  info: InputInfo;
  pre: GainNode | null;
  summer: GainNode | null;
  gain: GainNode | null;
  meter: AnalyserNode | null;
  monitor: GainNode | null;
  shared: Shared | null;
  buf: Float32Array<ArrayBuffer> | null;
}

export const MAX_INPUTS = 8;
const STORAGE_KEY = "musickit.looper.inputs";

export class InputMixer {
  /** stereo sum of every live input; connect this to the recorder */
  output: GainNode | null = null;
  private ctx: AudioContext | null = null;
  private monitorDest: AudioNode | null = null;
  private runtimes: Runtime[] = [];
  private shared = new Map<string, Shared>();
  private nextId = 0;
  private extraNode: AudioNode | null = null;

  constructor(private opts: MixerOptions) {
    this.runtimes = this.defaults().map((s) => this.make(s, true));
  }

  /* -------------------------------------------------------------- data */

  private defaults(): SavedInput[] {
    const list: SavedInput[] = [];
    if (this.opts.getExtraSource) list.push({ kind: "extra", name: this.opts.extraLabel ?? "Extra", deviceId: "", mode: "stereo", volume: 1 });
    return list;
  }

  private make(s: SavedInput, connected = false): Runtime {
    return {
      info: { id: this.nextId++, kind: s.kind, name: s.name, deviceId: s.deviceId, mode: s.mode, volume: s.volume, muted: false, solo: false, monitor: false, error: null, channels: 0, live: true, connected: s.kind === "extra" ? true : connected },
      pre: null, summer: null, gain: null, meter: null, monitor: null, shared: null, buf: null,
    };
  }

  list(): InputInfo[] {
    const anySolo = this.runtimes.some((r) => r.info.solo);
    return this.runtimes.map((r) => ({ ...r.info, live: effectiveGain(r.info, anySolo) > 0 }));
  }

  hasExtra() {
    return this.runtimes.some((r) => r.info.kind === "extra");
  }

  /** true when a microphone or interface is feeding the recording, so input latency applies */
  hasLiveDevice(): boolean {
    const anySolo = this.runtimes.some((r) => r.info.solo);
    return this.runtimes.some((r) => r.info.kind === "device" && r.info.connected && !r.info.error && effectiveGain(r.info, anySolo) > 0);
  }

  private save() {
    try {
      const data: SavedInput[] = this.runtimes.map((r) => ({ kind: r.info.kind, name: r.info.name, deviceId: r.info.deviceId, mode: r.info.mode, volume: r.info.volume }));
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* storage may be unavailable */
    }
  }

  /** Replace the default strips with the ones saved last time. Call from the browser, before the graph exists. */
  restore() {
    if (this.ctx) return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = (JSON.parse(raw) as SavedInput[]).filter((s) => (s.kind === "device" || (s.kind === "extra" && this.opts.getExtraSource)) && ["left", "right", "stereo", "sum"].includes(s.mode)).slice(0, MAX_INPUTS);
      if (saved.length) {
        this.runtimes = saved.map((s) => this.make({ ...s, volume: Math.min(1.5, Math.max(0, Number(s.volume) || 1)) }));
        this.opts.onChange();
      }
    } catch {
      /* ignore a corrupt save */
    }
  }

  /* -------------------------------------------------------------- graph */

  /** Build the Web Audio graph for every strip. */
  attach(ctx: AudioContext, monitorDest: AudioNode) {
    this.ctx = ctx;
    this.monitorDest = monitorDest;
    this.output = ctx.createGain();
    this.output.channelCount = 2;
    this.output.channelCountMode = "explicit";
    this.output.channelInterpretation = "speakers";
    if (this.opts.getExtraSource) this.extraNode = this.opts.getExtraSource();
    this.runtimes.forEach((r) => this.build(r));
  }

  private build(r: Runtime) {
    const ctx = this.ctx!;
    const pre = ctx.createGain();
    pre.channelCount = 2;
    pre.channelCountMode = "explicit";
    pre.channelInterpretation = "speakers";
    const gain = ctx.createGain();
    const meter = ctx.createAnalyser();
    meter.fftSize = 512;
    const monitor = ctx.createGain();
    monitor.gain.value = r.info.monitor ? 1 : 0;
    pre.connect(meter);
    pre.connect(gain);
    pre.connect(monitor);
    gain.connect(this.output!);
    monitor.connect(this.monitorDest!);
    r.pre = pre;
    r.gain = gain;
    r.meter = meter;
    r.monitor = monitor;
    r.buf = new Float32Array(meter.fftSize) as Float32Array<ArrayBuffer>;
    if (r.info.kind === "extra") this.extraNode?.connect(pre);
    this.applyGains();
  }

  /** Open the audio devices of every device strip. A strip that fails shows its own error; the others carry on. */
  async open() {
    if (!this.ctx) return;
    for (const r of this.runtimes) {
      if (r.info.kind === "device" && r.info.connected) await this.connectDevice(r);
    }
    this.opts.onChange();
  }

  private async connectDevice(r: Runtime) {
    this.release(r);
    r.info.error = null;
    try {
      const sh = await this.acquire(r.info.deviceId);
      r.shared = sh;
      r.info.channels = sh.channels;
      this.route(r);
    } catch (e) {
      r.info.error = describeError(e);
    }
  }

  private async acquire(deviceId: string): Promise<Shared> {
    const key = deviceId;
    const have = this.shared.get(key);
    if (have) {
      have.refs++;
      return have;
    }
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser cannot record audio (getUserMedia is missing). Use HTTPS or localhost.");
    // Raw signal wanted: no echo cancelling, noise suppression or auto gain, which would mangle an instrument.
    const audio: MediaTrackConstraints = {
      echoCancellation: false, noiseSuppression: false, autoGainControl: false,
      channelCount: { ideal: 2 },
      ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
    };
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio });
    } catch (e) {
      if (!deviceId) throw e;
      stream = await navigator.mediaDevices.getUserMedia({ audio: { ...audio, deviceId: undefined } });
    }
    const ctx = this.ctx!;
    const settings = stream.getAudioTracks()[0]?.getSettings?.() ?? {};
    const source = ctx.createMediaStreamSource(stream);
    const splitter = ctx.createChannelSplitter(2);
    source.connect(splitter);
    const sh: Shared = { stream, source, splitter, refs: 1, channels: settings.channelCount ?? 0, actualId: settings.deviceId ?? deviceId };
    this.shared.set(key, sh);
    return sh;
  }

  private release(r: Runtime) {
    const sh = r.shared;
    if (!sh) return;
    this.unroute(r);
    r.shared = null;
    sh.refs--;
    if (sh.refs <= 0) {
      try {
        sh.source.disconnect();
        sh.splitter.disconnect();
      } catch {
        /* already disconnected */
      }
      sh.stream.getTracks().forEach((t) => t.stop());
      for (const [k, v] of this.shared) if (v === sh) this.shared.delete(k);
    }
  }

  private unroute(r: Runtime) {
    const sh = r.shared;
    if (!sh || !r.pre) return;
    const tryDo = (f: () => void) => {
      try {
        f();
      } catch {
        /* that connection did not exist */
      }
    };
    tryDo(() => sh.splitter.disconnect(r.pre!));
    tryDo(() => sh.source.disconnect(r.pre!));
    if (r.summer) {
      tryDo(() => sh.source.disconnect(r.summer!));
      tryDo(() => r.summer!.disconnect());
      r.summer = null;
    }
  }

  private route(r: Runtime) {
    const sh = r.shared;
    if (!sh || !r.pre || !this.ctx) return;
    this.unroute(r);
    switch (r.info.mode) {
      case "left":
        sh.splitter.connect(r.pre, 0, 0);
        break;
      case "right":
        sh.splitter.connect(r.pre, 1, 0);
        break;
      case "stereo":
        sh.source.connect(r.pre);
        break;
      case "sum": {
        const s = this.ctx.createGain();
        s.channelCount = 1;
        s.channelCountMode = "explicit";
        s.channelInterpretation = "speakers";
        sh.source.connect(s);
        s.connect(r.pre);
        r.summer = s;
        break;
      }
    }
  }

  private applyGains() {
    const anySolo = this.runtimes.some((r) => r.info.solo);
    this.runtimes.forEach((r) => {
      if (r.gain) r.gain.gain.value = effectiveGain(r.info, anySolo);
    });
  }

  /* -------------------------------------------------------------- actions */

  private find(id: number) {
    return this.runtimes.find((r) => r.info.id === id);
  }

  /** Add a strip. Returns its id, or null when full or when the extra source is already there. */
  async add(spec: { kind: InputKind; name: string; deviceId?: string; mode?: InputMode }): Promise<number | null> {
    if (this.runtimes.length >= MAX_INPUTS) return null;
    if (spec.kind === "extra" && (this.hasExtra() || !this.opts.getExtraSource)) return null;
    const r = this.make({ kind: spec.kind, name: spec.name, deviceId: spec.deviceId ?? "", mode: spec.mode ?? (spec.kind === "extra" ? "stereo" : "left"), volume: 1 }, true);
    this.runtimes.push(r);
    if (this.ctx) {
      this.build(r);
      this.opts.onChange();
      if (r.info.kind === "device") await this.connectDevice(r);
    }
    this.save();
    this.opts.onChange();
    return r.info.id;
  }

  /** Open the microphone or interface of a restored strip. This is the only way a saved device strip asks for permission. */
  async connect(id: number) {
    const r = this.find(id);
    if (!r || r.info.kind !== "device") return;
    r.info.connected = true;
    this.opts.onChange();
    if (this.ctx) await this.connectDevice(r);
    this.opts.onChange();
  }

  remove(id: number) {
    const r = this.find(id);
    if (!r) return;
    this.release(r);
    if (r.info.kind === "extra") {
      try {
        if (r.pre) this.extraNode?.disconnect(r.pre);
      } catch {
        /* ignore */
      }
    }
    [r.gain, r.pre, r.monitor, r.meter].forEach((n) => {
      try {
        n?.disconnect();
      } catch {
        /* ignore */
      }
    });
    this.runtimes = this.runtimes.filter((x) => x !== r);
    this.applyGains();
    this.save();
    this.opts.onChange();
  }

  rename(id: number, name: string) {
    const r = this.find(id);
    if (!r) return;
    r.info.name = name;
    this.save();
    this.opts.onChange();
  }

  setMode(id: number, mode: InputMode) {
    const r = this.find(id);
    if (!r) return;
    r.info.mode = mode;
    if (r.info.kind === "device") this.route(r);
    this.save();
    this.opts.onChange();
  }

  async setDevice(id: number, deviceId: string) {
    const r = this.find(id);
    if (!r || r.info.kind !== "device") return;
    r.info.deviceId = deviceId;
    this.save();
    if (this.ctx) await this.connectDevice(r);
    this.opts.onChange();
  }

  setVolume(id: number, v: number) {
    const r = this.find(id);
    if (!r) return;
    r.info.volume = v;
    this.applyGains();
    this.save();
    this.opts.onChange();
  }

  toggleMute(id: number) {
    const r = this.find(id);
    if (!r) return;
    r.info.muted = !r.info.muted;
    this.applyGains();
    this.opts.onChange();
  }

  toggleSolo(id: number) {
    const r = this.find(id);
    if (!r) return;
    r.info.solo = !r.info.solo;
    this.applyGains();
    this.opts.onChange();
  }

  setMonitor(id: number, on: boolean) {
    const r = this.find(id);
    if (!r) return;
    r.info.monitor = on;
    if (r.monitor) r.monitor.gain.value = on ? 1 : 0;
    this.opts.onChange();
  }

  /** Peak level of one input, 0..1, measured before mute and volume so you can see signal on a muted strip. */
  getLevel(id: number): number {
    const r = this.find(id);
    if (!r?.meter || !r.buf) return 0;
    r.meter.getFloatTimeDomainData(r.buf);
    let m = 0;
    for (let i = 0; i < r.buf.length; i++) {
      const v = Math.abs(r.buf[i]);
      if (v > m) m = v;
    }
    return m;
  }

  dispose() {
    [...this.runtimes].forEach((r) => this.release(r));
    this.runtimes.forEach((r) => {
      [r.gain, r.pre, r.monitor, r.meter].forEach((n) => {
        try {
          n?.disconnect();
        } catch {
          /* ignore */
        }
      });
      r.gain = r.pre = r.monitor = r.meter = null;
    });
    try {
      this.output?.disconnect();
    } catch {
      /* ignore */
    }
    this.output = null;
    this.ctx = null;
  }
}

export function describeError(e: unknown): string {
  const name = (e as { name?: string })?.name;
  const msg = (e as { message?: string })?.message ?? String(e);
  if (name === "NotAllowedError" || name === "SecurityError") return "Microphone access was blocked. Allow it in the browser's site settings, then try again.";
  if (name === "NotFoundError") return "No audio input was found. Plug in your interface and try again.";
  if (name === "NotReadableError") return "The audio input is busy. Close other apps that are using it and try again.";
  return msg;
}

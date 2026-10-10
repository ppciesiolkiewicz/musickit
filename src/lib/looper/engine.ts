import { LENGTH_STEPS, assemble, effectiveGain, lengthMultiple, loopOffset, takeStatus, type TakeStatus, msToFrames, nextBoundary, peaks, quantUnitFrames, quantiseLength, type Chunk, type InputMode } from "./frames";
import { Metronome, type MetronomeSettings } from "./metronome";
import { Sequencer, type SequencerState } from "./sequencer";
import { fromRows } from "./sequencerPattern";
import { ScalePiano, clampState as clampScalePiano, type ScalePianoState, type VoiceFactory } from "./scalePiano";
import { EffectChain, LoopBus, peakOf } from "./buses";
import { EFFECT_DEFS, defaultParams, moveEffect, clampParams, sanitiseEffects, type EffectKind, type EffectSpec } from "./effects";
import { GROUP_COLOURS, clampPoint, clampRect, containingGroup, defaultGroups, defaultSpot, type GroupLayout } from "./layout";
import { InputMixer, MAX_INPUT_GAIN, describeError, type InputInfo } from "./mixer";
import { PatchGraph } from "./patchAudio";
import { activeLinks, addNode as patchAddNode, connect as patchConnect, disconnect as patchDisconnect, emptyPatch, feeds, layoutAll, moveNode as patchMoveNode, place, removeNode, sanitisePatch, setLinkMuted, setNodeMuted, setSwitchMode, type Patch, type PatchLink } from "./patch";
import { chooseDevice, deviceScore, gearIssues, type DeviceRef, type GearIssue } from "./deviceChoice";
import { ActionHistory, type DoOptions } from "./history";
import { MacroRecorder } from "./macros";
import { PIANO_STARTS, addBus, pianoRig, starterRig } from "./rig";
import type { FxTarget, InputSpec, LooperAction } from "./actions";
import { RECORDER_PROCESSOR_NAME, recorderWorkletUrl } from "./recorderWorklet";

export type { InputInfo } from "./mixer";
export type { LooperAction } from "./actions";
export type { InputMode, Quantise } from "./frames";
export { BPM_RANGE, type MetronomeSettings } from "./metronome";
export { INSTRUMENTS, type Instrument, type SequencerState } from "./sequencer";
export type { VoiceFactory, NoteVoice } from "./scalePiano";
export type { ScalePianoState } from "./scalePiano";
export { EFFECT_DEFS, EFFECT_KINDS, setNamFactory, type EffectKind, type EffectSpec, type ParamDef } from "./effects";
export { registerChoice, getChoice, type ChoiceSource, type ChoiceOption, type CloudSource, type CloudItem } from "./choices";
export { STAGE_W, STAGE_H, VIEW_W, VIEW_H, LOOP_R, GROUP_COLOURS, resizeRect, type Corner } from "./layout";

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
  /** Makes the sound of the Scale Piano (the app passes its sample player); the piano is silent without it. */
  createVoice?: VoiceFactory;
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
  /** planned length of the next take: 0 = free, else bars (first loop) or times the first loop (later loops) */
  plan: number;
  /** recorded length as a multiple of the first loop (1, 2, 4, 8, 16), 0 while empty */
  multiple: number;
}

/** An audio output (speakers, headphones, an audio interface) the browser can play to. */
export interface OutputDevice {
  id: string;
  label: string;
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
  /** audio outputs the browser lists, the one in use ("" = the system default), and whether this browser can choose one */
  outputs: OutputDevice[];
  outputId: string;
  /** how many channels the chosen output has, and which pair (0 = 1-2, 1 = 3-4, ...) the looper plays to */
  outputChannels: number;
  outputPair: number;
  canChooseOutput: boolean;
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
  /** what is connected to what (see patch.ts) */
  patch: Patch;
  /** ids of the connections that carry sound right now (not muted, not closed by a switch) */
  patchActive: string[];
  /** devices that are not connected but probably should be (empty when all is well) */
  gear: GearIssue[];
  masterVolume: number;
  /** effects on the master bus (the global output): before and after its fader */
  masterEffects: EffectSpec[];
  sampleRate: number;
}

interface ChannelRuntime {
  info: ChannelInfo;
  buffer: AudioBuffer | null;
  gain: GainNode | null;
  source: AudioBufferSourceNode | null;
  /** context time of the start of the recording; the loop's phase is counted from here */
  origin: number;
}

interface Capture {
  channel: number;
  /** context time the take is meant to start (before latency compensation) */
  at: number;
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
  /** length of the first loop in frames for a later take, 0 for the first take */
  loopFrames: number;
}

export const MAX_CHANNELS = 8;
export const MAX_FIRST_TAKE_SECONDS = 120;
export { MAX_INPUTS, MAX_INPUT_GAIN } from "./mixer";

const LAYOUT_KEY = "musickit.looper.layout";
const OUTPUT_KEY = "musickit.looper.output";
const PATCH_KEY = "musickit.looper.patch";
/** Saves made before the canvas existed have no positions worth keeping: they are laid out once. */
const PATCH_LAYOUT_KEY = "musickit.looper.patch.layout";
const PREF_KEY = "musickit.looper.preferred";
const RIG_KEY = "musickit.looper.rigDone2";
const PIANO_RIG_KEY = "musickit.looper.pianoRigDone2";
type SinkContext = AudioContext & { setSinkId?: (id: string) => Promise<void> };
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
  /** undo, redo and the list of changes: send every change a person makes through `do` */
  readonly history = new ActionHistory(this);
  /** records the changes a person makes into a macro */
  readonly macroRecorder = new MacroRecorder(this.history);

  private groups: GroupInfo[] = defaultGroupInfos();
  private buses = new Map<string, LoopBus>();
  private fxCounter = 0;
  private groupCounter = 5;
  private masterVolume = 1;
  private masterEffects: EffectSpec[] = [];
  private masterFader: GainNode | null = null;
  private mainOut: GainNode | null = null;
  private outSplit: ChannelSplitterNode | null = null;
  private outMerger: ChannelMergerNode | null = null;
  private outputPair = 0;
  private masterPre: EffectChain | null = null;
  private masterPost: EffectChain | null = null;
  private masterMeter: AnalyserNode | null = null;
  private masterBuf: Float32Array<ArrayBuffer> | null = null;
  private runtimes: ChannelRuntime[] = [];
  private patch: Patch = emptyPatch();
  private pgraph: PatchGraph | null = null;
  /** the last input and output the person used: tried first next time */
  private prefs: { in?: DeviceRef; out?: DeviceRef } = (() => {
    try {
      const j = JSON.parse(window.localStorage.getItem(PREF_KEY) ?? "{}") as { in?: DeviceRef; out?: DeviceRef };
      const ok = (d: unknown): d is DeviceRef => !!d && typeof (d as DeviceRef).id === "string" && typeof (d as DeviceRef).label === "string";
      return { ...(ok(j.in) ? { in: j.in } : {}), ...(ok(j.out) ? { out: j.out } : {}) };
    } catch {
      return {};
    }
  })();
  private loopLength: number | null = null;
  /** recent peak level of the signal reaching the recorder (0..1), for the pulse on a recording loop */
  private captureLevel = 0;
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

  private meta = { status: "idle" as LooperSnapshot["status"], error: null as string | null, devices: [] as InputDevice[], outputs: [] as OutputDevice[], outputId: "", outputChannels: 2, outputPair: 0, canChooseOutput: false, latencyMs: 0 };

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
      masterEffects: this.masterEffects.map((e) => ({ ...e, params: { ...e.params } })),
      patch: this.patch,
      patchActive: activeLinks(this.patch).map((l) => l.id),
      gear: this.meta.status === "ready" ? gearIssues({ strips: this.mixer.list().filter((i) => i.kind === "device").map((i) => ({ id: i.id, name: i.name, deviceId: i.deviceId, connected: i.connected, error: i.error })), devices: this.meta.devices }) : [],
      groups: this.groups.map((g) => ({ ...g, effects: g.effects.map((e) => ({ ...e, params: { ...e.params } })) })),
      sampleRate: this.ctx?.sampleRate ?? 0,
    };
  }

  private emit(patch: Partial<typeof this.meta> = {}) {
    this.syncPatch();
    this.syncPatchAudio();
    this.snap = this.buildSnapshot(patch);
    this.listeners.forEach((l) => l());
  }

  /** Load saved settings. Call once from the browser. */
  /** Make a change that can be undone, listed and recorded. See actions.ts. */
  do(action: LooperAction, o?: DoOptions): boolean {
    return this.history.do(action, o);
  }

  init() {
    // the saved patch is read first: restoring the strips emits, and an emit syncs (and saves) the patch
    let saved: Patch = emptyPatch();
    try {
      saved = sanitisePatch(JSON.parse(window.localStorage.getItem(PATCH_KEY) ?? "null"));
      if (window.localStorage.getItem(PATCH_LAYOUT_KEY) !== "2") {
        saved = layoutAll(saved);
        window.localStorage.setItem(PATCH_LAYOUT_KEY, "2");
      }
    } catch {
      saved = emptyPatch();
    }
    this.patch = saved;
    this.mixer.restore();
    this.metronome.restore();
    this.restoreSequencers();
    this.restoreScalePianos();
    this.restoreLayout();
    this.emit();
    this.setupPianos();
  }

  /**
   * The default pianos, once: a few Scale Pianos with different keys and scales, each with reverb buses of its own that play to the master
   * and the groups (`pianoRig`). Needs no device and opens nothing. Never again after it has run, so removing them sticks. Not part of the history.
   */
  private setupPianos(): void {
    try {
      if (window.localStorage.getItem(PIANO_RIG_KEY)) return;
      window.localStorage.setItem(PIANO_RIG_KEY, "1");
    } catch {
      return;
    }
    const have = this.mixer.list().filter((i) => i.kind === "scalepiano").map((i) => i.id);
    const ids = have.length ? have : PIANO_STARTS.map((st) => this.addScalePianoNow(st)).filter((id): id is number => id !== null);
    if (ids.length) this.addPianoRig(ids);
    this.history.clear();
  }

  /* ------------------------------------------------------------------ patch (what is connected to what) */

  /**
   * Keep the patch in step with what exists: an element for every input, sequencer, group and the master, and none for what is gone.
   * A new element gets the links today's fixed routing implies (an input records into every group, a group plays into master,
   * a sequencer plays into the group it sits in), so nothing changes until the person rewires it.
   */
  private syncPatch() {
    const before = this.patch;
    let p = this.patch;
    const has = (id: string) => p.nodes.some((n) => n.id === id);
    const add = (id: string, kind: Patch["nodes"][number]["kind"]) => {
      p = { ...p, nodes: [...p.nodes, { id, kind, ...place(p, kind), muted: false }] };
    };
    const want = new Set<string>(["master"]);
    if (!has("master")) add("master", "master");
    const groupIds = this.groups.map((g) => g.id);
    for (const g of this.groups) {
      const id = `group:${g.id}`;
      want.add(id);
      if (!has(id)) {
        add(id, "group");
        p = patchConnect(p, id, "master", `to-master:${g.id}`);
        p.nodes.filter((n) => n.kind === "input" || n.kind === "piano").forEach((n) => (p = patchConnect(p, n.id, id, `rec:${n.id}:${g.id}`, "rec")));
      }
    }
    for (const i of this.mixer.list()) {
      if (i.kind === "sequencer") continue;
      const id = `in:${i.id}`;
      want.add(id);
      if (!has(id)) {
        add(id, i.kind === "scalepiano" ? "piano" : "input");
        groupIds.forEach((g) => (p = patchConnect(p, id, `group:${g}`, `rec:${id}:${g}`, "rec")));
      }
    }
    for (const q of this.sequencers.values()) {
      const id = `seq:${q.id}`;
      want.add(id);
      if (!has(id)) {
        add(id, "sequencer");
        const gid = containingGroup(this.groups, q.state.x, q.state.y);
        p = patchConnect(p, id, gid ? `group:${gid}` : "master");
      }
    }
    // an element whose backing thing is gone (removed input, sequencer or group) leaves with its links
    p.nodes.forEach((n) => {
      if (["input", "piano", "sequencer", "group", "master"].includes(n.kind) && !want.has(n.id)) p = removeNode(p, n.id);
    });
    if (p !== before) {
      this.patch = p;
      try {
        window.localStorage.setItem(PATCH_KEY, JSON.stringify(p));
      } catch {
        /* ignore */
      }
    }
  }

  /** Build the audio for the patch (see patchAudio.ts). Does nothing until the audio engine runs. */
  private syncPatchAudio() {
    if (!this.pgraph || !this.master || !this.mixer.output) return;
    const patched = this.pgraph.patchedStrips(this.patch);
    this.mixer.setPatched(patched);
    // a piano that is patched is heard only through the patch: its direct route to the master closes
    this.mixer.list().forEach((i) => {
      if (i.kind === "scalepiano" && i.sourceId) {
        const sp = this.scalePianos.get(i.sourceId);
        if (sp?.toSpeakers) sp.toSpeakers.gain.value = patched.has(i.id) ? 0 : 1;
      }
    });
    this.pgraph.sync(this.patch, { tap: (id) => this.mixer.tap(id), bus: (g) => this.buses.get(g)?.input ?? null, master: this.master, recorder: this.mixer.output });
  }

  /** Add an effect chain or a switch to the canvas. */
  patchAdd(node: Patch["nodes"][number]): boolean {
    const before = this.patch;
    const next = patchAddNode(before, node);
    if (next === before) return false;
    this.savePatch(next);
    return true;
  }

  /** Remove an effect chain or a switch (with its connections). */
  patchRemove(id: string) {
    const n = this.patch.nodes.find((m) => m.id === id);
    if (!n || (n.kind !== "fx" && n.kind !== "switch")) return;
    this.savePatch(removeNode(this.patch, id));
  }

  patchMove(id: string, x: number, y: number) {
    this.savePatch(patchMoveNode(this.patch, id, x, y));
  }

  /** Replace the effects of an effect chain element. */
  patchEffects(id: string, effects: EffectSpec[]) {
    this.savePatch({ ...this.patch, nodes: this.patch.nodes.map((n) => (n.id === id && n.kind === "fx" ? { ...n, effects } : n)) });
  }

  patchRename(id: string, name: string) {
    this.savePatch({ ...this.patch, nodes: this.patch.nodes.map((n) => (n.id === id ? { ...n, name: name.slice(0, 40) } : n)) });
  }

  private savePatch(next: Patch) {
    if (next === this.patch) return;
    this.patch = next;
    try {
      window.localStorage.setItem(PATCH_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    this.emit();
  }

  /** Add a connection (refused if the rules say no). */
  patchLink(link: PatchLink): boolean {
    const before = this.patch;
    const next = patchConnect(before, link.from, link.to, link.id, link.port ?? "bus", link.muted);
    if (next === before) return false;
    this.savePatch(next);
    return true;
  }

  patchUnlink(id: string) {
    this.savePatch(patchDisconnect(this.patch, id));
  }

  patchMute(what: "link" | "node", id: string, muted: boolean) {
    this.savePatch(what === "link" ? setLinkMuted(this.patch, id, muted) : setNodeMuted(this.patch, id, muted));
  }

  patchSwitch(id: string, side: "in" | "out", multi: boolean) {
    this.savePatch(setSwitchMode(this.patch, id, side, multi));
  }

  /** The mixer strips that reach the recorder of a group (all of them for a loop outside every group, as before). */
  private recordSources(groupId: string | null): Set<number> | null {
    if (groupId === null) return null;
    const src = new Set(feeds(this.patch, `group:${groupId}`, "rec"));
    const out = new Set<number>();
    for (const i of this.mixer.list()) {
      // a sequencer strip is switched on and off by the sequencer's own "record" setting, so the gate leaves it alone
      if (i.kind === "sequencer" || src.has(`in:${i.id}`)) out.add(i.id);
    }
    return out;
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
    }, this.options.createVoice);
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

  /** Add a scale piano with its strip at once, with these starting settings. Returns the strip id. */
  addScalePianoNow(start?: Partial<ScalePianoState> & { name?: string }): number | null {
    const id = `p${++this.spCounter}`;
    const piano = this.makeScalePiano(id);
    if (start) piano.set(clampScalePiano({ ...piano.state, ...start }));
    const n = this.mixer.scalePianoIds().length;
    const made = this.mixer.addNow({ kind: "scalepiano", name: start?.name ?? (n === 0 ? "Scale Piano" : `Scale Piano ${n + 1}`), sourceId: id }).id;
    if (made === null) {
      this.disposeScalePiano(id);
      return null;
    }
    this.saveScalePianos();
    this.syncPatch();
    return made;
  }

  /** Add an output bus inside an input (a patch id like "in:3"), with the effects to be put on it afterwards. */
  addBus(input: string): boolean {
    const o = this.patch.nodes.find((n) => n.id === input);
    if (!o || (o.kind !== "input" && o.kind !== "piano")) return false;
    const n = this.patch.nodes.filter((m) => m.owner === input).length;
    const made = addBus({
      input,
      groups: this.groups.map((g) => g.id),
      directLinks: this.patch.links.filter((l) => l.from === input && l.to.startsWith("group:")).map((l) => l.id),
      name: `Bus ${n + 1}`,
      at: { x: o.x, y: o.y + 80 + n * 70 },
    });
    return this.do({ type: "batch", label: "Add output bus", actions: made.actions });
  }

  /** Rigs from before buses lived inside inputs: standalone chains and switches with the old generated ids. A new rig replaces them. */
  private legacyRig(): LooperAction[] {
    return this.patch.nodes.filter((n) => !n.owner && /^(fx|sw):(rig|pno)/.test(n.id)).map((n): LooperAction => ({ type: "patch.removeNode", id: n.id }));
  }

  /** Add the starter piano rig (reverb buses, a Piano Switch) for these piano strips, or for every piano when none are given. One batch. */
  addPianoRig(strips?: number[]): boolean {
    const ids = strips ?? this.mixer.list().filter((i) => i.kind === "scalepiano").map((i) => i.id);
    const inputs = ids.map((i) => `in:${i}`).filter((i) => this.patch.nodes.some((n) => n.id === i));
    if (!inputs.length) return false;
    const rig = pianoRig({
      inputs,
      groups: this.groups.map((g) => g.id),
      directLinks: this.patch.links.filter((l) => inputs.includes(l.from) && l.to.startsWith("group:")).map((l) => l.id),
      at: { x: 20, y: 1120 },
    });
    return this.do({ type: "batch", label: "Piano rig", actions: [...this.legacyRig(), ...rig.actions] });
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

  /** True when something other than the metronome button keeps the grid running: a take, a playing loop or a playing sequencer. */
  private othersRunning() {
    return this.capture !== null || (this.playing && this.loopLength !== null) || [...this.sequencers.values()].some((q) => q.state.playing);
  }

  /**
   * The metronome button. It only starts or stops the metronome; it never starts a loop or a sequencer.
   * The metronome always runs while anything else runs, so then the button only silences or restores the click.
   */
  toggleMetronome() {
    if (!this.ctx) return;
    if (this.othersRunning() && !this.metroManual) {
      this.metronome.set({ audible: !this.metronome.settings.audible });
      this.emit();
      return;
    }
    this.metroManual = !this.metroManual;
    if (this.metroManual && !this.othersRunning()) this.gridAnchor = this.ctx.currentTime + 0.05 + this.metronome.settings.countInBars * this.metronome.settings.beatsPerBar * this.metronome.period;
    this.syncMetronome(this.metroManual && !this.othersRunning());
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
      // the output used last time, if it is still there
      try {
        this.outputPair = Math.max(0, Number(window.localStorage.getItem(OUTPUT_KEY + ".pair")) || 0);
        const saved = window.localStorage.getItem(OUTPUT_KEY);
        if (saved && !this.prefs.out) {
          const o = this.meta.outputs.find((x) => x.id === saved);
          if (o) this.remember({ out: { id: o.id, label: o.label } });
        }
        this.routeMainOut();
      } catch {
        /* ignore */
      }
      navigator.mediaDevices?.addEventListener?.("devicechange", () => void this.refreshDevices());
      await this.waitForRemembered();
      this.emit({ status: "ready" });
      await this.autoConnect().catch(() => undefined);
      this.emit();
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
    // master (everything connects here) -> pre-fader effects -> fader (the master volume) -> post-fader effects -> speakers and meter
    this.master = ctx.createGain();
    this.masterPre = new EffectChain(ctx);
    this.masterFader = ctx.createGain();
    this.masterFader.gain.value = this.masterVolume;
    this.masterPost = new EffectChain(ctx);
    this.master.connect(this.masterPre.input);
    this.masterPre.output.connect(this.masterFader);
    this.masterFader.connect(this.masterPost.input);
    // everything audible ends at mainOut, which is wired to the chosen pair of output channels
    this.mainOut = ctx.createGain();
    this.mainOut.channelCount = 2;
    this.mainOut.channelCountMode = "explicit";
    this.masterPost.output.connect(this.mainOut);
    this.routeMainOut();
    this.masterMeter = ctx.createAnalyser();
    this.masterMeter.fftSize = 512;
    this.masterPost.output.connect(this.masterMeter);
    this.applyMasterEffects();
    this.masterBuf = new Float32Array(this.masterMeter.fftSize) as Float32Array<ArrayBuffer>;
    this.groups.forEach((g) => this.makeBus(g));
    this.sequencers.forEach((q) => {
      q.attach(ctx);
      this.routeSequencer(q);
    });
    this.scalePianos.forEach((p) => this.attachScalePiano(p));
    this.mixer.attach(ctx, this.master);
    this.pgraph = new PatchGraph(ctx);
    this.metronome.attach(ctx, this.mainOut);
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
    const outputs = all.filter((d) => d.kind === "audiooutput" && d.deviceId !== "default" && d.deviceId !== "communications").map((d, i) => ({ id: d.deviceId, label: d.label || `Output ${i + 1}` }));
    this.emit({ devices, outputs, canChooseOutput: this.ctx ? typeof (this.ctx as SinkContext).setSinkId === "function" : false });
  }

  /** Play everything (loops, live monitoring, metronome, piano) through this output. "" = the system default. Needs a browser with AudioContext.setSinkId. */
  private remember(p: { in?: DeviceRef; out?: DeviceRef }) {
    this.prefs = { ...this.prefs, ...p };
    try {
      window.localStorage.setItem(PREF_KEY, JSON.stringify(this.prefs));
    } catch {
      /* ignore */
    }
  }

  /**
   * A remembered interface can take a moment to show up after the page loads. When the browser already lets us see device
   * names, wait (up to a few seconds, while the startup loader shows) for the saved inputs and the remembered input to appear,
   * rather than carrying on without them.
   */
  private async waitForRemembered(maxMs = 5000): Promise<void> {
    if (!(await this.micGranted())) return;
    const wanted = (): DeviceRef[] => {
      const out: DeviceRef[] = this.mixer.list().filter((i) => i.kind === "device" && i.deviceId).map((i) => ({ id: i.deviceId, label: i.name }));
      return out;
    };
    const missing = () => wanted().some((w) => !this.meta.devices.some((d) => d.id === w.id || (w.label && d.label === w.label)));
    const t0 = Date.now();
    while (missing() && Date.now() - t0 < maxMs) {
      await new Promise((r) => setTimeout(r, 400));
      await this.refreshDevices().catch(() => undefined);
    }
  }

  private forgetInput() {
    const { in: _gone, ...rest } = this.prefs;
    void _gone;
    this.prefs = rest;
    try {
      window.localStorage.setItem(PREF_KEY, JSON.stringify(this.prefs));
    } catch {
      /* ignore */
    }
  }

  /** True when the browser has already given microphone access, so opening an input shows no prompt. */
  private async micGranted(): Promise<boolean> {
    try {
      const st = await navigator.permissions?.query({ name: "microphone" as PermissionName });
      return st?.state === "granted";
    } catch {
      return false;
    }
  }

  /**
   * At start, without a prompt: bring back the output chosen last time, and reconnect the saved inputs when the browser already allows
   * the microphone. Devices are only connected for inputs that exist. What is still wrong is listed in `snapshot.gear` for the devices dialog.
   */
  private async autoConnect(): Promise<void> {
    // the output chosen last time comes back if it is there; nothing is chosen otherwise
    const last = this.prefs.out;
    if (this.meta.canChooseOutput && last && last.id !== "") {
      const there = this.meta.outputs.find((o) => o.id === last.id);
      if (there && there.id !== this.meta.outputId) await this.setOutputDevice(there.id, false);
    }
    if (await this.micGranted()) {
      await this.refreshDevices().catch(() => undefined);
      await this.connectGear(false);
      this.setupGuitar();
    } else if (this.mixer.list().some((i) => i.kind === "device")) this.setupGuitar();
  }

  /**
   * The default setup, once: the audio interface's Input 1 (a DI guitar) as an input, with the starter rig (effect presets, the
   * Guitar Switch, master and every group). Only when a device is known (an interface, never the computer's own mic), and never again
   * after it has run, so deleting the rig sticks. Runs after a person's action or when the browser already allows the microphone.
   */
  private setupGuitar(): void {
    try {
      if (window.localStorage.getItem(RIG_KEY)) return;
    } catch {
      /* ignore */
    }
    let strip = this.mixer.list().find((i) => i.kind === "device");
    if (!strip) {
      const pick = chooseDevice(this.meta.devices, this.prefs.in);
      if (!pick || deviceScore(pick.label) <= 0) return;
      const id = this.addInput({ kind: "device", name: pick.label.slice(0, 40), deviceId: pick.id, mode: "left" });
      if (id === null) return;
      this.syncPatch();
      strip = this.mixer.list().find((i) => i.id === id);
    }
    if (!strip || !this.addRig(strip.id)) return;
    try {
      window.localStorage.setItem(RIG_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  /** Connect the input strips that are not connected. `ask` = the person pressed the button (a prompt is fine). No input is ever added for them. */
  async connectGear(ask = true): Promise<void> {
    if (ask) await this.requestDeviceAccess();
    for (const i of this.mixer.list()) if (i.kind === "device" && (!i.connected || i.error)) await this.mixer.connect(i.id);
    if (ask) {
      await this.refreshDevices().catch(() => undefined);
      this.setupGuitar();
    }
    this.emit();
  }

  /**
   * Add the starter guitar rig (buses inside the input, wired to the master and every group's recorder) for a hardware input:
   * the given one, else the first. One undo takes it all away. Returns false when there is no input or the rig is already there.
   */
  addRig(inputId?: number): boolean {
    const strip = this.mixer.list().find((i) => i.kind === "device" && (inputId === undefined || i.id === inputId));
    if (!strip) return false;
    const input = `in:${strip.id}`;
    if (!this.patch.nodes.some((n) => n.id === input)) return false;
    const rig = starterRig({
      input,
      groups: this.groups.map((g) => g.id),
      directLinks: this.patch.links.filter((l) => l.from === input && l.to.startsWith("group:")).map((l) => l.id),
      at: { x: 20, y: 660 + 0 },
    });
    return this.do({ type: "batch", label: "Guitar rig", actions: [...this.legacyRig(), ...rig.actions] });
  }

  async setOutputDevice(id: string, remember = true): Promise<void> {
    const ctx = this.ctx as SinkContext | null;
    if (!ctx || typeof ctx.setSinkId !== "function") return;
    try {
      await ctx.setSinkId(id);
      if (remember) this.remember({ out: { id, label: this.meta.outputs.find((o) => o.id === id)?.label ?? "System default" } });
      try {
        window.localStorage.setItem(OUTPUT_KEY, id);
      } catch {
        /* ignore */
      }
      this.routeMainOut();
      this.emit({ outputId: id });
    } catch {
      this.emit({ outputId: this.meta.outputId });
    }
  }

  /** Wire mainOut to the chosen pair of the output's channels. Pair 0 (or a stereo output) is the plain stereo path. */
  private routeMainOut() {
    const ctx = this.ctx;
    const out = this.mainOut;
    if (!ctx || !out) return;
    try {
      out.disconnect();
      this.outSplit?.disconnect();
      this.outMerger?.disconnect();
    } catch {
      /* nothing connected yet */
    }
    this.outSplit = this.outMerger = null;
    const n = Math.max(2, ctx.destination.maxChannelCount || 2);
    const pair = Math.min(this.outputPair, Math.floor(n / 2) - 1);
    if (n <= 2 || pair <= 0) {
      try {
        ctx.destination.channelCount = 2;
        ctx.destination.channelInterpretation = "speakers";
      } catch {
        /* keep the browser's choice */
      }
      out.connect(ctx.destination);
    } else {
      try {
        ctx.destination.channelCount = n;
        ctx.destination.channelCountMode = "explicit";
        ctx.destination.channelInterpretation = "discrete";
      } catch {
        /* keep the browser's choice */
      }
      this.outSplit = ctx.createChannelSplitter(2);
      this.outMerger = ctx.createChannelMerger(n);
      out.connect(this.outSplit);
      this.outSplit.connect(this.outMerger, 0, pair * 2);
      this.outSplit.connect(this.outMerger, 1, pair * 2 + 1);
      this.outMerger.connect(ctx.destination);
    }
    this.emit({ outputChannels: n, outputPair: Math.max(0, pair) });
  }

  /** Play to the Nth pair of the output's channels (0 = outputs 1-2, 1 = outputs 3-4 ...). Only a multi-channel interface has more than one. */
  setOutputPair(pair: number) {
    this.outputPair = Math.max(0, Math.floor(pair) || 0);
    try {
      window.localStorage.setItem(OUTPUT_KEY + ".pair", String(this.outputPair));
    } catch {
      /* ignore */
    }
    this.routeMainOut();
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
    if (this.masterFader && this.ctx) this.masterFader.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.02);
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
      info: { id, name: `Loop ${id + 1}`, state: "empty", volume: 0.8, muted: false, solo: false, peaks: null, x: spot.x, y: spot.y, groupId: containingGroup(this.groups, spot.x, spot.y), active: true, plan: 0, multiple: 0 },
      buffer: null,
      gain: null,
      source: null,
      origin: 0,
    };
  }

  /** Plan the length of the next take on a loop: 0 = free, else bars for the first loop or times the first loop for later ones. */
  setLoopPlan(id: number, plan: number) {
    const rt = this.runtimes[id];
    if (!rt || !(plan === 0 || (LENGTH_STEPS as readonly number[]).includes(plan))) return;
    rt.info.plan = plan;
    this.emit();
  }

  /** Beats left before this loop's take starts (waiting) or ends (after stop was pressed), or null when neither applies. */
  getCaptureCountdown(id: number): { beats: number; ending: boolean } | null {
    const cap = this.capture;
    if (!cap || cap.channel !== id || !this.ctx) return null;
    const sr = this.ctx.sampleRate;
    const period = this.metronome.period || 0.5;
    const now = this.ctx.currentTime;
    if (!cap.started) {
      const left = cap.at - now;
      return left > 0 ? { beats: Math.max(1, Math.ceil(left / period - 1e-6)), ending: false } : null;
    }
    if (cap.endFrame !== null) {
      const left = cap.at + (cap.endFrame - cap.startFrame) / sr - now;
      return left > 0 ? { beats: Math.max(1, Math.ceil(left / period - 1e-6)), ending: true } : null;
    }
    return null;
  }

  /** Peak level of what is being recorded on this loop (0..1), 0 when it is not recording. */
  getCaptureLevel(id: number): number {
    return this.capture?.channel === id && this.capture.started ? Math.min(1, this.captureLevel) : 0;
  }

  /** Countdown, bar and beat of the take running on this loop, or null. */
  getTakeStatus(id: number): TakeStatus | null {
    const cap = this.capture;
    if (!cap || cap.channel !== id || !this.ctx) return null;
    const sr = this.ctx.sampleRate;
    const m = this.metronome.settings;
    const barSec = m.beatsPerBar * this.metronome.period;
    return takeStatus({
      now: this.ctx.currentTime,
      start: cap.at,
      end: cap.endFrame === null ? null : cap.endFrame / sr - (cap.startFrame / sr - cap.at),
      stopping: cap.stopping,
      started: cap.started,
      period: this.metronome.period,
      beatsPerBar: m.beatsPerBar,
      minBars: cap.loopFrames > 0 ? Math.max(1, Math.round(cap.loopFrames / sr / barSec)) : 1,
    });
  }

  /** Where in its own length a loop is (0..1), or null when it is not playing. */
  getChannelPosition(id: number): number | null {
    const rt = this.runtimes[id];
    if (!this.ctx || !rt?.buffer || !this.playing || !rt.info.active) return null;
    return loopOffset(this.ctx.currentTime, rt.origin, rt.buffer.duration) / rt.buffer.duration;
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
      const j = JSON.parse(raw) as { groups?: Partial<GroupInfo>[]; spots?: Record<string, { x: number; y: number }>; masterEffects?: unknown };
      this.masterEffects = sanitiseEffects(j.masterEffects);
      this.fxCounter = this.masterEffects.reduce((n, e) => Math.max(n, Number(e.id.replace(/\D/g, "")) || 0), this.fxCounter);
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
      window.localStorage.setItem(LAYOUT_KEY, JSON.stringify({ groups: this.groups, spots, masterEffects: this.masterEffects }));
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

  /** Add a group. `id` asks for a particular id (a macro replays with the id it recorded); `patch` and `effects` restore a removed group. */
  addGroup(id?: string, patch?: Partial<Pick<GroupInfo, "name" | "colour" | "volume" | "muted" | "x" | "y" | "w" | "h">>, effects?: { kind: EffectKind; id?: string; post?: boolean; bypass?: boolean; params?: Record<string, number> }[]): string | null {
    if (this.groups.length >= 8) return null;
    const n = ++this.groupCounter;
    const i = this.groups.length;
    const r = clampRect({ x: 30 + i * 24, y: 30 + i * 24, w: 300, h: 260 });
    const gid = id && /^[\w-]{1,24}$/.test(id) && !this.groups.some((x) => x.id === id) ? id : `g${n}`;
    const g: GroupInfo = { id: gid, ...r, name: groupName(i), colour: GROUP_COLOURS[i % GROUP_COLOURS.length], volume: 1, muted: false, effects: [] };
    this.groups.push(g);
    this.makeBus(g);
    if (effects?.length) {
      g.effects = sanitiseEffects(effects.map((e) => ({ ...e, params: clampParams(e.kind, { ...defaultParams(e.kind), ...e.params }) })));
      this.buses.get(g.id)?.setEffects(g.effects);
    }
    if (patch) this.updateGroup(g.id, patch);
    else this.layoutChanged();
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
      // moving a group (not resizing it) carries the loops and sequencers inside it
      const carry = patch.w === undefined && patch.h === undefined;
      const loops = carry ? this.runtimes.filter((r) => r.info.groupId === id) : [];
      const seqs = carry ? [...this.sequencers.values()].filter((q) => containingGroup(this.groups, q.state.x, q.state.y) === id) : [];
      const from = { x: g.x, y: g.y };
      Object.assign(g, clampRect({ x: patch.x ?? g.x, y: patch.y ?? g.y, w: patch.w ?? g.w, h: patch.h ?? g.h }));
      const dx = g.x - from.x, dy = g.y - from.y;
      if (carry && (dx !== 0 || dy !== 0)) {
        loops.forEach((r) => {
          const c = clampPoint(r.info.x + dx, r.info.y + dy);
          r.info.x = c.x;
          r.info.y = c.y;
        });
        seqs.forEach((q) => {
          const c = clampPoint(q.state.x + dx, q.state.y + dy);
          q.setPos(c.x, c.y);
        });
      }
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

  addEffect(groupId: string, kind: EffectKind, post = false, spec: { id?: string; bypass?: boolean; params?: Record<string, number> } = {}): string | null {
    const g = this.groups.find((x) => x.id === groupId);
    if (!g || g.effects.length >= 6 || !EFFECT_DEFS[kind]) return null;
    let id = spec.id && !g.effects.some((e) => e.id === spec.id) ? spec.id : `fx${++this.fxCounter}`;
    while (g.effects.some((e) => e.id === id)) id = `fx${++this.fxCounter}`;
    g.effects.push({ id, kind, bypass: spec.bypass === true, post, params: clampParams(kind, { ...defaultParams(kind), ...spec.params }) });
    this.fxChanged(g);
    return id;
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

  moveEffect(groupId: string, fxId: string, dir: -1 | 1) {
    const g = this.groups.find((x) => x.id === groupId);
    if (!g) return;
    g.effects = moveEffect(g.effects, fxId, dir);
    this.fxChanged(g);
  }

  toggleEffectBypass(groupId: string, fxId: string) {
    const g = this.groups.find((x) => x.id === groupId);
    const e = g?.effects.find((x) => x.id === fxId);
    if (!g || !e) return;
    e.bypass = !e.bypass;
    this.fxChanged(g);
  }

  /* ------------------------------------------------------------------ the rest of what an action can do */

  /** Add a sequencer and its strip at once (the strip exists when this returns). `id` asks for a particular id. */
  addSequencerNow(id?: string): string | null {
    let sid = id && /^[\w-]{1,24}$/.test(id) && !this.sequencers.has(id) ? id : `s${++this.seqCounter}`;
    while (this.sequencers.has(sid)) sid = `s${++this.seqCounter}`;
    this.makeSequencer(sid);
    const n = this.mixer.sequencerIds().length;
    const { id: added } = this.mixer.addNow({ kind: "sequencer", name: n === 0 ? "Drums" : `Drums ${n + 1}`, sourceId: sid });
    if (added === null) {
      this.disposeSequencer(sid);
      return null;
    }
    this.saveSequencers();
    return sid;
  }

  removeSequencer(id: string) {
    const strip = this.mixer.list().find((i) => i.kind === "sequencer" && i.sourceId === id);
    if (strip) this.mixer.remove(strip.id);
  }

  /** Change a sequencer's sound and pattern. Order: instrument, preset, rows, clear, cells, bars, destination, place. */
  setSequencer(id: string, p: { instrument?: string; preset?: string; rows?: string[]; clear?: boolean; cells?: number[][]; bars?: number; dest?: "auto" | "record"; x?: number; y?: number }) {
    const q = this.sequencers.get(id);
    if (!q) return;
    if (p.instrument !== undefined) q.setInstrument(p.instrument);
    if (p.preset !== undefined) q.loadPreset(p.preset);
    if (p.rows !== undefined) q.setCells(fromRows(p.rows.slice(0, q.instrument.lanes.length).concat(Array(Math.max(0, q.instrument.lanes.length - p.rows.length)).fill(""))));
    if (p.clear) q.clearPattern();
    if (p.cells !== undefined && p.cells.length === q.instrument.lanes.length) q.setCells(p.cells);
    if (p.bars !== undefined) q.setBars(p.bars);
    if (p.dest !== undefined) this.setSequencerDest(id, p.dest);
    if (p.x !== undefined || p.y !== undefined) this.moveSequencer(id, p.x ?? q.state.x, p.y ?? q.state.y);
  }

  setSequencerStep(id: string, lane: number, step: number, value: number) {
    this.sequencers.get(id)?.setStep(lane, step, value);
  }

  /** Add a hardware or built-in input. The strip exists when this returns; a device asks for the microphone only now, because a person ran the action. */
  addInput(spec: InputSpec, id?: number): number | null {
    const name = spec.name?.slice(0, 40) || (spec.kind === "extra" ? this.options.externalLabel ?? "Keyboard" : "Input");
    if (spec.kind === "device" && spec.deviceId) {
      const d = this.meta.devices.find((x) => x.id === spec.deviceId);
      if (d) this.remember({ in: { id: d.id, label: d.label } });
    }
    const made = this.mixer.addNow({ kind: spec.kind, name, deviceId: spec.deviceId, mode: spec.mode }, id).id;
    if (made !== null) {
      spec.effects?.slice(0, 6).forEach((e) => this.mixer.addEffect(made, e.kind, e.post === true, { params: e.params }));
      if (spec.monitor !== undefined) this.mixer.setMonitor(made, spec.monitor);
    }
    return made;
  }

  /** Remove a device or built-in input. (Sequencer and Scale Piano strips go with their own remove.) */
  removeInput(id: number) {
    const i = this.mixer.list().find((x) => x.id === id);
    if (i && (i.kind === "device" || i.kind === "extra")) {
      // taking the last interface away means it is no longer wanted: do not offer it again or wait for it
      if (i.kind === "device" && !this.mixer.list().some((x) => x.kind === "device" && x.id !== id)) this.forgetInput();
      this.mixer.remove(id);
    }
  }

  setInput(id: number, p: { name?: string; volume?: number; muted?: boolean; solo?: boolean; monitor?: boolean; mode?: InputMode }) {
    const i = this.mixer.list().find((x) => x.id === id);
    if (!i) return;
    if (p.name !== undefined) this.mixer.rename(id, p.name.slice(0, 40));
    if (p.volume !== undefined) this.mixer.setVolume(id, Math.min(MAX_INPUT_GAIN, Math.max(0, p.volume)));
    if (p.muted !== undefined && p.muted !== i.muted) this.mixer.toggleMute(id);
    if (p.solo !== undefined && p.solo !== i.solo) this.mixer.toggleSolo(id);
    if (p.monitor !== undefined) this.mixer.setMonitor(id, p.monitor);
    if (p.mode !== undefined) this.mixer.setMode(id, p.mode);
  }

  /* effects on a group's bus, an input strip or the master bus, by target */
  private applyMasterEffects() {
    this.masterPre?.setEffects(this.masterEffects.filter((e) => !e.post));
    this.masterPost?.setEffects(this.masterEffects.filter((e) => e.post));
  }

  private masterFxChanged() {
    this.applyMasterEffects();
    this.saveLayout();
    this.emit();
  }

  /** Effects of an effect chain on the canvas: the same list rules as the other places, saved in the patch. */
  private elementFx(id: string, change: (list: EffectSpec[]) => EffectSpec[] | null): boolean {
    const n = this.patch.nodes.find((m) => m.id === id && m.kind === "fx");
    if (!n) return false;
    const next = change((n.effects ?? []).map((e) => ({ ...e, params: { ...e.params } })));
    if (!next) return false;
    this.patchEffects(id, next);
    return true;
  }

  fxAdd(t: FxTarget, fx: { kind: EffectKind; id?: string; post?: boolean; bypass?: boolean; params?: Record<string, number> }): string | null {
    if ("element" in t) {
      let made: string | null = null;
      this.elementFx(t.element, (list) => {
        if (list.length >= 6 || !EFFECT_DEFS[fx.kind]) return null;
        let id = fx.id && !list.some((e) => e.id === fx.id) ? fx.id : `fx${++this.fxCounter}`;
        while (list.some((e) => e.id === id)) id = `fx${++this.fxCounter}`;
        made = id;
        return [...list, { id, kind: fx.kind, bypass: fx.bypass === true, post: fx.post === true, params: clampParams(fx.kind, { ...defaultParams(fx.kind), ...fx.params }) }];
      });
      return made;
    }
    if ("master" in t) {
      if (this.masterEffects.length >= 6 || !EFFECT_DEFS[fx.kind]) return null;
      let id = fx.id && !this.masterEffects.some((e) => e.id === fx.id) ? fx.id : `fx${++this.fxCounter}`;
      while (this.masterEffects.some((e) => e.id === id)) id = `fx${++this.fxCounter}`;
      this.masterEffects.push({ id, kind: fx.kind, bypass: fx.bypass === true, post: fx.post === true, params: clampParams(fx.kind, { ...defaultParams(fx.kind), ...fx.params }) });
      this.masterFxChanged();
      return id;
    }
    return "group" in t ? this.addEffect(t.group, fx.kind, fx.post === true, fx) : this.mixer.addEffect(t.input, fx.kind, fx.post === true, fx);
  }

  fxRemove(t: FxTarget, id: string) {
    if ("element" in t) {
      this.elementFx(t.element, (list) => list.filter((e) => e.id !== id));
      return;
    }
    if ("master" in t) {
      this.masterEffects = this.masterEffects.filter((e) => e.id !== id);
      this.masterFxChanged();
    } else if ("group" in t) this.removeEffect(t.group, id);
    else this.mixer.removeEffect(t.input, id);
  }

  fxMove(t: FxTarget, id: string, dir: -1 | 1) {
    if ("element" in t) {
      this.elementFx(t.element, (list) => moveEffect(list, id, dir));
      return;
    }
    if ("master" in t) {
      this.masterEffects = moveEffect(this.masterEffects, id, dir);
      this.masterFxChanged();
    } else if ("group" in t) this.moveEffect(t.group, id, dir);
    else this.mixer.moveEffect(t.input, id, dir);
  }

  fxParam(t: FxTarget, id: string, key: string, value: number) {
    if ("element" in t) {
      this.elementFx(t.element, (list) => list.map((e) => (e.id === id ? { ...e, params: clampParams(e.kind, { ...e.params, [key]: value }) } : e)));
      return;
    }
    if ("master" in t) {
      const e = this.masterEffects.find((x) => x.id === id);
      if (!e) return;
      e.params = clampParams(e.kind, { ...e.params, [key]: value });
      this.masterFxChanged();
    } else if ("group" in t) this.setEffectParam(t.group, id, key, value);
    else this.mixer.setEffectParam(t.input, id, key, value);
  }

  fxBypass(t: FxTarget, id: string, bypass: boolean) {
    if ("element" in t) {
      this.elementFx(t.element, (list) => list.map((e) => (e.id === id ? { ...e, bypass } : e)));
      return;
    }
    if ("master" in t) {
      const e = this.masterEffects.find((x) => x.id === id);
      if (!e || e.bypass === bypass) return;
      e.bypass = bypass;
      this.masterFxChanged();
      return;
    }
    const list = "group" in t ? this.groups.find((g) => g.id === t.group)?.effects : this.mixer.list().find((i) => i.id === t.input)?.effects;
    const e = list?.find((x) => x.id === id);
    if (!e || e.bypass === bypass) return;
    if ("group" in t) this.toggleEffectBypass(t.group, id);
    else this.mixer.toggleEffectBypass(t.input, id);
  }

  /** Put a master effect before (false) or after (true) the master fader. */
  setMasterEffectPost(id: string, post: boolean) {
    const e = this.masterEffects.find((x) => x.id === id);
    if (!e) return;
    e.post = post;
    this.masterFxChanged();
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
    // only what is patched into this loop's group is recorded
    this.mixer.setRecordSources(this.recordSources(rt.info.groupId));
    this.pgraph?.setRecording(rt.info.groupId);

    if (!this.loopLength) {
      const m = this.metronome.settings;
      const unit = quantUnitFrames(m.quantise, m.bpm, m.beatsPerBar, sr);
      let anchor: number;
      let startFrame: number;
      if (this.gridActive() && unit > 0) {
        // the metronome is already running (a sequencer, a loop or the metronome itself): no count-in, the take starts on the next bar or beat line
        anchor = this.gridAnchor;
        const step = (m.quantise === "bar" ? m.beatsPerBar : 1) * this.metronome.period;
        startFrame = Math.round(nextBoundary(this.ctx.currentTime, anchor, step, 0.1) * sr) + comp;
      } else {
        // nothing running: start the metronome with a count-in; the take starts on beat 1
        anchor = this.ctx.currentTime + 0.1 + m.countInBars * m.beatsPerBar * this.metronome.period;
        startFrame = Math.round(anchor * sr) + comp;
      }
      const fresh = anchor !== this.gridAnchor || !this.gridActive();
      // a planned first loop is a number of bars (or beats, when quantising to beats)
      const planned = rt.info.plan > 0 && unit > 0 ? startFrame + rt.info.plan * (m.quantise === "bar" ? m.beatsPerBar : 1) * Math.round(this.metronome.period * sr) : null;
      this.capture = { channel: id, at: startFrame / sr - comp / sr, startFrame, endFrame: planned, chunks: [], lastFrame: startFrame, started: false, unit, stopping: false, loopFrames: 0 };
      rt.info.state = "armed";
      this.gridAnchor = anchor;
      this.loopOnGrid = unit > 0;
      this.syncMetronome(fresh);
      this.emit();
      return;
    }

    const when = nextBoundary(this.ctx.currentTime, this.loopStart, this.loopLength, 0.08);
    const startFrame = Math.round(when * sr) + comp;
    // a planned later take is n times the first loop; a free one runs until stopped and is rounded up to 1, 2, 4, 8 or 16 loops
    const loopFrames = Math.round(this.loopLength * sr);
    const endFrame = rt.info.plan > 0 ? startFrame + rt.info.plan * loopFrames : null;
    this.capture = { channel: id, at: when, startFrame, endFrame, chunks: [], lastFrame: startFrame, started: false, unit: 0, stopping: false, loopFrames };
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
      const later = cap.loopFrames > 0;
      const target = cap.startFrame + (later ? lengthMultiple(cap.lastFrame - cap.startFrame, cap.loopFrames) * cap.loopFrames : quantiseLength(cap.lastFrame - cap.startFrame, cap.unit));
      if ((cap.unit === 0 && !later) || target <= cap.lastFrame) {
        this.finish(cap, !later && cap.unit === 0 ? cap.lastFrame : target);
      } else {
        // keep recording up to the beat or bar line, then close the take
        cap.endFrame = target;
        cap.stopping = true;
        this.emit();
      }
    } else if (cap.endFrame !== null && cap.started) {
      // a later take that has begun runs to the end of the loop (quantised); pressing again must not throw it away
      return;
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
    this.mixer.setRecordSources(null);
    this.pgraph?.setRecording(undefined);
    this.syncMetronome();
    this.emit();
  }

  private onChunk(c: Chunk) {
    const cap = this.capture;
    if (!cap || !this.ctx) return;
    const n = c.l.length;
    const end = c.frame + n;
    let pk = 0;
    for (let i = 0; i < n; i += 4) pk = Math.max(pk, Math.abs(c.l[i]), Math.abs(c.r[i]));
    this.captureLevel = Math.max(pk, this.captureLevel * 0.8);
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
    this.mixer.setRecordSources(null);
    this.pgraph?.setRecording(undefined);
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
    rt.origin = cap.at;

    const firstTake = this.loopLength === null;
    if (firstTake) {
      this.loopLength = buf.duration;
      this.playing = true;
      // on the grid: the loop restarts on a multiple of its length after beat 1, so it stays in time with the clicks
      // on the grid the loop is already running: its start is the end of the take, so it plays on at once, in phase (no wait for the next round)
      this.loopStart = this.loopOnGrid ? cap.at + Math.floor((this.ctx.currentTime - cap.at) / this.loopLength) * this.loopLength : this.ctx.currentTime + 0.05;
      if (!this.loopOnGrid) this.gridAnchor = this.loopStart;
      if (!this.loopOnGrid) rt.origin = this.loopStart;
    }
    rt.info.multiple = firstTake ? 1 : Math.max(1, Math.round(buf.duration / (this.loopLength as number)));
    if (this.playing) this.startChannel(rt, firstTake && !this.loopOnGrid ? this.loopStart : null);
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
    const offset = at !== null ? 0 : loopOffset(when, rt.origin, rt.buffer.duration);
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
        if (r.buffer) r.origin = this.loopStart;
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
    rt.info.multiple = 0;
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
    this.pgraph?.dispose();
    this.pgraph = null;
    this.buses.forEach((b) => b.dispose());
    this.buses.clear();
    this.masterPre?.dispose();
    this.masterPost?.dispose();
    this.masterPre = null;
    this.masterPost = null;
    this.masterFader = null;
    this.mainOut = this.outSplit = this.outMerger = null;
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

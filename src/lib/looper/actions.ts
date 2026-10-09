/**
 * Looper actions: the one typed vocabulary for every change a person can make to a mix.
 *
 * An action is plain data (JSON-safe, no functions) so it can be applied, undone, listed in the history, recorded into a macro and replayed.
 * `applyAction` performs one, `inverseOf` works out the action that undoes it from the state before it ran.
 *
 * To add an action: add it to `LooperAction`, then handle it in `applyAction`, `inverseOf`, `describeAction`, `coalesceKey` (if it is a drag or a slider)
 * and `isAction`. `actions.test.ts` checks that undo really restores the state. See spec/looper-actions.md.
 * This file imports only types from inside src/lib/looper.
 */
import type { MetronomeSettings } from "./metronome";
import { EFFECT_DEFS, moveEffect, type EffectKind } from "./effects";
import type { InputMode } from "./frames";

export type GroupPatch = { name?: string; colour?: string; volume?: number; muted?: boolean; x?: number; y?: number; w?: number; h?: number };
export type MetronomePatch = Partial<MetronomeSettings>;

export type LooperAction =
  | { type: "loop.volume"; id: number; value: number }
  | { type: "loop.mute"; id: number; muted: boolean }
  | { type: "loop.solo"; id: number; solo: boolean }
  | { type: "loop.rename"; id: number; name: string }
  | { type: "loop.move"; id: number; x: number; y: number }
  | { type: "loop.active"; id: number; on: boolean }
  | { type: "group.set"; id: string; patch: GroupPatch }
  | { type: "group.active"; id: string; on: boolean }
  | { type: "master.volume"; value: number }
  | { type: "metronome.set"; patch: MetronomePatch }
  | { type: "playback.set"; on: boolean }
  | { type: "effect.param"; groupId: string; fxId: string; key: string; value: number }
  | { type: "effect.bypass"; groupId: string; fxId: string; bypass: boolean }
  | { type: "effect.post"; groupId: string; fxId: string; post: boolean }
  | { type: "sequencer.move"; id: string; x: number; y: number }
  | { type: "sequencer.playing"; id: string; on: boolean }
  | { type: "sequencer.dest"; id: string; dest: "auto" | "record" }
  | { type: "group.add"; id?: string; patch?: GroupPatch; effects?: (FxSpec & { id: string })[] }
  | { type: "group.remove"; id: string }
  | { type: "loop.add" }
  | { type: "loop.removeLast" }
  | { type: "loop.clear"; id: number }
  | { type: "loop.clearAll" }
  | { type: "loop.record"; id: number }
  | { type: "record.stop" }
  | { type: "sequencer.add"; id?: string }
  | { type: "sequencer.remove"; id: string }
  | { type: "sequencer.set"; id: string; patch: SeqPatch }
  /** one step of the pattern: lane 0 is the top row, value 0 off, 1 step, 2 accent */
  | { type: "sequencer.step"; id: string; lane: number; step: number; value: 0 | 1 | 2 }
  | { type: "input.add"; id?: number; spec: InputSpec }
  | { type: "input.remove"; id: number }
  | { type: "input.set"; id: number; patch: InputPatch }
  | { type: "fx.add"; target: FxTarget; fx: FxSpec }
  | { type: "fx.remove"; target: FxTarget; id: string }
  | { type: "fx.move"; target: FxTarget; id: string; dir: -1 | 1 }
  | { type: "fx.param"; target: FxTarget; id: string; key: string; value: number }
  | { type: "fx.bypass"; target: FxTarget; id: string; bypass: boolean }
  | { type: "metronome.toggle" }
  /** several actions as one step (one undo, one history line) */
  | { type: "batch"; label?: string; actions: LooperAction[] };

/** Where an effect lives: on a group's bus, or on an input strip. */
/** Where an effect lives: a group's bus, an input strip, or the master bus (the global output). */
export type FxTarget = { group: string } | { input: number } | { master: true };
export interface FxSpec {
  kind: EffectKind;
  /** a name for it (a macro replays with the id it recorded); made up when left out */
  id?: string;
  post?: boolean;
  bypass?: boolean;
  /** only the ones you want to change from the defaults */
  params?: Record<string, number>;
}
/** A hardware or built-in input. (Sequencer and Scale Piano strips come with `sequencer.add`.) */
export interface InputSpec {
  kind: "device" | "extra";
  name?: string;
  deviceId?: string;
  mode?: InputMode;
}
export type InputPatch = { name?: string; volume?: number; muted?: boolean; solo?: boolean; monitor?: boolean; mode?: InputMode };
/** What can change on a sequencer. Order of application: instrument, preset, rows, clear, cells, then the rest. */
export type SeqPatch = {
  instrument?: string;
  preset?: string;
  /** one string per lane, 16 characters a bar: "x" step, "X" accent, "." off */
  rows?: string[];
  clear?: boolean;
  cells?: number[][];
  bars?: number;
  dest?: "auto" | "record";
  x?: number;
  y?: number;
};

export type ActionType = LooperAction["type"];

/** The part of the engine snapshot the actions read. The engine's own snapshot satisfies it. */
export interface ActionState {
  channels: { id: number; name: string; volume: number; muted: boolean; solo: boolean; x: number; y: number; active: boolean }[];
  groups: { id: string; name: string; colour: string; volume: number; muted: boolean; x: number; y: number; w: number; h: number; effects: EffectState[] }[];
  inputs: { id: number; kind: string; name: string; deviceId: string; mode: InputMode; volume: number; muted: boolean; solo: boolean; monitor: boolean; effects: EffectState[] }[];
  masterVolume: number;
  /** effects on the master bus, before (post: false) and after its fader */
  masterEffects: EffectState[];
  playing: boolean;
  metronome: MetronomeSettings;
  sequencers: { id: string; name: string; x: number; y: number; dest: "auto" | "record"; playing: boolean; instrumentId: string; bars: number; cells: number[][] }[];
}

export interface EffectState {
  id: string;
  kind: EffectKind;
  bypass: boolean;
  post: boolean;
  params: Record<string, number>;
}

/** What `applyAction` needs from the engine. */
export interface ActionTarget {
  getSnapshot(): ActionState;
  setVolume(id: number, v: number): void;
  toggleMute(id: number): void;
  toggleSolo(id: number): void;
  rename(id: number, name: string): void;
  moveChannel(id: number, x: number, y: number): void;
  setLoopActive(id: number, on: boolean): void;
  updateGroup(id: string, patch: GroupPatch): void;
  setGroupActive(id: string, on: boolean): void;
  setMasterVolume(v: number): void;
  setMetronome(patch: MetronomePatch): void;
  setPlaying(on: boolean): void;
  setEffectParam(groupId: string, fxId: string, key: string, value: number): void;
  toggleEffectBypass(groupId: string, fxId: string): void;
  setEffectPost(groupId: string, fxId: string, post: boolean): void;
  moveSequencer(id: string, x: number, y: number): void;
  setSequencerPlaying(id: string, on: boolean): void;
  setSequencerDest(id: string, dest: "auto" | "record"): void;
  /** the creators return the id they made (null when full or refused) */
  addGroup(id?: string, patch?: GroupPatch, effects?: FxSpec[]): string | null;
  removeGroup(id: string): void;
  addChannel(): void;
  removeLastChannel(): void;
  clear(id: number): void;
  clearAll(): void;
  record(id: number): void;
  stopRecording(): void;
  addSequencerNow(id?: string): string | null;
  removeSequencer(id: string): void;
  setSequencer(id: string, patch: SeqPatch): void;
  setSequencerStep(id: string, lane: number, step: number, value: number): void;
  addInput(spec: InputSpec, id?: number): number | null;
  removeInput(id: number): void;
  setInput(id: number, patch: InputPatch): void;
  fxAdd(t: FxTarget, fx: FxSpec): string | null;
  fxRemove(t: FxTarget, id: string): void;
  fxMove(t: FxTarget, id: string, dir: -1 | 1): void;
  fxParam(t: FxTarget, id: string, key: string, value: number): void;
  fxBypass(t: FxTarget, id: string, bypass: boolean): void;
  toggleMetronome(): void;
}

/**
 * Perform an action. Returns the action as it was really done (a creator that was not given an id comes back with the one it was given),
 * or null when it was refused (full, missing target). Record and replay the returned form so ids stay the same.
 */
export function applyAction(t: ActionTarget, a: LooperAction): LooperAction | null {
  switch (a.type) {
    case "loop.volume": t.setVolume(a.id, a.value); return a;
    case "loop.mute": if (t.getSnapshot().channels.find((c) => c.id === a.id)?.muted !== a.muted) t.toggleMute(a.id); return a;
    case "loop.solo": if (t.getSnapshot().channels.find((c) => c.id === a.id)?.solo !== a.solo) t.toggleSolo(a.id); return a;
    case "loop.rename": t.rename(a.id, a.name); return a;
    case "loop.move": t.moveChannel(a.id, a.x, a.y); return a;
    case "loop.active": t.setLoopActive(a.id, a.on); return a;
    case "group.set": t.updateGroup(a.id, a.patch); return a;
    case "group.active": t.setGroupActive(a.id, a.on); return a;
    case "master.volume": t.setMasterVolume(a.value); return a;
    case "metronome.set": t.setMetronome(a.patch); return a;
    case "metronome.toggle": t.toggleMetronome(); return a;
    case "playback.set": t.setPlaying(a.on); return a;
    case "effect.param": t.setEffectParam(a.groupId, a.fxId, a.key, a.value); return a;
    case "effect.bypass": {
      const fx = t.getSnapshot().groups.find((g) => g.id === a.groupId)?.effects.find((e) => e.id === a.fxId);
      if (fx && fx.bypass !== a.bypass) t.toggleEffectBypass(a.groupId, a.fxId);
      return a;
    }
    case "effect.post": t.setEffectPost(a.groupId, a.fxId, a.post); return a;
    case "sequencer.move": t.moveSequencer(a.id, a.x, a.y); return a;
    case "sequencer.playing": t.setSequencerPlaying(a.id, a.on); return a;
    case "sequencer.dest": t.setSequencerDest(a.id, a.dest); return a;

    case "group.add": { const id = t.addGroup(a.id, a.patch, a.effects); return id === null ? null : { ...a, id }; }
    case "group.remove": if (!t.getSnapshot().groups.some((g) => g.id === a.id)) return null; t.removeGroup(a.id); return a;
    case "loop.add": { const n = t.getSnapshot().channels.length; t.addChannel(); return t.getSnapshot().channels.length > n ? a : null; }
    case "loop.removeLast": { const n = t.getSnapshot().channels.length; t.removeLastChannel(); return t.getSnapshot().channels.length < n ? a : null; }
    case "loop.clear": t.clear(a.id); return a;
    case "loop.clearAll": t.clearAll(); return a;
    case "loop.record": t.record(a.id); return a;
    case "record.stop": t.stopRecording(); return a;

    case "sequencer.add": { const id = t.addSequencerNow(a.id); return id === null ? null : { ...a, id }; }
    case "sequencer.remove": if (!t.getSnapshot().sequencers.some((q) => q.id === a.id)) return null; t.removeSequencer(a.id); return a;
    case "sequencer.set": t.setSequencer(a.id, a.patch); return a;
    case "sequencer.step": t.setSequencerStep(a.id, a.lane, a.step, a.value); return a;

    case "input.add": { const id = t.addInput(a.spec, a.id); return id === null ? null : { ...a, id }; }
    case "input.remove": t.removeInput(a.id); return a;
    case "input.set": t.setInput(a.id, a.patch); return a;

    case "fx.add": { const id = t.fxAdd(a.target, a.fx); return id === null ? null : { ...a, fx: { ...a.fx, id } }; }
    case "fx.remove": t.fxRemove(a.target, a.id); return a;
    case "fx.move": t.fxMove(a.target, a.id, a.dir); return a;
    case "fx.param": t.fxParam(a.target, a.id, a.key, a.value); return a;
    case "fx.bypass": t.fxBypass(a.target, a.id, a.bypass); return a;

    case "batch": {
      const done = a.actions.map((x) => applyAction(t, x)).filter((x): x is LooperAction => x !== null);
      return done.length ? { ...a, actions: done } : null;
    }
  }
}

const fxList = (s: ActionState, t: FxTarget): EffectState[] | undefined => ("master" in t ? s.masterEffects : "group" in t ? s.groups.find((g) => g.id === t.group)?.effects : s.inputs.find((i) => i.id === t.input)?.effects);
const specOf = (e: EffectState): FxSpec & { id: string } => ({ id: e.id, kind: e.kind, post: e.post, bypass: e.bypass, params: { ...e.params } });

/**
 * The action that undoes `a`, worked out from the state before `a` runs. Null when `a` would change nothing, points at something that is gone,
 * cannot be undone (recording, clearing), or is a creator that was not given an id yet (ask again with the action `applyAction` returned).
 */
export function inverseOf(a: LooperAction, s: ActionState): LooperAction | null {
  const ch = (id: number) => s.channels.find((c) => c.id === id);
  const gr = (id: string) => s.groups.find((g) => g.id === id);
  const sq = (id: string) => s.sequencers.find((q) => q.id === id);
  const inp = (id: number) => s.inputs.find((i) => i.id === id);
  switch (a.type) {
    case "loop.volume": { const c = ch(a.id); return c ? { type: a.type, id: a.id, value: c.volume } : null; }
    case "loop.mute": { const c = ch(a.id); return c ? { type: a.type, id: a.id, muted: c.muted } : null; }
    case "loop.solo": { const c = ch(a.id); return c ? { type: a.type, id: a.id, solo: c.solo } : null; }
    case "loop.rename": { const c = ch(a.id); return c ? { type: a.type, id: a.id, name: c.name } : null; }
    case "loop.move": { const c = ch(a.id); return c ? { type: a.type, id: a.id, x: c.x, y: c.y } : null; }
    case "loop.active": { const c = ch(a.id); return c ? { type: a.type, id: a.id, on: c.active } : null; }
    case "group.set": {
      const g = gr(a.id);
      if (!g) return null;
      const before: Record<string, unknown> = {};
      (Object.keys(a.patch) as (keyof GroupPatch)[]).forEach((k) => { before[k] = g[k]; });
      return { type: a.type, id: a.id, patch: before as GroupPatch };
    }
    case "group.active": return gr(a.id) ? { type: a.type, id: a.id, on: !a.on } : null;
    case "master.volume": return { type: a.type, value: s.masterVolume };
    case "metronome.set": {
      const before: Record<string, unknown> = {};
      (Object.keys(a.patch) as (keyof MetronomeSettings)[]).forEach((k) => { before[k] = s.metronome[k]; });
      return { type: a.type, patch: before as MetronomePatch };
    }
    case "metronome.toggle": return { type: a.type };
    case "playback.set": return { type: a.type, on: s.playing };
    case "effect.param": {
      const fx = gr(a.groupId)?.effects.find((e) => e.id === a.fxId);
      return fx && a.key in fx.params ? { type: a.type, groupId: a.groupId, fxId: a.fxId, key: a.key, value: fx.params[a.key] } : null;
    }
    case "effect.bypass": { const fx = gr(a.groupId)?.effects.find((e) => e.id === a.fxId); return fx ? { type: a.type, groupId: a.groupId, fxId: a.fxId, bypass: fx.bypass } : null; }
    case "effect.post": { const fx = gr(a.groupId)?.effects.find((e) => e.id === a.fxId); return fx ? { type: a.type, groupId: a.groupId, fxId: a.fxId, post: fx.post } : null; }
    case "sequencer.move": { const q = sq(a.id); return q ? { type: a.type, id: a.id, x: q.x, y: q.y } : null; }
    case "sequencer.playing": { const q = sq(a.id); return q ? { type: a.type, id: a.id, on: q.playing } : null; }
    case "sequencer.dest": { const q = sq(a.id); return q ? { type: a.type, id: a.id, dest: q.dest } : null; }

    case "group.add": return a.id ? { type: "group.remove", id: a.id } : null;
    case "group.remove": {
      const g = gr(a.id);
      if (!g) return null;
      return { type: "group.add", id: g.id, patch: { name: g.name, colour: g.colour, volume: g.volume, muted: g.muted, x: g.x, y: g.y, w: g.w, h: g.h }, effects: g.effects.map(specOf) };
    }
    case "loop.add": return { type: "loop.removeLast" };
    case "loop.removeLast": return s.channels.length > 1 ? { type: "loop.add" } : null;
    case "loop.clear": case "loop.clearAll": case "loop.record": case "record.stop": return null;

    case "sequencer.add": return a.id ? { type: "sequencer.remove", id: a.id } : null;
    case "sequencer.remove": {
      const q = sq(a.id);
      if (!q) return null;
      return { type: "batch", label: `Restore ${q.name}`, actions: [{ type: "sequencer.add", id: q.id }, { type: "sequencer.set", id: q.id, patch: { instrument: q.instrumentId, cells: q.cells, bars: q.bars, dest: q.dest, x: q.x, y: q.y } }] };
    }
    case "sequencer.set": {
      const q = sq(a.id);
      if (!q) return null;
      const p = a.patch;
      const before: SeqPatch = {};
      if (p.instrument !== undefined || p.preset !== undefined || p.rows !== undefined || p.clear !== undefined || p.cells !== undefined) { before.instrument = q.instrumentId; before.cells = q.cells.map((r) => r.slice()); }
      if (p.bars !== undefined) before.bars = q.bars;
      if (p.dest !== undefined) before.dest = q.dest;
      if (p.x !== undefined) before.x = q.x;
      if (p.y !== undefined) before.y = q.y;
      return { type: a.type, id: a.id, patch: before };
    }

    case "sequencer.step": {
      const v = sq(a.id)?.cells[a.lane]?.[a.step];
      return v === undefined ? null : { ...a, value: v as 0 | 1 | 2 };
    }

    case "input.add": return a.id !== undefined ? { type: "input.remove", id: a.id } : null;
    case "input.remove": {
      const i = inp(a.id);
      if (!i || (i.kind !== "device" && i.kind !== "extra")) return null;
      return {
        type: "batch",
        label: `Restore ${i.name}`,
        actions: [
          { type: "input.add", id: i.id, spec: { kind: i.kind, name: i.name, deviceId: i.deviceId, mode: i.mode } },
          { type: "input.set", id: i.id, patch: { volume: i.volume, muted: i.muted, solo: i.solo, monitor: i.monitor } },
          ...i.effects.map((e): LooperAction => ({ type: "fx.add", target: { input: i.id }, fx: specOf(e) })),
        ],
      };
    }
    case "input.set": {
      const i = inp(a.id);
      if (!i) return null;
      const before: Record<string, unknown> = {};
      (Object.keys(a.patch) as (keyof InputPatch)[]).forEach((k) => { before[k] = i[k]; });
      return { type: a.type, id: a.id, patch: before as InputPatch };
    }

    case "fx.add": return a.fx.id ? { type: "fx.remove", target: a.target, id: a.fx.id } : null;
    case "fx.remove": { const e = fxList(s, a.target)?.find((x) => x.id === a.id); return e ? { type: "fx.add", target: a.target, fx: specOf(e) } : null; }
    case "fx.move": {
      const list = fxList(s, a.target);
      if (!list || !list.some((e) => e.id === a.id)) return null;
      const after = moveEffect(list, a.id, a.dir);
      return after === list ? null : { type: a.type, target: a.target, id: a.id, dir: a.dir === 1 ? -1 : 1 };
    }
    case "fx.param": { const e = fxList(s, a.target)?.find((x) => x.id === a.id); return e && a.key in e.params ? { type: a.type, target: a.target, id: a.id, key: a.key, value: e.params[a.key] } : null; }
    case "fx.bypass": { const e = fxList(s, a.target)?.find((x) => x.id === a.id); return e ? { type: a.type, target: a.target, id: a.id, bypass: e.bypass } : null; }

    case "batch": {
      // each member is inverted against the state before the batch; fine because a batch holds changes to different things
      const inv = a.actions.map((x) => inverseOf(x, s)).filter((x): x is LooperAction => x !== null).reverse();
      return inv.length ? { type: "batch", label: a.label, actions: inv } : null;
    }
  }
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

/** A short human label for the history list. */
export function describeAction(a: LooperAction, s?: ActionState): string {
  const loop = (id: number) => s?.channels.find((c) => c.id === id)?.name ?? `Loop ${id + 1}`;
  const group = (id: string) => s?.groups.find((g) => g.id === id)?.name ?? "Group";
  const seq = (id: string) => s?.sequencers.find((q) => q.id === id)?.name ?? "Sequencer";
  switch (a.type) {
    case "loop.volume": return `${loop(a.id)} volume ${pct(a.value)}`;
    case "loop.mute": return `${a.muted ? "Mute" : "Unmute"} ${loop(a.id)}`;
    case "loop.solo": return `${a.solo ? "Solo" : "Unsolo"} ${loop(a.id)}`;
    case "loop.rename": return `Rename loop to ${a.name}`;
    case "loop.move": return `Move ${loop(a.id)}`;
    case "loop.active": return `${a.on ? "Start" : "Stop"} ${loop(a.id)}`;
    case "group.set": {
      const k = Object.keys(a.patch);
      if (k.length === 1 && k[0] === "volume") return `${group(a.id)} volume ${pct(a.patch.volume as number)}`;
      if (k.length === 1 && k[0] === "muted") return `${a.patch.muted ? "Mute" : "Unmute"} ${group(a.id)}`;
      if (k.every((x) => ["x", "y"].includes(x))) return `Move ${group(a.id)}`;
      if (k.every((x) => ["w", "h"].includes(x))) return `Resize ${group(a.id)}`;
      return `Change ${group(a.id)} (${k.join(", ")})`;
    }
    case "group.active": return `${a.on ? "Start" : "Stop"} ${group(a.id)}`;
    case "master.volume": return `Master volume ${pct(a.value)}`;
    case "metronome.set": return `Metronome: ${Object.entries(a.patch).map(([k, v]) => `${k} ${v}`).join(", ")}`;
    case "playback.set": return a.on ? "Play all" : "Stop all";
    case "effect.param": return `${group(a.groupId)} effect ${a.key} ${Math.round(a.value * 100) / 100}`;
    case "effect.bypass": return `${a.bypass ? "Bypass" : "Enable"} an effect on ${group(a.groupId)}`;
    case "effect.post": return `Effect on ${group(a.groupId)} ${a.post ? "after" : "before"} the fader`;
    case "sequencer.move": return `Move ${seq(a.id)}`;
    case "sequencer.playing": return `${a.on ? "Start" : "Stop"} ${seq(a.id)}`;
    case "sequencer.dest": return `${seq(a.id)} → ${a.dest}`;
    case "metronome.toggle": return "Metronome on/off";
    case "group.add": return `Add group${a.patch?.name ? ` ${a.patch.name}` : ""}`;
    case "group.remove": return `Remove ${group(a.id)}`;
    case "loop.add": return "Add a loop";
    case "loop.removeLast": return "Remove the last loop";
    case "loop.clear": return `Clear ${loop(a.id)}`;
    case "loop.clearAll": return "Clear every loop";
    case "loop.record": return `Record ${loop(a.id)}`;
    case "record.stop": return "Stop recording";
    case "sequencer.add": return "Add drums";
    case "sequencer.remove": return `Remove ${seq(a.id)}`;
    case "sequencer.set": {
      const p = a.patch;
      return p.preset || p.rows || p.cells || p.clear ? `${seq(a.id)} pattern${p.preset ? ` ${p.preset}` : ""}` : p.instrument ? `${seq(a.id)} → ${p.instrument}` : p.bars ? `${seq(a.id)} ${p.bars} bar${p.bars === 1 ? "" : "s"}` : `Change ${seq(a.id)}`;
    }
    case "sequencer.step": return `${seq(a.id)} step ${a.step + 1}`;
    case "input.add": return `Add input${a.spec.name ? ` ${a.spec.name}` : ""}`;
    case "input.remove": return `Remove ${s?.inputs.find((i) => i.id === a.id)?.name ?? "input"}`;
    case "input.set": return `Change ${s?.inputs.find((i) => i.id === a.id)?.name ?? "input"} (${Object.keys(a.patch).join(", ")})`;
    case "fx.add": return `Add ${a.fx.kind} to ${fxWhere(a.target, s)}`;
    case "fx.remove": return `Remove effect from ${fxWhere(a.target, s)}`;
    case "fx.move": return `Move effect on ${fxWhere(a.target, s)}`;
    case "fx.param": return `${fxWhere(a.target, s)} effect ${a.key} ${Math.round(a.value * 100) / 100}`;
    case "fx.bypass": return `${a.bypass ? "Bypass" : "Enable"} an effect on ${fxWhere(a.target, s)}`;
    case "batch": return a.label ?? `${a.actions.length} changes`;
  }
}

const fxWhere = (t: FxTarget, s?: ActionState): string => ("master" in t ? "master" : "group" in t ? s?.groups.find((g) => g.id === t.group)?.name ?? "group" : s?.inputs.find((i) => i.id === t.input)?.name ?? "input");

/**
 * Actions with the same key that follow each other closely are one gesture (a slider drag, a move) and share one history line.
 * Null means never merge.
 */
export function coalesceKey(a: LooperAction): string | null {
  switch (a.type) {
    case "loop.volume": return `loop.volume:${a.id}`;
    case "loop.move": return `loop.move:${a.id}`;
    case "loop.rename": return `loop.rename:${a.id}`;
    case "master.volume": return "master.volume";
    case "fx.param": return `fx.param:${JSON.stringify(a.target)}:${a.id}:${a.key}`;
    case "input.set": { const k = Object.keys(a.patch).sort().join(","); return k === "volume" || k === "name" ? `input.set:${a.id}:${k}` : null; }
    case "effect.param": return `effect.param:${a.groupId}:${a.fxId}:${a.key}`;
    case "sequencer.move": return `sequencer.move:${a.id}`;
    case "metronome.set": return `metronome.set:${Object.keys(a.patch).sort().join(",")}`;
    case "group.set": {
      const k = Object.keys(a.patch).sort().join(",");
      return ["volume", "name", "x,y", "h,w", "h,w,x,y"].includes(k) ? `group.set:${a.id}:${k}` : null;
    }
    default: return null;
  }
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === "string";
const isBool = (v: unknown): v is boolean => typeof v === "boolean";
const GROUP_KEYS: Record<string, (v: unknown) => boolean> = { name: isStr, colour: isStr, volume: isNum, muted: isBool, x: isNum, y: isNum, w: isNum, h: isNum };
const METRO_KEYS: Record<string, (v: unknown) => boolean> = { bpm: isNum, beatsPerBar: isNum, volume: isNum, audible: isBool, showBeat: isBool, quantise: isStr, countInBars: isNum };
const MODES = ["left", "right", "stereo", "sum"];
const INPUT_KEYS: Record<string, (v: unknown) => boolean> = { name: isStr, volume: isNum, muted: isBool, solo: isBool, monitor: isBool, mode: (v) => MODES.includes(v as string) };
const isCells = (v: unknown) => Array.isArray(v) && v.length > 0 && v.length <= 16 && v.every((r) => Array.isArray(r) && r.length <= 96 && r.every((n) => n === 0 || n === 1 || n === 2));
const SEQ_KEYS: Record<string, (v: unknown) => boolean> = {
  instrument: isStr, preset: isStr, rows: (v) => Array.isArray(v) && v.length <= 16 && v.every(isStr), clear: isBool, cells: isCells, bars: isNum,
  dest: (v) => v === "auto" || v === "record", x: isNum, y: isNum,
};
const isTarget = (t: unknown): t is FxTarget => typeof t === "object" && t !== null && (isStr((t as { group?: unknown }).group) || isNum((t as { input?: unknown }).input) || (t as { master?: unknown }).master === true);
/** a well-formed effect description of a kind that exists */
const isFx = (f: unknown): boolean => {
  if (typeof f !== "object" || f === null) return false;
  const o = f as Record<string, unknown>;
  return isStr(o.kind) && o.kind in EFFECT_DEFS && (o.id === undefined || isStr(o.id)) && (o.post === undefined || isBool(o.post)) && (o.bypass === undefined || isBool(o.bypass)) &&
    (o.params === undefined || (typeof o.params === "object" && o.params !== null && Object.values(o.params).every(isNum)));
};
const validPatch = (p: unknown, spec: Record<string, (v: unknown) => boolean>): boolean =>
  typeof p === "object" && p !== null && !Array.isArray(p) && Object.entries(p).every(([k, v]) => k in spec && spec[k](v)) && Object.keys(p).length > 0;

/** True when `v` is a well-formed action. Used for macros that come back from storage or from pasted JSON. */
export function isAction(v: unknown, depth = 0): v is LooperAction {
  if (typeof v !== "object" || v === null) return false;
  const a = v as Record<string, unknown>;
  switch (a.type) {
    case "loop.volume": return isNum(a.id) && isNum(a.value);
    case "loop.mute": return isNum(a.id) && isBool(a.muted);
    case "loop.solo": return isNum(a.id) && isBool(a.solo);
    case "loop.rename": return isNum(a.id) && isStr(a.name);
    case "loop.move": return isNum(a.id) && isNum(a.x) && isNum(a.y);
    case "loop.active": return isNum(a.id) && isBool(a.on);
    case "group.set": return isStr(a.id) && validPatch(a.patch, GROUP_KEYS);
    case "group.active": return isStr(a.id) && isBool(a.on);
    case "master.volume": return isNum(a.value);
    case "metronome.set": return validPatch(a.patch, METRO_KEYS);
    case "playback.set": return isBool(a.on);
    case "effect.param": return isStr(a.groupId) && isStr(a.fxId) && isStr(a.key) && isNum(a.value);
    case "effect.bypass": return isStr(a.groupId) && isStr(a.fxId) && isBool(a.bypass);
    case "effect.post": return isStr(a.groupId) && isStr(a.fxId) && isBool(a.post);
    case "sequencer.move": return isStr(a.id) && isNum(a.x) && isNum(a.y);
    case "sequencer.playing": return isStr(a.id) && isBool(a.on);
    case "sequencer.dest": return isStr(a.id) && (a.dest === "auto" || a.dest === "record");
    case "metronome.toggle": case "loop.add": case "loop.removeLast": case "loop.clearAll": case "record.stop": return true;
    case "group.add": return (a.id === undefined || isStr(a.id)) && (a.patch === undefined || validPatch(a.patch, GROUP_KEYS)) && (a.effects === undefined || (Array.isArray(a.effects) && a.effects.every((e) => isFx(e) && isStr((e as { id?: unknown }).id))));
    case "group.remove": return isStr(a.id);
    case "loop.clear": case "loop.record": return isNum(a.id);
    case "sequencer.add": return a.id === undefined || isStr(a.id);
    case "sequencer.remove": return isStr(a.id);
    case "sequencer.set": return isStr(a.id) && validPatch(a.patch, SEQ_KEYS);
    case "sequencer.step": return isStr(a.id) && isNum(a.lane) && isNum(a.step) && (a.value === 0 || a.value === 1 || a.value === 2);
    case "input.add": return (a.id === undefined || isNum(a.id)) && typeof a.spec === "object" && a.spec !== null && ((a.spec as { kind?: unknown }).kind === "device" || (a.spec as { kind?: unknown }).kind === "extra");
    case "input.remove": return isNum(a.id);
    case "input.set": return isNum(a.id) && validPatch(a.patch, INPUT_KEYS);
    case "fx.add": return isTarget(a.target) && isFx(a.fx);
    case "fx.remove": return isTarget(a.target) && isStr(a.id);
    case "fx.move": return isTarget(a.target) && isStr(a.id) && (a.dir === 1 || a.dir === -1);
    case "fx.param": return isTarget(a.target) && isStr(a.id) && isStr(a.key) && isNum(a.value);
    case "fx.bypass": return isTarget(a.target) && isStr(a.id) && isBool(a.bypass);
    case "batch": return depth < 2 && Array.isArray(a.actions) && a.actions.length > 0 && a.actions.every((x) => isAction(x, depth + 1)) && (a.label === undefined || isStr(a.label));
    default: return false;
  }
}

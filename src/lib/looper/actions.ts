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
  /** several actions as one step (one undo, one history line) */
  | { type: "batch"; label?: string; actions: LooperAction[] };

export type ActionType = LooperAction["type"];

/** The part of the engine snapshot the actions read. The engine's own snapshot satisfies it. */
export interface ActionState {
  channels: { id: number; name: string; volume: number; muted: boolean; solo: boolean; x: number; y: number; active: boolean }[];
  groups: { id: string; name: string; colour: string; volume: number; muted: boolean; x: number; y: number; w: number; h: number; effects: { id: string; bypass: boolean; post: boolean; params: Record<string, number> }[] }[];
  masterVolume: number;
  playing: boolean;
  metronome: MetronomeSettings;
  sequencers: { id: string; name: string; x: number; y: number; dest: "auto" | "record"; playing: boolean }[];
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
}

export function applyAction(t: ActionTarget, a: LooperAction): void {
  switch (a.type) {
    case "loop.volume": return t.setVolume(a.id, a.value);
    case "loop.mute": if (t.getSnapshot().channels.find((c) => c.id === a.id)?.muted !== a.muted) t.toggleMute(a.id); return;
    case "loop.solo": if (t.getSnapshot().channels.find((c) => c.id === a.id)?.solo !== a.solo) t.toggleSolo(a.id); return;
    case "loop.rename": return t.rename(a.id, a.name);
    case "loop.move": return t.moveChannel(a.id, a.x, a.y);
    case "loop.active": return t.setLoopActive(a.id, a.on);
    case "group.set": return t.updateGroup(a.id, a.patch);
    case "group.active": return t.setGroupActive(a.id, a.on);
    case "master.volume": return t.setMasterVolume(a.value);
    case "metronome.set": return t.setMetronome(a.patch);
    case "playback.set": return t.setPlaying(a.on);
    case "effect.param": return t.setEffectParam(a.groupId, a.fxId, a.key, a.value);
    case "effect.bypass": {
      const fx = t.getSnapshot().groups.find((g) => g.id === a.groupId)?.effects.find((e) => e.id === a.fxId);
      if (fx && fx.bypass !== a.bypass) t.toggleEffectBypass(a.groupId, a.fxId);
      return;
    }
    case "effect.post": return t.setEffectPost(a.groupId, a.fxId, a.post);
    case "sequencer.move": return t.moveSequencer(a.id, a.x, a.y);
    case "sequencer.playing": return t.setSequencerPlaying(a.id, a.on);
    case "sequencer.dest": return t.setSequencerDest(a.id, a.dest);
    case "batch": return a.actions.forEach((x) => applyAction(t, x));
  }
}

/**
 * The action that undoes `a`, worked out from the state before `a` runs. Null when `a` would change nothing or points at something that is gone.
 */
export function inverseOf(a: LooperAction, s: ActionState): LooperAction | null {
  const ch = (id: number) => s.channels.find((c) => c.id === id);
  const gr = (id: string) => s.groups.find((g) => g.id === id);
  const sq = (id: string) => s.sequencers.find((q) => q.id === id);
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
    case "batch": return a.label ?? `${a.actions.length} changes`;
  }
}

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
    case "batch": return depth < 2 && Array.isArray(a.actions) && a.actions.length > 0 && a.actions.every((x) => isAction(x, depth + 1)) && (a.label === undefined || isStr(a.label));
    default: return false;
  }
}

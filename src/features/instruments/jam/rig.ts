import { ClickTrack, DEFAULT_CLICK, beatIndexAt, beatOf, clampClick, type ClickParams } from "../click/click";
import { clampDrone, type DroneParams } from "../drone/drone";
import { findGroove, grooveBassCells, grooveDrumCells, type GrooveId } from "../sequencer/grooves";
import { BASS, DRONE_ID, DRUMS, Sequencer, type SequencerState } from "../sequencer/sequencer";
import { clampTempo, nextBeat } from "./clock";
import type { LoopConfig } from "../loops/loops";

export const JAM_PARTS = ["drone", "drums", "bass"] as const;
export type JamPart = (typeof JAM_PARTS)[number];
export const BEATS_PER_BAR = 4;

export interface JamPartView {
  state: SequencerState;
  /** sounding now (it may be on its way out: `stopping`) */
  running: boolean;
  stopping: boolean;
  steps: number;
  /** the part's own level: 0 to 1, and muted (the volume is kept) */
  volume: number;
  muted: boolean;
}
export interface PartLevel { volume: number; muted: boolean }
export const DEFAULT_LEVEL: PartLevel = { volume: 1, muted: false };
/** A saved level, repaired: volume 0 to 1, muted a boolean. */
export function clampLevel(l: Partial<PartLevel> | null | undefined): PartLevel {
  const v = Number(l?.volume);
  return { volume: Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : DEFAULT_LEVEL.volume, muted: l?.muted === true };
}
export interface JamSnapshot {
  bpm: number;
  parts: Record<JamPart, JamPartView>;
  /** the groove last set with `setGroove`; null once a step, preset, clear or bar count of the drums or bass changed it (Custom) */
  groove: GrooveId | null;
  /** a follower (a loop) holds sound or records: the tempo stays as it is */
  tempoLocked: boolean;
  /**
   * the metronome click on the same grid: `on` is its own play (`setClick`); `running` is clicking now, which with `followClick` is
   * also whenever another part or a follower plays; `muted` silences it and keeps it going
   */
  click: { on: boolean; running: boolean; volume: number; muted: boolean };
}
/** `loops` is the `LoopDeck`'s, written beside the rig's by the page that hosts both (`musickit.jam`); the rig neither reads nor writes it. */
export interface JamSaved { bpm: number; parts: Partial<Record<JamPart, Partial<SequencerState>>>; loops?: Partial<LoopConfig>[]; click?: { volume?: number; muted?: boolean }; levels?: Partial<Record<JamPart, Partial<PartLevel>>>; groove?: GrooveId | null }

/** The rig's grid, as a follower sees it (handed over in `JamRig.follow`). */
export interface GridHost {
  /** something keeps the grid: a part, the click or a follower sounds (or a take is on its way) */
  busy(): boolean;
  /** the running grid's beat 1, or a new grid `lead` seconds from now (every follower hears it in `onGrid`) */
  grid(lead?: number): number;
}

/**
 * Something that plays on a rig's clock without being one of its parts: the `LoopDeck`. The rig tells it where the grid is and the tempo,
 * starts and stops it with the parts when asked (`start`/`stop` with `withFollowers`), and asks it whether it keeps the grid and whether
 * it locks the tempo. `follow` sets `changed` (call it whenever the follower's state changes) and `host`; `unfollow` clears both.
 */
export interface GridFollower {
  /** it sounds, or a take is on its way: it keeps the grid and the following click */
  busy(): boolean;
  /** it holds sound recorded at this tempo */
  locksTempo(): boolean;
  /** the grid's beat 1 moved here (AudioContext time) */
  onGrid(anchor: number, beatSeconds: number): void;
  /** Play all: start on this beat */
  startAt(at: number): void;
  /** Stop all: stop on this beat */
  stopAt(at: number): void;
  onTempo(bpm: number): void;
  changed?: () => void;
  host?: GridHost | null;
}

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
  private followers: GridFollower[] = [];
  private clickTrack: ClickTrack | null = null;
  private clickOn = false;
  private clickVolume = DEFAULT_CLICK.volume;
  private clickMuted: boolean;
  /** the click also plays whenever another part or a follower does (the drone page), muted until a person wants it */
  private readonly followClick: boolean;
  private groove: GrooveId | null = null;
  private levels: Record<JamPart, PartLevel> = { drone: DEFAULT_LEVEL, drums: DEFAULT_LEVEL, bass: DEFAULT_LEVEL };

  constructor({ followClick = false }: { followClick?: boolean } = {}) {
    this.followClick = followClick;
    this.clickMuted = followClick;
    const timing = () => ({ beatSeconds: this.beat, beatsPerBar: BEATS_PER_BAR });
    const make = (id: JamPart, instrument: string) => {
      const q = new Sequencer(id, timing, () => this.changed());
      q.setInstrument(instrument);
      return q;
    };
    this.seqs = { drone: make("drone", DRONE_ID), drums: make("drums", DRUMS.id), bass: make("bass", BASS.id) };
    this.snap = this.build();
  }

  private get beat() {
    return 60 / this.bpm;
  }

  private build(): JamSnapshot {
    const view = (q: Sequencer): JamPartView => ({ state: q.state, running: q.running, stopping: q.stopping, steps: q.steps, ...this.levels[q.id as JamPart] });
    return {
      bpm: this.bpm,
      parts: { drone: view(this.seqs.drone), drums: view(this.seqs.drums), bass: view(this.seqs.bass) },
      groove: this.groove,
      tempoLocked: this.tempoLocked,
      click: { on: this.clickOn, running: !!this.clickTrack?.playing && !this.clickTrack.ending, volume: this.clickVolume, muted: this.clickMuted },
    };
  }

  private get tempoLocked() {
    return this.followers.some((f) => f.locksTempo());
  }

  private changed() {
    if (!this.seqs || !this.followers) return; // while the constructor makes them
    this.seqs.bass.key = this.seqs.drone.state.drone.root;
    this.snap = this.build();
    this.listeners.forEach((f) => f());
  }

  subscribe = (f: () => void) => {
    this.listeners.add(f);
    return () => this.listeners.delete(f);
  };
  snapshot = () => this.snap;

  /**
   * Play `f` on this rig's clock: it hears the grid and the tempo, keeps the grid while busy, can lock the tempo, and starts and stops
   * with the parts when asked. Returns the unfollow.
   */
  follow(f: GridFollower): () => void {
    if (this.followers.includes(f)) return () => this.unfollow(f);
    this.followers = [...this.followers, f];
    f.host = this.host;
    f.changed = () => {
      this.syncClick();
      this.changed();
    };
    f.onTempo(this.bpm);
    if (this.anchor !== null) f.onGrid(this.anchor, this.beat);
    this.changed();
    return () => this.unfollow(f);
  }

  private unfollow(f: GridFollower) {
    if (!this.followers.includes(f)) return;
    this.followers = this.followers.filter((x) => x !== f);
    f.changed = undefined;
    f.host = null;
    this.syncClick();
    this.changed();
  }

  private readonly host: GridHost = { busy: () => this.busy(), grid: (lead) => this.grid(lead) };

  /** The grid's beat 1 moved: every follower hears it. */
  private setAnchor(a: number) {
    this.anchor = a;
    this.followers.forEach((f) => f.onGrid(a, this.beat));
  }

  /** Load what `save` gave, checking every field. */
  load(saved: Partial<JamSaved> | null | undefined) {
    if (!saved) return;
    this.bpm = clampTempo(Number(saved.bpm));
    for (const p of JAM_PARTS) {
      const s = saved.parts?.[p];
      if (s && s.instrumentId === this.seqs[p].state.instrumentId) this.seqs[p].load(s);
    }
    // the saved cells win: a groove id is only the name they were made from
    this.groove = typeof saved.groove === "string" && findGroove(saved.groove) ? (saved.groove as GrooveId) : null;
    for (const p of JAM_PARTS) this.setLevel(p, clampLevel(saved.levels?.[p]), false);
    if (saved.click) {
      this.clickVolume = clampClick({ volume: saved.click.volume }).volume;
      if (typeof saved.click.muted === "boolean") this.clickMuted = saved.click.muted;
    }
    this.followers.forEach((f) => f.onTempo(this.bpm));
    this.changed();
  }

  /** An older save of the drone alone. */
  loadDrone(p: Partial<DroneParams>) {
    this.seqs.drone.setDrone(clampDrone(p));
  }

  save(): JamSaved {
    return { bpm: this.bpm, parts: { drone: this.seqs.drone.serialize(), drums: this.seqs.drums.serialize(), bass: this.seqs.bass.serialize() }, click: { volume: this.clickVolume, muted: this.clickMuted }, levels: { ...this.levels }, groove: this.groove };
  }

  /** Make the sound: every part into `out`. Call from a person's click, once the context is running. */
  attach(ctx: AudioContext, out: AudioNode) {
    if (this.ctx) return;
    this.ctx = ctx;
    for (const p of JAM_PARTS) {
      this.seqs[p].attach(ctx);
      this.seqs[p].toSpeakers!.connect(out);
      this.applyLevel(p);
    }
    this.clickTrack = new ClickTrack(ctx, out);
  }

  get attached() {
    return this.ctx !== null;
  }

  private sounding = (p: JamPart) => this.seqs[p].running && !this.seqs[p].stopping;
  /** something keeps the grid: a part or a follower sounds, or a take is on its way */
  private busy = () => this.clickOn || JAM_PARTS.some(this.sounding) || this.followers.some((f) => f.busy());

  /** The grid to start on: the running one, or a new one from now on (every follower hears it). */
  private grid(lead = 0.06): number {
    const ctx = this.ctx!;
    if (this.anchor === null || !this.busy()) this.setAnchor(ctx.currentTime + lead);
    return this.anchor!;
  }

  /** Start parts, and with `withFollowers` every follower (each loop that holds sound). */
  start(parts: readonly JamPart[], withFollowers = false) {
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
    if (withFollowers) this.followers.forEach((f) => f.startAt(at));
    this.syncClick();
  }

  stop(parts: readonly JamPart[], withFollowers = false) {
    const ctx = this.ctx;
    const at = ctx && this.anchor !== null ? nextBeat(ctx.currentTime + 0.02, this.anchor, this.beat) : 0;
    for (const p of parts) {
      const q = this.seqs[p];
      q.setPlaying(false);
      if (ctx && q.running && this.anchor !== null) q.stopAt(at);
    }
    if (withFollowers) this.followers.forEach((f) => f.stopAt(at));
    this.syncClick();
  }

  /** A new tempo moves the grid: the parts that play (and the click) start again together on it. */
  setTempo(bpm: number) {
    // recorded loops are so many bars of the tempo they were taken at
    if (this.tempoLocked) return;
    this.bpm = clampTempo(bpm);
    this.followers.forEach((f) => f.onTempo(this.bpm));
    const going = JAM_PARTS.filter(this.sounding);
    const clicking = !!this.clickTrack?.playing && !this.clickTrack.ending;
    if (this.ctx && (going.length || clicking)) {
      const a = this.ctx.currentTime + 0.05;
      this.setAnchor(a);
      going.forEach((p) => this.seqs[p].start(a, a));
      if (clicking) this.clickTrack?.start(this.clickParams, a, a);
    }
    this.changed();
  }

  private get clickParams(): ClickParams {
    return { bpm: this.bpm, beatsPerBar: BEATS_PER_BAR, volume: this.clickMuted ? 0 : this.clickVolume };
  }

  /** another part or a follower is meant to play (or a take is on its way) */
  private othersOn = () => JAM_PARTS.some((p) => this.seqs[p].state.playing) || this.followers.some((f) => f.busy());

  /**
   * Click when wanted: its own play, or (with `followClick`) whenever another part or a follower plays. It joins the grid on its next beat;
   * it stops with the others on the next beat, or at once when its own play stops without `followClick`.
   */
  private syncClick() {
    const ct = this.clickTrack, ctx = this.ctx;
    if (!ct || !ctx) return;
    const want = this.clickOn || (this.followClick && this.othersOn());
    if (want) {
      if (ct.ending) ct.cancelStop();
      else if (!ct.playing) {
        const anchor = this.grid();
        ct.start(this.clickParams, anchor, nextBeat(ctx.currentTime + 0.02, anchor, this.beat));
      }
    } else if (ct.playing && !ct.ending) {
      if (this.followClick && this.anchor !== null) ct.stopAt(nextBeat(ctx.currentTime + 0.02, this.anchor, this.beat));
      else ct.stop();
    }
  }

  /** Start the metronome click on the grid (on its next beat when something plays), or stop it. */
  setClick(on: boolean) {
    this.clickOn = on && !!this.ctx;
    this.syncClick();
    this.changed();
  }

  setClickVolume(volume: number) {
    this.clickVolume = clampClick({ volume }).volume;
    this.clickTrack?.set(this.clickParams);
    this.changed();
  }

  /** Silence the click (it keeps time) or bring it back, at once. */
  setClickMuted(muted: boolean) {
    this.clickMuted = muted;
    this.clickTrack?.set(this.clickParams);
    this.changed();
  }

  /** When the grid's next beat sounds (AudioContext time) while anything keeps it, else null: for a host to play along on the click. */
  nextBeatAt(): number | null {
    if (!this.ctx || this.anchor === null || !this.busy()) return null;
    return nextBeat(this.ctx.currentTime + 0.02, this.anchor, this.beat);
  }

  /** Beats since the grid's beat 1 (fractional; below 0 before it sounds) while anything keeps the grid, else null: for a host's bar to ride the click. */
  gridBeats(): number | null {
    if (!this.ctx || this.anchor === null || !this.busy()) return null;
    return (this.ctx.currentTime - this.anchor) / this.beat;
  }

  /**
   * Start the grid over `lead` seconds from now, the playing parts and the click with it: on beat 1, or `from` beats into it (the grid's
   * beat 1 then lies that far back, and nothing sounds before the restart). Returns when the restart sounds (AudioContext time).
   */
  restart(lead = 0.1, from = 0): number | null {
    const ctx = this.ctx;
    if (!ctx) return null;
    const a = ctx.currentTime + lead;
    const anchor = a - from * this.beat;
    this.setAnchor(anchor);
    JAM_PARTS.filter(this.sounding).forEach((p) => this.seqs[p].start(anchor, a));
    if (this.clickTrack?.playing && !this.clickTrack.ending) this.clickTrack.start(this.clickParams, anchor, a);
    this.changed();
    return a;
  }

  /** The beat of the bar sounding now (0 = beat 1) while anything keeps the grid, else null. */
  beatNow(): number | null {
    if (!this.ctx || this.anchor === null || !this.busy()) return null;
    const i = beatIndexAt(this.ctx.currentTime, this.anchor, this.bpm);
    return i < 0 ? null : beatOf(i, BEATS_PER_BAR);
  }

  /** A part's volume and mute (heard at once, without a click). */
  setLevel(p: JamPart, patch: Partial<PartLevel>, notify = true) {
    this.levels[p] = clampLevel({ ...this.levels[p], ...patch });
    this.applyLevel(p);
    if (notify) this.changed();
  }

  private applyLevel(p: JamPart) {
    const g = this.seqs[p].toSpeakers, ctx = this.ctx;
    if (!g || !ctx) return;
    const { volume, muted } = this.levels[p];
    g.gain.setTargetAtTime(muted ? 0 : volume, ctx.currentTime, 0.015);
  }

  setDrone(patch: Partial<DroneParams>) {
    this.seqs.drone.setDrone(patch);
  }
  /** Drums and bass from a groove: one bar each, its swing on both. The bass cells are degrees, so a key change keeps them. */
  setGroove(id: GrooveId) {
    const g = findGroove(id);
    if (!g) return;
    this.groove = g.id;
    for (const [p, cells] of [["drums", grooveDrumCells(g)], ["bass", grooveBassCells(g)]] as const) {
      this.seqs[p].setBars(1);
      this.seqs[p].setSwing(g.swing);
      this.seqs[p].setCells(cells);
    }
  }
  /** a hand edit of the drums or bass leaves the groove behind */
  private edited(p: JamPart) {
    if (p !== "drone") this.groove = null;
  }
  loadPreset(p: JamPart, id: string) {
    this.edited(p);
    if (p !== "drone") this.seqs[p].setSwing(0);
    this.seqs[p].loadPreset(id);
  }
  setBars(p: JamPart, bars: number) {
    this.edited(p);
    this.seqs[p].setBars(bars);
  }
  clear(p: JamPart) {
    this.edited(p);
    this.seqs[p].clearPattern();
  }
  setStep(p: JamPart, lane: number, step: number, value: number) {
    this.edited(p);
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
    this.clickTrack?.dispose();
    this.clickTrack = null;
    this.clickOn = false;
    this.anchor = null;
    this.ctx = null;
  }
}

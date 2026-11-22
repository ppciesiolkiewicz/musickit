import { arrange, PARTS, type Arrangement, type Part } from "../model/arrange";
import { TempoClock } from "../model/clock";
import { clampSettings, DEFAULT_SETTINGS, playedNumerals, type BandSettings, type PartLevel } from "../model/settings";
import { Song, type SongPosition } from "../model/song";
import { findStyle } from "../model/styles";
import { bassVoice, drumVoice, keysVoice, type Voices } from "./voices";

/**
 * The backing band: plays the arrangement of the chosen progression, key and style on the AudioContext clock.
 *
 * It is only a scheduler. What to play comes from the model (`Song` → `arrange`), the beat ↔ time maths from `TempoClock`,
 * and the sound from the injected voices; so each piece is tested or swapped on its own. Every change goes through `set`,
 * which works the same stopped or playing: the tempo follows from the next unscheduled note, a new progression, key or
 * style takes over on the next bar line. No React: hosts read `getSnapshot` through `subscribe` (useSyncExternalStore).
 *
 * A host that plays a piece with a start and an end (a song chart) sets its `form`: a bar of count-in clicks before
 * beat 0, and how many times round before the band stops by itself. Without one it starts on beat 0 and loops.
 */

/** How a run starts and ends (`Band.setForm`). */
export interface BandForm {
  /** one bar of clicks, a click a beat, before the first chord */
  countIn: boolean;
  /** stop by itself after this many times round the arrangement; null: loop until stopped */
  rounds: number | null;
}

export interface BandDeps {
  context: () => AudioContext;
  /** where the band's sound goes (the app's output bus) */
  destination: () => AudioNode;
  /** resume the context on a person's action */
  wake?: () => Promise<void>;
  /** the voices, built per run into each part's own gain */
  voices?: (ctx: AudioContext, outs: Record<Part, AudioNode>, keys: () => string) => Voices;
}

export interface BandSnapshot {
  settings: BandSettings;
  playing: boolean;
  /** the arrangement chosen (the one about to take over while a change waits for the bar line) */
  arrangement: Arrangement;
}

const LOOKAHEAD = 0.15;
const TICK_MS = 25;
/** a little room before the first note so it is never late */
const START_DELAY = 0.08;
/** the count-in's drum and how loud it is against the band's parts */
const COUNT_LANE = "hat";
const COUNT_LEVEL = 0.9;

const defaultVoices: NonNullable<BandDeps["voices"]> = (ctx, outs, keys) => ({ drums: drumVoice(ctx, outs.drums), bass: bassVoice(ctx, outs.bass), keys: keysVoice(outs.keys, keys) });

const build = (s: BandSettings): Arrangement => arrange(playedNumerals(s), s.tonic, findStyle(s.style));

/** The nodes of one run: the parts' gains into one output that fades out on stop, so ringing notes end cleanly. */
interface Run {
  out: GainNode;
  parts: Record<Part, GainNode>;
  voices: Voices;
  /** the count-in's own drum, straight into the output, so it sounds with the drums muted */
  count: Voices["drums"];
  /** the beats of count-in before beat 0 */
  countBeats: number;
  clock: TempoClock;
  timer: ReturnType<typeof setInterval>;
  /** the song beat scheduled up to */
  scheduled: number;
}

export class Band {
  private snap: BandSnapshot;
  private song: Song;
  private run: Run | null = null;
  /** bumps on every start and stop, so a start still loading samples is dropped if stopped meanwhile */
  private generation = 0;
  private listeners = new Set<() => void>();
  private form: BandForm = { countIn: false, rounds: null };

  constructor(private deps: BandDeps, settings: BandSettings = DEFAULT_SETTINGS) {
    const s = clampSettings(settings);
    const arrangement = build(s);
    this.snap = { settings: s, playing: false, arrangement };
    this.song = new Song(arrangement);
  }

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getSnapshot = (): BandSnapshot => this.snap;

  private publish(patch: Partial<BandSnapshot>) {
    this.snap = { ...this.snap, ...patch };
    this.listeners.forEach((fn) => fn());
  }

  /** Change any setting. Playing or not; see the class notes for when each change is heard. */
  set(patch: Partial<Omit<BandSettings, "levels">> & { levels?: Partial<Record<Part, Partial<PartLevel>>> }): void {
    const prev = this.snap.settings;
    const levels = Object.fromEntries(PARTS.map((p) => [p, { ...prev.levels[p], ...patch.levels?.[p] }]));
    const next = clampSettings({ ...prev, ...patch, levels }, prev);
    const newChords = next.progression !== prev.progression || String(next.numerals) !== String(prev.numerals);
    const trackChanged = newChords || next.tonic !== prev.tonic || next.style !== prev.style;
    const arrangement = trackChanged ? build(next) : this.snap.arrangement;
    if (trackChanged) {
      if (this.run) this.song.queue(arrangement, newChords);
      else this.song.reset(arrangement);
    }
    if (this.run && next.bpm !== prev.bpm) this.run.clock.setTempo(next.bpm, this.run.scheduled);
    if (this.run) this.applyLevels(this.run, next);
    this.publish({ settings: next, arrangement });
  }

  get playing(): boolean {
    return this.snap.playing;
  }

  /** How the next run starts and ends: a count-in bar, a number of times round. A run already playing keeps its count-in and takes the new `rounds`. */
  setForm(form: Partial<BandForm>): void {
    const rounds = form.rounds === undefined ? this.form.rounds : form.rounds !== null && Number.isFinite(form.rounds) && form.rounds >= 1 ? Math.floor(form.rounds) : null;
    this.form = { countIn: form.countIn ?? this.form.countIn, rounds };
  }

  async start(): Promise<void> {
    if (this.run || this.snap.playing) return;
    const gen = ++this.generation;
    this.publish({ playing: true });
    await this.deps.wake?.();
    const ctx = this.deps.context();
    const out = ctx.createGain();
    out.connect(this.deps.destination());
    const parts = Object.fromEntries(PARTS.map((p) => {
      const g = ctx.createGain();
      g.connect(out);
      return [p, g];
    })) as Record<Part, GainNode>;
    const factory = this.deps.voices ?? defaultVoices;
    const keys = () => findStyle(this.snap.settings.style).keys;
    const voices = factory(ctx, parts, keys);
    const countOut = ctx.createGain();
    countOut.gain.value = COUNT_LEVEL;
    countOut.connect(out);
    const count = factory(ctx, { drums: countOut, bass: countOut, keys: countOut }, keys).drums;
    await Promise.all(PARTS.map((p) => voices[p].prepare?.().catch(() => undefined)));
    if (gen !== this.generation) {
      out.disconnect();
      return;
    }
    this.song.reset(this.snap.arrangement);
    // with a count-in the clock starts a bar before beat 0: the clicks fall on the negative beats
    const countBeats = this.form.countIn ? this.snap.arrangement.beatsPerBar : 0;
    const first = ctx.currentTime + START_DELAY + countBeats * (60 / this.snap.settings.bpm);
    const run: Run = { out, parts, voices, count, countBeats, clock: new TempoClock(this.snap.settings.bpm, first), timer: setInterval(() => this.tick(), TICK_MS), scheduled: -countBeats };
    this.applyLevels(run, this.snap.settings);
    this.run = run;
    this.tick();
  }

  stop(): void {
    this.generation++;
    const run = this.run;
    this.run = null;
    if (run) {
      clearInterval(run.timer);
      const ctx = this.deps.context();
      const now = ctx.currentTime;
      run.out.gain.cancelScheduledValues(now);
      run.out.gain.setValueAtTime(run.out.gain.value, now);
      run.out.gain.linearRampToValueAtTime(0, now + 0.06);
      setTimeout(() => run.out.disconnect(), 300);
    }
    if (this.snap.playing) this.publish({ playing: false });
  }

  toggle(): void {
    if (this.snap.playing) this.stop();
    else void this.start();
  }

  /** Where the band is now (the chord to light, the beat), or null while stopped or before the first beat. */
  position(): SongPosition | null {
    const run = this.run;
    if (!run) return null;
    const beat = run.clock.beatAt(this.deps.context().currentTime);
    return beat < 0 ? null : this.song.position(beat);
  }

  /** The click of the count-in sounding now, from 1, and how many there are; null once the first chord has come, or stopped. */
  countIn(): { count: number; of: number } | null {
    const run = this.run;
    if (!run || !run.countBeats) return null;
    const beat = run.clock.beatAt(this.deps.context().currentTime);
    return beat >= 0 ? null : { count: Math.min(run.countBeats, Math.max(1, Math.floor(beat + run.countBeats) + 1)), of: run.countBeats };
  }

  dispose(): void {
    this.stop();
    this.listeners.clear();
  }

  private applyLevels(run: Run, s: BandSettings) {
    const now = this.deps.context().currentTime;
    for (const p of PARTS) {
      const { volume, muted } = s.levels[p];
      run.parts[p].gain.setTargetAtTime(muted ? 0 : volume, now, 0.02);
    }
  }

  private tick() {
    const run = this.run;
    if (!run) return;
    const ctx = this.deps.context();
    // the end of a run with a number of rounds: nothing is scheduled past it, and the band stops when the clock gets there
    const round = this.song.arrangement.beats;
    const end = this.form.rounds && round > 0 ? this.form.rounds * round : Infinity;
    if (run.clock.beatAt(ctx.currentTime) >= end) {
      this.stop();
      return;
    }
    const until = Math.min(run.clock.beatAt(ctx.currentTime + LOOKAHEAD), end);
    if (until <= run.scheduled) return;
    // the count-in: a click on each beat before beat 0, the first one louder
    for (let b = Math.ceil(run.scheduled - 1e-9); b < Math.min(until, 0); b++) {
      const when = run.clock.timeAt(b);
      if (when >= ctx.currentTime - 0.01) run.count.play({ part: "drums", beat: b, beats: 0.25, vel: b === -run.countBeats ? 1 : 0.7, lane: COUNT_LANE }, Math.max(when, ctx.currentTime), 0.25 * run.clock.beatSeconds);
    }
    for (const { at, ev } of this.song.take(Math.max(0, run.scheduled), until)) {
      const when = run.clock.timeAt(at);
      if (when < ctx.currentTime - 0.01) continue; // the tab slept: skip what is already past rather than play it in a heap
      run.voices[ev.part].play(ev, Math.max(when, ctx.currentTime), ev.beats * run.clock.beatSeconds);
    }
    run.scheduled = until;
  }
}

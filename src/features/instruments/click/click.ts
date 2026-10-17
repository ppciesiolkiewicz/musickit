/**
 * A small metronome for the pages: a click scheduled ahead on the AudioContext clock, so it never drifts, with an accent on beat 1.
 * The looper keeps its own (`src/lib/looper/metronome.ts`, tied to its transport); this one is the page's, like the Drone voice it sits
 * beside. Pure Web Audio, imports nothing.
 */

export interface ClickParams {
  bpm: number;
  beatsPerBar: number;
  /** 0 to 1 */
  volume: number;
}

export const DEFAULT_CLICK: ClickParams = { bpm: 80, beatsPerBar: 4, volume: 0.6 };
export const CLICK_MIN_BPM = 30;
export const CLICK_MAX_BPM = 260;
export const CLICK_MAX_BEATS = 12;
const LOOKAHEAD = 0.12;
const TICK_MS = 25;

const num = (v: unknown, lo: number, hi: number, fb: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fb);

/** Check every field of a (possibly saved) value; anything wrong falls back to the default. */
export function clampClick(p: Partial<ClickParams> | null | undefined): ClickParams {
  return {
    bpm: Math.round(num(p?.bpm, CLICK_MIN_BPM, CLICK_MAX_BPM, DEFAULT_CLICK.bpm)),
    beatsPerBar: Math.round(num(p?.beatsPerBar, 1, CLICK_MAX_BEATS, DEFAULT_CLICK.beatsPerBar)),
    volume: num(p?.volume, 0, 1, DEFAULT_CLICK.volume),
  };
}

/** The beat of the bar (0 = the downbeat) that the click at `index` falls on; negative indexes count back from the anchor. */
export const beatOf = (index: number, beatsPerBar: number): number => ((index % beatsPerBar) + beatsPerBar) % beatsPerBar;

/** Index of the beat sounding at `now` on the grid with beat 0 at `anchor`, or -1 before the anchor. */
export const beatIndexAt = (now: number, anchor: number, bpm: number): number => (now < anchor ? -1 : Math.floor(((now - anchor) * bpm) / 60 + 1e-9));

/** Tap tempo: the tempo from the gaps between recent taps (seconds), or null with fewer than two taps. Taps more than 2 s apart start over. */
export function tapTempo(taps: number[]): number | null {
  const recent: number[] = [];
  for (let i = taps.length - 1; i >= 0; i--) {
    if (recent.length && recent[0] - taps[i] > 2) break;
    recent.unshift(taps[i]);
    if (recent.length === 5) break;
  }
  if (recent.length < 2) return null;
  const gap = (recent[recent.length - 1] - recent[0]) / (recent.length - 1);
  return Math.round(Math.min(CLICK_MAX_BPM, Math.max(CLICK_MIN_BPM, 60 / gap)));
}

/** The sounding click. Create it with the context and the node it plays into, then `start`, `set` and `stop`. */
export class ClickTrack {
  private params: ClickParams = DEFAULT_CLICK;
  private out: GainNode;
  private timer: ReturnType<typeof setInterval> | null = null;
  private anchor = 0;
  private next = 0;

  constructor(private ctx: AudioContext, destination: AudioNode) {
    this.out = ctx.createGain();
    this.out.gain.value = this.params.volume;
    this.out.connect(destination);
  }

  get playing() {
    return this.timer !== null;
  }

  private get period() {
    return 60 / this.params.bpm;
  }

  /** Index of the beat sounding now (0 = the first click), or null when stopped. */
  beat(): { beat: number; index: number } | null {
    if (!this.playing) return null;
    const index = beatIndexAt(this.ctx.currentTime, this.anchor, this.params.bpm);
    return index < 0 ? null : { beat: beatOf(index, this.params.beatsPerBar), index };
  }

  /** Start clicking, the downbeat a moment from now. */
  start(p: ClickParams) {
    this.stop();
    this.params = p;
    this.out.gain.value = p.volume;
    this.anchor = this.ctx.currentTime + 0.05;
    this.next = 0;
    this.timer = setInterval(() => this.schedule(), TICK_MS);
    this.schedule();
  }

  /** Change the tempo, bar or volume. A new tempo keeps the beat that is due next where it is and spaces the rest anew. */
  set(p: ClickParams) {
    const old = this.params;
    this.params = p;
    this.out.gain.setTargetAtTime(p.volume, this.ctx.currentTime, 0.02);
    if (!this.playing || old.bpm === p.bpm) return;
    const due = this.anchor + (this.next * 60) / old.bpm;
    this.anchor = due - this.next * this.period;
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private schedule() {
    while (this.anchor + this.next * this.period < this.ctx.currentTime + LOOKAHEAD) {
      const t = this.anchor + this.next * this.period;
      if (t >= this.ctx.currentTime - 0.005) this.click(t, beatOf(this.next, this.params.beatsPerBar) === 0 && this.params.beatsPerBar > 1);
      this.next++;
    }
  }

  private click(t: number, accent: boolean) {
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.value = accent ? 1760 : 1175;
    env.gain.setValueAtTime(accent ? 0.5 : 0.3, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
    osc.connect(env).connect(this.out);
    osc.start(t);
    osc.stop(t + 0.045);
  }

  dispose() {
    this.stop();
    try {
      this.out.disconnect();
    } catch {
      /* already disconnected */
    }
  }
}

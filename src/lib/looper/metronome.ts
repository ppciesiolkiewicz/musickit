import { beatInBar, type Quantise } from "./frames";

/**
 * The looper's metronome: a click scheduled ahead of time on the AudioContext clock, so it never drifts.
 * It is wired to the speakers only, never to the recorder, so clicks are not recorded.
 * Like the rest of the looper this file imports nothing outside src/lib/looper.
 */

export interface MetronomeSettings {
  bpm: number;
  beatsPerBar: number;
  /** 0 to 1 */
  volume: number;
  /** false silences the click but keeps the beat counting and quantising */
  audible: boolean;
  /** show the beat indicator on the looper page */
  showBeat: boolean;
  /** what a first take is rounded to */
  quantise: Quantise;
  /** bars of clicks before the first take starts */
  countInBars: number;
}

export const DEFAULT_METRONOME: MetronomeSettings = { bpm: 100, beatsPerBar: 4, volume: 0.6, audible: true, showBeat: true, quantise: "bar", countInBars: 1 };
export const BPM_RANGE = [40, 240] as const;
const STORAGE_KEY = "musickit.looper.metronome";
const LOOKAHEAD = 0.12;
const TICK_MS = 25;

/** Keep every field inside its allowed range, falling back to the default for anything odd. */
export function sanitiseMetronome(raw: Partial<MetronomeSettings> | null | undefined): MetronomeSettings {
  const d = DEFAULT_METRONOME;
  const r = raw ?? {};
  const num = (v: unknown, lo: number, hi: number, fb: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fb);
  return {
    bpm: Math.round(num(r.bpm, BPM_RANGE[0], BPM_RANGE[1], d.bpm)),
    beatsPerBar: Math.round(num(r.beatsPerBar, 1, 12, d.beatsPerBar)),
    volume: num(r.volume, 0, 1, d.volume),
    audible: typeof r.audible === "boolean" ? r.audible : d.audible,
    showBeat: typeof r.showBeat === "boolean" ? r.showBeat : d.showBeat,
    quantise: r.quantise === "off" || r.quantise === "beat" || r.quantise === "bar" ? r.quantise : d.quantise,
    countInBars: Math.round(num(r.countInBars, 0, 4, d.countInBars)),
  };
}

export class Metronome {
  settings: MetronomeSettings = { ...DEFAULT_METRONOME };
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private anchor = 0;
  /** index of the next beat to schedule, 0 is the downbeat at the anchor */
  private next = 0;
  /** no click at or after this time (a stopping transport); null = no limit */
  private until: number | null = null;

  constructor(private onChange: () => void) {}

  get period() {
    return 60 / this.settings.bpm;
  }

  get running() {
    return this.timer !== null;
  }

  attach(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx;
    this.out = ctx.createGain();
    this.out.connect(destination);
    this.applyVolume();
  }

  restore() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) this.settings = sanitiseMetronome(JSON.parse(raw));
    } catch {
      /* ignore a corrupt save */
    }
    this.onChange();
  }

  set(patch: Partial<MetronomeSettings>) {
    this.settings = sanitiseMetronome({ ...this.settings, ...patch });
    this.applyVolume();
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      /* ignore */
    }
    // a tempo or bar change while running: carry on from the same anchor with the new spacing
    if (this.running) {
      // keep a pending stop line
      const until = this.until;
      this.start(this.anchor);
      this.until = until;
    }
    this.onChange();
  }

  private applyVolume() {
    if (this.out) this.out.gain.value = this.settings.audible ? this.settings.volume : 0;
  }

  /** Run the clicks with beat 1 at `anchor` (an AudioContext time). Clicks begin now, so a future anchor gives a count-in. Calling it again moves the grid. */
  start(anchor: number) {
    if (!this.ctx) return;
    this.anchor = anchor;
    this.until = null;
    const first = Math.ceil((this.ctx.currentTime - anchor) / this.period - 1e-9);
    this.next = first;
    if (!this.timer) this.timer = setInterval(() => this.schedule(), TICK_MS);
    this.schedule();
    this.onChange();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.until = null;
    this.onChange();
  }

  /** Click up to time `t` (exclusive), then stop. */
  stopAt(t: number) {
    this.until = t;
  }

  /** Forget a pending stop line and keep clicking. */
  cancelStop() {
    this.until = null;
  }

  /** Beat position for the display, or null when the metronome is not running. */
  position(): { beat: number; countIn: boolean } | null {
    if (!this.ctx || !this.running) return null;
    const { beat, index } = beatInBar(this.ctx.currentTime, this.anchor, this.period, this.settings.beatsPerBar);
    return { beat, countIn: index < 0 };
  }

  private schedule() {
    const ctx = this.ctx;
    if (!ctx || !this.out) return;
    while (this.anchor + this.next * this.period < ctx.currentTime + LOOKAHEAD) {
      const t = this.anchor + this.next * this.period;
      if (this.until !== null && t >= this.until - 1e-6) {
        this.stop();
        return;
      }
      if (t >= ctx.currentTime - 0.005) this.click(t, (((this.next % this.settings.beatsPerBar) + this.settings.beatsPerBar) % this.settings.beatsPerBar) === 0);
      this.next++;
    }
  }

  private click(t: number, accent: boolean) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = accent ? 1760 : 1175;
    env.gain.setValueAtTime(accent ? 0.5 : 0.3, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
    osc.connect(env);
    env.connect(this.out!);
    osc.start(t);
    osc.stop(t + 0.045);
  }

  dispose() {
    this.stop();
    try {
      this.out?.disconnect();
    } catch {
      /* already disconnected */
    }
    this.out = null;
    this.ctx = null;
  }
}

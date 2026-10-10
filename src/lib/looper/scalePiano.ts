/**
 * Scale Piano: the looper's side of the computer-keyboard piano. The keyboard itself (layout, scales, key handling) and
 * its sound (the sampled instruments) live in the app's sound module; the app injects the sound as a `VoiceFactory`.
 * Here are only the state the looper saves and the nodes it routes (heard on master, recorded through its strip).
 * Like the rest of the looper this file imports nothing outside src/lib/looper.
 */

export interface ScalePianoState {
  /** pitch class of the key, 0 = C */
  root: number;
  /** scale id, as the keyboard knows it (an unknown id plays as major) */
  scale: string;
  /** octave of the bottom row's root (3 = C3, an octave below middle C) */
  octave: number;
}

export const DEFAULT_SCALE_PIANO: ScalePianoState = { root: 0, scale: "major", octave: 3 };
const MIN_OCTAVE = 0;
const MAX_OCTAVE = 6;

export const clampState = (s: Partial<ScalePianoState> | undefined): ScalePianoState => {
  const root = Number.isInteger(s?.root) ? ((s!.root as number) % 12 + 12) % 12 : DEFAULT_SCALE_PIANO.root;
  const scale = typeof s?.scale === "string" && s.scale ? s.scale : DEFAULT_SCALE_PIANO.scale;
  const oct = Number.isInteger(s?.octave) ? (s!.octave as number) : DEFAULT_SCALE_PIANO.octave;
  return { root, scale, octave: Math.max(MIN_OCTAVE, Math.min(MAX_OCTAVE, oct)) };
};

/** Something that can sound notes into a node. The app injects one (its sample player) so the looper uses the same sounds as everything else. */
export interface NoteVoice {
  noteOn(midi: number, velocity?: number): void;
  noteOff(midi: number): void;
  allOff(): void;
}
export type VoiceFactory = (ctx: AudioContext, destination: AudioNode) => NoteVoice;

export class ScalePiano implements NoteVoice {
  state: ScalePianoState = { ...DEFAULT_SCALE_PIANO };
  out: GainNode | null = null;
  toSpeakers: GainNode | null = null;
  toRecord: GainNode | null = null;
  private voice: NoteVoice | null = null;

  /** `makeVoice` supplies the sound; without one the piano is silent */
  constructor(readonly id: string, private onChange: () => void, private makeVoice?: VoiceFactory) {}

  attach(ctx: AudioContext) {
    this.voice?.allOff();
    this.out = ctx.createGain();
    this.out.gain.value = 0.4;
    this.toSpeakers = ctx.createGain();
    this.toRecord = ctx.createGain();
    this.out.connect(this.toSpeakers);
    this.out.connect(this.toRecord);
    this.voice = this.makeVoice?.(ctx, this.out) ?? null;
  }

  load(s: Partial<ScalePianoState> | undefined) {
    this.state = clampState(s);
  }

  serialize(): ScalePianoState {
    return { ...this.state };
  }

  set(patch: Partial<ScalePianoState>) {
    this.allOff();
    this.state = clampState({ ...this.state, ...patch });
    this.onChange();
  }

  /** Start a note. Playing the same note again retriggers it. */
  noteOn(midi: number, velocity = 0.8) {
    this.voice?.noteOn(midi, velocity);
  }

  noteOff(midi: number) {
    this.voice?.noteOff(midi);
  }

  allOff() {
    this.voice?.allOff();
  }

  dispose() {
    this.allOff();
    try {
      [this.out, this.toSpeakers, this.toRecord].forEach((n) => n?.disconnect());
    } catch {
      /* already disconnected */
    }
    this.voice = null;
    this.out = this.toSpeakers = this.toRecord = null;
  }
}

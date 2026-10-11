/**
 * An instrument input: the looper's side of a played instrument (controller + sound generator, see instrumentModel.ts).
 * The keys and pads live in the UI and the sound in the app; the app injects the sound as a `VoiceFactory` and is told what to
 * play as a `VoiceSpec`, so the engine never touches samples or storage. Here are only the saved state and the routed nodes
 * (heard on master unless patched, recorded through its strip). Imports nothing outside src/lib/looper.
 */
import { DEFAULT_INSTRUMENT_STATE, clampInstrument, soundingNote, voiceSpec, type InstrumentState, type VoiceSpec } from "./instrumentModel";

/** Something that can sound notes into a node. The app injects one (its sample player) so the looper uses the same sounds as everything else. */
export interface NoteVoice {
  noteOn(midi: number, velocity?: number): void;
  noteOff(midi: number): void;
  allOff(): void;
  /** switch what it plays */
  setSound?(spec: VoiceSpec): void;
  preload?(): Promise<void>;
  /** let go of anything it registered */
  dispose?(): void;
}
export type VoiceFactory = (ctx: AudioContext, destination: AudioNode, spec: VoiceSpec) => NoteVoice;

export class InstrumentInput {
  state: InstrumentState = DEFAULT_INSTRUMENT_STATE;
  out: GainNode | null = null;
  toSpeakers: GainNode | null = null;
  toRecord: GainNode | null = null;
  private voice: NoteVoice | null = null;
  /** the spec the voice has, as JSON */
  private sound = "";

  /** `makeVoice` supplies the sound; without one the instrument is silent */
  constructor(readonly id: string, private onChange: () => void, private makeVoice?: VoiceFactory) {}

  attach(ctx: AudioContext) {
    this.voice?.allOff();
    this.voice?.dispose?.();
    this.out = ctx.createGain();
    this.out.gain.value = 0.4;
    this.toSpeakers = ctx.createGain();
    this.toRecord = ctx.createGain();
    this.out.connect(this.toSpeakers);
    this.out.connect(this.toRecord);
    const spec = voiceSpec(this.state);
    this.voice = this.makeVoice?.(ctx, this.out, spec) ?? null;
    this.sound = JSON.stringify(spec);
    void this.voice?.preload?.().catch(() => undefined);
  }

  load(s: unknown) {
    this.state = clampInstrument(s);
    this.applySound();
  }

  private applySound() {
    if (!this.voice) return;
    const spec = voiceSpec(this.state);
    const key = JSON.stringify(spec);
    if (key === this.sound) return;
    this.sound = key;
    this.voice.setSound?.(spec);
    void this.voice.preload?.().catch(() => undefined);
  }

  serialize(): InstrumentState {
    return clampInstrument(this.state);
  }

  set(patch: Partial<InstrumentState>) {
    this.allOff();
    this.state = clampInstrument({ ...this.state, ...patch });
    this.applySound();
    this.onChange();
  }

  /** Start a note (a key's MIDI note, or PAD_BASE + pad). Playing the same note again retriggers it. */
  noteOn(midi: number, velocity = 0.8) {
    const n = soundingNote(this.state, midi);
    if (n !== null) this.voice?.noteOn(n, velocity);
  }

  noteOff(midi: number) {
    const n = soundingNote(this.state, midi);
    if (n !== null) this.voice?.noteOff(n);
  }

  allOff() {
    this.voice?.allOff();
  }

  dispose() {
    this.allOff();
    this.voice?.dispose?.();
    try {
      [this.out, this.toSpeakers, this.toRecord].forEach((n) => n?.disconnect());
    } catch {
      /* already disconnected */
    }
    this.voice = null;
    this.out = this.toSpeakers = this.toRecord = null;
  }
}

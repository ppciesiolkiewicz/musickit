/**
 * The one shape every sample player has, so what plays the app's instruments can be swapped without its callers (the live player,
 * the backing band's scheduler, the offline renderer) knowing: our buffer player (`backends/buffer.ts`) or Tone.js
 * (`backends/tone.ts`). Which one an instrument gets is decided in `backends/choose.ts`.
 */

export interface NoteRequest {
  midi: number;
  /** when it starts, on the context's clock */
  at: number;
  /** 0–1; 0.8 is a normal press */
  velocity: number;
  /** held this long, then released; omitted: until `release()` */
  duration?: number;
}

export interface SoundingNote {
  /** when it starts, on the context's clock */
  readonly at: number;
  /** fade out from `at` over the instrument's release, or over `seconds` (a quick release when the same note is pressed again) */
  release(at: number, seconds?: number): void;
  /** cut at `at` */
  stop(at: number): void;
  onEnded(fn: () => void): void;
}

export interface SampleBackend {
  readonly id: "buffer" | "tone";
  /** the sample `midi` plays from is loaded, so `start` can sound it now */
  isLoaded(instrumentId: string, midi: number): boolean;
  /** load the sample `midi` plays from, or every sample of the instrument when `midi` is left out */
  load(instrumentId: string, midi?: number): Promise<void>;
  /** sound a note into `destination`; null when its sample is not loaded yet (call `load`) or it has none (a strict pad) */
  start(instrumentId: string, note: NoteRequest, destination: AudioNode): SoundingNote | null;
}

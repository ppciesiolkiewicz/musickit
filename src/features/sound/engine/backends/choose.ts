/**
 * Which backend plays an instrument live. The built-in instruments play on Tone.js; the sampler's (runtime instruments, blob URLs)
 * and strict pads stay on our buffer player, since Tone always moves the nearest sample to the note and a pad must not be moved.
 * Offline renders always use the buffer player (`playback/offline.ts`), so nothing offline touches Tone's global context.
 */

import type { SampleBackend } from "../backend";
import { getAudioContext } from "../context";
import { getInstrumentConfig } from "../instruments";
import { bufferBackendFor } from "./buffer";
import { toneBackendFor } from "./tone";

export type BackendKind = "buffer" | "tone";

export const backendFor = (config: { strict: boolean; runtime: boolean }): BackendKind => (config.strict || config.runtime ? "buffer" : "tone");

/** Ready an instrument to play at once: its samples, and the backend that plays them (Tone.js loads on first use). */
export const preloadInstrument = (instrumentId: string): Promise<void> => liveBackend(instrumentId).load(instrumentId);

/** The backend an instrument plays on, on the app's live context. */
export function liveBackend(instrumentId: string): SampleBackend {
  const config = getInstrumentConfig(instrumentId);
  const ctx = getAudioContext();
  return config && backendFor(config) === "tone" ? toneBackendFor(ctx) : bufferBackendFor(ctx);
}

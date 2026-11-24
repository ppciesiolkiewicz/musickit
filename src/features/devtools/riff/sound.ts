"use client";

import { createPlayer, getAudioContext, getOutputBus, getSharedPiano, type Player } from "@/features/sound";
import { createNamEffect, getModelLibrary, type NamEffectNode } from "@/features/nam";

/** What the riff maker sounds through: the shared piano, the clean electric guitar samples, or those samples into a NAM amp model. */
export type RiffSound = "piano" | "guitar" | "amp";

/** The sampled instrument that is a clean electric guitar: what an amp model expects at its input. */
const GUITAR = "METAL_GUITAR";

let guitar: Player | null = null;
let amp: NamEffectNode | null = null;
let ampPlayer: Player | null = null;
let ampStatus: (s: string) => void = () => {};

/** Run the amp through library model `id` (0 = none: the clean guitar). `onStatus` hears "loading", "ready", "none" or an error. */
export function setAmpModel(id: number, onStatus: (s: string) => void) {
  ampStatus = onStatus;
  const params = { model: id, input: 0, output: 0, gate: -90, match: 1, size: 1, mix: 1 };
  if (amp) { amp.update(params); return; }
  amp = createNamEffect(getAudioContext(), params, getModelLibrary(), (s) => ampStatus(s.state === "error" ? `Error: ${s.message ?? "the model didn't load"}` : s.state));
  amp.output.connect(getOutputBus());
}

/** The player for a sound. The amp's player plays into the model set with `setAmpModel`. */
export function playerFor(sound: RiffSound): Player {
  if (sound === "piano") return getSharedPiano();
  if (sound === "guitar") return (guitar ??= createPlayer({ instrumentId: GUITAR }));
  return (ampPlayer ??= createPlayer({ instrumentId: GUITAR, destination: () => amp?.input ?? getOutputBus() }));
}

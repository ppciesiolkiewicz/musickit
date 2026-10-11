import { createPlayer, registerRuntimeInstrument, unregisterRuntimeInstrument } from "@/features/sound";
import { runtimeFor, sampleIds, type SoundSpec } from "./model/sound";
import { sampleLibrary } from "./library";
import { urlFor } from "./sampleUrls";
import { getStore } from "./store/idb";
import type { SamplerStore } from "./store/types";

export interface GeneratorVoice {
  noteOn(midi: number, velocity?: number): void;
  noteOff(midi: number): void;
  allOff(): void;
  setSound(spec: SoundSpec): void;
  preload(): Promise<void>;
  dispose(): void;
}

let count = 0;

/**
 * The looper's injected voice: a sample player into `destination` whose sound follows the spec. A piano spec plays a built-in
 * instrument; a sampler spec gets a hidden runtime instrument of its own, built from the library's audio (silent until it loads,
 * and for any sample that is missing). It rebuilds when the library changes, so a deleted sample goes silent at once.
 */
export function makeGeneratorVoice(destination: AudioNode, spec: SoundSpec, store: SamplerStore = getStore(), onLibraryChange: (fn: () => void) => () => void = sampleLibrary.subscribe): GeneratorVoice {
  const rid = `sampler:voice${++count}`;
  const player = createPlayer({ destination: () => destination });
  let token = 0;
  let ready: Promise<void> = Promise.resolve();
  let current = spec;
  const setSound = (s: SoundSpec) => {
    current = s;
    const mine = ++token;
    if (s.kind === "piano") {
      player.setInstrument(s.instrument);
      ready = Promise.resolve();
      return;
    }
    registerRuntimeInstrument(rid, runtimeFor(s, () => null));
    player.setInstrument(rid);
    ready = (async () => {
      const found = new Map<string, string | null>();
      for (const id of sampleIds(s)) found.set(id, await urlFor(store, id).catch(() => null));
      if (mine === token) registerRuntimeInstrument(rid, runtimeFor(s, (id) => found.get(id)));
    })();
  };
  setSound(spec);
  const unsubscribe = onLibraryChange(() => {
    if (current.kind !== "piano") setSound(current);
  });
  return {
    noteOn: (m, v) => player.noteOn(m, v),
    noteOff: (m) => player.noteOff(m),
    allOff: () => player.allOff(),
    setSound,
    preload: async () => {
      await ready;
      await player.preload();
    },
    dispose: () => {
      token++;
      unsubscribe();
      player.allOff();
      unregisterRuntimeInstrument(rid);
    },
  };
}

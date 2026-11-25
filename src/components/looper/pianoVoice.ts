import { createPlayer } from "@/features/sound";
import type { NoteVoice, VoiceSpec } from "@/lib/looper/engine";

/** The looper's injected voice: a sample player into `destination` playing the built-in instrument the spec names. */
export function makePianoVoice(destination: AudioNode, spec: VoiceSpec): NoteVoice {
  const player = createPlayer({ destination: () => destination });
  player.setInstrument(spec.instrument);
  return {
    noteOn: (m, v) => player.noteOn(m, v),
    noteOff: (m) => player.noteOff(m),
    allOff: () => player.allOff(),
    setSound: (s) => player.setInstrument(s.instrument),
    preload: () => player.preload(),
    dispose: () => player.allOff(),
  };
}

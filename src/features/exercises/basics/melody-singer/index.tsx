"use client";

import type { Voice } from "@/features/theory/singing";
import { SingerOverlay, SingerView } from "../singer";
import { useVoice } from "../voiceChoice";

/** A tune from the melody book on its staff, in the key and voice, at its tempo (90 unless set), with its chords unless turned off and the metronome if asked; play it, then sing it with the mic. */
export function View({ tune, pc, voice, bpm, chords, metronome }: { tune: number; pc: number; voice?: Voice; bpm?: number; chords?: boolean; metronome?: boolean }) {
  return <SingerView n={tune} pc={pc} voice={useVoice(voice)} bpm={bpm} chords={chords} metronome={metronome} />;
}

/** The tune over a content video, at the tune's `beat` (null: stopped): no buttons, no sound, no mic, in the voice it was written with. */
export function VideoOverlay({ tune, pc, voice, chords, beat }: { tune: number; pc: number; voice?: Voice; chords?: boolean; beat: number | null }) {
  return <SingerOverlay n={tune} pc={pc} voice={voice} chords={chords} beat={beat} />;
}

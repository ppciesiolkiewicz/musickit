"use client";

import type { Voice } from "@/features/theory/singing";
import { SingerView } from "../singer";
import { useVoice } from "../voiceChoice";

/** A tune from the melody book on its staff, in the key and voice, with its chords unless turned off and the metronome if asked; play it, then sing it with the mic. */
export function View({ tune, pc, voice, chords, metronome }: { tune: number; pc: number; voice?: Voice; chords?: boolean; metronome?: boolean }) {
  return <SingerView n={tune} pc={pc} voice={useVoice(voice)} chords={chords} metronome={metronome} />;
}

"use client";

import type { Voice } from "@/features/theory/singing";
import { SingerView } from "../singer";

/** A run from the runs book on its staff, across the voice through its keys, each key change announced by its chords unless turned off, the metronome if asked; play it, then sing it with the mic. */
export function View({ run, voice, chords, metronome }: { run: number; voice?: Voice; chords?: boolean; metronome?: boolean }) {
  return <SingerView n={run} voice={voice} chords={chords} metronome={metronome} />;
}

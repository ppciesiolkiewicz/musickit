"use client";

import type { Voice } from "@/features/theory/singing";
import { SingerView } from "../singer";

/** A run from the runs book on its staff, through its keys from the one given, each key change announced by its chords unless turned off; play it, then sing it with the mic. */
export function View({ run, pc, voice, chords }: { run: number; pc: number; voice?: Voice; chords?: boolean }) {
  return <SingerView n={run} pc={pc} voice={voice} chords={chords} />;
}

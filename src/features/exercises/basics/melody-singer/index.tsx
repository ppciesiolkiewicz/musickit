"use client";

import type { Voice } from "@/features/theory/singing";
import { SingerView } from "../singer";

/** A tune from the melody book on its staff, in the key and voice, with its chords unless turned off; play it, then sing it with the mic. */
export function View({ tune, pc, voice, chords }: { tune: number; pc: number; voice?: Voice; chords?: boolean }) {
  return <SingerView n={tune} pc={pc} voice={voice} chords={chords} />;
}

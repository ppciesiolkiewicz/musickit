"use client";

import type { Voice } from "@/features/theory/singing";
import { SingerView } from "../singer";

/** A tune from the melody book on its staff, in the key and voice; play it, then sing it with the mic. */
export function View({ tune, pc, voice }: { tune: number; pc: number; voice?: Voice }) {
  return <SingerView n={tune} pc={pc} voice={voice} />;
}

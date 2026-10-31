"use client";

import type { Voice } from "@/features/theory/singing";
import { SingerView } from "../singer";

/** A run from the runs book on its staff, through its keys from the one given; play it, then sing it with the mic. */
export function View({ run, pc, voice }: { run: number; pc: number; voice?: Voice }) {
  return <SingerView n={run} pc={pc} voice={voice} />;
}

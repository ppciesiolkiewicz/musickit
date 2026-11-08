"use client";

import { useMemo } from "react";
import { DrillPlayer } from "../DrillPlayer";
import { fingerPatternSteps } from "../drills";

/** The finger pattern as tab you can play, the finger under each note: one finger per fret, on each string in turn, alternate picked. */
export function View({ fingers, fret = 1, strings, bpm }: { fingers: string; fret?: number; strings?: number[]; bpm: number }) {
  const steps = useMemo(() => fingerPatternSteps(fingers, fret, strings), [fingers, fret, strings]);
  return <DrillPlayer steps={steps} bpm={bpm} group={fingers.length} hint={`fingers ${fingers.split("").join("-")} from fret ${fret}`} />;
}

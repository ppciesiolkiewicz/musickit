"use client";

import { useMemo } from "react";
import { DrillPlayer } from "../DrillPlayer";
import { fingerPatternSteps } from "../drills";

/** The finger pattern as cells you can play: one finger per fret, on each string in turn, alternate picked. */
export function View({ fingers, fret = 1, strings, bpm }: { fingers: string; fret?: number; strings?: number[]; bpm: number }) {
  const steps = useMemo(() => fingerPatternSteps(fingers, fret, strings), [fingers, fret, strings]);
  return <DrillPlayer steps={steps} bpm={bpm} hint={`fingers ${fingers.split("").join("-")} from fret ${fret}`} />;
}

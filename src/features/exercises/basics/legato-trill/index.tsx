"use client";

import { useMemo } from "react";
import { DrillPlayer } from "../DrillPlayer";
import { legatoTrillSteps } from "../drills";

/** The legato trill as tab you can play: pick the first note, hammer on and pull off the rest. */
export function View({ fingers, string, fret, bpm }: { fingers: string; string: number; fret: number; bpm: number }) {
  const steps = useMemo(() => legatoTrillSteps(fingers, string, fret), [fingers, string, fret]);
  return <DrillPlayer steps={steps} bpm={bpm} hint={`pick once, then hammer and pull: fingers ${fingers.split("").join("-")}`} />;
}

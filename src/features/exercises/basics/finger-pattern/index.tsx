"use client";

import { useMemo } from "react";
import { DrillPlayer } from "../DrillPlayer";
import { fingerPatternSteps } from "../drills";

/** The finger pattern as tab you can play, the finger or pick stroke under each note (`show`, else the student switches): one finger per fret, up the strings and back down, alternate picked. */
export function View({ fingers, fret = 1, strings, show, bpm }: { fingers: string; fret?: number; strings?: number[]; show?: "finger" | "pick"; bpm: number }) {
  const steps = useMemo(() => fingerPatternSteps(fingers, fret, strings), [fingers, fret, strings]);
  return <DrillPlayer steps={steps} bpm={bpm} group={fingers.length} show={show} hint={`frets ${fret} to ${fret + Math.max(...fingers.split("").map(Number)) - 1}, fingers ${fingers.split("").join("-")}, up the strings and back down`} />;
}

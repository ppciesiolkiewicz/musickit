"use client";

import { useMemo } from "react";
import { DrillPlayer } from "../DrillPlayer";
import { pickingDrillSteps } from "../drills";

/** The picking drill as tab you can play: open strings, the strokes (↓ down, ↑ up) running on across strings. */
export function View({ strokes, notesPerString = 4, strings, skip = false, bpm }: { strokes: string; notesPerString?: number; strings?: number[]; skip?: boolean; bpm: number }) {
  const steps = useMemo(() => pickingDrillSteps(strokes, notesPerString, strings, skip), [strokes, notesPerString, strings, skip]);
  return <DrillPlayer steps={steps} bpm={bpm} group={notesPerString} hint={`${skip ? "skipping strings, " : ""}strokes ${strokes.split("").join(" ")}`} />;
}

import { createContext } from "react";
import type { Clef } from "@/features/theory/piano/staff";
import type { Ladder } from "@/features/theory/singing";
import type { PlacedNote } from "@/features/theory/singingMelodies";

/** What a host playing a timeline tells the widgets that follow it. */
export interface StageTimeline {
  melody: { notes: PlacedNote[]; ladder: Ladder; clef: Clef; beatMs: number } | null;
  /** beats since the melody's beat 1 (0 while it waits to start), read every animation frame */
  gridBeats: () => number | null;
  countdown: { caption: string; left: number } | null;
}

/** The host's timeline; null outside one (the studio), where the melody and countdown widgets draw nothing. */
export const TimelineContext = createContext<StageTimeline | null>(null);

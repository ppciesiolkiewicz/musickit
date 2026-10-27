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
  /** before the first countdown */
  intro: { title: string; text?: string } | null;
  /** from the first countdown on: tune and pass from 1, `pass` null while a tune counts in */
  progress: { tune: number; tunes: number; pass: number | null; times: number } | null;
  /** the tune after the one on the staff, bar by bar in solfège; null on the last */
  next: { tune: number; bars: string[][] } | null;
}

/** The host's timeline; null outside one (the studio), where the widgets that follow it draw nothing. */
export const TimelineContext = createContext<StageTimeline | null>(null);

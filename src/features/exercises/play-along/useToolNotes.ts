"use client";

import { useMemo } from "react";
import type { PlanTool } from "@/features/plan/model/tools";
import { cueNotes, type KitNote } from "../cues/cueNotes";
import { BEATS_PER_BAR } from "../timeline/timeline";
import type { PlayAlongShape } from "./play-along.props";
import { keyOf, useCuesOf, useTool, type PlayAlongToolProps } from "./PlayAlong";

/** What the hooks read for a tool that isn't a play-along: a shape that expands to nothing. */
const NO_TOOL: PlayAlongToolProps = { shape: { shape: "none" } as unknown as PlayAlongShape, bpm: 80 };

/**
 * The notes a guitar-play-along has the student play, one pass in its own beats, for the recorder's kit: built from its
 * timeline and cues as `VideoOverlay` draws them. `loopBeats` is one pass; `keyPc` the shape's key (C when it names none).
 * Null for a tool that isn't a play-along, or one that can't be drawn.
 */
export function useToolNotes(tool: PlanTool | null): { notes: KitNote[]; loopBeats: number; keyPc: number } | null {
  const props = tool?.type === "guitar-play-along" ? tool : NO_TOOL;
  const { timeline, marks } = useTool(props);
  const cues = useCuesOf(timeline, marks, props.others ?? "muted");
  return useMemo(
    () => (timeline ? { notes: cueNotes(cues), loopBeats: timeline.bars * BEATS_PER_BAR, keyPc: keyOf(timeline) ?? 0 } : null),
    [timeline, cues],
  );
}

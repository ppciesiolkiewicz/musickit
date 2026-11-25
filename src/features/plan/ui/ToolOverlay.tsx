"use client";

import dynamic from "next/dynamic";
import { VideoOverlay as MelodySinger } from "@/features/exercises/basics/melody-singer";
import type { PlanTool } from "../model/tools";

// the play-along's file carries its sound engine: loaded only when a riff's video plays
const PlayAlong = dynamic(() => import("@/features/exercises/play-along/PlayAlong").then((m) => m.VideoOverlay), { ssr: false });

/**
 * A tool drawn over a content video at `beat` (the tool's beat at this moment of the video, null while it was
 * stopped): its `VideoOverlay`, which draws and never sounds. Only the tools in `OVERLAY_TOOLS`
 * (`contentVideos/model/overlay.ts`) have one; any other draws nothing.
 */
export default function ToolOverlay({ tool, beat }: { tool: PlanTool; beat: number | null }) {
  switch (tool.type) {
    case "guitar-play-along":
      return <PlayAlong shape={tool.shape} bpm={tool.bpm} repeats={tool.repeats} view={tool.view} enable={tool.enable} highlight={tool.highlight} others={tool.others} under={tool.under} beat={beat} />;
    case "melody-singer":
      return <MelodySinger tune={tool.tune} pc={tool.key} voice={tool.voice} chords={tool.chords} beat={beat} />;
    default:
      return null;
  }
}

/** `ToolOverlay` as the content videos' `DrawTool`, for `OverlayDrawProvider`. */
export const drawToolOverlay = (tool: PlanTool, beat: number | null) => <ToolOverlay tool={tool} beat={beat} />;

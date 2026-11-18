"use client";

import DevName from "@/components/DevName";
import { devUi } from "@/features/devtools/gate";
import type { PlanTool } from "../model/tools";
import { SingerVoiceProvider } from "@/features/exercises/basics/voiceChoice";
import { usePlayerVoice } from "@/features/userData/client/usePlayerVoice";
import { Tool } from "./Tool";

export { Tool } from "./Tool";

/**
 * One tool of an exercise, as it was written: the component and nothing to configure, except the voice. A singing tool
 * uses the player's own voice (their type, or their own range) over the one it was written with; with no voice known it
 * keeps its own. In development its name shows above it.
 */
export default function ExerciseTool({ tool }: { tool: PlanTool }) {
  const { voice } = usePlayerVoice();
  if (!devUi()) return <SingerVoiceProvider voice={voice}><Tool tool={tool} /></SingerVoiceProvider>;
  return (
    <div className="flex flex-col gap-1">
      <DevName name={tool.type === "guitar-play-along" ? `guitar-play-along · ${tool.shape.shape}` : tool.type} params={params(tool)} />
      <SingerVoiceProvider voice={voice}><Tool tool={tool} /></SingerVoiceProvider>
    </div>
  );
}

/** The tool's props without its type: what the AI set. */
const params = (tool: PlanTool): object => {
  const { type: _type, ...rest } = tool;
  void _type;
  return rest;
};

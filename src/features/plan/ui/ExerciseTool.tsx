"use client";

import DevName from "@/components/DevName";
import { devUi } from "@/features/devtools/gate";
import type { PlanTool } from "../model/tools";
import { usePlan } from "../store/usePlan";
import { Tool, type KeyPick } from "./Tool";

export { Tool } from "./Tool";

/** One tool of an exercise, as the AI set it up: the component and nothing to configure. In development its name shows above it. */
export default function ExerciseTool({ tool, keyPick }: { tool: PlanTool; keyPick?: KeyPick }) {
  const { state } = usePlan();
  const voice = state.answers?.voice?.type;
  if (!devUi()) return <Tool tool={tool} voice={voice} keyPick={keyPick} />;
  return (
    <div className="flex flex-col gap-1">
      <DevName name={tool.type === "guitar-play-along" ? `guitar-play-along · ${tool.shape.shape}` : tool.type} params={params(tool)} />
      <Tool tool={tool} voice={voice} keyPick={keyPick} />
    </div>
  );
}

/** The tool's props without its type: what the AI set. */
const params = (tool: PlanTool): object => {
  const { type: _type, ...rest } = tool;
  void _type;
  return rest;
};

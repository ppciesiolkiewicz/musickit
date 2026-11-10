"use client";

import { Modal } from "@/components/ui";
import type { PlanTool } from "../model/tools";
import ExerciseTool from "./ExerciseTool";

/** A tool the browser's AI opened (`AgentExerciseTools`), over the page; `key` remounts it when the AI sends another. */
export default function AgentToolModal({ tool, onClose }: { tool: PlanTool; onClose: () => void }) {
  return (
    <Modal title="From your browser assistant" onClose={onClose}>
      <ExerciseTool key={JSON.stringify(tool)} tool={tool} />
    </Modal>
  );
}

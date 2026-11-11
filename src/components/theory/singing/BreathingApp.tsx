"use client";

import { useState, type ReactNode } from "react";
import { Chip, ChipRow } from "@/components/ui";
import { View as Breathwork } from "@/features/exercises/basics/breathwork";
import {
  FARINELLI_LEVELS,
  TOOL_LEVELS,
  type ToolLevel,
} from "@/features/exercises/basics/levels";

const LEVEL_LABEL: Record<ToolLevel, string> = {
  new: "New",
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

/** The Farinelli breathing page: a Level selector over the breathwork tool. A new level starts the drill over. */
export default function BreathingApp({ lead }: { lead?: ReactNode }) {
  const [level, setLevel] = useState<ToolLevel>("beginner");
  const { from, to } = FARINELLI_LEVELS[level];
  return (
    <div>
      {lead}
      <div className="mx-auto w-full max-w-xl">
        <div className="mb-3">
          <ChipRow label="Level">
            {TOOL_LEVELS.map((l) => (
              <Chip
                key={l}
                on={l === level}
                onClick={() => setLevel(l)}
                title={`${FARINELLI_LEVELS[l].from} to ${FARINELLI_LEVELS[l].to} counts`}
              >
                {LEVEL_LABEL[l]}
              </Chip>
            ))}
          </ChipRow>
        </div>
        <Breathwork key={level} drill="farinelli" from={from} to={to} />
      </div>
    </div>
  );
}

"use client";

import { Chip, DropdownSection, SettingsRow } from "@/components/ui";
import { FARINELLI_LEVELS, TOOL_LEVELS, type ToolLevel } from "../levels";

const LEVEL_LABEL: Record<ToolLevel, string> = {
  new: "New",
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

/**
 * The Farinelli drill's Level (how many counts each cycle runs from and to, `FARINELLI_LEVELS`) for a page that holds
 * it. `look`: "bar" a row of a page's `SettingsPanel`, "menu" a section of a sliders button.
 */
export function BreathingSettings({ level, onLevel, look = "bar" }: { level: ToolLevel; onLevel: (l: ToolLevel) => void; look?: "bar" | "menu" }) {
  const chips = TOOL_LEVELS.map((l) => (
    <Chip key={l} on={l === level} onClick={() => onLevel(l)} title={`${FARINELLI_LEVELS[l].from} to ${FARINELLI_LEVELS[l].to} counts`}>{LEVEL_LABEL[l]}</Chip>
  ));
  if (look === "bar") return <SettingsRow label="Level">{chips}</SettingsRow>;
  return <DropdownSection title="Level"><div className="flex flex-wrap gap-1.5">{chips}</div></DropdownSection>;
}

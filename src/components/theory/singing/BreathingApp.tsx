"use client";

import { useState, type ReactNode } from "react";
import { SettingsPanel, SettingsSection } from "@/components/ui";
import { View as Breathwork } from "@/features/exercises/basics/breathwork";
import { BreathingSettings } from "@/features/exercises/basics/breathwork/settings";
import { FARINELLI_LEVELS, type ToolLevel } from "@/features/exercises/basics/levels";
import { VolumeRow } from "@/features/settings";

/** The Farinelli breathing page: the breathwork tool, its Level and the volume in the settings panel. A new level starts the drill over. */
export default function BreathingApp({ lead }: { lead?: ReactNode }) {
  const [level, setLevel] = useState<ToolLevel>("beginner");
  const { from, to } = FARINELLI_LEVELS[level];
  return (
    <SettingsPanel settings={<SettingsSection first><BreathingSettings level={level} onLevel={setLevel} /><VolumeRow /></SettingsSection>}>
      <div>
        {lead}
        <div className="mx-auto w-full max-w-xl">
          <Breathwork key={level} drill="farinelli" from={from} to={to} />
        </div>
      </div>
    </SettingsPanel>
  );
}

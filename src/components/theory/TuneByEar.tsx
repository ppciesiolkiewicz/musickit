"use client";

import { useState } from "react";
import { Chip, ChipRow, Section, SettingsPanel, SettingsSection } from "@/components/ui";
import { VolumeRow } from "@/features/settings";
import { View as StringSinger } from "@/features/exercises/basics/string-singer";
import type { StringDrill } from "@/features/exercises/basics/string-singer/strings";

const DRILLS: { id: StringDrill; label: string }[] = [
  { id: "strings", label: "Open strings" },
  { id: "pairs", label: "Pairs" },
  { id: "fifth-fret", label: "5th fret" },
];

/**
 * Tuning a guitar without a tuner. Sing the open strings (the string singer, at the guitar's own pitch) to carry their
 * pitches. The Drill picks what is sung, so it stays over the tool; the volume is in the settings panel.
 */
export default function TuneByEar() {
  const [drill, setDrill] = useState<StringDrill>("strings");
  return (
    <SettingsPanel settings={<SettingsSection first><VolumeRow /></SettingsSection>}>
    <div className="flex flex-col gap-4">
      <div data-tour="tune-ear-sing">
      <Section title="Sing the open strings" meta="mic" info="Play the drill to hear it, tap a note to hear one, then sing along with the mic on, an octave up or down if the pitch is out of your range. Once you can sing E A D G B E, you can hear a string that is off.">
        <div className="flex flex-col gap-3">
          <ChipRow label="Drill">
            {DRILLS.map((d) => <Chip key={d.id} on={drill === d.id} onClick={() => setDrill(d.id)}>{d.label}</Chip>)}
          </ChipRow>
          <StringSinger drill={drill} />
        </div>
      </Section>
      </div>
    </div>
    </SettingsPanel>
  );
}

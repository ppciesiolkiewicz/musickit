"use client";

import { SettingsFact } from "@/components/ui";
import type { PocketStatus } from "@/features/instruments";
import { LABEL_SYSTEMS } from "@/features/theory/labels";
import { useLabelSystem } from "@/features/theory/useLabelSystem";

/**
 * A settings panel's `summary` for a page with labels and the play-along tools: the label system, then from the
 * tools' status the tempo, the drone note and what plays, as room allows.
 */
export function ScaleFacts({ labels = true, pocket, drone = true }: { labels?: boolean; pocket?: PocketStatus | null; drone?: boolean }) {
  const [system] = useLabelSystem();
  const labelName = LABEL_SYSTEMS.find((l) => l.id === system)?.label;
  return (
    <>
      {labels && labelName && <SettingsFact from="sm">{labelName}</SettingsFact>}
      {pocket && <SettingsFact from="md">{pocket.bpm} bpm</SettingsFact>}
      {pocket && drone && <SettingsFact from="lg">Drone {pocket.drone}</SettingsFact>}
      {pocket && pocket.playing.length > 0 && (
        <SettingsFact className="!border-emerald-400/50 !text-emerald-200">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" aria-hidden />
          <span className="capitalize">{pocket.playing.join(", ")}</span>
        </SettingsFact>
      )}
    </>
  );
}

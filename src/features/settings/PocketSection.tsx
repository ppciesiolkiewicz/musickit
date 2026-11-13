"use client";

import { useState, type ReactNode } from "react";
import { useSettingsPlace } from "@/components/ui";
import { PracticeBand, type PocketStatus } from "@/features/instruments";

/**
 * The play-along tools (click, drone, drums, bass) as a settings panel's `tools`. `drone={false}` leaves the drone out
 * (a page whose sound has no key to drone on); `side`: the panel's own `side`, so the tools stack one per line while it is a
 * column (and lie flat once moved above the page); `clickAlways` runs
 * the click, muted, from the first press on the page; `lines` are the host's own lines under the drone (`InputSection`).
 */
export function PocketSection({ keyPc, drone = true, clickAlways, side = false, onStatus, lines }: {
  keyPc: number;
  drone?: boolean;
  clickAlways?: boolean;
  side?: boolean;
  onStatus?: (s: PocketStatus) => void;
  lines?: ReactNode;
}) {
  const stacked = useSettingsPlace() === "side" && side;
  return (
    <PracticeBand view="pocket" storageKey="musickit.pocket"
      config={{ parts: drone ? ["click", "drone", "drums", "bass"] : ["click", "drums", "bass"], keyPc }}
      pocket={{ onStatus, clickAlways, stacked, lines, className: "-mx-2" }} />
  );
}

/** The play-along tools' status for the panel's summary: `[status, onStatus]`, the setter stable. */
export function usePocketStatus(): [PocketStatus | null, (s: PocketStatus) => void] {
  return useState<PocketStatus | null>(null);
}

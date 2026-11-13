"use client";

import { DropdownSection, SettingsRow, Slider } from "@/components/ui";
import { DOT_LAG_MS } from "@/components/theory/singing/MelodyStaff";
import type { RowLook } from "./rows";
import { savedSetting } from "./savedSetting";

export const MAX_LAG_MS = 1000;

/**
 * The play-ahead: how far behind the playhead your voice is drawn, in ms, to make up for the mic's delay. One setting
 * in this browser for the staff, the singing pages and the lip roll (`singing.lag`).
 */
export const usePlayAhead = savedSetting<number>("singing.lag", DOT_LAG_MS, (v) => typeof v === "number" && v >= 0 && v <= MAX_LAG_MS);

const INFO = <>How far behind the playhead your voice is drawn. Raise it when your line runs late against the tone.</>;

/** The play-ahead slider, as a panel row ("bar") or a section of the sliders button ("menu"). */
export function PlayAheadRow({ look = "bar" }: { look?: RowLook }) {
  const [ms, setMs] = usePlayAhead();
  const slider = (
    <span className="flex items-center gap-2">
      <Slider min={0} max={MAX_LAG_MS} step={10} value={ms} onChange={setMs} size="sm" className="w-40" aria-label="Play-ahead" />
      <span className="whitespace-nowrap text-xs tabular-nums text-slate-500">{ms} ms</span>
    </span>
  );
  if (look === "bar") return <SettingsRow label="Play-ahead" info={INFO}>{slider}</SettingsRow>;
  return <DropdownSection title="Play-ahead" info={INFO}>{slider}</DropdownSection>;
}

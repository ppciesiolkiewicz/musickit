"use client";

import { ibtn, Slider } from "@/components/ui";

/**
 * A part's mute and volume, the same in the looper's sequencer window and on a page. Volume is 0 to 1 (a looper strip may hold more;
 * the slider shows it at full).
 */
export default function PartLevel({ name, volume, muted, onVolume, onMute }: { name: string; volume: number; muted: boolean; onVolume: (v: number) => void; onMute: (muted: boolean) => void }) {
  return (
    <span className="flex items-center gap-1.5">
      <button type="button" className={`${ibtn} ${muted ? "!border-amber-400 !text-amber-200" : ""}`} aria-pressed={muted} onClick={() => onMute(!muted)} title="Mute" aria-label={`Mute ${name}`}>M</button>
      <Slider min={0} max={1} step={0.01} value={Math.min(1, volume)} onChange={onVolume} className="w-24" aria-label={`Volume of ${name}`} title={`Volume ${Math.round(volume * 100)}%`} />
    </span>
  );
}

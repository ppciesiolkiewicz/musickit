"use client";

import Icon from "@/components/Icon";
import { ibtn, Slider } from "@/components/ui";

/**
 * A part's mute: a speaker, amber and crossed out while muted. A muted part keeps playing (and keeping time), unheard.
 * The same button on every line of the pocket tools, the jam's cards and the looper's sequencer window; `className` sizes it.
 */
export function MuteButton({ name, muted, onMute, className = ibtn }: { name: string; muted: boolean; onMute: (muted: boolean) => void; className?: string }) {
  return (
    <button type="button" className={`${className} ${muted ? "!border-amber-400/60 !text-amber-200" : ""}`} aria-pressed={muted} onClick={() => onMute(!muted)}
      title={muted ? `Unmute the ${name} (it keeps going either way)` : `Mute the ${name} (it keeps going)`} aria-label={muted ? `Unmute the ${name}` : `Mute the ${name}`}>
      <Icon name={muted ? "volume-x" : "volume-2"} size={14} />
    </button>
  );
}

/**
 * A part's mute and volume, the same in the looper's sequencer window and on a page. Volume is 0 to 1 (a looper strip may hold more;
 * the slider shows it at full).
 */
export default function PartLevel({ name, volume, muted, onVolume, onMute }: { name: string; volume: number; muted: boolean; onVolume: (v: number) => void; onMute: (muted: boolean) => void }) {
  return (
    <span className="flex items-center gap-1.5">
      <MuteButton name={name} muted={muted} onMute={onMute} />
      <Slider min={0} max={1} step={0.01} value={Math.min(1, volume)} onChange={onVolume} className="w-24" aria-label={`Volume of ${name}`} title={`Volume ${Math.round(volume * 100)}%`} />
    </span>
  );
}

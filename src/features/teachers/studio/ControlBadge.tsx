import Icon from "@/components/Icon";

/** The small "control" badge by a widget that sets or plays something (Key & scale, Metronome, Tuner), in the palette and the Layers list. */
export default function ControlBadge() {
  return <span className="shrink-0 rounded-full border border-amber-500/50 px-1.5 text-[10px] leading-4 text-amber-300">control</span>;
}

/** The small "mic" badge by a widget the audio input lights notes on (when it is pinned or selected). */
export function MicBadge() {
  return (
    <span title="Lights the notes the audio input hears, when pinned or selected" className="flex shrink-0 items-center gap-0.5 rounded-full border border-rose-500/50 px-1.5 text-[10px] leading-4 text-rose-300">
      <Icon name="mic" size={9} />
      mic
    </span>
  );
}

/** The small "page" badge by a bigger widget: a whole cheatsheet page, Fretboard positions, Chords in the key. */
export function PageBadge() {
  return <span className="shrink-0 rounded-full border border-violet-500/50 px-1.5 text-[10px] leading-4 text-violet-300">page</span>;
}

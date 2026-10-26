/** The small "control" badge by a widget that sets or plays something (Key & scale, Metronome, Tuner), in the palette and the Layers list. */
export default function ControlBadge() {
  return <span className="shrink-0 rounded-full border border-amber-500/50 px-1.5 text-[10px] leading-4 text-amber-300">control</span>;
}

/** The small "page" badge by a bigger widget: a whole cheatsheet page, Fretboard positions, Chords in the key. */
export function PageBadge() {
  return <span className="shrink-0 rounded-full border border-violet-500/50 px-1.5 text-[10px] leading-4 text-violet-300">page</span>;
}

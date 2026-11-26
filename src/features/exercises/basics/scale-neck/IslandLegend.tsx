/**
 * The key to a scale-neck drawn with `islands`: what the frame, the red-circled root and a faded dot mean. Drawn under
 * the neck by the tool; exported so a page that shows the islands its own way says it in the same words.
 */
export function IslandLegend({ root }: { /** the root's note name, "A" */ root: string }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400" aria-label="Key to the neck">
      <li className="inline-flex items-center gap-1.5">
        <span aria-hidden className="inline-block h-3 w-5 rounded border-2 border-amber-300 bg-amber-300/10" />
        Island
      </li>
      <li className="inline-flex items-center gap-1.5">
        <span aria-hidden className="inline-block size-3 rounded-full bg-white ring-2 ring-rose-500 ring-offset-1 ring-offset-slate-900" />
        {root}, the root
      </li>
      <li className="inline-flex items-center gap-1.5">
        <span aria-hidden className="inline-block size-3 rounded-full bg-slate-400 opacity-35" />
        Other notes of the scale
      </li>
    </ul>
  );
}

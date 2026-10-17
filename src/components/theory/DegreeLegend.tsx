import { DEGREE_COLOURS } from "@/features/theory/scales";

/** The seven scale-degree colours, with their names. */
export function DegreeLegend() {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400" aria-label="Colour key: scale degrees">
      {DEGREE_COLOURS.map((c, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full border border-slate-700" style={{ background: c }} />
          {["R", "2", "3", "4", "p5", "6", "7"][i]}
        </span>
      ))}
    </span>
  );
}

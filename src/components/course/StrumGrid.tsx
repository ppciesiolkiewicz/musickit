import { strumCounts, type StrumPattern } from "@/features/course/strum";

/** One bar of a strum pattern: the count on top, ↓ / ↑ where the pick hits the strings, a blank where the hand swings past. */
export default function StrumGrid({ pattern }: { pattern: StrumPattern }) {
  const counts = strumCounts(pattern.perBeat);
  return (
    <div className="w-full" role="img" aria-label={`${pattern.name}: ${pattern.steps.map((s) => (s === "." ? "miss" : s === "D" ? "down" : "up")).join(", ")}`}>
      <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${pattern.steps.length}, minmax(0, 1fr))` }}>
        {counts.map((c, i) => {
          const beat = i % pattern.perBeat === 0;
          return <span key={`c${i}`} className={`text-center font-mono text-[10px] sm:text-xs ${beat ? "font-bold text-slate-200" : "text-slate-500"}`}>{c}</span>;
        })}
        {pattern.steps.map((s, i) => {
          const beat = i % pattern.perBeat === 0;
          return (
            <span
              key={`s${i}`}
              className={`flex aspect-[3/4] min-w-0 flex-col items-center justify-center rounded-md border text-sm font-bold sm:text-base ${beat ? "border-slate-500" : "border-slate-800"} ${s === "." ? "bg-slate-950/40 text-slate-700" : s === "D" ? "bg-amber-500/15 text-amber-300" : "bg-sky-500/15 text-sky-300"}`}
            >
              {s === "D" ? "↓" : s === "U" ? "↑" : "·"}
              {s !== "." && <span className="text-[9px] font-semibold opacity-70">{s}</span>}
            </span>
          );
        })}
      </div>
    </div>
  );
}

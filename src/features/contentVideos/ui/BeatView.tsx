/**
 * Where the playing stands on the click while a take records: the count-in counting down, then the bar and beat, four beat lights
 * (beat 1 brighter) and a strip of the expected bars filling up. `beat` counts from beat 1, negative in the count-in.
 */
export default function BeatView({ beat, bars, countIn }: { beat: number; bars: number; countIn: number }) {
  if (beat < -countIn * 4 - 1e-3) return null; // before the first click
  const counting = beat < 0;
  const whole = Math.floor(beat);
  const inBar = ((whole % 4) + 4) % 4;
  const bar = Math.floor(whole / 4) + 1;
  const done = beat >= bars * 4;
  const big = counting ? `${Math.ceil(-beat)}` : done ? "Done" : `Bar ${bar} of ${bars}`;
  const tone = counting ? "text-amber-300" : done ? "text-slate-400" : "text-emerald-300";
  return (
    <div className="flex max-w-xl flex-col gap-2" aria-live="polite">
      <div className="flex items-center gap-3">
        <span className={`min-w-28 font-mono text-2xl font-semibold tabular-nums ${tone}`}>{big}</span>
        <span className="text-slate-400">{counting ? "Count-in: play on beat 1" : done ? "Stopping…" : `Beat ${inBar + 1}`}</span>
        <div className="ml-auto flex gap-1.5" aria-hidden>
          {[0, 1, 2, 3].map((b) => {
            const on = !done && b === inBar && beat - whole < 0.35;
            return <span key={b} className={`size-4 rounded-full transition-colors duration-75 ${on ? (b === 0 ? "bg-white" : counting ? "bg-amber-400" : "bg-emerald-400") : "bg-slate-700"}`} />;
          })}
        </div>
      </div>
      <div className="flex gap-1" aria-hidden>
        {Array.from({ length: bars }, (_, i) => {
          const fill = Math.min(1, Math.max(0, beat / 4 - i));
          return (
            <span key={i} className="relative h-2 flex-1 overflow-hidden rounded bg-slate-800">
              <span className="absolute inset-y-0 left-0 bg-emerald-500" style={{ width: `${fill * 100}%` }} />
            </span>
          );
        })}
      </div>
    </div>
  );
}

/**
 * A faint band behind every other beat of a row (the 2 and the 4 of each bar), so the beats read apart at a glance.
 * `x` maps a beat to where its column is drawn; a beat's band runs from `inset` before it to `inset` before the next.
 */
export function BeatBands({ start, end, x, inset, y, height }: { start: number; end: number; x: (at: number) => number; inset: number; y: number; height: number }) {
  return (
    <g aria-hidden>
      {Array.from({ length: Math.ceil(end - start) }, (_, b) => b % 2 === 1 && (
        <rect key={b} x={x(start + b) - inset} y={y} width={x(start + b + 1) - x(start + b)} height={height} fill="var(--color-slate-400)" fillOpacity={0.07} />
      ))}
    </g>
  );
}

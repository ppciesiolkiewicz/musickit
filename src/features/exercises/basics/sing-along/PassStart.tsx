/**
 * Where a pass of the tune starts (the loop's seam): a solid line with an arrow off its middle pointing into the tune,
 * "|->", so the start reads at a glance. `room` is the space after the line before the first note; the arrow fits in it.
 */
export function PassStart({ x, y1, y2, room, colour }: { x: number; y1: number; y2: number; room: number; colour: string }) {
  const mid = (y1 + y2) / 2;
  const len = Math.max(6, Math.min(14, room - 4));
  const head = Math.min(5, len * 0.45);
  return (
    <g stroke={colour} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.85} pointerEvents="none">
      <line x1={x} x2={x} y1={y1} y2={y2} />
      <path d={`M ${x} ${mid} h ${len} m ${-head} ${-head} l ${head} ${head} l ${-head} ${head}`} />
    </g>
  );
}

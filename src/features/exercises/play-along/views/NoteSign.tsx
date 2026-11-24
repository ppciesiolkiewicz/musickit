/** The plain note lengths in beats, a sixteenth up to a whole note; each may also be dotted (one and a half times). */
const PLAIN = [0.25, 0.5, 1, 2, 4];

/** A dotted length is one and a half times a plain one. */
export const isDotted = (beats: number) => PLAIN.some((b) => b * 1.5 === beats);
/** Whether a length can be drawn as a note sign: plain or dotted, a sixteenth to a whole. */
export const hasNoteSign = (beats: number) => PLAIN.includes(beats) || isDotted(beats);

/**
 * A note's length drawn as a note sign, 12 wide and 22 tall with the head at the bottom: hollow for a half and whole, a stem below
 * a whole, one flag per halving below a quarter, and a dot when dotted. Drawn rather than typed: most fonts lack the 1/16, 1/2 and 1 signs.
 * Used in the riff maker and under the play-along tab.
 */
export function NoteSign({ beats, x = 0, y = 0, color = "currentColor" }: { beats: number; x?: number; y?: number; color?: string }) {
  const dotted = isDotted(beats);
  const base = dotted ? beats / 1.5 : beats;
  const hollow = base >= 2;
  const flags = base <= 0.25 ? 2 : base <= 0.5 ? 1 : 0;
  return (
    <g transform={`translate(${x} ${y})`} fill={color} stroke={color}>
      <ellipse cx={4} cy={18} rx={3.8} ry={2.8} transform="rotate(-20 4 18)" fill={hollow ? "none" : color} strokeWidth={hollow ? 1.3 : 0} />
      {base < 4 && <line x1={7.4} x2={7.4} y1={17} y2={2} strokeWidth={1.2} />}
      {Array.from({ length: flags }, (_, k) => <path key={k} d={`M7.4 ${2 + k * 4} q4 3 3.5 7`} fill="none" strokeWidth={1.3} />)}
      {dotted && <circle cx={11.5} cy={18} r={1.3} stroke="none" />}
    </g>
  );
}

"use client";

import { degreeColour } from "@/lib/chordKit/scales";

/**
 * A tiny scale-degree marker for a dot on a fretboard drawing (SVG). Sits at the top right of the dot at (x, y).
 * `degree` is the 0-based position in the scale, which picks the colour; `text` is what to print: "3", "♭7".
 */
export default function DegreeBadge({ x, y, text, degree, offset = 11 }: { x: number; y: number; text: string; degree: number | null; offset?: number }) {
  const bx = x + offset, by = y - offset;
  const colour = degree === null ? "#f43f5e" : degreeColour(degree);
  return (
    <g pointerEvents="none">
      <circle cx={bx} cy={by} r={6.5} fill="#0f172a" stroke={colour} strokeWidth={1.4} />
      <text x={bx} y={by} textAnchor="middle" dominantBaseline="central" fontSize={text.length > 1 ? 6.5 : 8} fontWeight={700} fill="#f8fafc">{text}</text>
    </g>
  );
}

/** Colours for the SVG diagrams (the page itself is always dark, like the home page). */
export interface Swatch { fill: string; line: string; text: string }

import { DEGREE_COLOURS } from "@/lib/chordKit/scales";

/**
 * One colour per scale degree for the whole app, defined once as DEGREE_COLOURS in lib/chordKit/scales.ts:
 * R white, 2 teal, 3 amber, 4 lime, 5 blue, 6 violet, 7 rose. Flat and sharp versions share the colour of their degree (b3 is amber like 3).
 * Notes outside the scale are red.
 */
const OUT_OF_SCALE = "#f43f5e";

export const GROUP_SWATCH = {
  root: { fill: DEGREE_COLOURS[0], line: "#f8fafc", text: "#0f172a" } as Swatch,
};

/** Degree index 0-6 for a label such as "R", "b3", "p5", "♯4", "9", "13". Extensions map to their scale degree. */
export function degreeIndexOf(label: string): number | null {
  if (label === "R") return 0;
  const m = /^[b#♭♯p]*(\d+)$/.exec(label);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 ? (n - 1) % 7 : null;
}

/** The colour of a note label (R, b3, p5, 9 ...). */
export const labelColour = (label: string): string => {
  const i = degreeIndexOf(label);
  return i === null ? OUT_OF_SCALE : DEGREE_COLOURS[i];
};

export const swatchFor = (label: string): Swatch => ({ fill: labelColour(label), line: "#0d1526", text: "#0b1220" });

export const HUES = {
  blue: { hub: "#3b82f6", leaf: "#1e3a8a", line: "#93c5fd", onHub: "#eff6ff", text: "#dbeafe" },
  amber: { hub: "#f59e0b", leaf: "#78350f", line: "#fcd34d", onHub: "#1c1917", text: "#fef3c7" },
  coral: { hub: "#f43f5e", leaf: "#881337", line: "#fda4af", onHub: "#fff1f2", text: "#ffe4e6" },
  purple: { hub: "#a855f7", leaf: "#581c87", line: "#d8b4fe", onHub: "#faf5ff", text: "#f3e8ff" },
} as const;

export const DIFF_CLASS: Record<string, string> = {
  easy: "border-emerald-500/50 bg-emerald-500/15 text-emerald-300",
  medium: "border-amber-500/50 bg-amber-500/15 text-amber-300",
  hard: "border-rose-500/50 bg-rose-500/15 text-rose-300",
};

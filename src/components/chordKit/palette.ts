/** Colours for the SVG diagrams (the page itself is always dark, like the home page). */
export interface Swatch { fill: string; line: string; text: string }

export type Group = "root" | "ref" | "2nd" | "4th" | "6th" | "7th";

export const GROUP_SWATCH: Record<Group, Swatch> = {
  root: { fill: "#f1f5f9", line: "#f8fafc", text: "#0f172a" },
  ref: { fill: "#1e3a8a", line: "#60a5fa", text: "#dbeafe" },
  "2nd": { fill: "#115e59", line: "#2dd4bf", text: "#ccfbf1" },
  "4th": { fill: "#92400e", line: "#fbbf24", text: "#fef3c7" },
  "6th": { fill: "#581c87", line: "#c084fc", text: "#f3e8ff" },
  "7th": { fill: "#9f1239", line: "#fb7185", text: "#ffe4e6" },
};

const LABEL_GROUP: Record<string, Group> = {
  R: "root", "1": "root",
  "3": "ref", "♭3": "ref", "5": "ref", "♭5": "ref", "♯5": "ref",
  "2": "2nd", "9": "2nd", "♭9": "2nd", "♯9": "2nd", "♭2": "2nd", "♯2": "2nd",
  "4": "4th", "11": "4th", "♯11": "4th", "♯4": "4th",
  "6": "6th", "13": "6th", "♭13": "6th", "♭6": "6th",
  "♭7": "7th", "7": "7th", "♭♭7": "7th",
};

export const groupOf = (label: string): Group => LABEL_GROUP[label] ?? "ref";
export const swatchFor = (label: string): Swatch => GROUP_SWATCH[groupOf(label)];

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

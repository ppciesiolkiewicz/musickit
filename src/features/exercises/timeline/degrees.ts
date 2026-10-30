const DEGREE_SEMIS: Record<string, number> = { "1": 0, r: 0, b2: 1, "2": 2, b3: 3, "3": 4, "4": 5, "#4": 6, b5: 6, "5": 7, "#5": 8, b6: 8, bb7: 9, "6": 9, b7: 10, "7": 11 };

/**
 * A scale degree as the AI writes it ("1", "b3", "♭7", "#4") in semitones above the reference root,
 * null when unknown. Major-relative, not scale-aware: "3" is always 4 semitones.
 */
export function degreeSemis(v: unknown): number | null {
  if (typeof v !== "string" && typeof v !== "number") return null;
  const s = String(v).trim().toLowerCase().replace(/♭/g, "b").replace(/♯/g, "#");
  return s in DEGREE_SEMIS ? DEGREE_SEMIS[s] : null;
}

/** Unique, sorted semitones for a list of degree strings; invalid entries are dropped. */
export function parseDegrees(v: unknown): number[] {
  const arr = Array.isArray(v) ? v : [];
  return [...new Set(arr.map(degreeSemis).filter((n): n is number => n !== null))].sort((a, b) => a - b);
}

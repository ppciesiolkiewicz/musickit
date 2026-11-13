/** The shared 1–5 scale a student rates plan exercises and course sections on: how well they can do it. */

export type Stars = 1 | 2 | 3 | 4 | 5;

export const STARS: readonly Stars[] = [1, 2, 3, 4, 5];

export const STAR_LABELS: Record<Stars, string> = {
  1: "Can't do it yet",
  2: "Struggling",
  3: "Same again next time",
  4: "Solid",
  5: "Easy now",
};

export function isStars(v: unknown): v is Stars {
  return typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 5;
}

/** One rating as stored: the stars and when they were given (ISO datetime). */
export interface StarRating {
  stars: Stars;
  at: string;
}

/** A stored rating made safe: null unless it has valid stars and a date. */
export function cleanRating(v: unknown): StarRating | null {
  if (!v || typeof v !== "object") return null;
  const r = v as Record<string, unknown>;
  return isStars(r.stars) && typeof r.at === "string" && r.at ? { stars: r.stars, at: r.at } : null;
}

/** "3★ Getting there" */
export const starText = (s: Stars): string => `${s}★ ${STAR_LABELS[s]}`;

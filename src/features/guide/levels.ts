export const LEVELS = ["simple", "standard"] as const;
export type Level = (typeof LEVELS)[number];
export const DEFAULT_LEVEL: Level = "standard";

export function isLevel(v: unknown): v is Level {
  return typeof v === "string" && (LEVELS as readonly string[]).includes(v);
}

/** True when `current` is `min` or above. */
export function atLeast(current: Level, min: Level): boolean {
  return LEVELS.indexOf(current) >= LEVELS.indexOf(min);
}

export function effectiveLevel(global: Level, pageOverride: Level | null): Level {
  return pageOverride ?? global;
}

/** The level a component sees: a pin from a `LevelPin` above it wins (the studio, which has no level switch), else the page's level. */
export function resolveLevel(global: Level, pageOverride: Level | null, pin: Level | null): Level {
  return pin ?? effectiveLevel(global, pageOverride);
}

export function stepUp(l: Level): Level {
  return LEVELS[Math.min(LEVELS.indexOf(l) + 1, LEVELS.length - 1)];
}

export function stepDown(l: Level): Level {
  return LEVELS[Math.max(LEVELS.indexOf(l) - 1, 0)];
}

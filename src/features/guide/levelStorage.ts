import { DEFAULT_LEVEL, isLevel, type Level } from "./levels";

export const GLOBAL_KEY = "musickit.level";
export const PAGE_KEY = "musickit.level.page";

export function readLevel(raw: string | null): Level {
  return isLevel(raw) ? raw : DEFAULT_LEVEL;
}

/** Per-page overrides as stored JSON; invalid JSON or non-level values are dropped. */
export function readOverrides(raw: string | null): Record<string, Level> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, Level> = {};
    for (const [k, v] of Object.entries(parsed)) if (isLevel(v)) out[k] = v;
    return out;
  } catch {
    return {};
  }
}

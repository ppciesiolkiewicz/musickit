/**
 * Words in an exercise that lean on another day of its week ("day 2", "yesterday", "this week"). The composer hands out
 * one block at a time, so a block read alone must not point at a day the player never had. A plan's summary, progress
 * line and day themes may name days: the composer doesn't carry them.
 */
const DAY_WORDS = /\b(?:day\s+(?:\d+|one|two|three|four|five|six|seven)|yesterday|tomorrow|(?:this|last|next|the)\s+week|all\s+week)\b/gi;

/** "from day one" means "from the start", not a day of the plan. */
const IDIOMS = /\bfrom\s+day\s+one\b/gi;

/** Every day word in the strings of `value` (any depth), as written. */
export function dayRefs(value: unknown): string[] {
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === "string") out.push(...(v.replace(IDIOMS, "").match(DAY_WORDS) ?? []));
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(value);
  return out;
}

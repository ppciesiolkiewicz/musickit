/** Stage slugs before the course was renumbered 1–11: old slug → new slug. Old links redirect and old notes move over. */
export const LEGACY_STAGES: Record<string, string> = {
  "0-1": "1", "0-2": "2", "0-3": "3", "0-4": "4", "1": "5", "2": "6", "3": "7", "4": "8", "5": "9", "6": "10", "7": "11",
};

/** A note key ("stage/section") written before the renumbering, moved to its new stage. */
export function legacyNoteKey(key: string): string {
  const i = key.indexOf("/");
  const to = i < 0 ? undefined : LEGACY_STAGES[key.slice(0, i)];
  return to ? `${to}${key.slice(i)}` : key;
}

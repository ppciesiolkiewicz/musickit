/** The practice days a teacher sets for a student: which weekdays a week has exercises on. Pure, no imports. */

/** The weekdays, Monday first, as a teacher picks them and a line names them. */
export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

/**
 * Practice days as stored and sent: whole weekdays 0 to 6, each once, in order. Undefined for anything else, for none
 * (a week needs a day) and for all seven (every day is the same as not set).
 */
export function cleanPracticeDays(raw: unknown): number[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const days = [...new Set(raw.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6))].sort((a, b) => a - b);
  return days.length && days.length < 7 ? days : undefined;
}

/** The practice days as a line names them: "Monday, Wednesday and Friday"; "every day" when not set. */
export function practiceDaysWords(days: number[] | undefined): string {
  const names = (cleanPracticeDays(days) ?? []).map((d) => WEEKDAYS[d]);
  if (!names.length) return "every day";
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

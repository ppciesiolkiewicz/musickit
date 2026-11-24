import { AREAS } from "./concepts";

/*
 * A day's sections as the screen draws them (DayShape1): the composer keeps each area's exercises together, so a
 * section is a run of exercises of one area. Read from the stored exercises; nothing about sections is stored.
 */

export interface SectionStart {
  /** the area's name as the questionnaire shows it */
  label: string;
  /** the minutes of the section's exercises */
  minutes: number;
}

/**
 * For each exercise, the section it opens, or null. A day in one area (or with no areas) has no sections to tell
 * apart, so every entry is null and the screen draws no heading.
 */
export function sectionStarts(exercises: { area?: string; minutes: number }[]): (SectionStart | null)[] {
  const label = (area: string | undefined) => AREAS.find((a) => a.id === area)?.label ?? null;
  const starts = exercises.map((e, i) => i === 0 || e.area !== exercises[i - 1].area);
  if (starts.filter(Boolean).length < 2 || exercises.some((e) => label(e.area) === null)) return exercises.map(() => null);
  return exercises.map((e, i) => {
    if (!starts[i]) return null;
    let minutes = 0;
    for (let j = i; j < exercises.length && (j === i || !starts[j]); j++) minutes += exercises[j].minutes;
    return { label: label(e.area)!, minutes };
  });
}

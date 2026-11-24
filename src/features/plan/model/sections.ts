import { AREAS } from "./concepts";

/*
 * A day's parts as the screen draws them (DayShape1, DayShape2): the composer keeps each area's exercises together and
 * opens a voice or guitar section with its warm-up, so a part is a run of exercises of one area that are all warm-ups or
 * all not. Read from the stored exercises; nothing about sections is stored.
 */

export interface SectionStart {
  /** the area's name as the questionnaire shows it; a warm-up's part is "Warm-up", with the area ("Voice warm-up") when the day has more than one */
  label: string;
  /** the minutes of the part's exercises */
  minutes: number;
}

type Part = { area?: string; kind?: string; minutes: number };

/**
 * For each exercise, the part it opens, or null. A day with one part (one area, no warm-up) or with an exercise of no
 * known area has nothing to tell apart, so every entry is null and the screen draws no heading.
 */
export function sectionStarts(exercises: Part[]): (SectionStart | null)[] {
  const label = (area: string | undefined) => AREAS.find((a) => a.id === area)?.label ?? null;
  const warm = (e: Part) => e.kind === "warm-up";
  const starts = exercises.map((e, i) => i === 0 || e.area !== exercises[i - 1].area || warm(e) !== warm(exercises[i - 1]));
  if (starts.filter(Boolean).length < 2 || exercises.some((e) => label(e.area) === null)) return exercises.map(() => null);
  const warmUps = exercises.filter((e, i) => starts[i] && warm(e)).length;
  return exercises.map((e, i) => {
    if (!starts[i]) return null;
    let minutes = 0;
    for (let j = i; j < exercises.length && (j === i || !starts[j]); j++) minutes += exercises[j].minutes;
    return { label: !warm(e) ? label(e.area)! : warmUps > 1 ? `${label(e.area)} warm-up` : "Warm-up", minutes };
  });
}

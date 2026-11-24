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

export interface DayPage {
  /** the page's name on its tab: the part's label, with "1 of 2" when a long part is cut in two */
  label: string;
  /** the exercises on the page, as indexes into the day's: from `start`, `count` of them */
  start: number;
  count: number;
  minutes: number;
}

/** A page holds at most this many exercises: a longer part is cut into even pages. */
export const PAGE_MAX = 4;

/**
 * A day cut into pages, so the screen draws one page's exercises and their tools at a time: each part (`sectionStarts`)
 * is a page, and a part of more than `PAGE_MAX` exercises is cut into even pages. A day of one part is cut the same way,
 * named "Part 1", "Part 2". A day short enough for one page is one page.
 */
export function dayPages(exercises: Part[]): DayPage[] {
  const starts = sectionStarts(exercises);
  const parts: { label: string | null; start: number; end: number }[] = [];
  exercises.forEach((_, i) => {
    if (i === 0 || starts[i]) parts.push({ label: starts[i]?.label ?? null, start: i, end: i + 1 });
    else parts[parts.length - 1].end = i + 1;
  });
  const pages: DayPage[] = [];
  for (const p of parts) {
    const n = p.end - p.start;
    const k = Math.ceil(n / PAGE_MAX);
    for (let j = 0; j < k; j++) {
      const start = p.start + Math.round((j * n) / k);
      const end = p.start + Math.round(((j + 1) * n) / k);
      const label = p.label === null ? `Part ${j + 1}` : k > 1 ? `${p.label} ${j + 1} of ${k}` : p.label;
      pages.push({ label, start, count: end - start, minutes: exercises.slice(start, end).reduce((m, e) => m + e.minutes, 0) });
    }
  }
  return pages;
}

/** The page that holds exercise `i`. */
export function pageOf(pages: DayPage[], i: number): number {
  const at = pages.findIndex((p) => i >= p.start && i < p.start + p.count);
  return at < 0 ? 0 : at;
}

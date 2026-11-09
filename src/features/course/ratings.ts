import type { Stars } from "@/features/progress/stars";
import { ALL_SECTIONS } from "./course";
import { noteKey, type SectionNotes } from "./notes";

/** One course section the student rated, as the plan prompt lists it. */
export interface CourseRating {
  title: string;
  stars: Stars;
  note?: string;
  at?: string;
}

/**
 * The sections the student rated, for the AI plan: newest rating first, then older ones without a date in course order,
 * at most `max`. Notes for sections that no longer exist are skipped.
 */
export function courseRatings(notes: Record<string, SectionNotes>, max = 30): CourseRating[] {
  const out: CourseRating[] = [];
  for (const { stage, section } of ALL_SECTIONS) {
    const n = notes[noteKey(stage.slug, section.slug)];
    if (!n?.stars) continue;
    const note = n.note.trim();
    out.push({ title: `${stage.title} › ${section.title}`, stars: n.stars, ...(note ? { note } : {}), ...(n.at ? { at: n.at } : {}) });
  }
  // stable sort: dated first, newest first; undated keep course order
  out.sort((x, y) => (x.at && y.at ? y.at.localeCompare(x.at) : x.at ? -1 : y.at ? 1 : 0));
  return out.slice(0, max);
}

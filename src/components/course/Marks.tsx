"use client";

import { EMPTY_NOTES, marksText } from "@/features/course/notes";
import { starText } from "@/features/progress/stars";
import { useAllNotes } from "./useCourseNotes";

/** The student's marks for one section, stars and a note sign; nothing when they haven't noted it. */
export default function Marks({ noteKey, className = "" }: { noteKey: string; className?: string }) {
  const n = useAllNotes()[noteKey] ?? EMPTY_NOTES;
  const marks = marksText(n);
  if (!marks) return null;
  const said = [n.stars ? starText(n.stars) : "", n.note.trim() ? "has a note" : ""].filter(Boolean).join(", ");
  return <span className={`shrink-0 truncate text-xs text-amber-300 ${className}`} aria-label={`My notes: ${said}`}>{marks}</span>;
}

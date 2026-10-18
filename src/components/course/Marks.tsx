"use client";

import { compactMarks, EMPTY_NOTES } from "@/features/course/notes";
import { useAllNotes, useTags } from "./useCourseNotes";

/** The student's marks for one section as a short row of signs; nothing when they haven't noted it. */
export default function Marks({ noteKey, className = "" }: { noteKey: string; className?: string }) {
  const all = useAllNotes();
  const [tags] = useTags();
  const marks = compactMarks(all[noteKey] ?? EMPTY_NOTES, tags);
  if (!marks.length) return null;
  return <span className={`shrink-0 truncate text-xs ${className}`} aria-label={`My notes: ${marks.join(" ")}`}>{marks.join(" ")}</span>;
}

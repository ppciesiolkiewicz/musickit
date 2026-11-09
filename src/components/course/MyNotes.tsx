"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { StarRating } from "@/components/ui";
import { noteKey } from "@/features/course/notes";
import { STARS, STAR_LABELS, isStars } from "@/features/progress/stars";
import { saveSectionNotes, useSectionNotes } from "./useCourseNotes";

const Q = ({ children }: { children: ReactNode }) => <p className="mb-1.5 mt-4 text-[11px] uppercase tracking-[0.15em] text-slate-500 first:mt-0">{children}</p>;

/** The end of every section: how the student feels about it, saved in this browser only. */
export default function MyNotes({ stage, section }: { stage: string; section: string }) {
  const [n, set] = useSectionNotes(noteKey(stage, section));
  const [note, setNote] = useState(n.note);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pending = useRef<string | null>(null);
  const key = noteKey(stage, section);

  // follow the stored note when it loads after hydration or changes in another tab, unless the student is typing
  useEffect(() => { if (!timer.current) setNote(n.note); }, [n.note]);
  // leaving the page mid-sentence still saves it
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (pending.current !== null) saveSectionNotes(key, { note: pending.current });
  }, [key]);

  const typeNote = (v: string) => {
    setNote(v);
    pending.current = v;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { timer.current = null; pending.current = null; set({ note: v }); }, 400);
  };

  return (
    <section aria-labelledby="my-notes-h" className="mt-12 rounded-3xl border border-slate-700/70 bg-slate-900/50 p-4 sm:p-5">
      <h2 id="my-notes-h" className="mb-1 font-semibold text-slate-100">My notes</h2>
      <p className="mb-4 text-xs text-slate-500">Saved in this browser only.</p>

      <Q>How well can I do it?</Q>
      <StarRating
        value={n.stars ?? null}
        labels={STARS.map((s) => STAR_LABELS[s])}
        label="How well can I do it?"
        onChange={(v) => set(isStars(v) ? { stars: v, at: new Date().toISOString() } : { stars: undefined, at: undefined })}
      />

      <Q>Note</Q>
      <textarea
        value={note}
        onChange={(e) => typeNote(e.target.value)}
        rows={3}
        aria-label="Note"
        placeholder="Anything to remember about this one"
        className="w-full rounded-xl border border-slate-700 bg-slate-950/60 p-2.5 text-sm text-slate-100 outline-none focus:border-amber-400"
      />
    </section>
  );
}

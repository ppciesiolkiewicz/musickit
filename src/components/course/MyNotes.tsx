"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { KNOW, LIKE, makeCustomTag, noteKey } from "@/features/course/notes";
import { saveSectionNotes, useSectionNotes, useTags } from "./useCourseNotes";

function Pick({ on, onClick, children, label }: { on: boolean; onClick: () => void; children: ReactNode; label?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`rounded-xl border px-2.5 py-1.5 text-sm transition ${on ? "border-amber-400 bg-amber-400/15 text-slate-50" : "border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-500"}`}
    >
      {children}
    </button>
  );
}

const Q = ({ children }: { children: ReactNode }) => <p className="mb-1.5 mt-4 text-[11px] uppercase tracking-[0.15em] text-slate-500 first:mt-0">{children}</p>;

/** The end of every section: how the student feels about it, saved in this browser only. */
export default function MyNotes({ stage, section }: { stage: string; section: string }) {
  const [n, set] = useSectionNotes(noteKey(stage, section));
  const [tags, addTag] = useTags();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [bad, setBad] = useState(false);
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
  const toggleTag = (id: string) => set({ tags: n.tags.includes(id) ? n.tags.filter((t) => t !== id) : [...n.tags, id] });
  const submitTag = () => {
    const t = makeCustomTag(draft, tags);
    if (!t) { setBad(true); return; }
    addTag(t);
    set({ tags: [...n.tags, t.id] });
    setDraft(""); setAdding(false); setBad(false);
  };

  return (
    <section aria-labelledby="my-notes-h" className="mt-12 rounded-3xl border border-slate-700/70 bg-slate-900/50 p-4 sm:p-5">
      <h2 id="my-notes-h" className="mb-1 font-semibold text-slate-100">My notes</h2>
      <p className="mb-4 text-xs text-slate-500">Saved in this browser only.</p>

      <Q>How well do I know it?</Q>
      <div className="flex flex-wrap gap-1.5">
        {KNOW.map((k) => <Pick key={k.id} on={n.know === k.id} onClick={() => set({ know: n.know === k.id ? undefined : k.id })}>{k.emoji} {k.label}</Pick>)}
      </div>

      <Q>How do I like it?</Q>
      <div className="flex flex-wrap gap-1.5">
        {LIKE.map((l) => <Pick key={l.id} label={l.label} on={n.like === l.id} onClick={() => set({ like: n.like === l.id ? undefined : l.id })}>{l.emoji}</Pick>)}
      </div>

      <Q>Keep it close</Q>
      <div className="flex flex-wrap gap-1.5">
        <Pick on={!!n.often} onClick={() => set({ often: !n.often || undefined })}>🔁 come back often</Pick>
        <Pick on={!!n.warmup} onClick={() => set({ warmup: !n.warmup || undefined })}>🔥 warm-up</Pick>
      </div>

      <Q><span className="text-lg tracking-normal">🤷</span></Q>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={n.tags.includes(t.id)}
            onClick={() => toggleTag(t.id)}
            className={`rounded-full px-2.5 py-1 text-xs transition ${n.tags.includes(t.id) ? "bg-amber-400/20 text-slate-50 ring-1 ring-amber-400" : "bg-slate-800/80 text-slate-300 hover:bg-slate-700"}`}
          >
            {t.emoji && `${t.emoji} `}{t.text}
          </button>
        ))}
        {adding ? (
          <form onSubmit={(e) => { e.preventDefault(); submitTag(); }} className="flex items-center gap-1">
            <input
              autoFocus
              value={draft}
              maxLength={40}
              onChange={(e) => { setDraft(e.target.value); setBad(false); }}
              onKeyDown={(e) => { if (e.key === "Escape") { setAdding(false); setDraft(""); } }}
              placeholder="🎯 my tag"
              aria-label="New tag: an emoji and/or words"
              aria-invalid={bad}
              className={`w-36 rounded-full border bg-slate-950 px-2.5 py-1 text-xs text-slate-100 outline-none ${bad ? "border-rose-400" : "border-slate-600 focus:border-amber-400"}`}
            />
            <button type="submit" className="rounded-full bg-amber-400 px-2.5 py-1 text-xs font-semibold text-slate-950">Add</button>
          </form>
        ) : (
          <button type="button" onClick={() => setAdding(true)} className="rounded-full border border-dashed border-slate-600 px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200">+ tag</button>
        )}
      </div>
      {bad && <p className="mt-1 text-xs text-rose-300">That tag is empty or already there.</p>}

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

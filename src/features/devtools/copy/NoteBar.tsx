"use client";

import { useState, type ReactNode } from "react";
import Icon from "@/components/Icon";
import type { CommentState, CopyNote } from "../model/copyNotes";
import { writeCopyNotes as write } from "./store";

/*
 * The one look of a dev note, wherever it shows: under its section on /dev/examples, under its text on any page, in the
 * Notes bar and on /dev/notes. The note, the commit it was made at, edit and delete.
 */

const TONE: Record<CommentState, string> = {
  current: "border-amber-400/40 bg-amber-300/10 text-amber-50",
  changed: "border-orange-500/60 bg-orange-500/10 text-orange-100",
  gone: "border-rose-500/60 bg-rose-500/10 text-rose-100",
};

/** The box a note is written or changed in: ⌘↵ saves, Esc cancels. */
export function NoteEditor({ initial, onSave, onCancel, placeholder = "What's wrong or good here? (⌘↵ to save, Esc to cancel)" }: { initial: string; onSave: (text: string) => void; onCancel: () => void; placeholder?: string }) {
  const [text, setText] = useState(initial);
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-amber-400/50 bg-slate-950/95 p-2">
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onSave(text);
          if (e.key === "Escape") onCancel();
        }}
        rows={2}
        placeholder={placeholder}
        className="w-full resize-y rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100 placeholder:text-slate-500"
      />
      <div className="flex gap-1.5">
        <button type="button" onClick={() => onSave(text)} className="cursor-pointer rounded-md border border-amber-400/70 bg-amber-500/20 px-2.5 py-0.5 text-xs font-medium text-amber-50 hover:bg-amber-500/30">Save</button>
        <button type="button" onClick={onCancel} className="cursor-pointer rounded-md border border-slate-700 px-2.5 py-0.5 text-xs text-slate-300 hover:bg-slate-800">Cancel</button>
      </div>
    </div>
  );
}

/** One note: its text, `@commit` (the example file's for a section note, else HEAD when it was made), edit and delete. */
export function NoteBar({ note, state = "current", linked = false, extra, id }: { note: CopyNote; state?: CommentState; linked?: boolean; extra?: ReactNode; id?: string }) {
  const [editing, setEditing] = useState(false);
  if (editing)
    return (
      <NoteEditor initial={note.note} onCancel={() => setEditing(false)} onSave={(raw) => {
        const text = raw.trim();
        if (text) write((l) => l.map((x) => (x.id === note.id ? { ...x, note: text } : x)));
        setEditing(false);
      }} />
    );
  const s = note.section;
  const commit = s ? `${s.commit}${s.dirty ? "+" : ""}` : note.head;
  const title = `Noted ${new Date(note.at).toLocaleString()}${s ? ` at ${s.commit}${s.dirty ? " (file had uncommitted edits)" : ""}` : ""}${note.head ? `, HEAD ${note.head}` : ""}`;
  return (
    <div id={id} className={`flex items-start gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${TONE[state]} ${linked ? "ring-2 ring-sky-400" : ""}`}>
      <p className="min-w-0 flex-1 whitespace-pre-wrap">{note.note}</p>
      <span className="shrink-0 font-mono text-[10px] opacity-70" title={title}>
        {state === "changed" ? "section changed · " : ""}{commit ? `@${commit}` : ""}
      </span>
      {extra}
      <button type="button" aria-label="Edit note" title="Edit" onClick={() => setEditing(true)} className="shrink-0 cursor-pointer opacity-60 hover:opacity-100">
        <Icon name="pencil" size={12} />
      </button>
      <button type="button" aria-label="Delete note" title="Delete" onClick={() => write((l) => l.filter((x) => x.id !== note.id))} className="shrink-0 cursor-pointer opacity-60 hover:opacity-100">
        <Icon name="x" size={12} />
      </button>
    </div>
  );
}

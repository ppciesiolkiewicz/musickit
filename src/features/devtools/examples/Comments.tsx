"use client";

import { useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Icon from "@/components/Icon";
import { SectionAsideContext, type SectionAside } from "@/features/plan/ui/SectionAside";
import type { Section } from "@/features/plan/model/tools";
import { pinSection, quoteOf, sectionHash, sectionText } from "../model/comments";
import { placeOf, stateOf, type CommentState, type CopyNote } from "../model/copyNotes";
import { useCommits, useCopyNotes, useLinkedNote, useScrollTo, writeCopyNotes as write } from "../copy/store";

/*
 * The pencils on /dev/examples: a shortcut to a dev note (the Notes button's "Note a text") pinned to one section, so it
 * lands with every other note and the Notes bar re-pins, copies and clears it with them.
 */

/* ---- one example's sections, each with its comments ---- */

const TONE: Record<CommentState, string> = {
  current: "border-amber-400/40 bg-amber-300/10 text-amber-50",
  changed: "border-orange-500/60 bg-orange-500/10 text-orange-100",
  gone: "border-rose-500/60 bg-rose-500/10 text-rose-100",
};

/** The box a comment is written or changed in: ⌘↵ saves, Esc cancels. */
function CommentEditor({ initial, onSave, onCancel }: { initial: string; onSave: (text: string) => void; onCancel: () => void }) {
  const [text, setText] = useState(initial);
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-amber-400/50 bg-slate-950/60 p-2">
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onSave(text);
          if (e.key === "Escape") onCancel();
        }}
        rows={2}
        placeholder="What's wrong or good here? (⌘↵ to save, Esc to cancel)"
        className="w-full resize-y rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100 placeholder:text-slate-500"
      />
      <div className="flex gap-1.5">
        <button type="button" onClick={() => onSave(text)} className="cursor-pointer rounded-md border border-amber-400/70 bg-amber-500/20 px-2.5 py-0.5 text-xs font-medium text-amber-50 hover:bg-amber-500/30">Save</button>
        <button type="button" onClick={onCancel} className="cursor-pointer rounded-md border border-slate-700 px-2.5 py-0.5 text-xs text-slate-300 hover:bg-slate-800">Cancel</button>
      </div>
    </div>
  );
}

/** Notes under one section, and the button (shown on hover, or always once there are some) that adds one. */
function CommentSlot({ example, address, index, section }: { example: string; address: string; index: number; section: Section }) {
  const all = useCopyNotes();
  const commits = useCommits();
  const route = usePathname();
  const linked = useLinkedNote();
  // the new comment's box is open (its text lives in CommentEditor); `editing` is the comment whose text is being changed
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const mine = all.filter((n) => n.section?.example === example && n.section.address === address && n.section.index === index);
  const hash = sectionHash(section);
  const file = commits?.files[example];
  useScrollTo(linked && mine.some((n) => n.id === linked) ? `note-${linked}` : null);

  const add = (raw: string) => {
    const text = raw.trim();
    if (!text) return setAdding(false);
    const at = { address, index };
    const c: CopyNote = {
      id: crypto.randomUUID(), route, text: quoteOf(sectionText(section)), where: `${example} · ${placeOf(at)}`, note: text, at: new Date().toISOString(),
      ...(commits ? { head: commits.head } : {}),
      section: { example, ...at, kind: section.type, hash, commit: file?.commit ?? "unknown", ...(file?.dirty ? { dirty: true } : {}) },
    };
    write((l) => [...l, c]);
    setAdding(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAdding(true)}
        title="Comment on this section"
        aria-label="Comment on this section"
        className="absolute right-0 top-0 z-10 grid size-6 cursor-pointer place-items-center rounded-md border border-amber-400/50 bg-slate-950/95 text-amber-200 opacity-30 shadow transition group-hover/sec:opacity-100 focus-visible:opacity-100 hover:bg-amber-500/25"
      >
        <Icon name="pencil" size={12} />
      </button>
      {(mine.length > 0 || adding) && (
        <div className="mt-2 flex min-w-72 flex-col gap-1.5">
          {mine.map((c) => {
            const s = c.section!;
            const state = stateOf(s, hash);
            return (
              editing === c.id ? (
                <CommentEditor key={c.id} initial={c.note} onCancel={() => setEditing(null)} onSave={(raw) => {
                  const note = raw.trim();
                  if (note) write((l) => l.map((x) => (x.id === c.id ? { ...x, note } : x)));
                  setEditing(null);
                }} />
              ) : (
              <div key={c.id} id={`note-${c.id}`} className={`flex items-start gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${TONE[state]} ${linked === c.id ? "ring-2 ring-sky-400" : ""}`}>
                <p className="min-w-0 flex-1 whitespace-pre-wrap">{c.note}</p>
                <span className="shrink-0 font-mono text-[10px] opacity-70" title={`Noted ${new Date(c.at).toLocaleString()} at ${s.commit}${s.dirty ? " (file had uncommitted edits)" : ""}${c.head ? `, HEAD ${c.head}` : ""}`}>
                  {state === "changed" ? "section changed · " : ""}@{s.commit}{s.dirty ? "+" : ""}
                </span>
                {state === "changed" && (
                  <button type="button" title="The section is still right for this comment: pin it to the section as it is now" onClick={() => write((l) => l.map((x) => (x.id === c.id && x.section ? { ...x, text: quoteOf(sectionText(section)), section: pinSection(x.section, section, file), ...(commits ? { head: commits.head } : {}) } : x)))} className="shrink-0 cursor-pointer text-[10px] underline opacity-80 hover:opacity-100">
                    keep
                  </button>
                )}
                <button type="button" aria-label="Edit comment" title="Edit" onClick={() => setEditing(c.id)} className="shrink-0 cursor-pointer opacity-60 hover:opacity-100">
                  <Icon name="pencil" size={12} />
                </button>
                <button type="button" aria-label="Delete comment" title="Delete" onClick={() => write((l) => l.filter((x) => x.id !== c.id))} className="shrink-0 cursor-pointer opacity-60 hover:opacity-100">
                  <Icon name="x" size={12} />
                </button>
              </div>
              )
            );
          })}
          {adding && <CommentEditor initial="" onSave={add} onCancel={() => setAdding(false)} />}
        </div>
      )}
    </>
  );
}

/** Makes every section rendered inside commentable, the comments belonging to `example`. */
export function CommentsFor({ example, children }: { example: string; children: ReactNode }) {
  // called as a function by Sections (not mounted as a component): the slot it returns is the component
  const aside = useMemo<SectionAside>(() => (at) => <CommentSlot example={example} {...at} />, [example]); // eslint-disable-line react/display-name -- a render function, not a component
  return <SectionAsideContext.Provider value={aside}>{children}</SectionAsideContext.Provider>;
}

/** How many notes an example has, for its closed card. */
export function CommentCount({ example }: { example: string }) {
  const n = useCopyNotes().filter((c) => c.section?.example === example).length;
  return n ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-1.5 text-[10px] font-semibold text-amber-200"><Icon name="pencil" size={10} />{n}</span> : null;
}

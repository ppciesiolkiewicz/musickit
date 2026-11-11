"use client";

import { useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Icon from "@/components/Icon";
import { SectionAsideContext, type SectionAside } from "@/features/plan/ui/SectionAside";
import type { PlainCell as Section } from "@/features/plan/model/tools";
import { pinSection, quoteOf, sectionHash, sectionText } from "../model/comments";
import { placeOf, stateOf, type CopyNote } from "../model/copyNotes";
import { NoteBar, NoteEditor } from "../copy/NoteBar";
import { useCommits, useCopyNotes, useLinkedNote, useScrollTo, writeCopyNotes as write } from "../copy/store";

/*
 * The pencils on /dev/examples: a shortcut to a dev note (the Notes button's "Note a text") pinned to one section, so it
 * lands with every other note and the Notes bar re-pins, copies and clears it with them.
 */

/* ---- one example's sections, each with its comments ---- */

/** Notes under one section, and the button (shown on hover, or always once there are some) that adds one. */
function CommentSlot({ example, address, index, section }: { example: string; address: string; index: number; section: Section }) {
  const all = useCopyNotes();
  const commits = useCommits();
  const route = usePathname();
  const linked = useLinkedNote();
  // the new comment's box is open (its text lives in NoteEditor)
  const [adding, setAdding] = useState(false);
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
            const state = stateOf(c.section!, hash);
            const keep = state === "changed" && (
              <button type="button" title="The section is still right for this comment: pin it to the section as it is now" onClick={() => write((l) => l.map((x) => (x.id === c.id && x.section ? { ...x, text: quoteOf(sectionText(section)), section: pinSection(x.section, section, file), ...(commits ? { head: commits.head } : {}) } : x)))} className="shrink-0 cursor-pointer text-[10px] underline opacity-80 hover:opacity-100">
                keep
              </button>
            );
            return <NoteBar key={c.id} id={`note-${c.id}`} note={c} state={state} linked={linked === c.id} extra={keep} />;
          })}
          {adding && <NoteEditor initial="" onSave={add} onCancel={() => setAdding(false)} />}
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

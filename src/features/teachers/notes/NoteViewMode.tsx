"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import Icon from "@/components/Icon";
import { PageHeading, PageHeadingRow, PageIntro } from "@/components/PageHeading";
import type { Block } from "@/features/plan/model/types";
import { notePageParts } from "./model/note";

/**
 * The notes creator's View as a note, shared by the page's header and the creator: while `viewing`, the header is the note's own
 * (as on a demo note's page) and the creator shows the article. The creator hands over the note it is showing (`setNote`).
 */
interface NoteViewMode {
  viewing: boolean;
  setViewing: (v: boolean) => void;
  note: Block | null;
  setNote: (b: Block | null) => void;
}

const Ctx = createContext<NoteViewMode | null>(null);

/** Wraps a notes creator page (the header and the creator) so View as a note can change both. */
export function NoteViewProvider({ children }: { children: ReactNode }) {
  const [viewing, setViewing] = useState(false);
  const [note, setNote] = useState<Block | null>(null);
  return <Ctx.Provider value={{ viewing, setViewing, note, setNote }}>{children}</Ctx.Provider>;
}

/** The page's View as a note state, or null outside a `NoteViewProvider` (the creator then keeps its own). */
export const useNoteViewMode = () => useContext(Ctx);

/**
 * View as a note's column, for its header and its article: as wide as a note's own page draws them (80rem less the page's side
 * padding), centred, so the creator's full-width page reads like the note does.
 */
export const NOTE_COLUMN = "mx-auto w-full max-w-[76rem]";

/** The eyebrow over a note's title, on a demo note's page and in View as a note. */
export const NOTE_EYEBROW = "A note from your teacher";

/**
 * The notes creator page's header: its own title, line and corner `action`, or, while viewing, the note's opening title and the line
 * after it, under "A note from your teacher", as a demo note's page draws them (`PresetHeader`). A note with no title has only the
 * eyebrow. Over it while viewing, **Back to editing**.
 */
export function NotesCreatorHeader({ title, intro, bar, action }: { title: string; intro: string; /** the title rule's colour class (`pageBar`) */ bar: string; action?: ReactNode }) {
  const mode = useNoteViewMode();
  if (mode?.viewing && mode.note) {
    const note = notePageParts(mode.note);
    const back = <BackToEditing onBack={() => mode.setViewing(false)} />;
    if (note.title === null) return <div className={NOTE_COLUMN}>{back}<p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">{NOTE_EYEBROW}</p></div>;
    return (
      <div className={NOTE_COLUMN}>
        {back}
        <PageHeading title={note.title} eyebrow={NOTE_EYEBROW} bar={bar} />
        {note.intro && <PageIntro>{note.intro}</PageIntro>}
      </div>
    );
  }
  const heading = <PageHeading title={title} bar={bar} />;
  return (
    <>
      {action ? <PageHeadingRow heading={heading} corner={action} /> : heading}
      <PageIntro>{intro}</PageIntro>
    </>
  );
}

/** View as a note's way back: a quiet link-like button with a left arrow, at the top of the note. */
export function BackToEditing({ onBack }: { onBack: () => void }) {
  return (
    <button type="button" onClick={onBack} className="mb-5 inline-flex items-center gap-1 text-sm text-sky-300 hover:text-sky-200">
      <Icon name="chevron-left" size={16} /> Back to editing
    </button>
  );
}

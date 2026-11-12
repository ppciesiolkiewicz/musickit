"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { PageHeading, PageHeadingRow, PageIntro } from "@/components/PageHeading";
import type { Stage } from "@/features/stage";
import { noteHeader } from "./notes";

/**
 * The notes creator's View as a note, shared by the page's header and the creator: while `viewing`, the header is the note's own
 * (as on a demo note's page) and the creator shows the article. The creator hands over the stage it is showing (`setStage`).
 */
interface NoteViewMode {
  viewing: boolean;
  setViewing: (v: boolean) => void;
  stage: Stage | null;
  setStage: (s: Stage | null) => void;
}

const Ctx = createContext<NoteViewMode | null>(null);

/** Wraps a notes creator page (the header and the creator) so View as a note can change both. */
export function NoteViewProvider({ children }: { children: ReactNode }) {
  const [viewing, setViewing] = useState(false);
  const [stage, setStage] = useState<Stage | null>(null);
  return <Ctx.Provider value={{ viewing, setViewing, stage, setStage }}>{children}</Ctx.Provider>;
}

/** The page's View as a note state, or null outside a `NoteViewProvider` (the creator then keeps its own). */
export const useNoteViewMode = () => useContext(Ctx);

/** The eyebrow over a note's title, on a demo note's page and in View as a note. */
export const NOTE_EYEBROW = "A note from your teacher";

/**
 * The notes creator page's header: its own title, line and corner `action`, or, while viewing, the note's opening title and the line
 * after it, under "A note from your teacher", as a demo note's page draws them (`PresetHeader`). A note that opens with something else
 * keeps its title in the article, so the header is only the eyebrow.
 */
export function NotesCreatorHeader({ title, intro, bar, action }: { title: string; intro: string; /** the title rule's colour class (`pageBar`) */ bar: string; action?: ReactNode }) {
  const mode = useNoteViewMode();
  if (mode?.viewing && mode.stage) {
    const note = noteHeader(mode.stage);
    if (note.title === null) return <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">{NOTE_EYEBROW}</p>;
    return (
      <>
        <PageHeading title={note.title} eyebrow={NOTE_EYEBROW} bar={bar} />
        {note.intro && <PageIntro>{note.intro}</PageIntro>}
      </>
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

"use client";

import type { ReactNode } from "react";
import { PageHeading, PageHeadingRow, PageIntro } from "@/components/PageHeading";
import { readable } from "@/features/plan/model/editBlock";
import { notePageParts } from "./model/note";
import { NoteReader } from "./NoteReader";
import { presetBlock } from "./presetNotes";

/** The preset as this tab has it (its changes from the creator, a dev demo), else the note in code, split into its header and body. */
const presetParts = (slug: string) => {
  const block = presetBlock(slug);
  return block ? notePageParts(readable(block)) : null;
};

/**
 * A preset note's page header, from the note's own opening: its title and the line about it, as the page frame draws any title,
 * with `action` in the right corner. A note with no title is only `eyebrow` and `action`. `title` and `intro` are what the server
 * knows (`presetInfo.ts`), shown when there is no note.
 */
export function PresetHeader({ slug, title, intro, eyebrow, bar, action }: { slug: string; title: string; intro: string; eyebrow: string; /** the title rule's colour class (`pageBar`) */ bar: string; action: ReactNode }) {
  const note = presetParts(slug);
  if (note && note.title === null) {
    return <PageHeadingRow heading={<p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">{eyebrow}</p>} corner={action} />;
  }
  const line = note ? note.intro : intro;
  return (
    <>
      <PageHeadingRow heading={<PageHeading title={note?.title ?? title} eyebrow={eyebrow} bar={bar} />} corner={action} />
      {line && <PageIntro>{line}</PageIntro>}
    </>
  );
}

/** A preset note drawn as an article without its opening title and line (`PresetHeader` shows them); the block lives in the browser's bundle, the server page only names it. */
export default function PresetNote({ slug }: { slug: string }) {
  const parts = presetParts(slug);
  return parts ? <NoteReader block={parts.body} body /> : null;
}

"use client";

import type { ReactNode } from "react";
import { PageHeading, PageHeadingRow, PageIntro } from "@/components/PageHeading";
import { NoteReader } from "./NoteView";
import { noteHeader } from "./notes";
import { presetStage } from "./presetNotes";

/** The preset as this tab has it (its changes from the creator, a dev demo), else the note in code, split into its header and body. */
const presetParts = (slug: string) => {
  const stage = presetStage(slug);
  return stage ? noteHeader(stage) : null;
};

/**
 * A preset note's page header, from the note's own opening: its title and the line about it, as the page frame draws any title,
 * with `action` in the right corner. A note that opens with something else (a notice, a widget) keeps its title where it was put, in
 * the article, so the header is only `eyebrow` and `action`. `title` and `intro` are what the server knows (`presetInfo.ts`), shown when
 * there is no note.
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

/** A preset note drawn as an article, without its opening title and line (`PresetHeader` shows them); the stage lives in the browser's bundle, the server page only names it. */
export default function PresetNote({ slug }: { slug: string }) {
  return <NoteReader stage={presetParts(slug)?.body ?? null} />;
}

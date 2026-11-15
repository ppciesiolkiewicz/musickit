"use client";

import { VoicePicker } from "@/features/exercises/basics/voiceChoice";
import BlockArticle, { BlockBody } from "@/features/plan/ui/reader/BlockArticle";
import type { Block } from "@/features/plan/model/types";

/** The way into the notes creator under a note being read. */
function MakeYourOwn() {
  return (
    <p className="border-t border-slate-800/70 pt-6 text-center text-sm text-slate-500">
      <a href="/teachers/studio?notes=1" className="text-sky-300 hover:text-sky-200">Make your own note</a>
    </p>
  );
}

/**
 * A note read as an article, never editable: the key bar when it has a key, under the Your voice picker when it sings. `body`
 * leaves out the title and the line under it (a page header draws them); `footer` adds Make your own note.
 */
export function NoteReader({ block, body = false, footer = true }: { block: Block; body?: boolean; footer?: boolean }) {
  return (
    <div className="flex flex-col gap-12 pt-2 sm:pt-4">
      <VoicePicker data={block}>{body ? <BlockBody block={block} size="page" keyBar /> : <BlockArticle block={block} keyBar />}</VoicePicker>
      {footer && <MakeYourOwn />}
    </div>
  );
}

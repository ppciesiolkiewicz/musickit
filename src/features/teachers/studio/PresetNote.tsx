"use client";

import { NoteReader } from "./NoteView";
import { withoutTitle } from "./notes";
import { presetNote } from "./presetNotes";

/** A preset note drawn as an article, without its opening title (the page's header shows it); the stage lives in the browser's bundle, the server page only names it. */
export default function PresetNote({ slug }: { slug: string }) {
  const stage = presetNote(slug)?.stage;
  return <NoteReader stage={stage ? withoutTitle(stage) : null} />;
}

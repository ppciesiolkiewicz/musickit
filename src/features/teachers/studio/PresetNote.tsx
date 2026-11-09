"use client";

import { NoteReader } from "./NoteView";
import { presetNote } from "./presetNotes";

/** A preset note drawn as an article; the stage lives in the browser's bundle, the server page only names it. */
export default function PresetNote({ slug }: { slug: string }) {
  return <NoteReader stage={presetNote(slug)?.stage ?? null} />;
}

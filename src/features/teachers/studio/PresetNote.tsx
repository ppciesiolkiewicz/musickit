"use client";

import { NoteReader } from "./NoteView";
import { withoutTitle } from "./notes";
import { presetStage } from "./presetNotes";

/** A preset note drawn as an article, without its opening title (the page's header shows it); the stage lives in the browser's bundle, the server page only names it. */
export default function PresetNote({ slug }: { slug: string }) {
  // its draft saved in this tab (dev demo), else the note in code
  const stage = presetStage(slug);
  return <NoteReader stage={stage ? withoutTitle(stage) : null} />;
}

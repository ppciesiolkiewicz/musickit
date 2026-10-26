import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import NoteGame from "@/components/practice/NoteGame";
import { parseNoteSettings } from "@/lib/practice/noteGame";

export const metadata: Metadata = {
  title: "Fretboard notes · attunr",
  description: "A game for learning the notes on the guitar neck: find a note by tapping or playing it, find every one, or name a lit note.",
};

export default async function NotesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])));
  return (
    <PageShell active="/theory/notes" title="Fretboard notes" intro="Learn where every note lives. Start with the natural notes on the low E and A strings (they are the roots of most chords), then add strings. Play the note on your guitar with the mic, or tap the neck. The settings are in the page address, so a teacher can set up an exercise and share the link.">
      <NoteGame initial={parseNoteSettings(q)} />
    </PageShell>
  );
}

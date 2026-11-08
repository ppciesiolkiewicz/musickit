import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import NoteGame from "@/components/practice/NoteGame";
import { parseNoteSettings } from "@/lib/practice/noteGame";
import { NOTES_TOUR } from "@/features/guide/tours/notes";

export const metadata: Metadata = {
  title: "Fretboard notes · attunr",
  description: "A game for learning the notes on the guitar neck: find a note by tapping or playing it, find every one, or name a lit note.",
};

export default async function NotesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])));
  return (
    <PageShell active="/theory/notes" devices pageId="notes" tour={NOTES_TOUR} title="Fretboard notes" intro="Learn where every note lives. Start with the natural notes on the low E and A strings (they are the roots of most chords), then add strings. Play the note on your guitar with the mic, or tap the neck.">
      <NoteGame initial={parseNoteSettings(q)} />
    </PageShell>
  );
}

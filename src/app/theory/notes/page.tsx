import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import NoteGame from "@/components/practice/NoteGame";
import { parseNoteSettings } from "@/lib/practice/noteGame";
import { NOTES_TOUR } from "@/features/guide/tours/notes";

export const metadata: Metadata = {
  title: "Guitar Fretboard Note Trainer: Interactive Practice Game · attunr",
  description: "Memorize notes on the guitar neck with interactive practice games: tap notes on the fretboard or play into your microphone with instant feedback.",
  alternates: { canonical: "/theory/notes" },
};

export default async function NotesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])));
  return (
    <PageShell active="/theory/notes" full devices mic pageId="notes" tour={NOTES_TOUR} title="Fretboard notes" intro="Find every note on the neck. Try the natural notes on the low E string, then the A string, then add more strings. Play the note on your guitar and the mic checks it, or tap the neck.">
      <NoteGame initial={parseNoteSettings(q)} />
    </PageShell>
  );
}

import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import SiteFooter from "@/components/landing/SiteFooter";
import { pageBar } from "@/components/PageHeading";
import { StudioApp } from "@/features/teachers/studio";
import { NoteViewProvider, NotesApp, NotesCreatorHeader } from "@/features/teachers/notes";

export const metadata: Metadata = {
  title: "Teacher Video Studio: Record Guitar Lessons · attunr",
  description: "Record high-quality guitar lessons with interactive fretboard diagrams, chord shapes, scales, and pitch drones displayed in real time alongside your camera.",
  alternates: { canonical: "/teachers/studio" },
};

export default async function StudioPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // the notes creator is a tool page like any other; the video studio keeps the whole window for its frame
  if ((await searchParams).notes === "1") {
    return (
      // View as a note changes the header too: the provider holds both
      <NoteViewProvider>
        <PageShell active="/teachers/studio?notes=1" full title="Notes creator" header={<NotesCreatorHeader title="Notes creator" intro="Build a page of notes for your students from scales, chords, necks and videos." bar={pageBar("/teachers/studio?notes=1")} />}>
          <NotesApp />
        </PageShell>
      </NoteViewProvider>
    );
  }
  return (
    <div className="app-bg min-h-screen text-slate-200">
      <StudioApp />
      <div className="px-4">
        <SiteFooter />
      </div>
    </div>
  );
}

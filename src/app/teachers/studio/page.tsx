import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { redirect } from "next/navigation";
import { pageBar } from "@/components/PageHeading";
import PageHelp from "@/features/guide/PageHelp";
import { INTERACTIVE_NOTES_TOUR } from "@/features/guide/tours/interactive-notes";
import { NoteViewProvider, NotesApp, NotesCreatorHeader } from "@/features/teachers/notes";

export const metadata: Metadata = {
  title: "Interactive notes · attunr",
  description: "Put scales, chords, necks and videos on one page, then share it as a link.",
  alternates: { canonical: "/teachers/studio" },
};

export default async function StudioPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // the notes creator lives here; the video studio moved to the dev tools
  if ((await searchParams).notes === "1") {
    return (
      // View as a note changes the header too: the provider holds both
      <NoteViewProvider>
        <PageShell active="/teachers/studio?notes=1" full columnTitle pageId="interactive-notes" title="Interactive notes" header={<NotesCreatorHeader title="Interactive notes" intro="Put scales, chords, necks and videos on one page, then share it as a link." bar={pageBar("/teachers/studio?notes=1")} action={<PageHelp pageId="interactive-notes" tour={INTERACTIVE_NOTES_TOUR} nudge />} />}>
          <NotesApp />
        </PageShell>
      </NoteViewProvider>
    );
  }
  redirect("/dev/studio");
}

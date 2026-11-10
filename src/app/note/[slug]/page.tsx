import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import { PRESET_INFO, PresetNote, StudioApp, editablePreset, editableSlug, presetInfo } from "@/features/teachers/studio";

type Params = { slug: string };

export const dynamicParams = false;
export const generateStaticParams = (): Params[] => Object.keys(PRESET_INFO).flatMap((slug) => [{ slug }, { slug: editableSlug(slug) }]);

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const edit = editablePreset(slug);
  if (edit) return { title: `Edit: ${presetInfo(edit)!.title} · attunr`, robots: { index: false } };
  const note = presetInfo(slug);
  return note ? { title: `${note.title} · attunr`, description: note.description } : {};
}

/** A note made ahead, at a plain address such as /note/minor-pentatonic; /note/minor-pentatonic-editable opens the same note in the notes creator. */
export default async function NotePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const edit = editablePreset(slug);
  if (edit) {
    return (
      <PageShell active="/teachers/studio?notes=1" full title="Notes creator" intro={`“${presetInfo(edit)!.title}”, open to change: add, move or remove widgets, then share it as a link. Nothing here is saved, so a reload brings the note back as it was.`}>
        <StudioApp notes preset={edit} />
      </PageShell>
    );
  }
  const note = presetInfo(slug);
  if (!note) notFound();
  return (
    <PageShell active="/teachers/studio?notes=1" devices eyebrow="A note from your teacher" title={note.title} intro={note.description}>
      <PresetNote slug={slug} />
    </PageShell>
  );
}

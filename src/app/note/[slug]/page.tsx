import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import { PRESET_INFO, PresetNote, presetInfo } from "@/features/teachers/studio";

type Params = { slug: string };

export const dynamicParams = false;
export const generateStaticParams = (): Params[] => Object.keys(PRESET_INFO).map((slug) => ({ slug }));

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const note = presetInfo((await params).slug);
  return note ? { title: `${note.title} · attunr`, description: note.description } : {};
}

/** A note made ahead, at a plain address such as /note/minor-pentatonic. */
export default async function NotePage({ params }: { params: Promise<Params> }) {
  const note = presetInfo((await params).slug);
  if (!note) notFound();
  return (
    <PageShell active="/teachers/studio?notes=1" full title={note.title} intro={note.description}>
      <PresetNote slug={(await params).slug} />
    </PageShell>
  );
}

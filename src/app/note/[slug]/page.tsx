import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import Icon from "@/components/Icon";
import { PRESET_INFO, PresetNote, StudioApp, presetInfo } from "@/features/teachers/studio";

type Params = { slug: string };
type Search = Record<string, string | string[] | undefined>;

export const dynamicParams = false;
export const generateStaticParams = (): Params[] => Object.keys(PRESET_INFO).map((slug) => ({ slug }));

/** `?edit=true` opens the note in the notes creator. */
const editing = (search: Search) => search.edit === "true";

export async function generateMetadata({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<Search> }): Promise<Metadata> {
  const note = presetInfo((await params).slug);
  if (!note) return {};
  if (editing(await searchParams)) return { title: `Edit: ${note.title} · attunr`, robots: { index: false } };
  return { title: `${note.title} · attunr`, description: note.description };
}

const ACTION = "inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800";

/** A note made ahead, at a plain address such as /note/minor-pentatonic; with `?edit=true` the same note opens in the notes creator. The page's header shows the title (the note's own first line, kept equal by a test), so the article leaves it out. */
export default async function NotePage({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<Search> }) {
  const { slug } = await params;
  const note = presetInfo(slug);
  if (!note) notFound();
  if (editing(await searchParams)) {
    return (
      <PageShell active="/teachers/studio?notes=1" full title="Notes creator" intro={`“${note.title}”, open to change: add, move or remove widgets, then share it as a link. This is a demo page: your changes are kept as you make them, so View the note shows them, until you reload.`}
        action={<Link href={`/note/${slug}`} className={ACTION}><Icon name="eye" size={15} />View the note</Link>}>
        <StudioApp notes preset={slug} />
      </PageShell>
    );
  }
  return (
    <PageShell active="/teachers/studio?notes=1" devices eyebrow="A note from your teacher" title={note.title} intro={note.description}
      action={<Link href={`/note/${slug}?edit=true`} className={ACTION}><Icon name="pencil" size={15} />Edit this note</Link>}>
      <PresetNote slug={slug} />
    </PageShell>
  );
}
